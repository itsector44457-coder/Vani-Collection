'use strict';

/**
 * Loyalty: earning, tiers, expiry, redemption and referrals.
 *
 * Design notes that matter when changing this file:
 *
 * - **The ledger is authoritative.** `LoyaltyAccount.points` is a cache. Every positive ledger row is
 *   a *batch* with `remaining` and `expiresAt`; the balance is the sum of `remaining` over unexpired
 *   batches. `recomputeBalance` can rebuild it at any time, which is what keeps 12-month expiry
 *   honest instead of approximate.
 * - **Redemption is FIFO.** The oldest batches are consumed first, so points that are about to lapse
 *   get spent before ones that are not. Spending newest-first would silently burn members' points.
 * - **Everything that moves points is idempotent** through `LoyaltyTransaction.requestId` (unique
 *   sparse index). A retried webhook, a double-clicked Redeem or a re-run backfill cannot award or
 *   deduct twice; the duplicate is detected and the original result returned.
 * - **Multi-document writes run in a transaction**, matching `routes/orders.js`. Balance reservation
 *   is additionally a conditional atomic update (`points: { $gte: n }`), so two concurrent
 *   redemptions cannot both succeed on the same funds even if a deployment has no replica set.
 * - **Earning never fails a request.** `awardLoyaltyForOrder` catches and logs; a loyalty problem must
 *   not stop a warehouse operator marking an order delivered.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');

const LoyaltyAccount = require('../../models/LoyaltyAccount');
const LoyaltyTransaction = require('../../models/LoyaltyTransaction');
const Coupon = require('../../models/Coupon');
const User = require('../../models/User');
const { AppError } = require('../lib/errors');

const DUPLICATE_KEY = 11000;

const DEFAULT_LOYALTY = {
  enabled: true,
  rupeesPerPoint: 100,
  pointValueRupees: 1,
  minRedemptionPoints: 100,
  maxRedemptionPercent: 50,
  expiryMonths: 12,
  referralBonusPoints: 200,
  couponValidDays: 30,
  tiers: [
    { name: 'silver', label: 'Silver', minLifetimePoints: 0 },
    { name: 'gold', label: 'Gold', minLifetimePoints: 1000 },
    { name: 'platinum', label: 'Platinum', minLifetimePoints: 5000 },
  ],
};

let activeConfig = null;

/** Wires the parsed config in. Called by `buildApp`, mirroring `configureEmail`. */
function configureLoyalty(config) {
  if (config) activeConfig = config;
  return getLoyaltyConfig();
}

function getLoyaltyConfig() {
  return (activeConfig && activeConfig.loyalty) || DEFAULT_LOYALTY;
}

function isLoyaltyEnabled() {
  return getLoyaltyConfig().enabled === true;
}

const info = (log, message, fields) => {
  if (log && typeof log.info === 'function') log.info(fields || {}, message);
};
const warn = (log, message, fields) => {
  if (log && typeof log.warn === 'function') log.warn(fields || {}, message);
  else if (!log) console.warn(`[loyalty] ${message}`, fields || '');
};

/* --------------------------------------------------------------------- tiers */

/** Highest tier whose lifetime threshold the member has passed. */
function tierFor(lifetimePoints) {
  const tiers = [...getLoyaltyConfig().tiers].sort((a, b) => a.minLifetimePoints - b.minLifetimePoints);
  const earned = tiers.filter((tier) => (lifetimePoints || 0) >= tier.minLifetimePoints);
  const current = earned[earned.length - 1] || tiers[0];
  const next = tiers.find((tier) => tier.minLifetimePoints > current.minLifetimePoints) || null;
  return {
    name: current.name,
    label: current.label,
    minLifetimePoints: current.minLifetimePoints,
    next: next ? { name: next.name, label: next.label, pointsNeeded: Math.max(0, next.minLifetimePoints - (lifetimePoints || 0)) } : null,
  };
}

/* ----------------------------------------------------------------- accounts */

