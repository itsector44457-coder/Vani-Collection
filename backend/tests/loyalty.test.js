const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/vani_loyalty_test';
process.env.JWT_ACCESS_SECRET = 'loyalty-access-secret-value-long-enough';
process.env.JWT_REFRESH_SECRET = 'loyalty-refresh-secret-value-long-enough';

const { loadConfig } = require('../src/config');
const loyalty = require('../src/services/loyalty');
const LoyaltyAccount = require('../models/LoyaltyAccount');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Order = require('../models/Order');

const silentLogger = { info() {}, warn() {}, error() {}, debug() {}, child() { return this; } };
const baseConfig = loadConfig();

/* --------------------------------------------------------------- DB gating */

let replset;
let dbAvailable = false;
let skipReason = '';
const maybeTest = (name, fn) => test(name, async (t) => (dbAvailable ? fn(t) : t.skip(skipReason || 'MongoDB unavailable')));

test.before(async () => {
  try {
    replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replset.getUri('vani_loyalty_test'));
    dbAvailable = true;
  } catch (error) {
    skipReason = `MongoDB unavailable (${error.message.split('\n')[0]})`;
    await mongoose.connection.close().catch(() => {});
  }
});

test.after(async () => {
  await mongoose.connection.close().catch(() => {});
  if (replset) await replset.stop().catch(() => {});
});

/** Swaps in a loyalty config for one test and always restores the real one. */
function withConfig(t, overrides) {
  loyalty.configureLoyalty({ ...baseConfig, loyalty: { ...baseConfig.loyalty, ...overrides } });
  t.after(() => loyalty.configureLoyalty(baseConfig));
  return loyalty.getLoyaltyConfig();
}

const deliveredOrder = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  orderNumber: 'VC17200000001',
  customerId: new mongoose.Types.ObjectId(),
  status: 'delivered',
  amounts: { subtotal: 3999, discount: 0, shipping: 99, tax: 639, total: 4098 },
  payment: { method: 'cod', status: 'pending' },
  ...overrides,
});

/* ===========================================================================
   Pure: configuration and arithmetic. No MongoDB required.
   =========================================================================== */

test('loyalty is configured with safe defaults and needs no credentials', () => {
  const config = loyalty.getLoyaltyConfig();
  assert.equal(config.enabled, true, 'on by default: it is internal bookkeeping with no provider');
  assert.equal(config.rupeesPerPoint, 100);
  assert.equal(config.pointValueRupees, 1);
  assert.equal(config.minRedemptionPoints, 100);
  assert.equal(config.maxRedemptionPercent, 50);
  assert.equal(config.expiryMonths, 12);
  assert.equal(config.referralBonusPoints, 200);
  assert.deepEqual(config.tiers.map((tier) => [tier.name, tier.minLifetimePoints]), [['silver', 0], ['gold', 1000], ['platinum', 5000]]);
  // Every env var has a default, so a fresh checkout boots with a working programme.
  assert.equal(process.env.LOYALTY_ENABLED, undefined);
});

test('LOYALTY_ENABLED=false switches the programme off without failing any request', async (t) => {
  withConfig(t, { enabled: false });
  assert.equal(loyalty.isLoyaltyEnabled(), false);
  const result = await loyalty.awardLoyaltyForOrder(deliveredOrder(), { log: silentLogger });
  assert.deepEqual(result, { awarded: false, points: 0, reason: 'LOYALTY_DISABLED' });
  await assert.rejects(
    () => loyalty.redeemPoints({ userId: new mongoose.Types.ObjectId(), points: 500 }),
    (error) => error.code === 'LOYALTY_DISABLED'
  );
});

test('rates are configurable, not hardcoded', (t) => {
  withConfig(t, { rupeesPerPoint: 50 });
  assert.equal(loyalty.pointsForRupees(100), 2, '₹50 per point at the overridden rate');
  withConfig(t, { rupeesPerPoint: 250 });
  assert.equal(loyalty.pointsForRupees(1000), 4);
});

test('points are earned on whole rupee steps and never fractional', (t) => {
  withConfig(t, { rupeesPerPoint: 100 });
  assert.equal(loyalty.pointsForRupees(0), 0);
  assert.equal(loyalty.pointsForRupees(99), 0, 'just under the threshold earns nothing');
  assert.equal(loyalty.pointsForRupees(100), 1);
  assert.equal(loyalty.pointsForRupees(199), 1, 'floors rather than rounds');
  assert.equal(loyalty.pointsForRupees(1050), 10);
  assert.equal(loyalty.pointsForRupees(-500), 0, 'a negative base cannot mint points');
  assert.equal(loyalty.pointsForRupees('not-a-number'), 0);
});

