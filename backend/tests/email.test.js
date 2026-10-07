const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/vani_email_test';
process.env.JWT_ACCESS_SECRET = 'email-access-secret-value-that-is-long-enough';
process.env.JWT_REFRESH_SECRET = 'email-refresh-secret-value-that-is-long-enough';
// A provider is configured for the HTTP-level tests so the outbox path is exercised for real.
process.env.EMAIL_ENABLED = 'true';
process.env.EMAIL_FROM = 'Vani Collection <care@vanicollection.test>';
process.env.EMAIL_REPLY_TO = 'support@vanicollection.test';
process.env.SMTP_HOST = 'smtp.test.invalid';
process.env.SMTP_PORT = '587';
process.env.SMTP_SECURE = 'false';
process.env.SMTP_USER = 'mailer';
process.env.SMTP_PASS = 'mailer-secret';
process.env.EMAIL_DEV_CAPTURE = 'false';
process.env.STOREFRONT_URL = 'https://shop.vanicollection.test';
process.env.SUPPORT_EMAIL = 'care@vanicollection.test';

const { loadConfig } = require('../src/config');
const { buildApp } = require('../src/app');
const email = require('../src/services/email');
const { TEMPLATE_NAMES } = require('../src/services/email-templates');
const { inr, escapeHtml } = require('../src/services/email-templates/layout');
const { processPendingEmails } = require('../src/workers/integration-worker');
const EmailLog = require('../models/EmailLog');
const IntegrationEvent = require('../models/IntegrationEvent');
const User = require('../models/User');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Order = require('../models/Order');
const ReturnRequest = require('../models/ReturnRequest');

const capturedRequestErrors = [];
const silentLogger = {
  info() {},
  warn() {},
  error(fields, message) { capturedRequestErrors.push({ fields, message }); },
  debug() {},
  child() { return this; },
};
const config = loadConfig();

/* ------------------------------------------------------------------- fixtures */

const XSS = '<script>alert(1)</script>';
const ESCAPED_XSS = '&lt;script&gt;alert(1)&lt;/script&gt;';

const FIXTURE_ORDER = {
  id: '64f000000000000000000001',
  orderNumber: 'VC1720000000123',
  status: 'shipped',
  createdAt: new Date('2026-10-01T10:00:00.000Z'),
  guestEmail: 'guest@example.com',
  couponCode: 'FEST10',
  shippingAddress: { fullName: `${XSS} Priya Sharma`, line1: '12 Freeganj Road', city: 'Ujjain', state: 'Madhya Pradesh', pincode: '456010', phone: '9876543210', email: 'shopper@example.com' },
  billingAddress: { fullName: 'Priya Sharma', line1: '12 Freeganj Road', city: 'Ujjain', state: 'Madhya Pradesh', pincode: '456010' },
  amounts: { subtotal: 4299, discount: 300, shipping: 0, tax: 205, total: 3999, currency: 'INR' },
  payment: { method: 'razorpay', status: 'paid' },
  shipment: { provider: 'shiprocket', awb: 'AWB7788990011', courier: 'Delhivery', trackingUrl: 'https://tracking.example.com/AWB7788990011', status: 'in_transit' },
  items: [
    { sku: 'VC-AN-01-M', name: `Gulab Bagh ${XSS} Anarkali`, size: 'M', color: 'Rose', quantity: 2, unitPrice: 2149.5, mrp: 2499, gstRate: 5, taxAmount: 190.43, lineTotal: 4299 },
  ],
};

const FIXTURE_RETURN = {
  id: '64f000000000000000000002',
  returnNumber: 'RET1720000000999',
  type: 'return',
  status: 'approved',
  refundAmount: 2149,
  refundId: 'rfnd_TEST123',
  adminNote: `${XSS} pickup scheduled for Monday`,
  items: [{ sku: 'VC-AN-01-M', quantity: 1, reason: `${XSS} size too small`, condition: 'unused', images: [] }],
  updatedAt: new Date('2026-10-04T10:00:00.000Z'),
};

/** Renders a template with hostile input everywhere a shopper-controlled value can appear. */
const renderWithHostileInput = (name, extra = {}) =>
  email.renderTemplate(name, {
    firstName: XSS,
    email: 'shopper@example.com',
    order: FIXTURE_ORDER,
    returnRequest: FIXTURE_RETURN,
    refund: { id: 'rfnd_TEST123', amountRupees: 3999, status: 'processed' },
    reason: XSS,
    note: XSS,
    adminNote: XSS,
    resetUrl: `https://shop.vanicollection.test/reset-password?token=${'a'.repeat(64)}`,
    verificationUrl: 'https://shop.vanicollection.test/verify?token=abc',
    status: 'shipped',
    ...extra,
  });

/* --------------------------------------------------------------- pure rendering */

