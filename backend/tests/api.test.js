const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/vani_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-value-that-is-long-enough';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-value-that-is-long-enough';
process.env.ERP_WEBHOOK_SECRET = 'test-erp-webhook-secret';
process.env.ERP_ENABLED = 'false';

const { loadConfig } = require('../src/config');
const { buildApp } = require('../src/app');
const { processPendingEvents } = require('../src/workers/integration-worker');
const User = require('../models/User');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Order = require('../models/Order');
const IntegrationEvent = require('../models/IntegrationEvent');

let replset;
let server;
let baseUrl;
let dbAvailable = false;
let skipReason = '';
const config = loadConfig();

// Integration coverage needs a MongoDB replica set (transactions). Set TEST_MONGO_URI to use an
// existing cluster, otherwise an in-memory replica set is started. When neither is reachable the
// suite skips instead of failing, so `npm test` stays green on machines without MongoDB.
const maybeTest = (name, fn) => test(name, (t) => (dbAvailable ? fn(t) : t.skip(skipReason || 'MongoDB unavailable')));

// Routes answer with `res.json({ data: <mongoose doc> })`, and a document's `toJSON` ships `_id` —
// the `id` virtual is not part of it. Always read ids off a response body as `_id`; reading `.id`
// yields `undefined`, which interpolates into a URL as the string "undefined" and surfaces far away
// as a CastError 500. (`doc.id` on a document fetched directly from a model is still fine.)
const api = async (path, { method = 'GET', body, token, headers = {} } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null, setCookie: response.headers.getSetCookie?.() || [] };
};
/** Binary-response helper for PDF endpoints; the JSON helper above intentionally JSON-parses. */
const apiRaw = async (path, { method = 'GET', token, headers = {} } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
  });
  return {
    status: response.status,
    headers: response.headers,
    body: Buffer.from(await response.arrayBuffer()),
  };
};
const accessTokenFrom = (setCookie) => setCookie.find((c) => c.startsWith('accessToken='))?.split(';')[0].split('=')[1];
const signup = async (email) => {
  const res = await api('/api/auth/register', { method: 'POST', body: { email, password: 'StrongPass123', firstName: 'Test', phone: '9876543210' } });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return accessTokenFrom(res.setCookie);
};

test.before(async () => {
  try {
    const uri = process.env.TEST_MONGO_URI || (replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } })).getUri('vani_test');
    await mongoose.connect(uri);
    dbAvailable = true;
  } catch (error) {
    skipReason = `MongoDB unavailable (${error.message.split('\n')[0]})`;
    await mongoose.connection.close().catch(() => {});
    return;
  }
  server = buildApp({ config, logger: { info() {}, warn() {}, error() {}, debug() {}, child() { return this; } } }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
  if (replset) await replset.stop();
});

maybeTest('health endpoints report readiness', async () => {
  const health = await api('/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.db, 'connected');
  assert.equal((await api('/health/ready')).status, 200);
});

maybeTest('unknown routes return a structured 404', async () => {
  const res = await api('/api/does-not-exist');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'ROUTE_NOT_FOUND');
});

maybeTest('registration and login issue working sessions', async () => {
  const token = await signup('buyer@example.com');
  assert.ok(token);
  const me = await api('/api/auth/me', { token });
  assert.equal(me.status, 200);
  assert.equal(me.body.data.email, 'buyer@example.com');
  const login = await api('/api/auth/login', { method: 'POST', body: { email: 'buyer@example.com', password: 'StrongPass123' } });
  assert.equal(login.status, 200);
  const bad = await api('/api/auth/login', { method: 'POST', body: { email: 'buyer@example.com', password: 'WrongPass123' } });
  assert.equal(bad.status, 401);
});

