const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../lib/errors');
const {
  isLoyaltyEnabled,
  getLoyaltyConfig,
  getSummary,
  listTransactions,
  redeemPoints,
  applyReferralCode,
  ensureReferralCode,
} = require('../services/loyalty');

/**
 * Thin routes only — earning, expiry, FIFO batch consumption and idempotency all live in
 * `services/loyalty.js`.
 *
 * Everything here is customer-scoped: a shopper can only ever read or spend their own balance. The
 * staff view is `GET /api/admin/loyalty`.
 */
module.exports = ({ auth }) => {
  const router = express.Router();
  router.use(auth);

  /**
   * Idempotency key for a redemption.
   *
   * The client should send one (header or body) so a retry after a dropped response cannot spend the
   * same points twice. Without one we generate a fresh key, which means "this is a new redemption" —
   * a deliberate click is never silently swallowed.
   */
  const idempotencyKey = (req, fallbackPrefix) =>
    String(req.get('idempotency-key') || req.body?.requestId || `${fallbackPrefix}:${req.user.id}:${crypto.randomBytes(8).toString('hex')}`);

  // Balance, tier and progress, what is expiring within 30 days, redemption limits and the member's
  // own referral code. Lapses any due points first so the number shown is the number spendable.
  router.get('/me', asyncHandler(async (req, res) => {
    const data = await getSummary(req.user.id);
    res.json({ data });
  }));

  router.get('/transactions', asyncHandler(async (req, res) => {
    const limit = Math.min(200, Number(req.query.limit) || 50);
    const data = await listTransactions(req.user.id, { limit });
    res.json({ data, meta: { total: data.length, limit } });
  }));

  /**
   * Turns points into a single-use discount code bound to this account.
   *
   * `orderValue` is optional but strongly advised: without it the percentage cap cannot be applied and
   * the member could mint a code larger than the basket they intend to use it on (the coupon's own
   * `minOrderValue` still stops it zeroing out a small order).
   */
  router.post('/redeem', validate(z.object({
    points: z.number().int().positive(),
    orderValue: z.number().nonnegative().optional(),
    requestId: z.string().min(6).max(120).optional(),
  })), audit('loyalty.redeem', 'LoyaltyTransaction'), asyncHandler(async (req, res) => {
    if (!isLoyaltyEnabled()) throw new AppError(409, 'LOYALTY_DISABLED', 'The rewards programme is not active');
    const data = await redeemPoints(
      { userId: req.user.id, points: req.body.points, orderValue: req.body.orderValue, requestId: idempotencyKey(req, 'redeem') },
      { log: req.log }
    );
    res.status(data.duplicate ? 200 : 201).json({ data, meta: { duplicate: Boolean(data.duplicate) } });
  }));

  /**
   * Claims a referral code, awarding the configured bonus to both sides.
   *
   * At most one code per account, self-referral is rejected, and each award carries a pair-keyed
   * idempotency key so replaying this cannot mint points.
   */
  router.post('/referral', validate(z.object({ code: z.string().min(4).max(24) })), audit('loyalty.referral', 'User'), asyncHandler(async (req, res) => {
    if (!isLoyaltyEnabled()) throw new AppError(409, 'LOYALTY_DISABLED', 'The rewards programme is not active');
    const data = await applyReferralCode({ userId: req.user.id, code: req.body.code }, { log: req.log });
    res.json({ data });
  }));

  // The member's own shareable code and how many people have used it. Creating the code is lazy, so a
  // shopper who never opens the rewards screen costs nothing.
  router.get('/referral', asyncHandler(async (req, res) => {
    const config = getLoyaltyConfig();
    const code = await ensureReferralCode(req.user.id);
    res.json({ data: { code, bonusPoints: config.referralBonusPoints } });
  }));

  return router;
};