test('earning is on net goods value — shipping and GST are excluded', () => {
  // Awarding points on tax would rebate money that goes straight to the exchequer; on shipping it
  // would reward the courier's cost.
  assert.equal(loyalty.earningBaseRupees({ amounts: { subtotal: 3999, discount: 0, shipping: 99, tax: 639, total: 4098 } }), 3999);
  assert.equal(loyalty.earningBaseRupees({ amounts: { subtotal: 1000, discount: 250, shipping: 99, tax: 100, total: 949 } }), 750);
  assert.equal(loyalty.earningBaseRupees({ amounts: { subtotal: 100, discount: 500 } }), 0, 'a discount larger than the subtotal clamps at zero');
  assert.equal(loyalty.earningBaseRupees({}), 0);
  assert.equal(loyalty.earningBaseRupees(null), 0);
});

test('only delivered, captured, customer-owned orders earn', () => {
  assert.deepEqual(loyalty.orderEarningEligibility(deliveredOrder()), { eligible: true });
  assert.deepEqual(
    loyalty.orderEarningEligibility(deliveredOrder({ payment: { method: 'razorpay', status: 'paid' } })),
    { eligible: true },
    'an online order that was captured earns'
  );
  assert.deepEqual(
    loyalty.orderEarningEligibility(deliveredOrder({ payment: { method: 'razorpay', status: 'pending' } })),
    { eligible: false, reason: 'NOT_CAPTURED' },
    'COD is collected at the door, but an uncaptured online payment is not'
  );
  assert.deepEqual(loyalty.orderEarningEligibility(deliveredOrder({ status: 'shipped' })), { eligible: false, reason: 'NOT_DELIVERED' });
  assert.deepEqual(loyalty.orderEarningEligibility(deliveredOrder({ status: 'cancelled' })), { eligible: false, reason: 'NOT_DELIVERED' });
  assert.deepEqual(loyalty.orderEarningEligibility({ status: 'delivered', amounts: {}, payment: {} }), { eligible: false, reason: 'NO_CUSTOMER' });
  assert.deepEqual(loyalty.orderEarningEligibility(null), { eligible: false, reason: 'NO_CUSTOMER' });
});

test('tiers are thresholds on lifetime points and never demote on spend', (t) => {
  withConfig(t, {});
  const cases = [
    [0, 'silver', 'gold', 1000],
    [999, 'silver', 'gold', 1],
    [1000, 'gold', 'platinum', 4000],
    [4999, 'gold', 'platinum', 1],
    [5000, 'platinum', null, null],
    [250000, 'platinum', null, null],
  ];
  for (const [lifetime, name, nextName, needed] of cases) {
    const tier = loyalty.tierFor(lifetime);
    assert.equal(tier.name, name, `${lifetime} lifetime points`);
    assert.equal(tier.next ? tier.next.name : null, nextName);
    assert.equal(tier.next ? tier.next.pointsNeeded : null, needed);
  }
  // lifetimePoints only grows, so redeeming cannot demote: the same input always gives the same tier.
  assert.equal(loyalty.tierFor(5000).name, loyalty.tierFor(5000).name);
  assert.equal(loyalty.tierFor(undefined).name, 'silver');
  assert.equal(loyalty.tierFor(-100).name, 'silver', 'a corrupt negative total still resolves');
});

test('tier thresholds follow the configured values', (t) => {
  withConfig(t, {
    tiers: [
      { name: 'silver', label: 'Silver', minLifetimePoints: 0 },
      { name: 'gold', label: 'Gold', minLifetimePoints: 100 },
      { name: 'platinum', label: 'Platinum', minLifetimePoints: 200 },
    ],
  });
  assert.equal(loyalty.tierFor(50).name, 'silver');
  assert.equal(loyalty.tierFor(150).name, 'gold');
  assert.equal(loyalty.tierFor(250).name, 'platinum');
});

test('awarding never throws at the caller, even when the ledger write fails', async (t) => {
  withConfig(t, {});
  // A loyalty fault must not stop a warehouse operator marking an order delivered.
  t.mock.method(LoyaltyTransaction, 'findOne', async () => { throw new Error('mongo is down'); });
  const result = await loyalty.awardLoyaltyForOrder(deliveredOrder(), { log: silentLogger });
  assert.equal(result.awarded, false);
  assert.equal(result.reason, 'AWARD_FAILED');
  assert.match(result.error, /mongo is down/);
});

