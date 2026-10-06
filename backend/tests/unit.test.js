const assert = require('node:assert/strict');
const test = require('node:test');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/vani_unit';
process.env.JWT_ACCESS_SECRET = 'unit-access-secret-value-that-is-long-enough';
process.env.JWT_REFRESH_SECRET = 'unit-refresh-secret-value-that-is-long-enough';

const { loadConfig } = require('../src/config');
const { buildApp } = require('../src/app');
const pricing = require('../src/services/pricing');
const { serviceability } = require('../src/services/shipping');
const { signHmac, verifyHmac } = require('../src/lib/signature');
const { issueTokens } = require('../src/services/tokens');

const silentLogger = { info() {}, warn() {}, error() {}, debug() {}, child() { return this; } };

test('config validation rejects missing secrets', () => {
  const saved = { ...process.env };
  delete process.env.JWT_ACCESS_SECRET;
  assert.throws(() => loadConfig(), /Invalid environment configuration/);
  process.env = saved;
  assert.equal(typeof loadConfig().MONGO_URI, 'string');
});

test('seller GSTIN, PAN and state code reject malformed non-empty values at boot', () => {
  const saved = { ...process.env };
  // Blank values from a copied .env.example are intentionally treated as unset.
  process.env.SELLER_GSTIN = '';
  process.env.SELLER_PAN = '';
  process.env.SELLER_STATE_CODE = '';
  assert.equal(loadConfig().seller.gstin, undefined);

  process.env.SELLER_GSTIN = 'not-a-gstin';
  assert.throws(() => loadConfig(), /SELLER_GSTIN must be a valid 15-character GSTIN/);
  process.env.SELLER_GSTIN = '';
  process.env.SELLER_PAN = '123';
  assert.throws(() => loadConfig(), /SELLER_PAN must be a valid 10-character PAN/);
  process.env.SELLER_PAN = '';
  process.env.SELLER_STATE_CODE = 'Madhya Pradesh';
  assert.throws(() => loadConfig(), /SELLER_STATE_CODE must be a two-digit state code/);

  process.env = saved;
  assert.equal(typeof loadConfig().MONGO_URI, 'string');
});

test('coupon engine enforces windows, limits and caps', () => {
  const now = new Date('2026-10-05T00:00:00.000Z');
  const coupon = { code: 'FEST10', type: 'percentage', value: 10, maxDiscount: 500, minOrderValue: 1000, active: true, usedCount: 0 };
  assert.equal(pricing.computeDiscount(coupon, 4000), 400);
  assert.equal(pricing.computeDiscount(coupon, 10000), 500, 'maxDiscount must cap percentage discounts');
  assert.equal(pricing.computeDiscount({ type: 'fixed', value: 250 }, 200), 200, 'discount cannot exceed subtotal');
  assert.equal(pricing.checkCouponValidity(coupon, 500, now).reason, 'Minimum order value is ₹1000');
  assert.equal(pricing.checkCouponValidity({ ...coupon, endsAt: '2026-09-01' }, 4000, now).reason, 'Coupon has expired');
  assert.equal(pricing.checkCouponValidity({ ...coupon, startsAt: '2026-11-01' }, 4000, now).reason, 'Coupon is not active yet');
  assert.equal(pricing.checkCouponValidity({ ...coupon, usageLimit: 5, usedCount: 5 }, 4000, now).reason, 'Coupon usage limit reached');
  assert.equal(pricing.checkCouponValidity(null, 4000, now).valid, false);
  assert.equal(pricing.checkCouponValidity(coupon, 4000, now).valid, true);
});

test('totals apply free shipping threshold and GST inclusive tax', () => {
  const small = pricing.computeTotals({ subtotal: 1200, gstRate: 5 });
  assert.equal(small.shipping, 99);
  assert.equal(small.total, 1299);
  assert.equal(Math.round(small.tax * 100) / 100, 57.14);
  const large = pricing.computeTotals({ subtotal: 2400, discount: 400, gstRate: 5 });
  assert.equal(large.shipping, 0, 'orders above ₹1999 ship free');
  assert.equal(large.total, 2000);
});

test('pincode serviceability validates Indian pincodes', () => {
  assert.equal(serviceability('45601').serviceable, false);
  assert.equal(serviceability('056010').serviceable, false);
  const ujjain = serviceability('456010');
  assert.equal(ujjain.serviceable, true);
  assert.equal(ujjain.etaDays, 4, 'central India pincodes deliver in 4 days');
  assert.equal(ujjain.shippingFee, 79);
  assert.equal(serviceability('400001').zone, 'metro');
  assert.equal(serviceability('400001').cod, true);
  assert.equal(serviceability('800001').cod, false);
});

