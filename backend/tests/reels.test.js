const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/vani_reels_test';
process.env.JWT_ACCESS_SECRET = 'reels-access-secret-value-that-is-long-enough';
process.env.JWT_REFRESH_SECRET = 'reels-refresh-secret-value-that-is-long-enough';
process.env.ERP_ENABLED = 'false';

const { loadConfig } = require('../src/config');
const { buildApp } = require('../src/app');
const User = require('../models/User');
const Product = require('../models/Product');
const { Reel } = require('../models/Reel');

let replset;
let server;
let baseUrl;
let dbAvailable = false;
let skipReason = '';
let adminToken = '';
const config = loadConfig();

// These paths need a real MongoDB; the suite skips rather than fails when one is unavailable so
// `npm test` stays green on machines without it.
const maybeTest = (name, fn) => test(name, (t) => (dbAvailable ? fn(t) : t.skip(skipReason || 'MongoDB unavailable')));

const api = async (path, { method = 'GET', body, token, headers = {} } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null, setCookie: response.headers.getSetCookie?.() || [] };
};

// The API hands the access token over as an httpOnly cookie, not in the response body.
const accessTokenFrom = (setCookie) => setCookie.find((cookie) => cookie.startsWith('accessToken='))?.split(';')[0].split('=')[1];

const VIDEO = 'https://res.cloudinary.com/vani/video/upload/v1730000000/vani-collection/reels/demo.mp4';

const draftReel = (productId, overrides = {}) => ({
  title: 'Bagru handblock drop',
  caption: 'Featherlight mul cotton for summer',
  tag: 'Bagru Handblock',
  videoUrl: VIDEO,
  videoPublicId: 'vani-collection/reels/demo',
  posterUrl: 'https://res.cloudinary.com/vani/image/upload/v1730000000/vani-collection/reels/demo.jpg',
  provider: 'cloudinary',
  durationSec: 18.4,
  width: 1080,
  height: 1920,
  bytes: 4_200_000,
  format: 'mp4',
  status: 'published',
  ...(productId ? { productId } : {}),
  ...overrides,
});

test.before(async () => {
  try {
    const uri = process.env.TEST_MONGO_URI || (replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } })).getUri('vani_reels_test');
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

  await User.create({ email: 'reels-admin@example.com', firstName: 'Reels', roles: ['admin', 'super_admin'], passwordHash: await User.hashPassword('ReelsPass12345') });
  const login = await api('/api/auth/login', { method: 'POST', body: { email: 'reels-admin@example.com', password: 'ReelsPass12345' } });
  adminToken = accessTokenFrom(login.setCookie) || '';
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
  if (replset) await replset.stop();
});

maybeTest('admin can publish a reel and shoppers see it with its product card', async () => {
  const product = await Product.create({
    name: 'Gulab Bagh Anarkali', slug: 'gulab-bagh-reel', category: 'anarkalis', status: 'active',
    images: [{ url: 'https://res.cloudinary.com/vani/image/upload/v1/p/front.jpg' }],
    variants: [{ sku: 'VC-RL-01-M', size: 'M', price: 2499, mrp: 3499 }],
  });

  const created = await api('/api/reels', { method: 'POST', token: adminToken, body: draftReel(product.id) });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.data.status, 'published');
  assert.equal(created.body.data.product.slug, 'gulab-bagh-reel');
  assert.equal(created.body.data.product.price, 2499);

  const feed = await api('/api/reels');
  assert.equal(feed.status, 200);
  const reel = feed.body.data.find((item) => item._id === created.body.data._id);
  assert.ok(reel, 'the published reel appears in the public feed');
  assert.deepEqual(reel.product.sizes, ['M']);

  // Drafts stay out of the storefront feed but show up for staff.
  await api('/api/reels', { method: 'POST', token: adminToken, body: draftReel(product.id, { title: 'Unlisted look', status: 'draft' }) });
  const publicFeed = await api('/api/reels');
  assert.ok(!publicFeed.body.data.some((item) => item.title === 'Unlisted look'), 'drafts are hidden');
  const staffList = await api('/api/reels/admin', { token: adminToken });
  assert.equal(staffList.status, 200);
  assert.ok(staffList.body.data.some((item) => item.title === 'Unlisted look'), 'staff see drafts');
  assert.equal(staffList.body.meta.published, 1);
  assert.equal(staffList.body.meta.drafts, 1);

  // Header totals are counted independently of the status filter.
  const onlyDrafts = await api('/api/reels/admin?status=draft', { token: adminToken });
  assert.equal(onlyDrafts.body.data.length, 1);
  assert.equal(onlyDrafts.body.meta.total, 1, 'the list itself is filtered');
  assert.equal(onlyDrafts.body.meta.published, 1, 'but the published total is not');
});