/* ===========================================================================
   Integration: needs a replica set (transactions). Skipped without MongoDB.
   =========================================================================== */

async function makeCustomer(email) {
  const user = await User.create({ email, firstName: 'Loyal', roles: ['customer'], passwordHash: await User.hashPassword('StrongPass123') });
  return user;
}

async function makeDeliveredOrder(customer, { subtotal = 3999, discount = 0, method = 'cod', paymentStatus = 'pending' } = {}) {
  const product = await Product.findOne({ slug: 'loyalty-test-saree' }) || await Product.create({
    name: 'Loyalty Test Saree', slug: 'loyalty-test-saree', category: 'festive', gstRate: 5, status: 'active',
    images: [{ url: 'https://example.com/a.jpg' }], variants: [{ sku: 'VC-LT-01', size: 'Free', mrp: 4999, price: 3999 }],
  });
  await Inventory.findOneAndUpdate({ sku: 'VC-LT-01' }, { $setOnInsert: { sku: 'VC-LT-01', onHand: 100, reserved: 0 } }, { upsert: true });
  const [order] = await Order.create([{
    customerId: customer._id,
    items: [{ productId: product._id, sku: 'VC-LT-01', name: product.name, quantity: 1, unitPrice: 3999, mrp: 4999, gstRate: 5, taxAmount: 190, lineTotal: 3999 }],
    shippingAddress: { fullName: 'Loyal Shopper', phone: '9876543210', line1: '1 Street', city: 'Guna', state: 'Madhya Pradesh', pincode: '473001' },
    amounts: { subtotal, discount, shipping: 99, tax: 190, total: subtotal - discount + 99 },
    payment: { method, status: paymentStatus },
    status: 'delivered',
  }]);
  return order;
}

maybeTest('a delivered order earns points once, and re-running the transition does not earn again', async () => {
  const customer = await makeCustomer('earn-once@example.com');
  const order = await makeDeliveredOrder(customer, { subtotal: 3999 });

  const first = await loyalty.awardLoyaltyForOrder(order, { log: silentLogger });
  assert.equal(first.awarded, true);
  assert.equal(first.points, 39, '₹3,999 at ₹100 per point, floored');
  assert.equal(first.baseRupees, 3999, 'shipping is not part of the base');

  const account = await LoyaltyAccount.findOne({ userId: customer._id });
  assert.equal(account.points, 39);
  assert.equal(account.lifetimePoints, 39);
  assert.equal(account.tier, 'silver');

  // A duplicated webhook, a retried request or a re-run backfill all reuse the same requestId.
  const second = await loyalty.awardLoyaltyForOrder(order, { log: silentLogger });
  assert.equal(second.awarded, false);
  assert.equal(second.reason, 'ALREADY_AWARDED');
  assert.equal(second.duplicate, true);
  assert.equal((await LoyaltyAccount.findOne({ userId: customer._id })).points, 39, 'the balance did not move');
  assert.equal(await LoyaltyTransaction.countDocuments({ userId: customer._id, reason: 'order_earned' }), 1);
});

maybeTest('discounts reduce the earning base and small orders earn nothing', async () => {
  const customer = await makeCustomer('earn-base@example.com');
  const discounted = await makeDeliveredOrder(customer, { subtotal: 2000, discount: 500 });
  const result = await loyalty.awardLoyaltyForOrder(discounted, { log: silentLogger });
  assert.equal(result.points, 15, '₹1,500 net of the ₹500 discount');

  const tiny = await makeDeliveredOrder(customer, { subtotal: 99 });
  const tinyResult = await loyalty.awardLoyaltyForOrder(tiny, { log: silentLogger });
  assert.equal(tinyResult.awarded, false);
  assert.equal(tinyResult.reason, 'BELOW_EARNING_THRESHOLD');
});