test('every template renders a subject, html and a plain-text alternative', () => {
  assert.ok(TEMPLATE_NAMES.length >= 9, `expected the full template set, saw ${TEMPLATE_NAMES.length}`);
  for (const required of ['welcome', 'password-reset', 'password-changed', 'order-confirmation', 'order-status', 'order-cancelled', 'refund-processed', 'return-status', 'email-verification']) {
    assert.ok(TEMPLATE_NAMES.includes(required), `missing template ${required}`);
  }

  for (const name of TEMPLATE_NAMES) {
    const rendered = renderWithHostileInput(name);
    assert.ok(rendered.subject.length > 5, `${name} needs a subject`);
    assert.ok(rendered.html.startsWith('<!doctype html>'), `${name} html must be a full document`);
    assert.ok(rendered.text.length > 50, `${name} needs a plain-text alternative`);
    // Table-based, responsive and branded — the things a mail client actually needs.
    assert.match(rendered.html, /<table[^>]*role="presentation"/, `${name} must use table layout`);
    assert.match(rendered.html, /max-width:\s*600px/, `${name} must stay responsive`);
    assert.match(rendered.html, /#881337/, `${name} must carry the brand crimson`);
    assert.match(rendered.html, /Vani Collection/, `${name} must carry the brand mark`);
    assert.match(rendered.html, /care@vanicollection\.test/, `${name} footer must show the support inbox`);
  }
});

test('an unknown template is rejected instead of rendering an empty email', () => {
  assert.throws(() => email.renderTemplate('does-not-exist', {}), /Unknown email template/);
});

test('html escaping neutralises shopper input in every template', () => {
  for (const name of TEMPLATE_NAMES) {
    const rendered = renderWithHostileInput(name);
    assert.ok(!rendered.html.includes('<script>alert(1)</script>'), `${name} leaked a raw script tag into the html body`);
    assert.ok(!rendered.html.includes('onerror='), `${name} leaked an event handler attribute`);
    // The escaped form must still be *there* — escaping is not the same as dropping the value.
    assert.ok(rendered.html.includes(ESCAPED_XSS), `${name} dropped the escaped value entirely`);
  }
});

test('escapeHtml and inr cover the injection and currency rules', () => {
  assert.equal(escapeHtml(XSS), ESCAPED_XSS);
  assert.equal(escapeHtml('a & b "c" \'d\' <e>'), 'a &amp; b &quot;c&quot; &#39;d&#39; &lt;e&gt;');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(inr(1299), '₹1,299');
  assert.equal(inr(1299.4), '₹1,299', 'paise are rounded away for display');
  assert.equal(inr(100000), '₹1,00,000', 'Indian digit grouping, not western');
  assert.equal(inr('not-a-number'), '₹0');
});

test('order emails carry the order number, INR totals and item table', () => {
  const rendered = email.renderTemplate('order-confirmation', { order: FIXTURE_ORDER, firstName: 'Priya' });
  assert.match(rendered.subject, /VC1720000000123/);
  assert.ok(rendered.html.includes('₹3,999'), 'grand total must be formatted as INR');
  assert.ok(rendered.html.includes('₹4,299'), 'line total must be formatted as INR');
  assert.ok(rendered.html.includes('₹300'), 'discount must be shown');
  assert.ok(rendered.html.includes('FEST10'), 'coupon code must be shown');
  assert.ok(rendered.html.includes('Gulab Bagh'), 'item name must be listed');
  assert.ok(rendered.html.includes('Size M'), 'variant size must be listed');
  assert.ok(rendered.text.includes('₹3,999'), 'the text alternative carries the same totals');
  assert.ok(rendered.text.includes('VC1720000000123'), 'the text alternative carries the order number');
});

test('password reset email exposes the reset link in html and text', () => {
  const resetUrl = `https://shop.vanicollection.test/reset-password?token=${'a'.repeat(64)}`;
  const rendered = email.renderTemplate('password-reset', { firstName: 'Priya', resetUrl, expiresInMinutes: 30 });
  assert.ok(rendered.html.includes(`href="${resetUrl}"`), 'the CTA must point at the reset url');
  assert.ok(rendered.html.includes('30 minutes'), 'the expiry must be stated');
  assert.ok(rendered.text.includes(resetUrl), 'clients that strip buttons still get the link');
  assert.equal(rendered.transactional, true, 'a reset link must never carry an unsubscribe token');
});

test('shipped order status email carries the AWB, courier and tracking url', () => {
  const rendered = email.renderTemplate('order-status', { order: FIXTURE_ORDER, status: 'shipped', firstName: 'Priya' });
  assert.match(rendered.subject, /Delhivery/);
  assert.ok(rendered.html.includes('AWB7788990011'), 'the AWB must be visible');
  assert.ok(rendered.html.includes('https://tracking.example.com/AWB7788990011'), 'the tracking link must be clickable');
  assert.ok(rendered.text.includes('AWB7788990011'), 'the text alternative carries the AWB too');

  // Every lifecycle status has its own copy, and an unknown one degrades instead of throwing.
  for (const status of ['confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled']) {
    const variant = email.renderTemplate('order-status', { order: FIXTURE_ORDER, status });
    assert.ok(variant.subject.length > 5, `${status} needs a subject`);
  }
  assert.ok(email.renderTemplate('order-status', { order: FIXTURE_ORDER, status: 'not-a-status' }).html.length > 1000);
});

test('return status email walks the ladder and quotes the admin note safely', () => {
  const rendered = email.renderTemplate('return-status', { order: FIXTURE_ORDER, returnRequest: FIXTURE_RETURN, status: 'approved', adminNote: FIXTURE_RETURN.adminNote });
  assert.match(rendered.subject, /RET1720000000999/);
  assert.ok(rendered.html.includes('₹2,149'), 'the agreed refund amount must be shown');
  assert.ok(rendered.html.includes('pickup scheduled for Monday'), 'the admin note is quoted');
  assert.ok(!rendered.html.includes('<script>'), 'the admin note is escaped');
  assert.ok(rendered.html.includes('size too small'), 'the shopper reason is quoted');
});

test('refund email reports rupees and the settlement window', () => {
  const rendered = email.renderTemplate('refund-processed', { order: FIXTURE_ORDER, refund: { id: 'rfnd_TEST123', amountRupees: 3999 }, reason: 'Damaged in transit' });
  assert.match(rendered.subject, /₹3,999/);
  assert.ok(rendered.html.includes('rfnd_TEST123'), 'the provider refund id is shown for support');
  assert.ok(rendered.html.includes('Damaged in transit'), 'the recorded reason is shown');
  assert.ok(rendered.html.includes('3–7 working days'), 'the settlement window is set');
});

test('non-transactional mail keeps an unsubscribe path, transactional mail does not', () => {
  const welcome = email.renderTemplate('welcome', { firstName: 'Priya', email: 'shopper@example.com' });
  assert.ok(welcome.html.includes('{{unsubscribe}}'), 'the ESP-safe placeholder survives when no list url is given');
  const withListUrl = email.renderTemplate('welcome', { firstName: 'Priya', unsubscribeUrl: 'https://shop.vanicollection.test/preferences?u=1' });
  assert.ok(withListUrl.html.includes('https://shop.vanicollection.test/preferences?u=1'));
  assert.ok(!withListUrl.html.includes('{{unsubscribe}}'), 'an explicit url replaces the placeholder');

  for (const name of ['password-reset', 'order-confirmation', 'order-status', 'order-cancelled', 'refund-processed', 'return-status', 'password-changed']) {
    assert.ok(!email.renderTemplate(name, { order: FIXTURE_ORDER, returnRequest: FIXTURE_RETURN, resetUrl: 'https://x/y' }).html.includes('{{unsubscribe}}'), `${name} is transactional and must not offer an unsubscribe`);
  }
});

test('subjects cannot be used for header injection', () => {
  const rendered = email.renderTemplate('order-status', { order: { ...FIXTURE_ORDER, orderNumber: 'VC1\r\nBcc: attacker@evil.example' }, status: 'confirmed' });
  assert.ok(!/[\r\n\0]/.test(rendered.subject), 'CRLF and NUL must be stripped from the subject');
  assert.equal(rendered.subject.split('\n').length, 1, 'the subject stays on a single line, so no extra header can be injected');
  assert.ok(rendered.subject.length <= 200, 'subjects are capped so a hostile value cannot blow up the inbox line');
});

/* ------------------------------------------------- queueing without a database */

const fakeLogDoc = (fields, id = 'log-1') => {
  const doc = { ...fields, id, _id: id };
  doc.save = async () => doc;
  return doc;
};

test('with no SMTP provider the request degrades to a skipped EmailLog', async (t) => {
  email.configureEmail({ ...config, EMAIL_ENABLED: false, SMTP_HOST: '', emailConfigured: false, EMAIL_DEV_CAPTURE: false });
  assert.equal(email.isEmailConfigured(), false);
  assert.equal(email.shouldDeliver(), false);

  const logs = [];
  t.mock.method(EmailLog, 'create', async (fields) => { const doc = fakeLogDoc(fields); logs.push(doc); return doc; });
  t.mock.method(IntegrationEvent, 'create', async () => { throw new Error('nothing may be enqueued while email is disabled'); });

  const result = await email.sendEmail({ to: 'shopper@example.com', template: 'welcome', data: { firstName: 'Priya' }, log: silentLogger });
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'EMAIL_NOT_CONFIGURED');
  assert.equal(logs.length, 1, 'the attempt stays auditable');
  assert.equal(logs[0].status, 'skipped');
  assert.equal(logs[0].template, 'welcome');
  email.configureEmail(config);
});