maybeTest('catalogue, checkout, stock reservation and idempotent ERP sync work end to end', async () => {
  const admin = await User.create({ email: 'admin@example.com', firstName: 'Admin', roles: ['admin', 'super_admin'], passwordHash: await User.hashPassword('AdminPass12345') });
  const product = await Product.create({ name: 'Gulab Bagh Anarkali', slug: 'gulab-bagh-anarkali', category: 'anarkalis', gstRate: 5, status: 'active', images: [{ url: 'https://example.com/a.jpg' }], variants: [{ sku: 'VC-AN-01-M', size: 'M', mrp: 4999, price: 3999 }] });
  await Inventory.create({ sku: 'VC-AN-01-M', onHand: 5, reserved: 0 });

  const list = await api('/api/products');
  assert.equal(list.status, 200);
  assert.equal(list.body.data.length, 1);
  assert.equal((await api('/api/products/gulab-bagh-anarkali')).status, 200);
  assert.equal((await api('/api/products/missing-product')).status, 404);

  const token = await signup('shopper@example.com');
  const address = { fullName: 'Test Shopper', phone: '9876543210', email: 'shopper@example.com', line1: '12 Freeganj Road', city: 'Ujjain', state: 'Madhya Pradesh', pincode: '456010' };
  const order = await api('/api/orders', { method: 'POST', token, body: { items: [{ productId: product.id, sku: 'VC-AN-01-M', quantity: 2 }], shippingAddress: address, paymentMethod: 'cod' } });
  assert.equal(order.status, 201, JSON.stringify(order.body));
  assert.equal(order.body.data.amounts.total, 7998);
  assert.ok(order.body.data.orderNumber.startsWith('VC'));

  const reserved = await Inventory.findOne({ sku: 'VC-AN-01-M' });
  assert.equal(reserved.reserved, 2);
  assert.equal(reserved.onHand - reserved.reserved, 3);

  const oversell = await api('/api/orders', { method: 'POST', token, body: { items: [{ productId: product.id, sku: 'VC-AN-01-M', quantity: 9 }], shippingAddress: address, paymentMethod: 'cod' } });
  assert.equal(oversell.status, 409);
  assert.equal(oversell.body.error.code, 'OUT_OF_STOCK');

  const mine = await api('/api/orders/mine', { token });
  assert.equal(mine.body.data.length, 1);

  const adminLogin = await api('/api/auth/login', { method: 'POST', body: { email: 'admin@example.com', password: 'AdminPass12345' } });
  const adminToken = accessTokenFrom(adminLogin.setCookie);
  const statusUpdate = await api(`/api/orders/${order.body.data._id}/status`, { method: 'PATCH', token: adminToken, body: { status: 'packed', note: 'Packed at Ujjain studio' } });
  assert.equal(statusUpdate.status, 200);
  assert.equal(statusUpdate.body.data.status, 'packed');

  const adjust = await api('/api/inventory/VC-AN-01-M', { method: 'PATCH', token: adminToken, body: { adjustment: 4, reason: 'ERP stock receipt' } });
  assert.equal(adjust.body.data.onHand, 9);

  const dashboard = await api('/api/admin/dashboard', { token: adminToken });
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.data.activeProducts, 1);
  assert.ok(dashboard.body.data.openOrders >= 1);

  // A GST return reports tax on *captured* orders only, so the endpoint filters on
  // `payment.status: 'paid'` — correctly, since including unpaid orders would overstate the
  // liability to the exchequer. This order was placed COD, whose payment stays `pending` until it is
  // collected at the door, so mark it captured first (there is no API route for it; online orders
  // reach this state via the Razorpay verification webhook).
  await Order.updateOne({ _id: order.body.data._id }, { $set: { 'payment.status': 'paid', 'payment.paidAt': new Date() } });
  const report = await api('/api/admin/reports/gst', { token: adminToken });
  assert.equal(report.status, 200);
  assert.ok(report.body.data.totalTax > 0);
  assert.equal(report.body.data.invoices, 1);

  const audit = await api('/api/admin/audit-logs', { token: adminToken });
  assert.ok(audit.body.data.some((entry) => entry.action === 'order.status'));

  const forbidden = await api('/api/admin/dashboard', { token });
  assert.equal(forbidden.status, 403);
  assert.ok(admin.email);
});