maybeTest('redemption spends oldest batches first and issues a single-use coupon bound to the member', async () => {
  const customer = await makeCustomer('redeem-fifo@example.com');

  // Two earns a month apart: the older batch expires first and must be consumed first.
  const older = await makeDeliveredOrder(customer, { subtotal: 20000 });
  await loyalty.awardLoyaltyForOrder(older, { log: silentLogger });
  await LoyaltyTransaction.updateOne({ userId: customer._id, reason: 'order_earned' }, { $set: { createdAt: new Date(Date.now() - 60 * 86400000) } });
  const newer = await makeDeliveredOrder(customer, { subtotal: 20000 });
  await loyalty.awardLoyaltyForOrder(newer, { log: silentLogger });

  const before = await LoyaltyAccount.findOne({ userId: customer._id });
  assert.equal(before.points, 400);

  const redemption = await loyalty.redeemPoints({ userId: customer._id, points: 150, orderValue: 5000, requestId: 'redeem-test-1' }, { log: silentLogger });
  assert.equal(redemption.discountRupees, 150);
  assert.equal(redemption.capped, false);
  assert.equal(redemption.balance, 250);
  assert.match(redemption.couponCode, /^VC-[A-HJ-NP-Z2-9]{8}$/);

  const coupon = await Coupon.findOne({ code: redemption.couponCode });
  assert.equal(coupon.type, 'fixed');
  assert.equal(coupon.value, 150);
  assert.equal(coupon.usageLimit, 1, 'a reward code is single use');
  assert.equal(String(coupon.issuedTo), String(customer._id), 'bound to the member who spent the points');
  assert.equal(coupon.minOrderValue, 150, 'it can never zero out a smaller basket');
  assert.ok(coupon.endsAt > new Date(), 'it has a real expiry');

  // FIFO: the older batch took the whole 150, the newer one is untouched.
  const batches = await LoyaltyTransaction.find({ userId: customer._id, delta: { $gt: 0 } }).sort({ createdAt: 1 });
  assert.equal(batches.length, 2);
  assert.equal(batches[0].remaining, 50, 'the older batch was consumed first');
  assert.equal(batches[1].remaining, 200, 'the newer batch is intact');

  // Idempotent replay returns the same coupon instead of spending again.
  const replay = await loyalty.redeemPoints({ userId: customer._id, points: 150, orderValue: 5000, requestId: 'redeem-test-1' }, { log: silentLogger });
  assert.equal(replay.duplicate, true);
  assert.equal(replay.couponCode, redemption.couponCode);
  assert.equal((await LoyaltyAccount.findOne({ userId: customer._id })).points, 250, 'the replay did not deduct again');
  assert.equal(await Coupon.countDocuments({ issuedTo: customer._id }), 1, 'and did not mint a second coupon');
});

maybeTest('redemption is clamped to the percentage cap instead of failing, and refuses to overspend', async () => {
  const customer = await makeCustomer('redeem-cap@example.com');
  const order = await makeDeliveredOrder(customer, { subtotal: 100000 });
  await loyalty.awardLoyaltyForOrder(order, { log: silentLogger });
  assert.equal((await LoyaltyAccount.findOne({ userId: customer._id })).points, 1000);

  // 1000 points is ₹1,000, but the cap is 50% of a ₹1,000 order = ₹500.
  const capped = await loyalty.redeemPoints({ userId: customer._id, points: 1000, orderValue: 1000, requestId: 'cap-test-1' }, { log: silentLogger });
  assert.equal(capped.capped, true);
  assert.equal(capped.discountRupees, 500);
  assert.equal(capped.points, 500, 'only the points actually used are deducted');
  assert.equal(capped.requestedPoints, 1000);
  assert.equal(capped.balance, 500);

  await assert.rejects(
    () => loyalty.redeemPoints({ userId: customer._id, points: 9999, orderValue: 100000, requestId: 'cap-test-2' }),
    (error) => error.code === 'INSUFFICIENT_POINTS' && error.details.balance === 500
  );
  await assert.rejects(
    () => loyalty.redeemPoints({ userId: customer._id, points: 50, orderValue: 100000, requestId: 'cap-test-3' }),
    (error) => error.code === 'BELOW_MINIMUM'
  );
  await assert.rejects(
    () => loyalty.redeemPoints({ userId: customer._id, points: 100, orderValue: 10, requestId: 'cap-test-4' }),
    (error) => error.code === 'ORDER_TOO_SMALL'
  );
  // Nothing leaked out of the failed attempts.
  assert.equal((await LoyaltyAccount.findOne({ userId: customer._id })).points, 500);
});