test('a bad recipient or template is skipped, never thrown at the shopper', async (t) => {
  t.mock.method(EmailLog, 'create', async (fields) => fakeLogDoc(fields));
  t.mock.method(IntegrationEvent, 'create', async (fields) => ({ ...fields, id: 'evt-1' }));

  assert.equal((await email.sendEmail({ to: '', template: 'welcome', data: {} })).reason, 'INVALID_RECIPIENT');
  assert.equal((await email.sendEmail({ to: 'not-an-email', template: 'welcome', data: {} })).reason, 'INVALID_RECIPIENT');
  assert.equal((await email.sendEmail({ to: 'shopper@example.com', template: 'nope', data: {} })).reason, 'UNKNOWN_TEMPLATE');
  assert.equal((await email.sendRaw({ to: 'shopper@example.com', subject: '', html: '' })).reason, 'INVALID_MESSAGE');
  email.resetEmailServiceForTesting();
  email.configureEmail(config);
});

test('EMAIL_DEV_CAPTURE renders and logs the email without contacting SMTP', async (t) => {
  email.configureEmail({ ...config, EMAIL_DEV_CAPTURE: true });
  assert.equal(email.isEmailConfigured(), true, 'a host is configured…');
  assert.equal(email.shouldDeliver(), false, '…but dev capture must win');

  const logs = [];
  const captured = [];
  t.mock.method(EmailLog, 'create', async (fields) => { const doc = fakeLogDoc(fields); logs.push(doc); return doc; });
  t.mock.method(IntegrationEvent, 'create', async () => { throw new Error('dev capture must not enqueue'); });
  email.setTransportForTesting({ sendMail: async () => { throw new Error('SMTP must never be contacted in dev capture'); } });

  const result = await email.sendEmail({ to: 'shopper@example.com', template: 'order-confirmation', data: { order: FIXTURE_ORDER }, log: { ...silentLogger, info: (payload) => captured.push(payload) } });
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'DEV_CAPTURE');
  assert.equal(logs[0].status, 'skipped');
  assert.ok(captured.some((entry) => String(entry.html || '').includes(FIXTURE_ORDER.orderNumber)), 'the fully rendered email is written to the log');
  email.setTransportForTesting(null);
  email.resetEmailServiceForTesting();
  email.configureEmail(config);
});