maybeTest('inventory is not silently oversold and coupon engine applies configured coupons', async () => {
  const Coupon = require('../models/Coupon');
  await Coupon.create({ code: 'FEST10', type: 'percentage', value: 10, maxDiscount: 500, minOrderValue: 1000 });
  const valid = await api('/api/coupons/validate', { method: 'POST', body: { code: 'fest10', subtotal: 4000 } });
  assert.equal(valid.status, 200);
  assert.equal(valid.body.data.discount, 400);
  const invalid = await api('/api/coupons/validate', { method: 'POST', body: { code: 'NOPE', subtotal: 4000 } });
  assert.equal(invalid.status, 422);
});

maybeTest('shipping serviceability and payment configuration guards respond correctly', async () => {
  const ok = await api('/api/shipping/serviceability?pincode=456010');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.serviceable, true);
  const bad = await api('/api/shipping/serviceability?pincode=12');
  assert.equal(bad.status, 422);
  const token = await signup('payments@example.com');
  const rates = await api('/api/shipping/rates', { method: 'POST', body: { pincode: '456010', subtotal: 1500 } });
  assert.equal(rates.body.data.fee, 79);
  const razorpay = await api('/api/payments/razorpay/verify', { method: 'POST', token, body: { orderId: new mongoose.Types.ObjectId().toString(), razorpay_order_id: 'x', razorpay_payment_id: 'y', razorpay_signature: 'z' } });
  assert.equal(razorpay.status, 503);
});

maybeTest('ERP webhook rejects bad signatures and processes valid stock events idempotently', async () => {
  const payload = JSON.stringify({ type: 'stock.update', items: [{ sku: 'VC-AN-01-M', quantity: 42 }] });
  const rejected = await api('/api/integrations/erp/webhook', { method: 'POST', body: JSON.parse(payload), headers: { 'x-erp-signature': 'deadbeef' } });
  assert.equal(rejected.status, 401);

  const signature = crypto.createHmac('sha256', process.env.ERP_WEBHOOK_SECRET).update(Buffer.from(payload)).digest('hex');
  const accepted = await api('/api/integrations/erp/webhook', { method: 'POST', body: JSON.parse(payload), headers: { 'x-erp-signature': signature, 'x-event-id': 'evt-1' } });
  assert.equal(accepted.status, 202);
  const duplicate = await api('/api/integrations/erp/webhook', { method: 'POST', body: JSON.parse(payload), headers: { 'x-erp-signature': signature, 'x-event-id': 'evt-1' } });
  assert.equal(duplicate.status, 202);
  assert.equal(await IntegrationEvent.countDocuments({ idempotencyKey: 'evt-1' }), 1);

  const results = await processPendingEvents({ log: { warn() {}, error() {} } });
  assert.equal(results.filter((r) => r.status === 'succeeded').length, 1);
  assert.equal((await Inventory.findOne({ sku: 'VC-AN-01-M' })).onHand, 42);

  await IntegrationEvent.create({ provider: 'rishabh_erp', direction: 'inbound', eventType: 'price.update', idempotencyKey: 'evt-price', payload: { type: 'price.update', items: [{ sku: 'VC-AN-01-M', price: 3499, mrp: 4999 }] } });
  await processPendingEvents({ log: { warn() {}, error() {} } });
  const product = await Product.findOne({ slug: 'gulab-bagh-anarkali' });
  assert.equal(product.variants[0].price, 3499);

  await IntegrationEvent.create({ provider: 'rishabh_erp', direction: 'inbound', eventType: 'unknown.event', idempotencyKey: 'evt-bad', payload: { type: 'unsupported.event' } });
  await processPendingEvents({ log: { warn() {}, error() {} } });
  assert.equal((await IntegrationEvent.findOne({ idempotencyKey: 'evt-bad' })).status, 'failed');
});

maybeTest('reviews require moderation before they are public', async () => {
  const product = await Product.findOne({ slug: 'gulab-bagh-anarkali' });
  const token = await signup('reviewer@example.com');
  const created = await api('/api/reviews', { method: 'POST', token, body: { productId: product.id, rating: 5, body: 'Beautiful mul cotton fabric and quick delivery.' } });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.status, 'pending');
  assert.equal((await api(`/api/reviews/product/${product.id}`)).body.data.length, 0);

  const admin = await User.findOne({ email: 'admin@example.com' });
  const adminLogin = await api('/api/auth/login', { method: 'POST', body: { email: admin.email, password: 'AdminPass12345' } });
  const adminToken = accessTokenFrom(adminLogin.setCookie);
  const published = await api(`/api/reviews/${created.body.data._id}`, { method: 'PATCH', token: adminToken, body: { status: 'published' } });
  assert.equal(published.status, 200);
  assert.equal((await api(`/api/reviews/product/${product.id}`)).body.data.length, 1);
  const summary = await api(`/api/reviews/summary/${product.id}`);
  assert.equal(summary.body.data.average, 5);
});