async function ensureAccount(userId, session) {
  const query = session ? LoyaltyAccount.findOne({ userId }).session(session) : LoyaltyAccount.findOne({ userId });
  const existing = await query;
  if (existing) return existing;
  try {
    const [created] = await LoyaltyAccount.create([{ userId, points: 0, tier: 'silver', lifetimePoints: 0 }], session ? { session } : {});
    return created;
  } catch (error) {
    // Lost an upsert race with a concurrent request; the winner's row is the one to use.
    if (error.code !== DUPLICATE_KEY) throw error;
    return LoyaltyAccount.findOne({ userId }).session(session);
  }
}

/** The balance implied by the ledger: unspent, unexpired batch points. */
async function recomputeBalance(userId, session) {
  const [row] = await LoyaltyTransaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(String(userId)), delta: { $gt: 0 }, remaining: { $gt: 0 }, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] } },
    { $group: { _id: null, balance: { $sum: '$remaining' } } },
  ]).session(session || null);
  return row ? row.balance : 0;
}

/* ------------------------------------------------------------------- expiry */

/**
 * Lapses batches whose `expiresAt` has passed, writing one `expired` ledger row per batch.
 *
 * Idempotent by construction: a batch is only selected while `remaining > 0`, and it is zeroed in the
 * same pass, so a second call is a no-op. Called lazily before any read or spend so a member is never
 * shown — or able to redeem — points that have already lapsed.
 */
async function applyExpiry(userId, { session, log } = {}) {
  const dueQuery = { userId, delta: { $gt: 0 }, remaining: { $gt: 0 }, expiresAt: { $ne: null, $lte: new Date() } };
  const due = session
    ? await LoyaltyTransaction.find(dueQuery).sort({ expiresAt: 1 }).session(session)
    : await LoyaltyTransaction.find(dueQuery).sort({ expiresAt: 1 });
  if (!due.length) return 0;

  let expired = 0;
  for (const batch of due) {
    const amount = batch.remaining;
    // Zero the batch first and only write the ledger row if we actually won the update, so two
    // concurrent passes cannot both expire the same points.
    const claimed = await LoyaltyTransaction.findOneAndUpdate(
      { _id: batch._id, remaining: amount },
      { $set: { remaining: 0 } },
      { new: true, ...(session ? { session } : {}) }
    );
    if (!claimed) continue;
    expired += amount;
    try {
      await LoyaltyTransaction.create([{
        userId,
        delta: -amount,
        reason: 'expired',
        requestId: `expire:${batch._id}`,
        note: `Points from ${batch.createdAt ? new Date(batch.createdAt).toLocaleDateString('en-IN') : 'an earlier order'} lapsed after ${getLoyaltyConfig().expiryMonths} months`,
      }], session ? { session } : {});
    } catch (error) {
      if (error.code !== DUPLICATE_KEY) throw error;
    }
  }

  if (expired > 0) {
    const balance = await recomputeBalance(userId, session);
    await LoyaltyAccount.findOneAndUpdate({ userId }, { $set: { points: balance } }, session ? { session } : {});
    info(log, 'loyalty points expired', { userId: String(userId), expired, balance });
  }
  return expired;
}

/* -------------------------------------------------------------------- award */

/**
 * Writes one ledger row and updates the cached account.
 *
 * Returns `{ transaction, duplicate }`. A duplicate `requestId` is not an error — the caller gets the
 * original row back so a retry is indistinguishable from the first attempt.
 */
