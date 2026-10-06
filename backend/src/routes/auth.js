const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../../models/User');
const { validate } = require('../middleware/validate');
const { AppError, asyncHandler } = require('../lib/errors');
const { issueTokens, setAuthCookies, hashToken } = require('../services/tokens');
const { queueEmail } = require('../services/email');

module.exports = ({ config, auth }) => {
  const router = express.Router();
  const credentials = z.object({ email: z.email(), password: z.string().min(8).max(128) });
  router.post('/register', validate(credentials.extend({ firstName: z.string().min(1), lastName: z.string().optional(), phone: z.string().regex(/^[6-9]\d{9}$/).optional() })), asyncHandler(async (req, res) => {
    if (await User.exists({ email: req.body.email })) throw new AppError(409, 'EMAIL_EXISTS', 'Email is already registered');
    const user = await User.create({ ...req.body, passwordHash: await User.hashPassword(req.body.password), password: undefined, roles: ['customer'] });
    const tokens = issueTokens(user, config);
    user.refreshTokenHashes.push({ hash: hashToken(tokens.refreshToken), expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 86400000), userAgent: req.get('user-agent') });
    await user.save(); setAuthCookies(res, tokens, config);
    // Email is enqueued (never sent inline) so a broken SMTP provider cannot fail sign-up.
    await queueEmail({ to: user.email, template: 'welcome', data: { firstName: user.firstName, lastName: user.lastName, email: user.email }, userId: user.id, tags: ['onboarding'], log: req.log });
    res.status(201).json({ data: user.toSafeJSON() });
  }));
  router.post('/login', validate(credentials), asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
    if (!user || !(await user.verifyPassword(req.body.password)) || user.status !== 'active') throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    const tokens = issueTokens(user, config);
    user.refreshTokenHashes = user.refreshTokenHashes.filter((t) => t.expiresAt > new Date()).slice(-4);
    user.refreshTokenHashes.push({ hash: hashToken(tokens.refreshToken), expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 86400000), userAgent: req.get('user-agent') });
    user.lastLoginAt = new Date(); await user.save(); setAuthCookies(res, tokens, config);
    res.json({ data: user.toSafeJSON() });
  }));
  router.post('/refresh', asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken;
    if (!token) throw new AppError(401, 'REFRESH_REQUIRED', 'Refresh token required');
    let payload; try { payload = jwt.verify(token, config.JWT_REFRESH_SECRET, { issuer: 'vani-api', audience: 'vani-web' }); } catch { throw new AppError(401, 'INVALID_REFRESH', 'Session expired'); }
    const user = await User.findById(payload.sub).select('+refreshTokenHashes');
    const existing = user?.refreshTokenHashes.find((t) => t.hash === hashToken(token));
    if (!user || !existing) throw new AppError(401, 'TOKEN_REUSE', 'Session is no longer valid');
    user.refreshTokenHashes = user.refreshTokenHashes.filter((t) => t.hash !== existing.hash);
    const tokens = issueTokens(user, config);
    user.refreshTokenHashes.push({ hash: hashToken(tokens.refreshToken), expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 86400000), userAgent: req.get('user-agent') });
    await user.save(); setAuthCookies(res, tokens, config); res.status(204).end();
  }));
  router.post('/logout', asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken;
    if (token) await User.updateOne({ 'refreshTokenHashes.hash': hashToken(token) }, { $pull: { refreshTokenHashes: { hash: hashToken(token) } } });
    const clearOptions = { path: '/', ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}) };
    res.clearCookie('accessToken', clearOptions); res.clearCookie('refreshToken', clearOptions); res.status(204).end();
  }));
  router.get('/me', auth, asyncHandler(async (req, res) => res.json({ data: req.user.toSafeJSON() })));

  // Password reset. The link goes out by email through the outbox; in non-production the response
  // also carries it so the flow stays testable without a mail provider. The response is identical
  // whether or not the address exists — never leak which emails are registered.
  const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
  router.post('/forgot-password', validate(z.object({ email: z.email() })), asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+passwordResetTokenHash +passwordResetExpiresAt');
    const meta = {};
    if (user && user.status === 'active') {
      const rawToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetTokenHash = hashToken(rawToken);
      user.passwordResetExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save();
      const resetUrl = `${config.storefrontUrl}/reset-password?token=${rawToken}`;
      await queueEmail({
        to: user.email,
        template: 'password-reset',
        data: { firstName: user.firstName, resetUrl, expiresInMinutes: RESET_TOKEN_TTL_MS / 60000 },
        userId: user.id,
        tags: ['security'],
        log: req.log,
      });
      if (config.NODE_ENV !== 'production') meta.resetUrl = resetUrl;
    }
    res.status(202).json({ message: 'If that email exists, a reset link has been sent.', meta });
  }));

  router.post('/reset-password', validate(z.object({ token: z.string().min(20).max(200), password: z.string().min(8).max(128) })), asyncHandler(async (req, res) => {
    const user = await User.findOne({ passwordResetTokenHash: hashToken(req.body.token), passwordResetExpiresAt: { $gt: new Date() } }).select('+passwordResetTokenHash +passwordResetExpiresAt +passwordHash');
    if (!user) throw new AppError(400, 'INVALID_RESET_TOKEN', 'This reset link is invalid or has expired');
    user.passwordHash = await User.hashPassword(req.body.password);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.refreshTokenHashes = [];
    await user.save();
    await queueEmail({ to: user.email, template: 'password-changed', data: { firstName: user.firstName, changedAt: new Date(), ip: req.ip }, userId: user.id, tags: ['security'], log: req.log });
    res.status(204).end();
  }));

  return router;
};