maybeTest('content CMS and returns workflow are enforced by role', async () => {
  const admin = await User.findOne({ email: 'admin@example.com' });
  const adminLogin = await api('/api/auth/login', { method: 'POST', body: { email: admin.email, password: 'AdminPass12345' } });
  const adminToken = accessTokenFrom(adminLogin.setCookie);

  const created = await api('/api/content', { method: 'POST', token: adminToken, body: { key: 'home-hero', kind: 'section', title: 'Handcrafted in Ujjain' } });
  assert.equal(created.status, 201);
  assert.equal((await api('/api/content/home-hero')).body.data.title, 'Handcrafted in Ujjain');

  const customerToken = await signup('returns@example.com');
  const order = await api('/api/orders', { method: 'POST', token: customerToken, body: { items: [{ productId: (await Product.findOne()).id, sku: 'VC-AN-01-M', quantity: 1 }], shippingAddress: { fullName: 'Return User', phone: '9876543210', email: 'returns@example.com', line1: '9 Bhoj Marg', city: 'Ujjain', state: 'Madhya Pradesh', pincode: '456010' }, paymentMethod: 'cod' } });
  const orderId = order.body.data._id;
  const early = await api('/api/returns', { method: 'POST', token: customerToken, body: { orderId, items: [{ sku: 'VC-AN-01-M', quantity: 1, reason: 'Size issue' }] } });
  assert.equal(early.status, 409);

  await api(`/api/orders/${orderId}/status`, { method: 'PATCH', token: adminToken, body: { status: 'shipped' } });
  await api(`/api/orders/${orderId}/status`, { method: 'PATCH', token: adminToken, body: { status: 'delivered' } });
  const request = await api('/api/returns', { method: 'POST', token: customerToken, body: { orderId, items: [{ sku: 'VC-AN-01-M', quantity: 1, reason: 'Size issue' }] } });
  assert.equal(request.status, 201);
  assert.ok(request.body.data.refundAmount > 0);
  const approved = await api(`/api/returns/${request.body.data._id}`, { method: 'PATCH', token: adminToken, body: { status: 'approved', adminNote: 'Pickup scheduled' } });
  assert.equal(approved.body.data.status, 'approved');
  // There is no collection-level PATCH route at all (`/api/returns` only serves POST and GET), so
  // this 404s identically for a customer and for an admin — it is not an authorization boundary.
  // The real one is `requireRoles` on `PATCH /api/returns/:id`, exercised by `early` above: a
  // customer cannot approve their own return. Asserting 405 here would test Express's fallthrough
  // rather than the app.
  const forbidden = await api('/api/returns', { method: 'PATCH', token: customerToken, body: {} });
  assert.equal(forbidden.status, 404);
  const adminOnCollection = await api('/api/returns', { method: 'PATCH', token: adminToken, body: {} });
  assert.equal(adminOnCollection.status, 404, 'the collection route does not exist for anyone');

  // The boundary that does matter: a customer cannot drive the ladder on their own return.
  const customerApprove = await api(`/api/returns/${request.body.data._id}`, { method: 'PATCH', token: customerToken, body: { status: 'completed' } });
  assert.equal(customerApprove.status, 403, 'only staff can move a return through the ladder');
});