maybeTest('points lapse after the configured window and can no longer be spent', async () => {
  const customer = await makeCustomer('expiry@example.com');
  const order = await makeDeliveredOrder(customer, { subtotal: 30000 });
  await loyalty.awardLoyaltyForOrder(order, { log: silentLogger });
  assert.equal((await LoyaltyAccount.findOne({ userId: customer._id })).points, 300);

  // Backdate the batch past the 12-month window rather than waiting a year.
  await LoyaltyTransaction.updateOne(
    { userId: customer._id, reason: 'order_earned' },
    { $set: { expiresAt: new Date(Date.now() - 1000), createdAt: new Date(Date.now() - 400 * 86400000) } }
  );

  const expired = await loyalty.applyExpiry(customer._id, { log: silentLogger });
  assert.equal(expired, 300);
  const account = await LoyaltyAccount.findOne({ userId: customer._id });
  assert.equal(account.points, 0);
  assert.equal(account.lifetimePoints, 300, 'lifetime points survive expiry, so the tier is never demoted');
  assert.equal(account.tier, 'silver');

  const expiryRow = await LoyaltyTransaction.findOne({ userId: customer._id, reason: 'expired' });
  assert.equal(expiryRow.delta, -300);
  assert.match(expiryRow.note, /lapsed/);

  // Running expiry again is a no-op, and the lapsed points cannot be spent.
  assert.equal(await loyalty.applyExpiry(customer._id, { log: silentLogger }), 0);
  assert.equal(await LoyaltyTransaction.countDocuments({ userId: customer._id, reason: 'expired' }), 1);
  await assert.rejects(
    () => loyalty.redeemPoints({ userId: customer._id, points: 300, orderValue: 5000, requestId: 'expiry-spend' }),
    (error) => error.code === 'INSUFFICIENT_POINTS'
  );
});

maybeTest('a referral pays both sides once, and self-referral and reuse are refused', async () => {
  const referrer = await makeCustomer('referrer@example.com');
  const referee = await makeCustomer('referee@example.com');
  const code = await loyalty.ensureReferralCode(referrer._id);
  assert.ok(code && code.length === 7, 'every member gets a shareable code');
  assert.equal(await loyalty.ensureReferralCode(referrer._id), code, 'the code is stable across calls');

  const result = await loyalty.applyReferralCode({ userId: referee._id, code }, { log: silentLogger });
  assert.equal(result.awarded, true);
  assert.equal(result.bonus, 200);

  assert.equal((await LoyaltyAccount.findOne({ userId: referrer._id })).points, 200, 'the referrer is paid');
  assert.equal((await LoyaltyAccount.findOne({ userId: referee._id })).points, 200, 'and so is the new member');
  const made = await LoyaltyTransaction.findOne({ userId: referrer._id, reason: 'referral_made' });
  assert.equal(String(made.referredUserId), String(referee._id), 'the ledger records who was referred');

  const refreshed = await User.findById(referee._id);
  assert.equal(String(refreshed.referredBy), String(referrer._id));
  assert.ok(refreshed.referredAt);

  // Replay: the pair-keyed requestId makes a second call a no-op rather than a second payout.
  await assert.rejects(
    () => loyalty.applyReferralCode({ userId: referee._id, code }),
    (error) => error.code === 'ALREADY_REFERRED'
  );
  assert.equal((await LoyaltyAccount.findOne({ userId: referrer._id })).points, 200, 'no double payout');

  await assert.rejects(
    () => loyalty.applyReferralCode({ userId: referrer._id, code }),
    (error) => error.code === 'SELF_REFERRAL'
  );
  const third = await makeCustomer('third@example.com');
  await assert.rejects(
    () => loyalty.applyReferralCode({ userId: third._id, code: 'NOSUCHCODE' }),
    (error) => error.code === 'CODE_NOT_FOUND'
  );
  assert.equal((await LoyaltyAccount.findOne({ userId: referrer._id })).points, 200);
});

maybeTest('a bound reward coupon cannot be spent by another account or anonymously', async () => {
  const { checkCouponValidity } = require('../src/services/pricing');
  const owner = await makeCustomer('coupon-owner@example.com');
  const stranger = await makeCustomer('coupon-stranger@example.com');
  const order = await makeDeliveredOrder(owner, { subtotal: 50000 });
  await loyalty.awardLoyaltyForOrder(order, { log: silentLogger });
  const redemption = await loyalty.redeemPoints({ userId: owner._id, points: 200, orderValue: 5000, requestId: 'coupon-bind-1' }, { log: silentLogger });
  const coupon = await Coupon.findOne({ code: redemption.couponCode });

  assert.equal(checkCouponValidity(coupon, 5000, new Date(), { userId: String(owner._id) }).valid, true);
  assert.equal(checkCouponValidity(coupon, 5000, new Date(), { userId: String(stranger._id) }).valid, false);
  assert.equal(checkCouponValidity(coupon, 5000).valid, false, 'never valid anonymously');
  assert.equal(checkCouponValidity(coupon, 100, new Date(), { userId: String(owner._id) }).valid, false, 'below its own minOrderValue');
});

