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
  for (const required of ['POST /api/orders', 'POST /api/integrations/erp/webhook', 'POST /api/webhooks/razorpay', 'GET /api/admin/dashboard', 'PATCH /api/inventory/:sku', 'POST /api/payments/razorpay/verify', 'POST /api/returns', 'POST /api/uploads/images', 'GET /api/cart', 'POST /api/cart/items', 'PATCH /api/cart/items/:lineId', 'DELETE /api/cart/items/:lineId', 'POST /api/auth/forgot-password', 'POST /api/auth/reset-password', 'POST /api/orders/:id/cancel', 'GET /api/reels', 'GET /api/reels/:id', 'GET /api/reels/admin', 'POST /api/reels', 'PATCH /api/reels/:id', 'PATCH /api/reels/reorder', 'DELETE /api/reels/:id', 'POST /api/reels/:id/engage', 'GET /api/uploads/signature']) {
    assert.ok(seen.has(required), `missing route ${required}`);
  }
  assert.ok(seen.size >= 60, `expected a broad API surface, saw ${seen.size} routes`);
});

test('reels router registers its literal paths before the :id wildcards', () => {
  const app = buildApp({ config: loadConfig(), logger: silentLogger });
  const reels = app.locals.routes.find((entry) => entry.base === '/api/reels');
  assert.ok(reels, 'the /api/reels router is mounted');
  const order = reels.router.stack.filter((layer) => layer.route).map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);
  // Express matches in registration order: `/admin` and `/reorder` would be swallowed by `/:id`.
  assert.ok(order.indexOf('GET /admin') < order.indexOf('GET /:id'), `GET /admin must precede GET /:id (${order.join(', ')})`);
  assert.ok(order.indexOf('PATCH /reorder') < order.indexOf('PATCH /:id'), `PATCH /reorder must precede PATCH /:id (${order.join(', ')})`);
});

test('reel serialization folds the linked product into a storefront-ready card', () => {
  const { serialize } = require('../src/routes/reels');
  const productId = '6650f0a2c1d2e3f4a5b6c7d8';
  const reel = {
    _id: '6650f0a2c1d2e3f4a5b6c7d9',
    title: 'Bagru handblock drop',
    videoUrl: 'https://res.cloudinary.com/vani/video/upload/v1/reels/a.mp4',
    likes: 12, views: 90, shares: 3, cartAdds: 1,
    status: 'published', position: 0,
    productId: {
      _id: productId,
      name: 'Gulab Bagh Anarkali',
      slug: 'gulab-bagh-anarkali',
      category: 'anarkalis',
      status: 'active',
      images: [{ url: 'https://res.cloudinary.com/vani/image/upload/v1/p/front.jpg' }],
      variants: [
        { sku: 'VC-AN-01-M', size: 'M', price: 2499, mrp: 3499, active: true },
        { sku: 'VC-AN-01-L', size: 'L', price: 2699, mrp: 3499, active: true },
        { sku: 'VC-AN-01-S', size: 'S', price: 2499, mrp: 3499, active: false },
      ],
    },
  };

  const flat = serialize(reel);
  assert.equal(flat.productId, productId);
  assert.equal(flat.product.slug, 'gulab-bagh-anarkali');
  assert.equal(flat.product.image, 'https://res.cloudinary.com/vani/image/upload/v1/p/front.jpg');
  assert.equal(flat.product.price, 2499, 'the card shows the cheapest live variant');
  assert.deepEqual(flat.product.sizes, ['M', 'L'], 'inactive variants are not offered');
  assert.deepEqual(
    flat.product.variants.map((variant) => variant.sku),
    ['VC-AN-01-M', 'VC-AN-01-L'],
    'sellable variants ride along so add-to-bag needs no second round trip'
  );
  assert.ok(!('costPrice' in flat.product.variants[0]), 'cost price never leaves the API');

  const orphan = serialize({ _id: reel._id, title: 'orphan', videoUrl: 'https://x.test/v.mp4', productId });
  assert.equal(orphan.productId, productId, 'a deleted product keeps its id…');
  assert.equal(orphan.product, null, '…but renders no product card');
});

test('Cloudinary upload signatures are minted for staff and verify against the upload form', async () => {
  const express = require('express');
  const cloudinary = require('cloudinary');
  const saved = { ...process.env };
  process.env.CLOUDINARY_CLOUD_NAME = 'vani-test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-api-key';
  process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
  try {
    // Auth is stubbed so this exercises the real handler without a database.
    const auth = (req, _res, next) => { req.user = { id: '507f1f77bcf86cd799439011', roles: ['admin'] }; next(); };
    const app = express();
    app.use('/api/uploads', require('../src/routes/uploads')({ auth }));
    // eslint-disable-next-line no-unused-vars
    app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: { code: error.code, message: error.message } }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const get = async (path) => {
      const response = await fetch(`${base}${path}`);
      return { status: response.status, body: await response.json() };
    };

    const video = await get('/api/uploads/signature?type=video&folder=reels');
    assert.equal(video.status, 200);
    assert.equal(video.body.data.cloudName, 'vani-test-cloud');
    assert.equal(video.body.data.folder, 'vani-collection/reels');
    assert.equal(video.body.data.resourceType, 'video');
    assert.equal(video.body.data.uploadUrl, 'https://api.cloudinary.com/v1_1/vani-test-cloud/video/upload');
    assert.equal(video.body.data.maxBytes, 300 * 1024 * 1024);

    // Cloudinary recomputes the signature from exactly the fields the browser posts; a mismatch 401s.
    const expected = cloudinary.v2.utils.api_sign_request(
      { folder: video.body.data.folder, timestamp: video.body.data.timestamp },
      process.env.CLOUDINARY_API_SECRET
    );
    assert.equal(video.body.data.signature, expected, 'the signature matches the uploaded form fields');

    const image = await get('/api/uploads/signature?type=image&folder=products');
    assert.equal(image.body.data.folder, 'vani-collection/products');
    assert.equal(image.body.data.resourceType, 'image');

    // Hostile query values must fall back to the allowlist, never reach the folder path.
    const hostile = await get('/api/uploads/signature?type=hack&folder=../../../etc');
    assert.equal(hostile.body.data.folder, 'vani-collection/reels');
    assert.equal(hostile.body.data.resourceType, 'video');

    await new Promise((resolve) => server.close(resolve));
  } finally {
    process.env = saved;
  }
});
