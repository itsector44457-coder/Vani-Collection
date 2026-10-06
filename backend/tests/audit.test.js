'use strict';

/**
 * Audit middleware coverage.
 *
 * These are pure tests: the middleware is exercised with fake req/res objects and `AuditLog.create`
 * is mocked, so no MongoDB is needed. The audit trail is the only record of who changed what in the
 * admin console, so the entity id resolution and the "never break the response" guarantees are worth
 * pinning down explicitly.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const AuditLog = require('../models/AuditLog');
const { audit } = require('../src/middleware/audit');

/** Runs the middleware with a stubbed AuditLog.create and returns the rows it would have written. */
function runAudit(t, action, entity, { params = {}, statusCode = 200, user = { _id: 'u1', email: 'admin@example.com' }, ip = '103.21.58.4', userAgent = 'Mozilla/5.0', requestId = 'req_1', headers = {} } = {}) {
  const created = [];
  t.mock.method(AuditLog, 'create', async (doc) => { created.push(doc); return doc; });

  const req = {
    params,
    user,
    ip,
    // The pino request-id middleware hangs the correlation id off `req.id`.
    id: requestId,
    get: (name) => (name.toLowerCase() === 'user-agent' ? userAgent : headers[name.toLowerCase()]),
  };
  const res = new EventEmitter();
  res.statusCode = statusCode;

  let nextCalled = false;
  audit(action, entity)(req, res, () => { nextCalled = true; });
  res.emit('finish');

  return { created, nextCalled };
}

test('audit() calls next synchronously so it never delays the response', (t) => {
  const { nextCalled } = runAudit(t, 'test.action', 'Thing');
  assert.equal(nextCalled, true);
});

test('audit() records the actor, action, entity and request metadata', (t) => {
  const { created } = runAudit(t, 'refund.process', 'Order', { params: { id: 'order-1' } });
  assert.equal(created.length, 1);
  assert.deepEqual(created[0], {
    actorId: 'u1',
    actorEmail: 'admin@example.com',
    action: 'refund.process',
    entity: 'Order',
    entityId: 'order-1',
    ip: '103.21.58.4',
    userAgent: 'Mozilla/5.0',
    requestId: 'req_1',
  });
});

test('audit() resolves entityId from the common param spellings, in order', (t) => {
  // Routes do not all name their param `id`; an audit row without an entity id is close to useless.
  const cases = [
    [{ id: 'a', orderId: 'b', sku: 'C', code: 'D' }, 'a'],
    [{ orderId: 'b', sku: 'C' }, 'b'],
    [{ sku: 'VC-SR-02-DW' }, 'VC-SR-02-DW'],
    [{ eventId: 'e1' }, 'e1'],
    [{ code: 'FEST10' }, 'FEST10'],
    [{}, undefined],
  ];
  for (const [params, expected] of cases) {
    const { created } = runAudit(t, 'x.y', 'Thing', { params });
    assert.equal(created[0].entityId, expected, `params ${JSON.stringify(params)}`);
  }
});

test('audit() writes nothing when the response failed', (t) => {
  for (const statusCode of [400, 401, 403, 404, 422, 500]) {
    const { created } = runAudit(t, 'coupon.create', 'Coupon', { statusCode, params: { id: 'c1' } });
    assert.equal(created.length, 0, `status ${statusCode} should not be audited`);
  }
});

test('audit() still records the row when req.user is absent, without an actor', (t) => {
  // `null` rather than `undefined` so the helper's default does not kick in. A successful admin
  // write with no user would be a routing bug, so it is worth leaving a trace of.
  const { created } = runAudit(t, 'inventory.adjust', 'Inventory', { user: null, params: { sku: 'VC-SR-02-DW' } });
  assert.equal(created.length, 1);
  assert.equal(created[0].actorEmail, undefined);
  assert.equal(created[0].actorId, undefined);
  assert.equal(created[0].entityId, 'VC-SR-02-DW');
});

test('audit() survives a database failure without throwing at the caller', async (t) => {
  t.mock.method(AuditLog, 'create', async () => { throw new Error('mongo is down'); });

  const req = { params: { id: 'x' }, user: { _id: 'u1', email: 'a@b.com' }, ip: '1.2.3.4', get: () => 'ua' };
  const res = new EventEmitter();
  res.statusCode = 200;

  let nextCalled = false;
  // The `.catch(() => {})` inside the middleware must swallow this; an unhandled rejection would
  // crash the process long after the shopper got their response.
  audit('email.resend', 'EmailLog')(req, res, () => { nextCalled = true; });
  res.emit('finish');

  assert.equal(nextCalled, true);
  await new Promise((resolve) => setImmediate(resolve));
});