test('a configured provider enqueues email.send on the outbox with the rendered message', async (t) => {
  const events = [];
  const logs = [];
  t.mock.method(EmailLog, 'create', async (fields) => { const doc = fakeLogDoc(fields); logs.push(doc); return doc; });
  t.mock.method(IntegrationEvent, 'create', async (fields) => { events.push(fields); return { ...fields, id: 'evt-1' }; });

  const result = await email.sendEmail({ to: 'Shopper@Example.com', template: 'order-confirmation', data: { order: FIXTURE_ORDER }, tags: ['orders'], log: silentLogger });
  assert.equal(result.queued, true);
  assert.equal(events.length, 1);
  assert.equal(events[0].provider, 'email');
  assert.equal(events[0].eventType, 'email.send');
  assert.equal(events[0].direction, 'outbound');
  assert.equal(events[0].status, 'pending');
  assert.equal(events[0].payload.to, 'shopper@example.com', 'recipients are normalised');
  assert.ok(events[0].payload.html.includes(FIXTURE_ORDER.orderNumber), 'the outbox carries the rendered html');
  assert.ok(events[0].payload.text.includes('₹3,999'), 'and the text alternative');
  assert.equal(events[0].payload.replyTo, 'support@vanicollection.test');
  assert.equal(logs[0].status, 'queued');
  assert.equal(logs[0].orderId, FIXTURE_ORDER.id);
  email.resetEmailServiceForTesting();
  email.configureEmail(config);
});

test('a duplicate trigger is suppressed by the idempotency key instead of sending twice', async (t) => {
  const events = [];
  t.mock.method(EmailLog, 'create', async (fields) => fakeLogDoc(fields, `log-${events.length + 1}`));
  t.mock.method(IntegrationEvent, 'create', async (fields) => {
    if (events.some((e) => e.idempotencyKey === fields.idempotencyKey)) { const error = new Error('E11000 duplicate key'); error.code = 11000; throw error; }
    events.push(fields);
    return { ...fields, id: `evt-${events.length}` };
  });

  const options = { to: 'shopper@example.com', template: 'order-confirmation', data: { order: FIXTURE_ORDER }, dedupeKey: 'order-confirmation:vc-1', log: silentLogger };
  assert.equal((await email.sendEmail(options)).queued, true);
  const second = await email.sendEmail(options);
  assert.equal(second.skipped, true);
  assert.equal(second.reason, 'DUPLICATE');
  assert.equal(events.length, 1);
  email.resetEmailServiceForTesting();
  email.configureEmail(config);
});

test('the transport is used exactly once per delivery and the message id is returned', async (t) => {
  const sent = [];
  email.setTransportForTesting({ sendMail: async (message) => { sent.push(message); return { messageId: '<rendered@smtp.test.invalid>' }; } });
  const logs = [];
  t.mock.method(EmailLog, 'findById', async () => { const doc = fakeLogDoc({ template: 'welcome', status: 'queued' }); logs.push(doc); return doc; });

  const outcome = await email.deliverOutboxEvent({ attempts: 1, payload: { emailLogId: 'log-1', to: 'shopper@example.com', subject: 'Welcome', html: '<p>hi</p>', text: 'hi', tags: ['orders'] } }, { log: silentLogger });
  assert.equal(outcome.sent, true);
  assert.equal(outcome.messageId, '<rendered@smtp.test.invalid>');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].from, config.EMAIL_FROM);
  assert.equal(sent[0].replyTo, 'support@vanicollection.test');
  assert.deepEqual(sent[0].headers, { 'X-Vani-Tags': 'orders' });
  assert.equal(logs[0].status, 'sent');
  assert.equal(logs[0].providerMessageId, '<rendered@smtp.test.invalid>');
  assert.ok(logs[0].sentAt instanceof Date);
  email.setTransportForTesting(null);
});