test('hmac helpers are constant-time and reject tampering', () => {
  const signature = signHmac('secret', Buffer.from('{"type":"stock.update"}'));
  assert.equal(verifyHmac('secret', Buffer.from('{"type":"stock.update"}'), signature), true);
  assert.equal(verifyHmac('secret', Buffer.from('{"type":"stock.update","x":1}'), signature), false);
  assert.equal(verifyHmac('other-secret', Buffer.from('{"type":"stock.update"}'), signature), false);
  assert.equal(verifyHmac('secret', Buffer.from('a'), ''), false);
});

test('issued tokens verify with the configured secrets and carry roles', () => {
  const config = loadConfig();
  const tokens = issueTokens({ id: 'user-1', roles: ['admin'] }, config);
  const payload = jwt.verify(tokens.accessToken, config.JWT_ACCESS_SECRET, { issuer: 'vani-api', audience: 'vani-web' });
  assert.equal(payload.sub, 'user-1');
  assert.deepEqual(payload.roles, ['admin']);
  assert.equal(jwt.verify(tokens.refreshToken, config.JWT_REFRESH_SECRET, { issuer: 'vani-api', audience: 'vani-web' }).sub, 'user-1');
  assert.throws(() => jwt.verify(tokens.refreshToken, config.JWT_ACCESS_SECRET));
});

test('http layer serves health, structured 404s and validation errors without a database', async () => {
  const server = buildApp({ config: loadConfig(), logger: silentLogger }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, init) => { const res = await fetch(base + path, init); return { status: res.status, body: await res.json().catch(() => null), headers: res.headers }; };
  try {
    const health = await call('/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.status, 'ok');
    assert.ok(health.headers.get('x-request-id'));
    assert.equal((await call('/health/ready')).status, 503);
    assert.equal((await call('/api/nope')).body.error.code, 'ROUTE_NOT_FOUND');
    const invalid = await call('/api/coupons/validate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'AB' }) });
    assert.equal(invalid.status, 422);
    assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
    const unauthenticated = await call('/api/admin/dashboard');
    assert.equal(unauthenticated.status, 401);
    assert.equal(unauthenticated.body.error.code, 'AUTH_REQUIRED');
    const securityHeaders = (await call('/health')).headers;
    assert.ok(securityHeaders.get('content-security-policy'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('route surface is complete and free of duplicate registrations', () => {
  const app = buildApp({ config: loadConfig(), logger: silentLogger });
  const seen = new Set();
  const paths = [];
  for (const { base, router } of app.locals.routes) {
    for (const layer of router.stack) {
      if (!layer.route) continue;
      const path = `${base}${layer.route.path === '/' ? '' : layer.route.path}`;
      paths.push(path);
      for (const method of Object.keys(layer.route.methods)) {
        const key = `${method.toUpperCase()} ${path}`;
        assert.ok(!seen.has(key), `duplicate route ${key}`);
        seen.add(key);
      }
    }
  }
  for (const required of ['POST /api/orders', 'POST /api/integrations/erp/webhook', 'POST /api/webhooks/razorpay', 'GET /api/admin/dashboard', 'PATCH /api/inventory/:sku', 'POST /api/payments/razorpay/verify', 'POST /api/returns', 'POST /api/uploads/images', 'GET /api/cart', 'POST /api/cart/items', 'PATCH /api/cart/items/:lineId', 'DELETE /api/cart/items/:lineId', 'POST /api/auth/forgot-password', 'POST /api/auth/reset-password', 'POST /api/orders/:id/cancel',
    // The screens the admin console drives — a silently unmounted router would leave a blank page
    // rather than a failing request, so the surface is asserted explicitly.
    'GET /api/integrations/events', 'POST /api/integrations/events/:id/retry', 'GET /api/admin/audit-logs', 'GET /api/admin/reports/sales', 'GET /api/admin/reports/gst', 'GET /api/admin/staff', 'POST /api/admin/staff', 'GET /api/refunds/pending', 'POST /api/refunds/:orderId', 'GET /api/inventory', 'GET /api/returns', 'PATCH /api/returns/:id', 'GET /api/coupons', 'POST /api/coupons', 'PATCH /api/coupons/:id', 'DELETE /api/coupons/:id', 'GET /api/reviews', 'PATCH /api/reviews/:id',
    // Phase 5–6 contracts — reward routes and both downloadable documents.
    'GET /api/loyalty/me', 'GET /api/loyalty/transactions', 'POST /api/loyalty/redeem', 'POST /api/loyalty/referral', 'GET /api/loyalty/referral', 'GET /api/admin/loyalty', 'GET /api/admin/loyalty/:userId', 'POST /api/admin/loyalty/:userId/adjust', 'GET /api/orders/:id/invoice.pdf', 'GET /api/admin/orders/:id/packing-slip.pdf']) {
    assert.ok(seen.has(required), `missing route ${required}`);
  }
  assert.ok(seen.size >= 80, `expected a broad API surface, saw ${seen.size} routes`);
});