maybeTest('a staff adjustment is recorded with a reason and cannot force a negative balance', async () => {
  const customer = await makeCustomer('adjust@example.com');
  const order = await makeDeliveredOrder(customer, { subtotal: 10000 });
  await loyalty.awardLoyaltyForOrder(order, { log: silentLogger });
  assert.equal((await LoyaltyAccount.findOne({ userId: customer._id })).points, 100);

  const added = await loyalty.adjustPoints({ userId: customer._id, delta: 50, note: 'Goodwill after a delayed delivery', actorEmail: 'support@vanicollection.test' });
  assert.equal(added.delta, 50);
  assert.equal(added.reason, 'admin_adjustment');
  assert.match(added.note, /support@vanicollection\.test/, 'the ledger records who made the change');
  assert.equal((await LoyaltyAccount.findOne({ userId: customer._id })).points, 150);

  await assert.rejects(
    () => loyalty.adjustPoints({ userId: customer._id, delta: -5000, note: 'Overdraft attempt' }),
    (error) => error.code === 'INSUFFICIENT_POINTS'
  );
  await assert.rejects(() => loyalty.adjustPoints({ userId: customer._id, delta: 10, note: '' }), (error) => error.code === 'REASON_REQUIRED');
  await assert.rejects(() => loyalty.adjustPoints({ userId: customer._id, delta: 0, note: 'Nothing' }), (error) => error.code === 'INVALID_ADJUSTMENT');
  assert.equal((await LoyaltyAccount.findOne({ userId: customer._id })).points, 150, 'the rejected adjustments changed nothing');

  const removed = await loyalty.adjustPoints({ userId: customer._id, delta: -50, note: 'Reversing the goodwill' });
  assert.equal(removed.delta, -50);
  assert.equal((await LoyaltyAccount.findOne({ userId: customer._id })).points, 100);
  assert.equal((await LoyaltyAccount.findOne({ userId: customer._id })).lifetimePoints, 150, 'a reversal does not erase lifetime history');
});

maybeTest('the summary reconciles the cached balance against the ledger', async () => {
  const customer = await makeCustomer('summary@example.com');
  const order = await makeDeliveredOrder(customer, { subtotal: 120000 });
  await loyalty.awardLoyaltyForOrder(order, { log: silentLogger });

  // Corrupt the cache on purpose: the ledger is authoritative and must win.
  await LoyaltyAccount.updateOne({ userId: customer._id }, { $set: { points: 999999, tier: 'platinum' } });

  const summary = await loyalty.getSummary(customer._id);
  assert.equal(summary.points, 1200, 'recomputed from the unexpired batches');
  assert.equal(summary.valueRupees, 1200);
  assert.equal(summary.lifetimePoints, 1200);
  assert.equal(summary.tier.name, 'gold');
  assert.equal(summary.tier.next.name, 'platinum');
  assert.equal(summary.tier.next.pointsNeeded, 3800);
  assert.equal(summary.redemption.canRedeem, true);
  assert.equal(summary.redemption.minPoints, 100);
  assert.equal(summary.earning.rupeesPerPoint, 100);
  assert.equal(summary.earning.expiryMonths, 12);
  assert.ok(summary.referral.code, 'the member has a shareable code');
  assert.equal(summary.totals.earned, 1200);
  assert.equal(summary.totals.redeemed, 0);
  assert.equal(summary.expiringSoon.points, 0, 'nothing lapses within 30 days');

  const transactions = await loyalty.listTransactions(customer._id, { limit: 10 });
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].reason, 'order_earned');
});

maybeTest('expiring-soon warns about points that lapse within 30 days', async () => {
  const customer = await makeCustomer('expiring-soon@example.com');
  const order = await makeDeliveredOrder(customer, { subtotal: 40000 });
  await loyalty.awardLoyaltyForOrder(order, { log: silentLogger });
  await LoyaltyTransaction.updateOne({ userId: customer._id, reason: 'order_earned' }, { $set: { expiresAt: new Date(Date.now() + 10 * 86400000) } });

  const summary = await loyalty.getSummary(customer._id);
  assert.equal(summary.expiringSoon.points, 400);
  assert.ok(summary.expiringSoon.earliest instanceof Date);
  assert.equal(summary.points, 400, 'still spendable until the date passes');
});
