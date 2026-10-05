const crypto = require('crypto');

const asBuffer = (value) => (Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value ?? {})));

function signHmac(secret, payload) {
  return crypto.createHmac('sha256', secret).update(asBuffer(payload)).digest('hex');
}

function safeCompare(a = '', b = '') {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

const verifyHmac = (secret, payload, signature) => safeCompare(signHmac(secret, payload), signature);

module.exports = { signHmac, verifyHmac, safeCompare };