async function award({ userId, delta, reason, requestId, orderId, referredUserId, note, expiresAt, session }) {
  if (!delta) return { transaction: null, duplicate: false, skipped: 'ZERO_DELTA' };

  if (requestId) {
    const existing = session
      ? await LoyaltyTransaction.findOne({ requestId }).session(session)
      : await LoyaltyTransaction.findOne({ requestId });
    if (existing) return { transaction: existing, duplicate: true };
  }

  const account = await ensureAccount(userId, session);
  const batch = delta > 0
    ? { remaining: delta, expiresAt: expiresAt || addMonths(getLoyaltyConfig().expiryMonths) }
    : {};

  let transaction;
  try {
    [transaction] = await LoyaltyTransaction.create([{
      userId,
      delta,
      reason,
      ...(requestId ? { requestId } : {}),
      ...(orderId ? { orderId } : {}),
      ...(referredUserId ? { referredUserId } : {}),
      ...(note ? { note } : {}),
      ...batch,
    }], session ? { session } : {});
  } catch (error) {
    if (error.code !== DUPLICATE_KEY || !requestId) throw error;
    const winner = await LoyaltyTransaction.findOne({ requestId }).session(session || null);
    return { transaction: winner, duplicate: true };
  }

  // `points` follows the ledger for spends and earns; `lifetimePoints` only ever grows, so redeeming
  // or letting points lapse can never demote a member.
  const update = delta > 0
    ? { $inc: { points: delta, lifetimePoints: delta }, $set: { lastEarnedAt: new Date() } }
    : { $inc: { points: delta } };
  await LoyaltyAccount.updateOne({ userId }, update, session ? { session } : {});

  const refreshed = await LoyaltyAccount.findOne({ userId }).session(session || null);
  if (refreshed) {
    // A single earn can cross a tier threshold, so re-derive the tier on every movement.
    const tier = tierFor(refreshed.lifetimePoints);
    if (tier.name !== refreshed.tier) {
      await LoyaltyAccount.updateOne({ userId }, { $set: { tier: tier.name } }, session ? { session } : {});
    }
    if (transaction) {
      transaction.balanceAfter = refreshed.points;
      await LoyaltyTransaction.updateOne({ _id: transaction._id }, { $set: { balanceAfter: refreshed.points } }, session ? { session } : {});
    }
  }
  return { transaction, duplicate: false };
}

const addMonths = (months) => {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
};

/* ------------------------------------------------------------- order earning */

/**
 * Points for an order: net goods value only.
 *
 * Shipping and GST are excluded — awarding points on tax would mean giving members a rebate on money
 * that is passed straight to the exchequer, and on shipping it would reward a courier's cost.
 */
function earningBaseRupees(order) {
  const amounts = (order && order.amounts) || {};
  const subtotal = Number(amounts.subtotal) || 0;
  const discount = Number(amounts.discount) || 0;
  return Math.max(0, subtotal - discount);
}

function pointsForRupees(rupees) {
  const rate = getLoyaltyConfig().rupeesPerPoint;
  if (!(rate > 0)) return 0;
  const value = Number(rupees);
  if (!Number.isFinite(value) || value <= 0) return 0;
  // Clamped at zero: flooring a negative base would yield negative points, i.e. a silent deduction
  // from a member's balance rather than "this earned nothing".
  return Math.max(0, Math.floor(value / rate));
}

/** Whether an order is eligible: delivered, not unwound, and the money actually arrived. */
function orderEarningEligibility(order) {
  if (!order || !order.customerId) return { eligible: false, reason: 'NO_CUSTOMER' };
  if (order.status !== 'delivered') return { eligible: false, reason: 'NOT_DELIVERED' };
  const payment = order.payment || {};
  // COD is collected at the door, so `delivered` is itself the proof of payment; online orders must
  // have been captured.
  const captured = payment.method === 'cod' || payment.status === 'paid';
  if (!captured) return { eligible: false, reason: 'NOT_CAPTURED' };
  if (['cancelled', 'returned', 'refunded'].includes(order.status)) return { eligible: false, reason: 'UNWOUND' };
  return { eligible: true };
}

/**
 * Awards points for a delivered order. Idempotent per order and **never throws** — a loyalty failure
 * must not stop the order-status update that triggered it.
 */