test('a transport failure is recorded for retry and never escapes to the caller', async (t) => {
  email.setTransportForTesting({ sendMail: async () => { const error = new Error('ESMTP connection reset by provider'); error.code = 'ESMTP'; throw error; } });
  const logs = [];
  t.mock.method(EmailLog, 'findById', async () => { const doc = fakeLogDoc({ template: 'order-confirmation', status: 'queued' }); logs.push(doc); return doc; });

  // The worker owns retry scheduling, so delivery re-throws…
  await assert.rejects(
    () => email.deliverOutboxEvent({ attempts: 2, payload: { emailLogId: 'log-1', to: 'shopper@example.com', subject: 'Order confirmed', html: '<p>x</p>' } }, { log: silentLogger }),
    /connection reset/
  );
  assert.equal(logs[0].status, 'failed');
  assert.equal(logs[0].attempts, 2);
  assert.match(logs[0].error, /connection reset/);

  // …but the HTTP-facing entry point is total: it resolves with a skip instead of rejecting.
  t.mock.method(EmailLog, 'create', async (fields) => fakeLogDoc(fields));
  t.mock.method(IntegrationEvent, 'create', async (fields) => ({ ...fields, id: 'evt-1' }));
  const queued = await email.queueEmail({ to: 'shopper@example.com', template: 'order-confirmation', data: { order: FIXTURE_ORDER }, log: silentLogger });
  assert.equal(queued.queued, true, 'queueing succeeds even though the transport is broken');
  email.setTransportForTesting(null);
  email.resetEmailServiceForTesting();
  email.configureEmail(config);
});

test('queueEmail resolves even when the whole email stack throws', async (t) => {
  t.mock.method(EmailLog, 'create', async () => { throw new Error('mongo is down'); });
  t.mock.method(IntegrationEvent, 'create', async () => { throw new Error('mongo is down'); });
  const result = await email.queueEmail({ to: 'shopper@example.com', template: 'welcome', data: {}, log: silentLogger });
  assert.equal(result.skipped, true, 'a broken outbox degrades to a skip, never a 500');
  email.resetEmailServiceForTesting();
  email.configureEmail(config);
});

test('orderEmailData reduces a Mongoose document to a JSON-safe snapshot with an id', () => {
  const doc = new Order({ orderNumber: 'VC1', items: [{ sku: 'A', quantity: 1, unitPrice: 100, lineTotal: 100 }], shippingAddress: { fullName: 'Priya', email: 'p@example.com' }, amounts: { subtotal: 100, total: 100 } });
  const data = email.orderEmailData(doc, { firstName: 'Priya' });
  assert.equal(JSON.parse(JSON.stringify(data)).order.id, doc.id, 'the id virtual survives serialisation');
  assert.equal(data.firstName, 'Priya');
  assert.equal(data.order.shippingAddress.email, 'p@example.com');
  assert.equal(typeof email.orderRecipient(doc, null), 'string');
  assert.equal(email.orderRecipient(doc, null), 'p@example.com');
  assert.equal(email.orderRecipient({}, { email: 'Account@Example.com' }), 'account@example.com', 'the account email is the fallback');
  assert.equal(email.orderRecipient({ guestEmail: 'guest@example.com' }, null), 'guest@example.com', 'guest checkout works too');
  assert.equal(email.orderRecipient({}, null), '', 'no recipient is an empty string, not a throw');
});

/* --------------------------------------------------------- HTTP + database path */

let replset;
let server;
let baseUrl;
let dbAvailable = false;
let skipReason = '';

const maybeTest = (name, fn) => test(name, (t) => (dbAvailable ? fn(t) : t.skip(skipReason || 'MongoDB unavailable')));

// Routes answer with `res.json({ data: <mongoose doc> })`, and a document's `toJSON` ships `_id` —
// the `id` virtual is not part of it. Always read ids off a response body as `_id`; reading `.id`
// yields `undefined`, which interpolates into a URL as the string "undefined" and surfaces far away
// as a CastError 500. (`doc.id` on a document fetched directly from a model is still fine.)
const api = async (path, { method = 'GET', body, token } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null, setCookie: response.headers.getSetCookie?.() || [] };
};
const accessTokenFrom = (setCookie) => setCookie.find((c) => c.startsWith('accessToken='))?.split(';')[0].split('=')[1];

test.before(async () => {
  try {
    const uri = process.env.TEST_MONGO_URI || (replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } })).getUri('vani_email_test');
    await mongoose.connect(uri);
    dbAvailable = true;
  } catch (error) {
    skipReason = `MongoDB unavailable (${error.message.split('\n')[0]})`;
    await mongoose.connection.close().catch(() => {});
    return;
  }
  server = buildApp({ config, logger: silentLogger }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  await User.create({ email: 'email-admin@example.com', firstName: 'Ops', roles: ['admin', 'super_admin'], passwordHash: await User.hashPassword('AdminPass12345') });
  await Product.create({ name: 'Gulab Bagh Anarkali', slug: 'gulab-bagh-anarkali', category: 'anarkalis', gstRate: 5, status: 'active', hsnCode: '6204', images: [{ url: 'https://example.com/a.jpg' }], variants: [{ sku: 'VC-AN-01-M', size: 'M', mrp: 4999, price: 3999 }] });
  await Inventory.create({ sku: 'VC-AN-01-M', onHand: 20, reserved: 0 });
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
  if (replset) await replset.stop();
});