maybeTest('cart persists per browser, rejects oversell and merges into the customer cart on login', async () => {
  const product = await Product.findOne({ slug: 'gulab-bagh-anarkali' });
  const inventory = await Inventory.findOne({ sku: 'VC-AN-01-M' });
  await Inventory.updateOne({ _id: inventory._id }, { $set: { onHand: 4, reserved: 0 } });

  const guestHeaders = { 'x-cart-token': 'guest-token-test-1234' };
  const added = await api('/api/cart/items', { method: 'POST', body: { sku: 'VC-AN-01-M', quantity: 2 }, headers: guestHeaders });
  assert.equal(added.status, 200, JSON.stringify(added.body));
  assert.equal(added.body.data.count, 2);
  assert.equal(added.body.data.subtotal, product.variants[0].price * 2);
  assert.equal(added.body.data.lines[0].inStock, true);
  assert.equal(added.body.meta.persisted, false);

  const tooMany = await api('/api/cart/items', { method: 'POST', body: { sku: 'VC-AN-01-M', quantity: 9 }, headers: guestHeaders });
  assert.equal(tooMany.status, 409);
  assert.equal(tooMany.body.error.code, 'OUT_OF_STOCK');

  const fetched = await api('/api/cart', { headers: guestHeaders });
  assert.equal(fetched.body.data.count, 2, 'guest cart is restored from the token alone');
  const lineId = fetched.body.data.lines[0].lineId;
  const patched = await api(`/api/cart/items/${lineId}`, { method: 'PATCH', body: { quantity: 1 }, headers: guestHeaders });
  assert.equal(patched.body.data.count, 1);
  const removed = await api(`/api/cart/items/${lineId}`, { method: 'DELETE', headers: guestHeaders });
  assert.equal(removed.body.data.count, 0);

  const unknownSku = await api('/api/cart/items', { method: 'POST', body: { sku: 'VC-NOPE-M', quantity: 1 }, headers: guestHeaders });
  assert.equal(unknownSku.status, 404);

  // guest cart -> customer cart merge on login
  await api('/api/cart/items', { method: 'POST', body: { sku: 'VC-AN-01-M', quantity: 3 }, headers: guestHeaders });
  const token = await signup('cart-merge@example.com');
  const merged = await api('/api/cart', { token, headers: guestHeaders });
  assert.equal(merged.body.meta.persisted, true);
  assert.equal(merged.body.data.count, 3, 'guest lines move into the signed-in cart');
  const afterMerge = await api('/api/cart', { headers: guestHeaders });
  assert.equal(afterMerge.body.data.count, 0, 'guest cart is emptied after the merge');
  const cleared = await api('/api/cart', { method: 'DELETE', token, headers: guestHeaders });
  assert.equal(cleared.body.data.count, 0);
});

maybeTest('password reset issues a single-use token and revokes old sessions', async () => {
  await signup('reset-flow@example.com');
  const requested = await api('/api/auth/forgot-password', { method: 'POST', body: { email: 'reset-flow@example.com' } });
  assert.equal(requested.status, 202);
  const resetUrl = requested.body.meta.resetUrl;
  assert.ok(resetUrl && resetUrl.includes('token='), 'non-production responses expose the reset link for testing');
  const token = new URL(resetUrl).searchParams.get('token');

  const unknown = await api('/api/auth/forgot-password', { method: 'POST', body: { email: 'nobody@example.com' } });
  assert.equal(unknown.status, 202, 'unknown emails do not leak account existence');

  const weak = await api('/api/auth/reset-password', { method: 'POST', body: { token, password: 'short' } });
  assert.equal(weak.status, 422);
  const wrongToken = await api('/api/auth/reset-password', { method: 'POST', body: { token: 'x'.repeat(40), password: 'BrandNewPass123' } });
  assert.equal(wrongToken.status, 400);
  assert.equal(wrongToken.body.error.code, 'INVALID_RESET_TOKEN');

  const reset = await api('/api/auth/reset-password', { method: 'POST', body: { token, password: 'BrandNewPass123' } });
  assert.equal(reset.status, 204);
  const reuse = await api('/api/auth/reset-password', { method: 'POST', body: { token, password: 'AnotherPass123' } });
  assert.equal(reuse.status, 400, 'reset tokens are single use');

  const oldPassword = await api('/api/auth/login', { method: 'POST', body: { email: 'reset-flow@example.com', password: 'StrongPass123' } });
  assert.equal(oldPassword.status, 401);
  const newPassword = await api('/api/auth/login', { method: 'POST', body: { email: 'reset-flow@example.com', password: 'BrandNewPass123' } });
  assert.equal(newPassword.status, 200);
});