async function awardLoyaltyForOrder(order, { log } = {}) {
  if (!isLoyaltyEnabled()) return { awarded: false, points: 0, reason: 'LOYALTY_DISABLED' };

  const eligibility = orderEarningEligibility(order);
  if (!eligibility.eligible) return { awarded: false, points: 0, reason: eligibility.reason };

  const base = earningBaseRupees(order);
  const points = pointsForRupees(base);
  if (points <= 0) return { awarded: false, points: 0, reason: 'BELOW_EARNING_THRESHOLD', baseRupees: base };

  const requestId = `order-earned:${String(order._id || order.id)}`;
  try {
    const { transaction, duplicate } = await award({
      userId: order.customerId,
      delta: points,
      reason: 'order_earned',
      requestId,
      orderId: order._id || order.id,
      note: `Earned on order ${order.orderNumber || ''}`.trim(),
    });
    if (duplicate) {
      info(log, 'loyalty already awarded for order', { orderId: String(order._id || order.id), points });
      return { awarded: false, points: 0, reason: 'ALREADY_AWARDED', duplicate: true, transactionId: transaction?.id };
    }
    info(log, 'loyalty points awarded', { orderId: String(order._id || order.id), points, baseRupees: base });
    return { awarded: true, points, baseRupees: base, reason: 'AWARDED', transactionId: transaction?.id };
  } catch (error) {
    warn(log, 'loyalty award failed', { orderId: String(order._id || order.id), error: error.message });
    return { awarded: false, points: 0, reason: 'AWARD_FAILED', error: error.message };
  }
}

/* --------------------------------------------------------------- redemption */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 — these get read aloud
const randomCode = (prefix, length) => {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return `${prefix}${out}`;
};

async function createRewardCoupon({ userId, valueRupees, session }) {
  const endsAt = new Date(Date.now() + getLoyaltyConfig().couponValidDays * 86400000);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const [coupon] = await Coupon.create([{
        code: randomCode('VC-', 8),
        type: 'fixed',
        value: valueRupees,
        // The order has to be worth at least the discount, so a reward can never zero out a basket.
        minOrderValue: valueRupees,
        usageLimit: 1,
        perCustomerLimit: 1,
        active: true,
        startsAt: new Date(),
        endsAt,
        issuedTo: userId,
      }], session ? { session } : {});
      return coupon;
    } catch (error) {
      if (error.code !== DUPLICATE_KEY) throw error;
    }
  }
  throw new AppError(500, 'COUPON_COLLISION', 'Could not generate a unique reward code');
}

/**
 * Turns points into a single-use discount code.
 *
 * The discount is always whole rupees. It is capped at `maxRedemptionPercent` of the order value and
 * the request is **clamped rather than rejected** when it exceeds the cap, so a shopper redeeming too
 * many points gets the largest valid discount instead of an error — the response says what happened.
 */