maybeTest('placing an order enqueues order-confirmation and a broken transport cannot fail it', async () => {
  // The provider is configured but the transport is dead — the worst realistic case.
  email.setTransportForTesting({ sendMail: async () => { throw new Error('ESMTP connection refused'); } });

  const register = await api('/api/auth/register', { method: 'POST', body: { email: 'email-shopper@example.com', password: 'StrongPass123', firstName: 'Priya' } });
  assert.equal(register.status, 201, JSON.stringify(register.body));
  const token = accessTokenFrom(register.setCookie);

  const welcomeLog = await EmailLog.findOne({ to: 'email-shopper@example.com', template: 'welcome' });
  assert.ok(welcomeLog, 'sign-up enqueues the welcome email');
  assert.equal(welcomeLog.status, 'queued');

  const product = await Product.findOne({ slug: 'gulab-bagh-anarkali' });
  const created = await api('/api/orders', {
    method: 'POST',
    token,
    body: {
      items: [{ productId: product.id, sku: 'VC-AN-01-M', quantity: 2 }],
      shippingAddress: { fullName: 'Priya Sharma', phone: '9876543210', email: 'email-shopper@example.com', line1: '12 Freeganj Road', city: 'Ujjain', state: 'Madhya Pradesh', pincode: '456010' },
      paymentMethod: 'cod',
    },
  });
  assert.equal(created.status, 201, `a broken mail transport must not fail checkout: ${JSON.stringify(created.body)}`);
  const orderId = created.body.data._id;

  const confirmation = await EmailLog.findOne({ template: 'order-confirmation', orderId });
  if (!confirmation) {
    const emailLogs = await EmailLog.find({ to: 'email-shopper@example.com' }).select('template status error orderId subject').lean();
    const emailEvents = await IntegrationEvent.find({ provider: 'email' }).select('eventType status lastError entityId idempotencyKey').lean();
    assert.ok(confirmation, `order-confirmation missing; order=${JSON.stringify({ id: orderId, number: created.body.data.orderNumber, status: created.body.data.status })}; logs=${JSON.stringify(emailLogs)}; events=${JSON.stringify(emailEvents)}`);
  }
  assert.ok(confirmation, 'order-confirmation is enqueued on order creation');
  assert.equal(confirmation.to, 'email-shopper@example.com');
  assert.match(confirmation.subject, new RegExp(created.body.data.orderNumber));
  // The order was placed as a single line of quantity 2, not two lines: the checkout route pushes
  // one snapshot item per requested line. Assert both, since a resend re-renders from this snapshot
  // and a wrong quantity would show the shopper the wrong goods.
  assert.equal(confirmation.data.order.items.length, 1, 'the template input is stored so support can resend');
  assert.equal(confirmation.data.order.items[0].quantity, 2, 'the line quantity is preserved for the resend');

  const event = await IntegrationEvent.findOne({ eventType: 'email.send', entityId: confirmation.id });
  assert.ok(event, 'delivery goes through the shared outbox');
  assert.equal(event.provider, 'email');
  assert.equal(event.status, 'pending');
  assert.ok(event.payload.html.includes(created.body.data.orderNumber));

  // The worker retries, fails, and the failure stays inside the outbox.
  const failed = await processPendingEmails({ log: silentLogger });
  assert.ok(failed.some((row) => row.status === 'failed'), 'a transport failure is recorded as failed, not thrown');
  // Mongoose 9 removed Document.prototype.reload(), so refetch the row explicitly.
  const afterFailure = await EmailLog.findById(confirmation._id);
  assert.equal(afterFailure.status, 'failed');
  assert.match(afterFailure.error, /connection refused/);
  assert.equal(afterFailure.attempts, 1);

  // A status change still emails even though the last delivery failed.
  const adminLogin = await api('/api/auth/login', { method: 'POST', body: { email: 'email-admin@example.com', password: 'AdminPass12345' } });
  const adminToken = accessTokenFrom(adminLogin.setCookie);
  const shipped = await api(`/api/orders/${orderId}/status`, { method: 'PATCH', token: adminToken, body: { status: 'shipped', note: 'Handed to Delhivery' } });
  assert.equal(shipped.status, 200);
  assert.ok(await EmailLog.findOne({ template: 'order-status', orderId }), 'the status transition emails the shopper');

  // Recover the provider and the queued mail goes out.
  const sentMessages = [];
  email.setTransportForTesting({ sendMail: async (message) => { sentMessages.push(message); return { messageId: `<${sentMessages.length}@smtp.test.invalid>` }; } });
  await IntegrationEvent.updateMany({ provider: 'email', status: 'failed' }, { $set: { status: 'pending', nextAttemptAt: new Date(0) } });
  const drained = await processPendingEmails({ log: silentLogger });
  assert.equal(drained.filter((row) => row.status === 'succeeded').length, sentMessages.length);
  assert.ok(sentMessages.length >= 2, 'the confirmation and the status email are delivered');
  const afterDelivery = await EmailLog.findById(confirmation._id);
  assert.equal(afterDelivery.status, 'sent');
  assert.ok(afterDelivery.providerMessageId);
  assert.ok(afterDelivery.sentAt instanceof Date);

  // Delivery never reaches the real SMTP host configured in env.
  assert.ok(sentMessages.every((message) => message.to.endsWith('@example.com')));
  email.setTransportForTesting(null);
});

