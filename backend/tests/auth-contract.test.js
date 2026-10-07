'use strict';

/**
 * Database-free HTTP contract for password-reset anti-enumeration.
 *
 * The DB-gated e2e test in `email.test.js` also checks persistence and the outbox. This one pins the
 * shopper-visible contract without a MongoDB binary: both addresses get the same 202 and same
 * message, and the only deliberate non-production difference is the reset URL returned for a real
 * account so the flow can be tested without a mail provider.
 */

const assert = require('node:assert/strict');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/vani_auth_contract_test';
process.env.JWT_ACCESS_SECRET = 'auth-contract-access-secret-long-enough';
process.env.JWT_REFRESH_SECRET = 'auth-contract-refresh-secret-long-enough';
process.env.EMAIL_ENABLED = 'false';
process.env.STOREFRONT_URL = 'https://shop.vanicollection.test';

const { loadConfig } = require('../src/config');
const { buildApp } = require('../src/app');
const User = require('../models/User');
const emailService = require('../src/services/email');

const silentLogger = { info() {}, warn() {}, error() {}, debug() {}, child() { return this; } };

test('forgot-password always returns the same 202/message for known and unknown emails', async (t) => {
  const knownEmail = 'known@example.test';
  let emailQueued = 0;
  const knownUser = {
    id: '6650f1a2c3d4e5f6a7b8c901',
    email: knownEmail,
    firstName: 'Meera',
    status: 'active',
    passwordResetTokenHash: undefined,
    passwordResetExpiresAt: undefined,
    save: async () => {},
  };

  t.mock.method(User, 'findOne', (filter) => ({
    select: async () => filter.email === knownEmail ? knownUser : null,
  }));
  t.mock.method(emailService, 'queueEmail', async () => { emailQueued += 1; return { queued: true }; });

  // `auth.js` destructures queueEmail when it is required. Reload that route while the method is
  // mocked, then restore the original module cache so no later test inherits this stub.
  const authPath = require.resolve('../src/routes/auth');
  const previousAuthModule = require.cache[authPath];
  delete require.cache[authPath];
  const server = buildApp({ config: loadConfig(), logger: silentLogger }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    delete require.cache[authPath];
    if (previousAuthModule) require.cache[authPath] = previousAuthModule;
  });

  const call = async (email) => {
    const response = await fetch(`${base}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return { status: response.status, body: await response.json() };
  };

  const known = await call(knownEmail);
  const unknown = await call('nobody@example.test');

  assert.equal(known.status, 202);
  assert.equal(unknown.status, 202);
  assert.equal(known.body.message, unknown.body.message);
  assert.deepEqual(unknown.body.meta, {}, 'unknown addresses get no identifying metadata');
  assert.match(known.body.meta.resetUrl, /^https:\/\/shop\.vanicollection\.test\/reset-password\?token=/);
  assert.equal(emailQueued, 1, 'only a real account queues the reset email');
});