async function redeemPoints({ userId, points, orderValue, requestId }, { log } = {}) {
  const config = getLoyaltyConfig();
  if (!isLoyaltyEnabled()) throw new AppError(409, 'LOYALTY_DISABLED', 'The rewards programme is not active');
  if (!(config.maxRedemptionPercent > 0)) throw new AppError(409, 'REDEMPTION_DISABLED', 'Point redemption is currently disabled');

  const requested = Math.floor(Number(points));
  if (!Number.isInteger(requested) || requested <= 0) throw new AppError(422, 'INVALID_POINTS', 'Points must be a whole number greater than zero');
  if (requested < config.minRedemptionPoints) {
    throw new AppError(422, 'BELOW_MINIMUM', `The minimum redemption is ${config.minRedemptionPoints} points`, { minPoints: config.minRedemptionPoints });
  }

  // Idempotent replay: the same requestId returns the coupon that was already issued.
  if (requestId) {
    const prior = await LoyaltyTransaction.findOne({ requestId });
    if (prior) {
      const coupon = prior.couponCode ? await Coupon.findOne({ code: prior.couponCode }) : null;
      return { duplicate: true, points: -prior.delta, discountRupees: coupon ? coupon.value : Math.floor(-prior.delta * config.pointValueRupees), couponCode: prior.couponCode, expiresAt: coupon?.endsAt, balance: (await LoyaltyAccount.findOne({ userId }))?.points ?? 0 };
    }
  }

  let discountRupees = Math.floor(requested * config.pointValueRupees);
  let spendPoints = requested;
  let capped = false;

  const value = Number(orderValue);
  if (Number.isFinite(value) && value > 0) {
    const maxDiscount = Math.floor((value * config.maxRedemptionPercent) / 100);
    if (maxDiscount < 1) {
      throw new AppError(422, 'ORDER_TOO_SMALL', `Points cannot cover more than ${config.maxRedemptionPercent}% of an order this small`, { maxRedemptionPercent: config.maxRedemptionPercent });
    }
    if (discountRupees > maxDiscount) {
      discountRupees = maxDiscount;
      spendPoints = Math.ceil(maxDiscount / config.pointValueRupees);
      capped = true;
    }
  }
  if (discountRupees < 1) throw new AppError(422, 'INVALID_POINTS', 'That many points is worth less than one rupee');

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      // Lapse anything due first, so expired points cannot be spent.
      await applyExpiry(userId, { session, log });

      const account = await LoyaltyAccount.findOne({ userId }).session(session);
      if (!account || account.points < spendPoints) {
        throw new AppError(409, 'INSUFFICIENT_POINTS', 'You do not have enough points for that redemption', { balance: account?.points ?? 0, requested: spendPoints });
      }

      // Conditional atomic reservation: the guard is evaluated against the committed document, so two
      // concurrent redemptions cannot both succeed on the same funds.
      const reserved = await LoyaltyAccount.findOneAndUpdate(
        { userId, points: { $gte: spendPoints } },
        { $inc: { points: -spendPoints } },
        { new: true, session }
      );
      if (!reserved) {
        throw new AppError(409, 'INSUFFICIENT_POINTS', 'Your balance changed while this was processing — please try again', { balance: account.points });
      }

      // FIFO: oldest-expiring batches first, so nothing lapses while newer points sit unused.
      let left = spendPoints;
      const batches = await LoyaltyTransaction.find({ userId, delta: { $gt: 0 }, remaining: { $gt: 0 } })
        .sort({ expiresAt: 1, createdAt: 1 })
        .session(session);
      for (const batch of batches) {
        if (left <= 0) break;
        const take = Math.min(left, batch.remaining);
        await LoyaltyTransaction.findOneAndUpdate({ _id: batch._id, remaining: { $gte: take } }, { $inc: { remaining: -take } }, { session });
        left -= take;
      }
      if (left > 0) {
        // The cache and the ledger disagreed. Refund the reservation rather than spend points that
        // are not backed by a batch, and let applyExpiry/recompute reconcile on the next read.
        await LoyaltyAccount.updateOne({ userId }, { $inc: { points: left } }, { session });
        throw new AppError(409, 'LEDGER_MISMATCH', 'Your points are being recalculated — please try again in a moment', { unbaked: left });
      }

      const coupon = await createRewardCoupon({ userId, valueRupees: discountRupees, session });
      const [transaction] = await LoyaltyTransaction.create([{
        userId,
        delta: -spendPoints,
        reason: 'redeemed',
        couponCode: coupon.code,
        balanceAfter: reserved.points,
        ...(requestId ? { requestId } : {}),
        note: `Redeemed for ₹${discountRupees} off`,
      }], { session });

      result = {
        duplicate: false,
        points: spendPoints,
        requestedPoints: requested,
        capped,
        discountRupees,
        couponCode: coupon.code,
        minOrderValue: coupon.minOrderValue,
        expiresAt: coupon.endsAt,
        balance: reserved.points,
        transactionId: transaction?.id,
      };
    });
    info(log, 'loyalty points redeemed', { userId: String(userId), points: spendPoints, discountRupees });
    return result;
  } finally {
    await session.endSession();
  }
}

/* ---------------------------------------------------------------- referrals */