maybeTest('forgot-password emails a reset link and never reveals whether the address exists', async () => {
  const known = await api('/api/auth/forgot-password', { method: 'POST', body: { email: 'email-shopper@example.com' } });
  const unknown = await api('/api/auth/forgot-password', { method: 'POST', body: { email: 'nobody-here@example.com' } });
  assert.equal(known.status, 202);
  assert.equal(unknown.status, 202);
  // Anti-enumeration: same status, same message, and nothing extra for an address we do not have.
  assert.equal(known.body.message, unknown.body.message);
  assert.deepEqual(unknown.body.meta, {}, 'unknown addresses get no meta at all');
  assert.ok(known.body.meta.resetUrl.includes('token='), 'non-production still exposes the link for testing; production only sends the email');

  const log = await EmailLog.findOne({ to: 'email-shopper@example.com', template: 'password-reset' });
  assert.ok(log, 'the warn-only log is gone — a real email is queued');
  assert.ok(log.data.resetUrl.includes('token='));
  assert.equal(log.data.resetUrl, known.body.meta.resetUrl, 'the emailed link is the one the response reports');
  assert.equal(await EmailLog.countDocuments({ to: 'nobody-here@example.com' }), 0, 'unknown addresses are not logged');

  const token = new URL(known.body.meta.resetUrl).searchParams.get('token');
  const reset = await api('/api/auth/reset-password', { method: 'POST', body: { token, password: 'BrandNewPass123' } });
  assert.equal(reset.status, 204);
  assert.ok(await EmailLog.findOne({ to: 'email-shopper@example.com', template: 'password-changed' }), 'a password change is confirmed by email');
});

maybeTest('cancelling an order and moving a return both email the shopper', async () => {
  const login = await api('/api/auth/login', { method: 'POST', body: { email: 'email-shopper@example.com', password: 'BrandNewPass123' } });
  const token = accessTokenFrom(login.setCookie);
  const adminLogin = await api('/api/auth/login', { method: 'POST', body: { email: 'email-admin@example.com', password: 'AdminPass12345' } });
  const adminToken = accessTokenFrom(adminLogin.setCookie);
  const product = await Product.findOne({ slug: 'gulab-bagh-anarkali' });
  const address = { fullName: 'Priya Sharma', phone: '9876543210', email: 'email-shopper@example.com', line1: '12 Freeganj Road', city: 'Ujjain', state: 'Madhya Pradesh', pincode: '456010' };

  const order = await api('/api/orders', { method: 'POST', token, body: { items: [{ productId: product.id, sku: 'VC-AN-01-M', quantity: 1 }], shippingAddress: address, paymentMethod: 'cod' } });
  assert.equal(order.status, 201);
  const errorMark = capturedRequestErrors.length;
  const cancelled = await api(`/api/orders/${order.body.data._id}/cancel`, { method: 'POST', token, body: { reason: 'Ordered the wrong size' } });
  const requestErrors = capturedRequestErrors.slice(errorMark).map(({ fields, message }) => ({ message, error: fields?.err?.stack || fields?.err?.message || String(fields?.err || '') }));
  assert.equal(cancelled.status, 200, `cancellation response: ${JSON.stringify(cancelled.body)}; server log: ${JSON.stringify(requestErrors)}`);
  const cancelLog = await EmailLog.findOne({ template: 'order-cancelled', orderId: order.body.data._id });
  assert.ok(cancelLog, 'cancellation emails the shopper');
  assert.equal(cancelLog.data.reason, 'Ordered the wrong size');

  // Return lifecycle: deliver a second order, request a return, then approve it.
  const delivered = await api('/api/orders', { method: 'POST', token, body: { items: [{ productId: product.id, sku: 'VC-AN-01-M', quantity: 1 }], shippingAddress: address, paymentMethod: 'cod' } });
  const deliveredId = delivered.body.data._id;
  await api(`/api/orders/${deliveredId}/status`, { method: 'PATCH', token: adminToken, body: { status: 'delivered' } });
  const requested = await api('/api/returns', { method: 'POST', token, body: { orderId: deliveredId, items: [{ sku: 'VC-AN-01-M', quantity: 1, reason: 'Size too small' }] } });
  assert.equal(requested.status, 201);
  assert.ok(await EmailLog.findOne({ template: 'return-status', orderId: deliveredId }), 'submitting a return emails the shopper');

  const approved = await api(`/api/returns/${requested.body.data._id}`, { method: 'PATCH', token: adminToken, body: { status: 'approved', adminNote: 'Pickup on Monday', refundAmount: 3999, refundId: 'rfnd_TEST999' } });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.data.refundAmount, 3999, 'finance can record the agreed refund amount');
  assert.equal(approved.body.data.refundId, 'rfnd_TEST999');
  const returnEmails = await EmailLog.find({ template: 'return-status' });
  const approvedEmail = returnEmails.find((entry) => entry.subject.toLowerCase().includes('approved'));
  assert.ok(approvedEmail, 'each ladder step gets its own email');
  assert.equal(approvedEmail.data.returnRequest.refundId, 'rfnd_TEST999', 'the refund reference is stored so support can resend');
  assert.equal(approvedEmail.data.adminNote, 'Pickup on Monday');
  assert.ok(returnEmails.some((entry) => entry.subject.toLowerCase().includes('requested')), 'the shopper is told the moment a return is submitted');
});