maybeTest('the /admin list is not swallowed by the /:id route', async () => {
  const staffList = await api('/api/reels/admin', { token: adminToken });
  assert.equal(staffList.status, 200, JSON.stringify(staffList.body));
  assert.ok(Array.isArray(staffList.body.data));
  const unknownId = await api('/api/reels/6650f0a2c1d2e3f4a5b6c700');
  assert.equal(unknownId.status, 404);
  assert.equal(unknownId.body.error.code, 'REEL_NOT_FOUND');
});

maybeTest('likes are idempotent per identity and unlike restores the count', async () => {
  const created = await api('/api/reels', { method: 'POST', token: adminToken, body: draftReel(null, { title: 'Like target' }) });
  const id = created.body.data._id;

  const first = await api(`/api/reels/${id}/engage`, { method: 'POST', body: { action: 'like', identity: 'browser-aaaaaaaa' } });
  assert.equal(first.status, 200);
  assert.equal(first.body.data.liked, true);
  assert.equal(first.body.data.likes, 1);

  const repeat = await api(`/api/reels/${id}/engage`, { method: 'POST', body: { action: 'like', identity: 'browser-aaaaaaaa' } });
  assert.equal(repeat.body.data.likes, 1, 'a second like from the same browser does not double count');

  const other = await api(`/api/reels/${id}/engage`, { method: 'POST', body: { action: 'like', identity: 'browser-bbbbbbbb' } });
  assert.equal(other.body.data.likes, 2);

  const unlike = await api(`/api/reels/${id}/engage`, { method: 'POST', body: { action: 'unlike', identity: 'browser-aaaaaaaa' } });
  assert.equal(unlike.body.data.liked, false);
  assert.equal(unlike.body.data.likes, 1);

  const anonymous = await api(`/api/reels/${id}/engage`, { method: 'POST', body: { action: 'like' } });
  assert.equal(anonymous.status, 422);
  assert.equal(anonymous.body.error.code, 'IDENTITY_REQUIRED');
});

maybeTest('views dedupe inside the 24h window and shares always count', async () => {
  const created = await api('/api/reels', { method: 'POST', token: adminToken, body: draftReel(null, { title: 'View target' }) });
  const id = created.body.data._id;

  const first = await api(`/api/reels/${id}/engage`, { method: 'POST', body: { action: 'view', identity: 'viewer-cccccccc' } });
  assert.equal(first.body.data.views, 1);
  const second = await api(`/api/reels/${id}/engage`, { method: 'POST', body: { action: 'view', identity: 'viewer-cccccccc' } });
  assert.equal(second.body.data.views, 1, 'a repeat view from the same browser is not counted twice');
  const otherViewer = await api(`/api/reels/${id}/engage`, { method: 'POST', body: { action: 'view', identity: 'viewer-dddddddd' } });
  assert.equal(otherViewer.body.data.views, 2);

  await api(`/api/reels/${id}/engage`, { method: 'POST', body: { action: 'share', identity: 'viewer-cccccccc' } });
  const shared = await api(`/api/reels/${id}/engage`, { method: 'POST', body: { action: 'cart_add', identity: 'viewer-cccccccc' } });
  assert.equal(shared.body.data.shares, 1);
  assert.equal(shared.body.data.cartAdds, 1);
});

maybeTest('reorder rewrites positions and deletes remove the reel', async () => {
  const a = (await api('/api/reels', { method: 'POST', token: adminToken, body: draftReel(null, { title: 'Order A' }) })).body.data;
  const b = (await api('/api/reels', { method: 'POST', token: adminToken, body: draftReel(null, { title: 'Order B' }) })).body.data;
  assert.ok(b.position > a.position, 'new reels are appended after the last position');

  const reordered = await api('/api/reels/reorder', { method: 'PATCH', token: adminToken, body: { order: [b._id, a._id] } });
  assert.equal(reordered.status, 200);
  assert.equal(reordered.body.data.find((item) => item._id === b._id).position, 0);
  assert.equal(reordered.body.data.find((item) => item._id === a._id).position, 1);

  const removed = await api(`/api/reels/${a._id}?purge=false`, { method: 'DELETE', token: adminToken });
  assert.equal(removed.status, 204);
  assert.equal(await Reel.countDocuments({ _id: a._id }), 0);
});

maybeTest('reel mutations require a staff session and validate their payload', async () => {
  const unauthenticated = await api('/api/reels', { method: 'POST', body: draftReel(null) });
  assert.equal(unauthenticated.status, 401);

  const invalid = await api('/api/reels', { method: 'POST', token: adminToken, body: { title: 'x', videoUrl: 'not-a-url' } });
  assert.equal(invalid.status, 422);
  assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');

  const badProduct = await api('/api/reels', { method: 'POST', token: adminToken, body: draftReel('6650f0a2c1d2e3f4a5b6c711') });
  assert.equal(badProduct.status, 422);
  assert.equal(badProduct.body.error.code, 'PRODUCT_NOT_FOUND');
});
