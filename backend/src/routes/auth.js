const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../../models/User');
const SignupVerification = require('../../models/SignupVerification');
const { validate } = require('../middleware/validate');
const { AppError, asyncHandler } = require('../lib/errors');
const { issueTokens, setAuthCookies, hashToken } = require('../services/tokens');
const { queueEmail, shouldDeliver } = require('../services/email');
const { applyReferralCode, ensureReferralCode, getLoyaltyConfig } = require('../services/loyalty');

module.exports = ({ config, auth, authLimiter }) => {
  const router = express.Router();
  const credentials = z.object({ email: z.email(), password: z.string().min(8).max(128) });
  const signupProfile = credentials.extend({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().max(100).optional(),
    phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
    referralCode: z.string().max(24).optional(),
  });
  const OTP_TTL_MS = 10 * 60 * 1000;
  const OTP_RESEND_MS = 60 * 1000;
  const OTP_MAX_ATTEMPTS = 5;
  const genericOtpResponse = { message: 'If the address can be used, a verification code has been sent.' };
  const otpHash = (email, code) => crypto.createHmac('sha256', config.JWT_REFRESH_SECRET).update(`${email}:${code}`).digest('hex');
  const referralInput = z.object({ email: z.email(), code: z.string().regex(/^\d{6}$/) });

  router.post('/register/request-otp', authLimiter, validate(signupProfile), asyncHandler(async (req, res) => {
    if (!shouldDeliver()) throw new AppError(503, 'EMAIL_NOT_CONFIGURED', 'Email verification is temporarily unavailable. Please try again later.');
    const { password, ...profileFields } = req.body;
    const profile = { ...profileFields, email: req.body.email.toLowerCase() };
    if (await User.exists({ email: profile.email })) return res.status(202).json(genericOtpResponse);

    const now = new Date();
    const existing = await SignupVerification.findOne({ email: profile.email });
    if (existing && now - existing.lastSentAt < OTP_RESEND_MS) {
      throw new AppError(429, 'OTP_RESEND_WAIT', 'Please wait before requesting another verification code.');
    }

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const passwordHash = await User.hashPassword(password);
    const verification = await SignupVerification.findOneAndUpdate(
      { email: profile.email },
      {
        ...profile,
        passwordHash,
        codeHash: otpHash(profile.email, code),
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
        lastSentAt: now,
        attempts: 0,
      },
      { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
    );
    const result = await queueEmail({
      to: profile.email,
      template: 'signup-otp',
      data: { firstName: profile.firstName, code },
      tags: ['security', 'signup'],
      dedupeKey: `signup-otp-${verification.id}-${now.getTime()}`,
      log: req.log,
    });
    if (!result.queued) {
      await SignupVerification.deleteOne({ _id: verification._id });
      throw new AppError(503, 'EMAIL_NOT_QUEUED', 'Could not send the verification code. Please try again later.');
    }
    res.status(202).json(genericOtpResponse);
  }));

  router.post('/register', authLimiter, validate(referralInput), asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase();
    const now = new Date();
    const verification = await SignupVerification.findOneAndUpdate(
      { email, expiresAt: { $gt: now }, attempts: { $lt: OTP_MAX_ATTEMPTS } },
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' }
    ).select('+passwordHash +codeHash');
    if (!verification) throw new AppError(400, 'OTP_EXPIRED', 'Verification code is invalid or expired. Request a new code.');
    const expectedHash = Buffer.from(otpHash(email, req.body.code), 'hex');
    const actualHash = Buffer.from(verification.codeHash, 'hex');
    if (expectedHash.length !== actualHash.length || !crypto.timingSafeEqual(expectedHash, actualHash)) {
      throw new AppError(400, 'INVALID_OTP', 'Verification code is incorrect.');
    }
    if (await User.exists({ email })) {
      await SignupVerification.deleteOne({ _id: verification._id });
      throw new AppError(409, 'EMAIL_EXISTS', 'Email is already registered');
    }

    const { referralCode } = verification;
    let user;
    try {
      user = await User.create({
        email,
        firstName: verification.firstName,
        lastName: verification.lastName,
        phone: verification.phone,
        passwordHash: verification.passwordHash,
        roles: ['customer'],
        emailVerifiedAt: now,
      });
    } catch (error) {
      if (error?.code === 11000) throw new AppError(409, 'EMAIL_EXISTS', 'Email is already registered');
      throw error;
    }
    await SignupVerification.deleteOne({ _id: verification._id });

    // A referral is a bonus, not a precondition for having an account: an expired, mistyped or
    // self-referential code is reported back but must never fail sign-up. The code can still be
    // claimed later from POST /api/loyalty/referral while `referredBy` is unset.
    let referral = null;
    if (referralCode) {
      referral = await applyReferralCode({ userId: user.id, code: referralCode }, { log: req.log })
        .then((data) => ({ applied: true, ...data }))
        .catch((error) => ({ applied: false, reason: error.code || 'REFERRAL_FAILED', message: error.message }));
    }
    // Every member gets a shareable code from day one, so "refer a friend" works before their first order.
    const ownReferralCode = await ensureReferralCode(user.id).catch(() => null);
    const tokens = issueTokens(user, config);
    user.refreshTokenHashes.push({ hash: hashToken(tokens.refreshToken), expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 86400000), userAgent: req.get('user-agent') });
    await user.save(); setAuthCookies(res, tokens, config);
    // Email is enqueued (never sent inline) so a broken SMTP provider cannot fail sign-up.
    await queueEmail({ to: user.email, template: 'welcome', data: { firstName: user.firstName, lastName: user.lastName, email: user.email, referralCode: ownReferralCode || undefined, referralBonusPoints: referral?.applied ? referral.bonus : getLoyaltyConfig().referralBonusPoints }, userId: user.id, tags: ['onboarding'], log: req.log });
    res.status(201).json({ data: user.toSafeJSON(), meta: { referral: referral || undefined, referralCode: ownReferralCode || undefined } });
  }));
  router.post('/login', authLimiter, validate(credentials), asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
    if (!user || !(await user.verifyPassword(req.body.password)) || user.status !== 'active') throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    const tokens = issueTokens(user, config);
    user.refreshTokenHashes = user.refreshTokenHashes.filter((t) => t.expiresAt > new Date()).slice(-4);
    user.refreshTokenHashes.push({ hash: hashToken(tokens.refreshToken), expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 86400000), userAgent: req.get('user-agent') });
    user.lastLoginAt = new Date(); await user.save(); setAuthCookies(res, tokens, config);
    res.json({ data: user.toSafeJSON() });
  }));
  const credentialsUpdate = z.object({
    currentPassword: z.string().min(1).max(128),
    email: z.email().optional(),
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().max(100).optional(),
    newPassword: z.string().min(8).max(128).optional(),
  }).refine((data) => data.email !== undefined || data.firstName !== undefined || data.lastName !== undefined || data.newPassword !== undefined, {
    message: 'Provide at least one account change',
  });
  router.patch('/change-credentials', auth, validate(credentialsUpdate), asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('+passwordHash +refreshTokenHashes');
    if (!user || !(await user.verifyPassword(req.body.currentPassword))) {
      throw new AppError(401, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
    }
    if (user.mustChangePassword && !req.body.newPassword) {
      throw new AppError(422, 'NEW_PASSWORD_REQUIRED', 'Set a new password before continuing');
    }

    const previousEmail = user.email;
    const nextEmail = req.body.email?.toLowerCase();
    if (nextEmail && nextEmail !== previousEmail) {
      if (await User.exists({ email: nextEmail, _id: { $ne: user._id } })) {
        throw new AppError(409, 'EMAIL_EXISTS', 'That email address is already in use');
      }
      user.email = nextEmail;
    }
    if (req.body.firstName !== undefined) user.firstName = req.body.firstName;
    if (req.body.lastName !== undefined) user.lastName = req.body.lastName;
    if (req.body.newPassword) {
      user.passwordHash = await User.hashPassword(req.body.newPassword);
      user.mustChangePassword = false;
    }

    const emailChanged = user.email !== previousEmail;
    const passwordChanged = Boolean(req.body.newPassword);
    user.refreshTokenHashes = [];
    const tokens = issueTokens(user, config);
    user.refreshTokenHashes.push({
      hash: hashToken(tokens.refreshToken),
      expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 86400000),
      userAgent: req.get('user-agent'),
    });
    await user.save();
    setAuthCookies(res, tokens, config);

    if (passwordChanged) {
      await queueEmail({
        to: previousEmail,
        template: 'password-changed',
        data: { firstName: user.firstName, changedAt: new Date(), ip: req.ip },
        userId: user.id,
        tags: ['security'],
        log: req.log,
      });
    }
    if (emailChanged) {
      await queueEmail({
        to: previousEmail,
        template: 'account-email-changed',
        data: { firstName: user.firstName, email: nextEmail },
        userId: user.id,
        tags: ['security'],
        log: req.log,
      });
      await queueEmail({
        to: nextEmail,
        template: 'account-email-changed',
        data: { firstName: user.firstName, email: nextEmail },
        userId: user.id,
        tags: ['security'],
        log: req.log,
      });
    }
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
  router.post('/forgot-password', authLimiter, validate(z.object({ email: z.email() })), asyncHandler(async (req, res) => {
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

  router.post('/reset-password', authLimiter, validate(z.object({ token: z.string().min(20).max(200), password: z.string().min(8).max(128) })), asyncHandler(async (req, res) => {
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