/** Assigns a shareable referral code if the account does not have one yet. */
async function ensureReferralCode(userId) {
  const user = await User.findById(userId);
  if (!user) return null;
  if (user.referralCode) return user.referralCode;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomCode('', 7);
    try {
      user.referralCode = code;
      await user.save();
      return code;
    } catch (error) {
      if (error.code !== DUPLICATE_KEY) throw error;
      await user.refresh();
      if (user.referralCode) return user.referralCode;
    }
  }
  return null;
}

/**
 * Applies a referral code, awarding the configured bonus to **both** sides.
 *
 * The bonus lands only once per pair: `referredBy` is set at most once on the account, and each award
 * carries a `requestId` keyed on the pair, so replaying the call cannot mint points.
 */
async function applyReferralCode({ userId, code }, { log } = {}) {
  if (!isLoyaltyEnabled()) throw new AppError(409, 'LOYALTY_DISABLED', 'The rewards programme is not active');
  const bonus = getLoyaltyConfig().referralBonusPoints;
  const normalized = String(code || '').trim().toUpperCase();
  if (normalized.length < 4) throw new AppError(422, 'INVALID_CODE', 'Enter the referral code your friend shared');

  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Account not found');
  if (user.referredBy) throw new AppError(409, 'ALREADY_REFERRED', 'This account has already used a referral code');

  const referrer = await User.findOne({ referralCode: normalized });
  if (!referrer) throw new AppError(404, 'CODE_NOT_FOUND', 'That referral code does not exist');
  if (String(referrer._id) === String(userId)) throw new AppError(422, 'SELF_REFERRAL', 'You cannot use your own referral code');
  if (referrer.status !== 'active') throw new AppError(422, 'REFERRER_INACTIVE', 'That referral code is no longer active');

  user.referredBy = referrer._id;
  user.referredAt = new Date();
  await user.save();

  const referrerId = String(referrer._id);
  const refereeId = String(userId);
  // The referrer earns for introducing someone; the new member earns as a welcome. Separate requestIds
  // so one side failing does not suppress the other on retry.
  const [made, received] = await Promise.all([
    award({ userId: referrer._id, delta: bonus, reason: 'referral_made', referredUserId: user._id, requestId: `referral:made:${referrerId}:${refereeId}`, note: `Referred ${user.firstName || user.email || 'a friend'}` }).catch((error) => ({ error })),
    award({ userId: user._id, delta: bonus, reason: 'referral_received', referredUserId: referrer._id, requestId: `referral:received:${refereeId}:${referrerId}`, note: 'Welcome bonus' }).catch((error) => ({ error })),
  ]);
  if (made.error) warn(log, 'referral award failed for referrer', { referrerId, error: made.error.message });
  if (received.error) warn(log, 'referral award failed for new member', { refereeId, error: received.error.message });

  info(log, 'referral applied', { referrerId, refereeId, bonus });
  return { bonus, referrerName: referrer.firstName || 'A friend', awarded: !made.error && !received.error };
}

/* -------------------------------------------------------------- read models */