maybeTest('the admin email console lists, filters and resends', async () => {
  const adminLogin = await api('/api/auth/login', { method: 'POST', body: { email: 'email-admin@example.com', password: 'AdminPass12345' } });
  const adminToken = accessTokenFrom(adminLogin.setCookie);
  const shopperLogin = await api('/api/auth/login', { method: 'POST', body: { email: 'email-shopper@example.com', password: 'BrandNewPass123' } });
  const shopperToken = accessTokenFrom(shopperLogin.setCookie);

  const list = await api('/api/admin/emails?limit=5', { token: adminToken });
  assert.equal(list.status, 200);
  assert.ok(list.body.data.length > 0);
  assert.ok(list.body.meta.total >= list.body.data.length);
  assert.ok(list.body.meta.counts.byStatus, 'the console gets status counts for its filters');
  assert.equal(list.body.data[0].data, undefined, 'the list view does not ship template payloads');

  const filtered = await api('/api/admin/emails?template=order-confirmation', { token: adminToken });
  assert.ok(filtered.body.data.every((entry) => entry.template === 'order-confirmation'));

  const forbidden = await api('/api/admin/emails', { token: shopperToken });
  assert.equal(forbidden.status, 403, 'customers cannot read the mail log');

  // Force a failure, then let support replay it.
  email.setTransportForTesting({ sendMail: async () => { throw new Error('mailbox unavailable'); } });
  const order = await Order.findOne({ status: 'cancelled' });
  await api(`/api/orders/${order.id}/status`, { method: 'PATCH', token: adminToken, body: { status: 'processing', note: 'Reopened for a resend test' } });
  await IntegrationEvent.updateMany({ provider: 'email', status: 'pending' }, { $set: { nextAttemptAt: new Date(0) } });
  await processPendingEmails({ log: silentLogger });

  const failedList = await api('/api/admin/emails?status=failed', { token: adminToken });
  assert.ok(failedList.body.data.length > 0, 'failures are visible to support');
  const failedId = failedList.body.data[0]._id;

  email.setTransportForTesting({ sendMail: async () => ({ messageId: '<resent@smtp.test.invalid>' }) });
  const resent = await api(`/api/admin/emails/${failedId}/resend`, { method: 'POST', token: adminToken });
  assert.equal(resent.status, 200, JSON.stringify(resent.body));
  assert.equal(resent.body.data.queued, true);
  // Drain until the outbox is empty: a resend competes with every other due message.
  for (let pass = 0; pass < 5; pass += 1) {
    const drained = await processPendingEmails({ limit: 50, log: silentLogger });
    if (drained.length === 0) break;
  }
  const afterResend = await EmailLog.findById(failedId);
  assert.equal(afterResend.status, 'sent', 'the resend goes out through the recovered provider');
  assert.equal(afterResend.providerMessageId, '<resent@smtp.test.invalid>');

  const auditLogs = await api('/api/admin/audit-logs?action=email.resend', { token: adminToken });
  assert.ok(auditLogs.body.data.some((entry) => entry.action === 'email.resend'), 'resends are audited');

  const missing = await api(`/api/admin/emails/${new mongoose.Types.ObjectId()}/resend`, { method: 'POST', token: adminToken });
  assert.equal(missing.status, 404);
  email.setTransportForTesting(null);
});

maybeTest('the mail worker dead-letters an undeliverable message after the backoff ladder', async () => {
  email.setTransportForTesting({ sendMail: async () => { throw new Error('recipient address rejected'); } });
  await IntegrationEvent.create({
    provider: 'email',
    direction: 'outbound',
    eventType: 'email.send',
    idempotencyKey: `email.deadletter.${Date.now()}`,
    payload: { type: 'email.send', to: 'bounce@example.com', subject: 'Dead letter probe', html: '<p>probe</p>', text: 'probe' },
    status: 'pending',
  });
  for (let attempt = 0; attempt < email.BACKOFF_MS.length; attempt += 1) {
    await IntegrationEvent.updateMany({ provider: 'email', status: 'failed' }, { $set: { nextAttemptAt: new Date(0) } });
    await processPendingEmails({ log: silentLogger });
  }
  const dead = await IntegrationEvent.findOne({ eventType: 'email.send', 'payload.to': 'bounce@example.com' }).sort({ createdAt: -1 });
  assert.ok(dead, 'the probe event exists');
  assert.equal(dead.status, 'dead_letter', 'exhausted retries become a dead letter instead of looping forever');
  assert.equal(dead.attempts, email.BACKOFF_MS.length);
  assert.match(dead.lastError, /recipient address rejected/);
  email.setTransportForTesting(null);
});

maybeTest('returns list exposes the order and customer the console needs', async () => {
  const adminLogin = await api('/api/auth/login', { method: 'POST', body: { email: 'email-admin@example.com', password: 'AdminPass12345' } });
  const adminToken = accessTokenFrom(adminLogin.setCookie);
  const list = await api('/api/returns', { token: adminToken });
  assert.equal(list.status, 200);
  assert.ok(list.body.data.length > 0);
  const row = list.body.data[0];
  assert.ok(row.orderId.orderNumber, 'the order number is populated for the returns queue');
  assert.ok(row.customerId.email, 'the customer is populated for the returns queue');
  assert.ok(await ReturnRequest.findById(row._id));
});
