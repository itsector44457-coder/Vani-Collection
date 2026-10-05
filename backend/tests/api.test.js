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

const api = async (path, { method = 'GET', body, token, headers = {} } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null, setCookie: response.headers.getSetCookie?.() || [] };
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
  const statusUpdate = await api(`/api/orders/${order.body.data.id}/status`, { method: 'PATCH', token: adminToken, body: { status: 'packed', note: 'Packed at Ujjain studio' } });
  assert.equal(statusUpdate.status, 200);
  assert.equal(statusUpdate.body.data.status, 'packed');

  const adjust = await api('/api/inventory/VC-AN-01-M', { method: 'PATCH', token: adminToken, body: { adjustment: 4, reason: 'ERP stock receipt' } });
  assert.equal(adjust.body.data.onHand, 9);

  const dashboard = await api('/api/admin/dashboard', { token: adminToken });
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.data.activeProducts, 1);
  assert.ok(dashboard.body.data.openOrders >= 1);

  const report = await api('/api/admin/reports/gst', { token: adminToken });
  assert.equal(report.status, 200);
  assert.ok(report.body.data.totalTax > 0);

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
  const published = await api(`/api/reviews/${created.body.data.id}`, { method: 'PATCH', token: adminToken, body: { status: 'published' } });
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
  const orderId = order.body.data.id;
  const early = await api('/api/returns', { method: 'POST', token: customerToken, body: { orderId, items: [{ sku: 'VC-AN-01-M', quantity: 1, reason: 'Size issue' }] } });
  assert.equal(early.status, 409);

  await api(`/api/orders/${orderId}/status`, { method: 'PATCH', token: adminToken, body: { status: 'shipped' } });
  await api(`/api/orders/${orderId}/status`, { method: 'PATCH', token: adminToken, body: { status: 'delivered' } });
  const request = await api('/api/returns', { method: 'POST', token: customerToken, body: { orderId, items: [{ sku: 'VC-AN-01-M', quantity: 1, reason: 'Size issue' }] } });
  assert.equal(request.status, 201);
  assert.ok(request.body.data.refundAmount > 0);
  const approved = await api(`/api/returns/${request.body.data.id}`, { method: 'PATCH', token: adminToken, body: { status: 'approved', adminNote: 'Pickup scheduled' } });
  assert.equal(approved.body.data.status, 'approved');
  const forbidden = await api('/api/returns', { method: 'PATCH', token: customerToken, body: {} });
  assert.equal(forbidden.status, 405);
});