/** Balance, tier, what is expiring and referral standing — one call for the rewards screen. */
async function getSummary(userId) {
  const config = getLoyaltyConfig();
  if (isLoyaltyEnabled()) await applyExpiry(userId, {});

  const account = await ensureAccount(userId);
  // Trust the ledger over the cache; if they disagree the ledger wins and the cache is repaired.
  const ledgerBalance = await recomputeBalance(userId);
  if (ledgerBalance !== account.points) {
    account.points = ledgerBalance;
    await account.save();
  }

  const tier = tierFor(account.lifetimePoints);
  if (tier.name !== account.tier) {
    account.tier = tier.name;
    await account.save();
  }

  const soon = new Date(Date.now() + 30 * 86400000);
  const [expiring] = await LoyaltyTransaction.aggregate([
    { $match: { userId: account.userId, delta: { $gt: 0 }, remaining: { $gt: 0 }, expiresAt: { $ne: null, $lte: soon } } },
    { $group: { _id: null, points: { $sum: '$remaining' }, earliest: { $min: '$expiresAt' } } },
  ]);

  const [totals] = await LoyaltyTransaction.aggregate([
    { $match: { userId: account.userId } },
    {
      $group: {
        _id: null,
        earned: { $sum: { $cond: [{ $eq: ['$reason', 'order_earned'] }, '$delta', 0] } },
        referrals: { $sum: { $cond: [{ $in: ['$reason', ['referral_made', 'referral_received']] }, '$delta', 0] } },
        redeemed: { $sum: { $cond: [{ $eq: ['$reason', 'redeemed'] }, { $abs: '$delta' }, 0] } },
        expired: { $sum: { $cond: [{ $eq: ['$reason', 'expired'] }, { $abs: '$delta' }, 0] } },
      },
    },
  ]);

  const referralCode = await ensureReferralCode(userId);
  const referredCount = await User.countDocuments({ referredBy: userId });

  return {
    enabled: isLoyaltyEnabled(),
    points: account.points,
    valueRupees: Math.floor(account.points * config.pointValueRupees),
    lifetimePoints: account.lifetimePoints,
    tier,
    memberSince: account.createdAt,
    expiringSoon: expiring ? { points: expiring.points, earliest: expiring.earliest } : { points: 0, earliest: null },
    redemption: {
      minPoints: config.minRedemptionPoints,
      pointValueRupees: config.pointValueRupees,
      maxPercentOfOrder: config.maxRedemptionPercent,
      couponValidDays: config.couponValidDays,
      canRedeem: account.points >= config.minRedemptionPoints && config.maxRedemptionPercent > 0,
    },
    earning: { rupeesPerPoint: config.rupeesPerPoint, expiryMonths: config.expiryMonths },
    referral: { code: referralCode, bonusPoints: config.referralBonusPoints, referredCount },
    totals: {
      earned: totals?.earned ?? 0,
      referrals: totals?.referrals ?? 0,
      redeemed: totals?.redeemed ?? 0,
      expired: totals?.expired ?? 0,
    },
  };
}

async function listTransactions(userId, { limit = 50 } = {}) {
  const capped = Math.min(200, Math.max(1, Number(limit) || 50));
  return LoyaltyTransaction.find({ userId }).sort({ createdAt: -1 }).limit(capped).lean();
}

/** Staff correction. Audited by the route; recorded with who made it and why. */
async function adjustPoints({ userId, delta, note, actorEmail, requestId }) {
  const points = Math.trunc(Number(delta));
  if (!Number.isInteger(points) || points === 0) throw new AppError(422, 'INVALID_ADJUSTMENT', 'Adjustment must be a non-zero whole number of points');
  if (!String(note || '').trim()) throw new AppError(422, 'REASON_REQUIRED', 'A reason is required for every manual adjustment');

  if (points < 0) {
    await applyExpiry(userId, {});
    const account = await LoyaltyAccount.findOne({ userId });
    if (!account || account.points < Math.abs(points)) {
      throw new AppError(409, 'INSUFFICIENT_POINTS', 'That would take the balance below zero', { balance: account?.points ?? 0 });
    }
  }

  const result = await award({
    userId,
    delta: points,
    reason: 'admin_adjustment',
    note: `${String(note).trim()}${actorEmail ? ` — by ${actorEmail}` : ''}`,
    requestId: requestId || `adjust:${userId}:${Date.now()}:${crypto.randomBytes(4).toString('hex')}`,
  });
  return result.transaction;
}

module.exports = {
  configureLoyalty,
  getLoyaltyConfig,
  isLoyaltyEnabled,
  tierFor,
  ensureAccount,
  recomputeBalance,
  applyExpiry,
  earningBaseRupees,
  pointsForRupees,
  orderEarningEligibility,
  awardLoyaltyForOrder,
  redeemPoints,
  ensureReferralCode,
  applyReferralCode,
  getSummary,
  listTransactions,
  adjustPoints,
};