maybeTest('customers can cancel their own pending order and reserved stock is released', async () => {
  const product = await Product.findOne({ slug: 'gulab-bagh-anarkali' });
  await Inventory.updateOne({ sku: 'VC-AN-01-M' }, { $set: { onHand: 5, reserved: 0 } });
  const token = await signup('cancel-order@example.com');
  const address = { fullName: 'Cancel Tester', phone: '9876543210', email: 'cancel-order@example.com', line1: '5 Freeganj Road', city: 'Ujjain', state: 'Madhya Pradesh', pincode: '456010' };
  const order = await api('/api/orders', { method: 'POST', token, body: { items: [{ productId: product.id, sku: 'VC-AN-01-M', quantity: 2 }], shippingAddress: address, paymentMethod: 'cod' } });
  assert.equal(order.status, 201);
  assert.equal((await Inventory.findOne({ sku: 'VC-AN-01-M' })).reserved, 2);

  const cancelled = await api(`/api/orders/${order.body.data._id}/cancel`, { method: 'POST', token, body: { reason: 'Ordered the wrong size' } });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.data.status, 'cancelled');
  assert.equal((await Inventory.findOne({ sku: 'VC-AN-01-M' })).reserved, 0, 'cancelling releases the reservation');

  const again = await api(`/api/orders/${order.body.data._id}/cancel`, { method: 'POST', token, body: {} });
  assert.equal(again.status, 409);

  const stranger = await signup('stranger@example.com');
  const notMine = await api(`/api/orders/${order.body.data._id}/cancel`, { method: 'POST', token: stranger, body: {} });
  assert.equal(notMine.status, 404);
});

maybeTest('wishlist round-trips ids as strings and never duplicates on repeat or concurrent saves', async () => {
  const { Wishlist } = require('../models/Engagement');

  const [alpha, beta] = await Promise.all([
    Product.create({ name: 'Wishlist Alpha Saree', slug: 'wishlist-alpha-saree', category: 'festive', gstRate: 5, status: 'active', images: [{ url: 'https://example.com/alpha.jpg' }], variants: [{ sku: 'VC-WL-A-S', size: 'S', mrp: 2999, price: 2499 }, { sku: 'VC-WL-A-M', size: 'M', mrp: 2999, price: 2699 }] }),
    Product.create({ name: 'Wishlist Beta Kurti', slug: 'wishlist-beta-kurti', category: 'mul-cotton', gstRate: 12, status: 'active', images: [{ url: 'https://example.com/beta.jpg' }], variants: [{ sku: 'VC-WL-B-M', size: 'M', mrp: 1999, price: 1599 }] }),
  ]);
  const token = await signup('wishlist@example.com');

  // ---- the shape contract -------------------------------------------------
  // GET populates items.productId so the account screen gets names and images in one round trip, but
  // populate replaces the ObjectId with the whole Product document. The storefront compares against
  // string ids (`wishlist.includes(product.id)`), so the API must hand back a string and move the
  // document to `product`. Returning objects made a signed-in shopper's saved wishlist never match.
  await api('/api/customers/wishlist', { method: 'PUT', token, body: { productId: alpha.id } });
  const first = await api('/api/customers/wishlist', { token });
  assert.equal(first.status, 200);
  assert.equal(first.body.data.length, 1);
  assert.equal(typeof first.body.data[0].productId, 'string', 'productId must serialise as a string id');
  assert.equal(first.body.data[0].productId, String(alpha._id));
  assert.ok(first.body.data[0].product, 'the populated document still travels in `product`');
  assert.equal(first.body.data[0].product.name, 'Wishlist Alpha Saree');

  // ---- idempotence --------------------------------------------------------
  // The old handler used $addToSet on the subdocument, which compares every field including the
  // `addedAt` default Mongoose applies while casting — so it appended a duplicate row on every call.
  await api('/api/customers/wishlist', { method: 'PUT', token, body: { productId: alpha.id } });
  await api('/api/customers/wishlist', { method: 'PUT', token, body: { productId: alpha.id } });
  const repeated = await api('/api/customers/wishlist', { token });
  assert.equal(repeated.body.data.length, 1, 'saving the same product again must not duplicate it');

  // A different size of the same product is still the same wishlisted product.
  await api('/api/customers/wishlist', { method: 'PUT', token, body: { productId: alpha.id, sku: 'VC-WL-A-M' } });
  const otherSku = await api('/api/customers/wishlist', { token });
  assert.equal(otherSku.body.data.length, 1, 'a differing sku must not create a second row for one product');

  // ---- bulk merge on sign-in ---------------------------------------------
  // Duplicated inside the request (alpha twice) and against what is already saved.
  const merged = await api('/api/customers/wishlist', { method: 'PUT', token, body: { items: [{ productId: alpha.id }, { productId: alpha.id }, { productId: beta.id }] } });
  assert.equal(merged.status, 200);
  assert.equal(merged.body.data.length, 2, 'the merge de-duplicates within the request and against existing rows');
  assert.equal(merged.body.meta.added, 1, 'only beta was new');
  assert.equal(merged.body.meta.alreadySaved, 2);
  assert.deepEqual(merged.body.data.map((row) => row.productId).sort(), [String(alpha._id), String(beta._id)].sort());

  // ---- concurrency --------------------------------------------------------
  // The sign-in merge used to fire one PUT per item in parallel. Each guarded $push is evaluated
  // against the committed document and MongoDB serialises writes to one doc, so this stays idempotent.
  await Wishlist.deleteOne({ userId: (await User.findOne({ email: 'wishlist@example.com' })).id });
  await Promise.all([
    api('/api/customers/wishlist', { method: 'PUT', token, body: { productId: alpha.id } }),
    api('/api/customers/wishlist', { method: 'PUT', token, body: { productId: alpha.id } }),
    api('/api/customers/wishlist', { method: 'PUT', token, body: { items: [{ productId: alpha.id }, { productId: beta.id }] } }),
  ]);
  const concurrent = await api('/api/customers/wishlist', { token });
  assert.equal(concurrent.body.data.length, 2, 'concurrent merges must not duplicate rows');

  // ---- removal ------------------------------------------------------------
  const removed = await api(`/api/customers/wishlist/${alpha.id}`, { method: 'DELETE', token });
  assert.equal(removed.status, 200);
  assert.equal(removed.body.data.length, 1);
  assert.equal(removed.body.data[0].productId, String(beta._id));

  // Removing a product that was saved in two sizes clears it completely rather than leaving a stray row.
  await api('/api/customers/wishlist', { method: 'PUT', token, body: { productId: alpha.id, sku: 'VC-WL-A-S' } });
  await api('/api/customers/wishlist', { method: 'PUT', token, body: { items: [{ productId: alpha.id }] } });
  const beforePull = await api('/api/customers/wishlist', { token });
  assert.equal(beforePull.body.data.length, 2);
  await api(`/api/customers/wishlist/${alpha.id}`, { method: 'DELETE', token });
  const afterPull = await api('/api/customers/wishlist', { token });
  assert.equal(afterPull.body.data.length, 1, '$pull matches on productId regardless of sku');

  // ---- validation ---------------------------------------------------------
  // A demo id ("vani-1") or any non-ObjectId used to reach the cast layer and 500; it is a clean 422.
  const badId = await api('/api/customers/wishlist', { method: 'PUT', token, body: { productId: 'vani-1' } });
  assert.equal(badId.status, 422);
  assert.equal(badId.body.error.code, 'VALIDATION_ERROR');
  const empty = await api('/api/customers/wishlist', { method: 'PUT', token, body: {} });
  assert.equal(empty.status, 422);
  const badDelete = await api('/api/customers/wishlist/not-an-id', { method: 'DELETE', token });
  assert.equal(badDelete.status, 422);

  // ---- isolation ----------------------------------------------------------
  const stranger = await signup('wishlist-stranger@example.com');
  const theirs = await api('/api/customers/wishlist', { token: stranger });
  assert.equal(theirs.body.data.length, 0, 'a wishlist is per customer');
  const anonymous = await api('/api/customers/wishlist');
  assert.equal(anonymous.status, 401);
});

maybeTest('GST invoices are owner/staff scoped and packing slips are staff-only PDFs', async () => {
  const suffix = Date.now();
  const ownerEmail = `invoice-owner-${suffix}@example.com`;
  const ownerToken = await signup(ownerEmail);
  const owner = await User.findOne({ email: ownerEmail });
  const product = await Product.create({
    name: 'Invoice Test Saree',
    slug: `invoice-test-saree-${suffix}`,
    category: 'festive',
    hsnCode: '5208',
    gstRate: 5,
    status: 'active',
    images: [{ url: 'https://example.com/invoice.jpg' }],
    variants: [{ sku: `VC-INV-${suffix}`, size: 'Free Size', mrp: 1299, price: 999 }],
  });
  const [order] = await Order.create([{
    customerId: owner._id,
    items: [{ productId: product._id, sku: product.variants[0].sku, name: product.name, quantity: 1, unitPrice: 999, mrp: 1299, gstRate: 5, taxAmount: 47.57, lineTotal: 999 }],
    shippingAddress: { fullName: 'Invoice Owner', phone: '9876543210', email: ownerEmail, line1: '12 Freeganj Road', city: 'Guna', state: 'Madhya Pradesh', pincode: '473001', country: 'IN' },
    amounts: { subtotal: 999, discount: 0, shipping: 99, tax: 47.57, total: 1098, currency: 'INR' },
    payment: { method: 'cod', status: 'pending' },
    status: 'confirmed',
  }]);

  // The owner receives a real PDF, built from the saved snapshot.
  const ownInvoice = await apiRaw(`/api/orders/${order.id}/invoice.pdf`, { token: ownerToken });
  assert.equal(ownInvoice.status, 200);
  assert.match(ownInvoice.headers.get('content-type'), /application\/pdf/i);
  assert.match(ownInvoice.headers.get('content-disposition'), new RegExp(`invoice-${order.orderNumber}\\.pdf`));
  assert.equal(ownInvoice.body.subarray(0, 5).toString(), '%PDF-');
  assert.ok(ownInvoice.body.length > 1000);
  assert.match(ownInvoice.headers.get('cache-control'), /no-store/);

  // A different shopper cannot fetch this order's invoice, and anonymous requests cannot either.
  const strangerToken = await signup(`invoice-stranger-${suffix}@example.com`);
  const stranger = await api(`/api/orders/${order.id}/invoice.pdf`, { token: strangerToken });
  assert.equal(stranger.status, 404, 'not found rather than disclosing somebody else’s order');
  const anonymous = await api('/api/orders/not-an-order/invoice.pdf');
  assert.equal(anonymous.status, 401);

  // A warehouse staff account can download both operational documents.
  const staff = await User.create({
    email: `invoice-warehouse-${suffix}@example.com`,
    firstName: 'Warehouse',
    roles: ['warehouse'],
    passwordHash: await User.hashPassword('StrongPass123'),
  });
  const login = await api('/api/auth/login', { method: 'POST', body: { email: staff.email, password: 'StrongPass123' } });
  assert.equal(login.status, 200);
  const staffToken = accessTokenFrom(login.setCookie);
  assert.ok(staffToken);

  const staffInvoice = await apiRaw(`/api/orders/${order.id}/invoice.pdf`, { token: staffToken });
  assert.equal(staffInvoice.status, 200, 'staff can retrieve the invoice for support');
  assert.equal(staffInvoice.body.subarray(0, 5).toString(), '%PDF-');

  const slip = await apiRaw(`/api/admin/orders/${order.id}/packing-slip.pdf`, { token: staffToken });
  assert.equal(slip.status, 200);
  assert.match(slip.headers.get('content-type'), /application\/pdf/i);
  assert.match(slip.headers.get('content-disposition'), new RegExp(`packing-slip-${order.orderNumber}\\.pdf`));
  assert.equal(slip.body.subarray(0, 5).toString(), '%PDF-');
  assert.ok(slip.body.length > 1000);

  const customerSlip = await api('/api/admin/orders/not-an-order/packing-slip.pdf', { token: ownerToken });
  assert.equal(customerSlip.status, 403, 'a customer cannot use the warehouse packing-slip endpoint');
});
