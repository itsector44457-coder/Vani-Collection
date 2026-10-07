/**
 * Email delivery service.
 *
 * Design rules this module exists to enforce:
 *
 *  1. EMAIL IS THE ONLY CHANNEL. No WhatsApp, no SMS, no push — there is deliberately no other
 *     notification provider in this codebase.
 *  2. Provider agnostic. We speak SMTP through nodemailer, so Gmail, Amazon SES, Resend, Postmark,
 *     Zoho or Mailgun all work by changing env vars only. No vendor SDK is imported anywhere.
 *  3. A shopper never sees an email failure. Triggers call {@link queueEmail}, which swallows every
 *     error, logs it and returns. Delivery happens later in the integration worker's outbox with
 *     exponential backoff (`email.send`), exactly like the ERP/Shiprocket events.
 *  4. Zero-config boot. With no EMAIL_* / SMTP_* env vars the API still starts, `/health` is green
 *     and every trigger records a `skipped` EmailLog so support can see what would have been sent.
 */

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const IntegrationEvent = require('../../models/IntegrationEvent');
const EmailLog = require('../../models/EmailLog');
const { templates, TEMPLATE_NAMES, hasTemplate, NON_TRANSACTIONAL } = require('./email-templates');

/** Same ladder the integration worker uses, so retries behave identically for every provider. */
const BACKOFF_MS = [30_000, 120_000, 600_000, 3_600_000, 21_600_000];

const noopLogger = { info() {}, warn() {}, error() {}, debug() {} };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let activeConfig = null;
let transport = null;
let transportForTesting = null;

/**
 * Wires the parsed config into the service. Called by `buildApp` (so tests and the route lister get
 * it) and again by `server.js`. Falls back to a lazy `loadConfig()` when nothing was configured —
 * that keeps `require('../services/email')` usable from scripts and workers.
 */
function configureEmail(config) {
  if (config) {
    activeConfig = config;
    // A new config invalidates a cached transport (host/credentials may have changed).
    transport = null;
  }
  return getEmailConfig();
}

function getEmailConfig() {
  if (activeConfig) return activeConfig;
  try {
    // eslint-disable-next-line global-require
    activeConfig = require('../config').loadConfig();
  } catch {
    // Running without a usable environment (a worker in a degraded pod, a script, a unit test):
    // email simply stays disabled instead of taking the process down.
    activeConfig = {
      NODE_ENV: 'test',
      EMAIL_ENABLED: false,
      EMAIL_FROM: 'Vani Collection <care@vanicollection.com>',
      SMTP_PORT: 587,
      SMTP_SECURE: false,
      EMAIL_DEV_CAPTURE: false,
      SUPPORT_EMAIL: 'care@vanicollection.com',
      storefrontUrl: 'http://localhost:3000',
      emailConfigured: false,
    };
  }
  return activeConfig;
}

/** True only when a real SMTP host is present and email is switched on. */
function isEmailConfigured() {
  const config = getEmailConfig();
  return Boolean(config.EMAIL_ENABLED && config.SMTP_HOST);
}

/** True when a message should actually be handed to SMTP (configured and not in dev-capture). */
function shouldDeliver() {
  const config = getEmailConfig();
  return isEmailConfigured() && !config.EMAIL_DEV_CAPTURE;
}

function getTransport() {
  if (transportForTesting) return transportForTesting;
  if (transport) return transport;
  const config = getEmailConfig();
  transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: Number(config.SMTP_PORT) || 587,
    secure: Boolean(config.SMTP_SECURE),
    ...(config.SMTP_USER && config.SMTP_PASS ? { auth: { user: config.SMTP_USER, pass: config.SMTP_PASS } } : {}),
  });
  return transport;
}

/** Test hook: swap in a nodemailer stub so delivery can be asserted without an SMTP server. */
function setTransportForTesting(stub) {
  transportForTesting = stub || null;
  return transportForTesting;
}

/** Test hook: drop cached config/transport state. */
function resetEmailServiceForTesting() {
  activeConfig = null;
  transport = null;
  transportForTesting = null;
}

/* ------------------------------------------------------------------ rendering */

/**
 * Reduces an order (Mongoose doc, lean object or fixture) to the JSON-safe snapshot templates need.
 *
 * Storing the raw document in `EmailLog.data` would drag the whole schema into Mongo and, worse,
 * `JSON.stringify` drops Mongoose's `id` virtual — the admin resend action and the tracking link
 * both need it. So the snapshot is built explicitly and kept small on purpose.
 */
function orderEmailData(order, extra = {}) {
  const plain = typeof order?.toObject === 'function' ? order.toObject() : { ...(order || {}) };
  const snapshot = {
    id: String(plain.id || plain._id || ''),
    orderNumber: plain.orderNumber,
    status: plain.status,
    createdAt: plain.createdAt,
    guestEmail: plain.guestEmail,
    couponCode: plain.couponCode,
    notes: plain.notes,
    amounts: plain.amounts,
    payment: { method: plain.payment?.method, status: plain.payment?.status },
    shipment: plain.shipment,
    shippingAddress: plain.shippingAddress,
    billingAddress: plain.billingAddress,
    items: (plain.items || []).map((item) => ({
      sku: item.sku,
      name: item.name,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      mrp: item.mrp,
      gstRate: item.gstRate,
      taxAmount: item.taxAmount,
      lineTotal: item.lineTotal,
    })),
    statusHistory: (plain.statusHistory || []).slice(-8).map((entry) => ({ status: entry.status, at: entry.at, note: entry.note })),
  };
  return { order: snapshot, ...extra };
}

/** The shopper an order email should go to: the account email, else the guest email on the order. */
function orderRecipient(order, user) {
  const candidates = [order?.shippingAddress?.email, order?.billingAddress?.email, user?.email, order?.guestEmail];
  return candidates.map((value) => String(value || '').trim().toLowerCase()).find((value) => EMAIL_RE.test(value)) || '';
}

/** Context every template receives — brand links and the support inbox. */
function templateContext(data = {}) {
  const config = getEmailConfig();
  return {
    storefrontUrl: String(data.storefrontUrl || config.storefrontUrl || 'http://localhost:3000').replace(/\/+$/, ''),
    supportEmail: data.supportEmail || config.SUPPORT_EMAIL || config.EMAIL_REPLY_TO || 'care@vanicollection.com',
    logoUrl: config.EMAIL_LOGO_URL || '',
  };
}

/**
 * Subjects are plain text, so they are not HTML-escaped — but they must never contain a CR/LF, or
 * a template interpolating shopper input could inject extra mail headers.
 */
function sanitizeSubject(subject) {
  // eslint-disable-next-line no-control-regex
  return String(subject).replace(/[\r\n\0]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}

/**
 * Renders a template without touching the network or the database.
 * @returns {{subject: string, html: string, text: string, transactional: boolean}}
 */
function renderTemplate(name, data = {}) {
  if (!hasTemplate(name)) {
    const error = new Error(`Unknown email template: ${name}`);
    error.code = 'UNKNOWN_EMAIL_TEMPLATE';
    throw error;
  }
  const rendered = templates[name](data || {}, templateContext(data));
  if (!rendered || !rendered.subject || !rendered.html) {
    const error = new Error(`Email template ${name} did not render a subject and html body`);
    error.code = 'EMAIL_RENDER_FAILED';
    throw error;
  }
  return {
    subject: sanitizeSubject(rendered.subject),
    html: String(rendered.html),
    text: String(rendered.text || ''),
    transactional: rendered.transactional !== false && !NON_TRANSACTIONAL.includes(name),
  };
}

/* ------------------------------------------------------------------- queueing */

/** Deterministic outbox key so a double-fired trigger cannot send the same email twice. */
function idempotencyKeyFor({ template, to, dedupeKey }) {
  const suffix = dedupeKey || crypto.randomUUID();
  return `email.send:${template}:${String(to).toLowerCase()}:${suffix}`;
}

function buildMessage({ to, subject, html, text, replyTo, tags }) {
  const config = getEmailConfig();
  const message = {
    from: config.EMAIL_FROM,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
  };
  const reply = replyTo || config.EMAIL_REPLY_TO;
  if (reply) message.replyTo = reply;
  if (tags?.length) message.headers = { 'X-Vani-Tags': tags.join(',') };
  return message;
}

/** Writes the rendered message to the server log — the EMAIL_DEV_CAPTURE / unconfigured path. */
function captureToLog(log, { to, subject, text, html, reason }) {
  const config = getEmailConfig();
  const showBody = config.EMAIL_DEV_CAPTURE || config.NODE_ENV !== 'production';
  const payload = { to, subject, reason };
  if (showBody) {
    payload.text = text;
    // HTML is large; keep the log readable but still fully inspectable in development.
    payload.html = config.EMAIL_DEV_CAPTURE ? html : `${String(html).slice(0, 2000)}…`;
  }
  log.info(payload, `email not sent (${reason})`);
}

/**
 * Best-effort EmailLog write. A missing/unreachable database must never turn into a shopper-facing
 * 500, so every persistence failure is logged and ignored.
 */
async function writeEmailLog(fields, log) {
  try {
    // Round-trip the template input so nothing non-serialisable (a Mongoose doc, a Date subclass,
    // a circular fixture) reaches Mongo and so a later resend re-renders from plain data.
    let data = fields.data;
    try {
      data = data === undefined ? undefined : JSON.parse(JSON.stringify(data));
    } catch {
      data = undefined;
    }
    return await EmailLog.create({ ...fields, data });
  } catch (error) {
    log.warn({ err: error.message, template: fields.template }, 'could not persist EmailLog');
    return null;
  }
}

/**
 * Renders and enqueues a templated email. Never throws.
 *
 * @returns {Promise<{queued?: boolean, skipped?: boolean, id?: string, reason?: string, subject?: string}>}
 */
async function sendEmail({ to, template, data = {}, replyTo, tags, orderId, userId, dedupeKey, log = noopLogger }) {
  const recipient = String(to || '').trim().toLowerCase();
  if (!EMAIL_RE.test(recipient)) {
    log.warn({ to: String(to || ''), template }, 'email skipped — missing or invalid recipient');
    return { skipped: true, reason: 'INVALID_RECIPIENT' };
  }
  if (!hasTemplate(template)) {
    log.error({ template }, 'email skipped — unknown template');
    return { skipped: true, reason: 'UNKNOWN_TEMPLATE' };
  }

  let rendered;
  try {
    rendered = renderTemplate(template, data);
  } catch (error) {
    log.error({ err: error.message, template, to: recipient }, 'email template failed to render');
    return { skipped: true, reason: 'RENDER_FAILED' };
  }

  const emailLog = await writeEmailLog(
    {
      to: recipient,
      template,
      subject: rendered.subject,
      status: 'queued',
      data,
      replyTo: replyTo || getEmailConfig().EMAIL_REPLY_TO || undefined,
      tags: tags || [],
      orderId: orderId || data?.order?.id || data?.order?._id || undefined,
      userId: userId || undefined,
    },
    log
  );

  if (!shouldDeliver()) {
    const reason = isEmailConfigured() ? 'DEV_CAPTURE' : 'EMAIL_NOT_CONFIGURED';
    if (emailLog) {
      emailLog.status = 'skipped';
      emailLog.error = reason;
      await emailLog.save().catch(() => {});
    }
    captureToLog(log, { to: recipient, subject: rendered.subject, text: rendered.text, html: rendered.html, reason });
    return { skipped: true, reason, id: emailLog?.id, subject: rendered.subject };
  }

  return enqueueDelivery({
    emailLog,
    to: recipient,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    replyTo,
    tags,
    dedupeKey: dedupeKey || emailLog?.id,
    template,
    log,
  });
}

/**
 * Enqueues an already-rendered message (used by `sendEmail`, `sendRaw` and the admin resend action).
 * Never throws.
 */
async function enqueueDelivery({ emailLog, to, subject, html, text, replyTo, tags, dedupeKey, template = 'raw', log = noopLogger }) {
  const idempotencyKey = idempotencyKeyFor({ template, to, dedupeKey });
  try {
    await IntegrationEvent.create({
      provider: 'email',
      direction: 'outbound',
      eventType: 'email.send',
      idempotencyKey,
      entityType: 'EmailLog',
      entityId: emailLog?.id,
      status: 'pending',
      payload: {
        type: 'email.send',
        emailLogId: emailLog?.id,
        to,
        subject,
        html,
        text,
        replyTo: replyTo || getEmailConfig().EMAIL_REPLY_TO || undefined,
        tags: tags || [],
      },
    });
    return { queued: true, id: emailLog?.id, idempotencyKey, subject };
  } catch (error) {
    if (error?.code === 11000) {
      log.info({ idempotencyKey }, 'email already queued for this trigger — duplicate suppressed');
      return { skipped: true, reason: 'DUPLICATE', id: emailLog?.id };
    }
    log.error({ err: error.message, to, template }, 'could not enqueue email for delivery');
    if (emailLog) {
      emailLog.status = 'failed';
      emailLog.error = `enqueue failed: ${error.message}`;
      await emailLog.save().catch(() => {});
    }
    return { skipped: true, reason: 'ENQUEUE_FAILED', id: emailLog?.id };
  }
}

/**
 * Same contract as {@link sendEmail} but guaranteed never to reject — this is what routes call.
 * Fire-and-forget is safe: the outbox row is written before the HTTP response is sent.
 */
async function queueEmail(options) {
  try {
    return await sendEmail(options);
  } catch (error) {
    (options?.log || noopLogger).error({ err: error.message, template: options?.template }, 'email queueing failed');
    return { skipped: true, reason: 'QUEUE_FAILED' };
  }
}

/**
 * One-off transactional mail that is already rendered (an ops broadcast, a support reply).
 * Still goes through the outbox, so it inherits the same retries and audit trail.
 */
async function sendRaw({ to, subject, html, text = '', replyTo, tags, orderId, userId, log = noopLogger }) {
  const recipient = String(to || '').trim().toLowerCase();
  if (!EMAIL_RE.test(recipient)) {
    log.warn({ to: String(to || '') }, 'raw email skipped — missing or invalid recipient');
    return { skipped: true, reason: 'INVALID_RECIPIENT' };
  }
  if (!subject || !html) {
    log.warn({ to: recipient }, 'raw email skipped — subject and html are required');
    return { skipped: true, reason: 'INVALID_MESSAGE' };
  }

  const emailLog = await writeEmailLog(
    { to: recipient, template: 'raw', subject, status: 'queued', data: { html, text }, replyTo, tags: tags || [], orderId, userId },
    log
  );

  if (!shouldDeliver()) {
    const reason = isEmailConfigured() ? 'DEV_CAPTURE' : 'EMAIL_NOT_CONFIGURED';
    if (emailLog) {
      emailLog.status = 'skipped';
      emailLog.error = reason;
      await emailLog.save().catch(() => {});
    }
    captureToLog(log, { to: recipient, subject, text, html, reason });
    return { skipped: true, reason, id: emailLog?.id, subject };
  }

  return enqueueDelivery({ emailLog, to: recipient, subject, html, text, replyTo, tags, dedupeKey: emailLog?.id, template: 'raw', log });
}

/* ------------------------------------------------------------------ delivery */

/**
 * Delivers one outbox event. Called from `integration-worker.handleEvent('email.send')`.
 * Throws on failure so the worker applies its backoff ladder and eventually dead-letters the event.
 */
async function deliverOutboxEvent(event, { log = noopLogger } = {}) {
  const payload = event.payload || {};
  if (!payload.to || !payload.subject) throw new Error('email.send payload requires `to` and `subject`');

  const message = buildMessage({
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    replyTo: payload.replyTo,
    tags: payload.tags,
  });

  const emailLog = payload.emailLogId ? await EmailLog.findById(payload.emailLogId).catch(() => null) : null;
  const attempts = Number(event.attempts) || 1;

  if (!isEmailConfigured()) {
    // Provider was disabled between enqueueing and delivery (a rollback, a rotated credential).
    if (emailLog) {
      emailLog.status = 'skipped';
      emailLog.error = 'EMAIL_NOT_CONFIGURED';
      emailLog.attempts = attempts;
      await emailLog.save().catch(() => {});
    }
    captureToLog(log, { to: payload.to, subject: payload.subject, text: payload.text, html: payload.html, reason: 'EMAIL_NOT_CONFIGURED' });
    return { skipped: true, reason: 'EMAIL_NOT_CONFIGURED' };
  }

  try {
    const info = await getTransport().sendMail(message);
    const messageId = info?.messageId || info?.response || undefined;
    if (emailLog) {
      emailLog.status = 'sent';
      emailLog.providerMessageId = messageId;
      emailLog.sentAt = new Date();
      emailLog.attempts = attempts;
      emailLog.error = undefined;
      await emailLog.save().catch(() => {});
    }
    log.info({ to: payload.to, subject: payload.subject, messageId, attempts }, 'email sent');
    return { sent: true, messageId, attempts };
  } catch (error) {
    const exhausted = attempts >= BACKOFF_MS.length;
    if (emailLog) {
      emailLog.status = 'failed';
      emailLog.error = String(error.message || error).slice(0, 500);
      emailLog.attempts = attempts;
      await emailLog.save().catch(() => {});
    }
    log.warn({ to: payload.to, subject: payload.subject, attempts, exhausted, err: error.message }, 'email delivery failed');
    // Re-throw: the worker owns retry scheduling and the dead-letter transition.
    throw error;
  }
}

/**
 * Re-enqueues a previously failed or skipped email (admin console "Resend").
 * The template is re-rendered from the stored input, so a fixed template is picked up immediately.
 * @throws {Error} with `.status`/`.code` — this is a staff-only endpoint, so a loud failure is right.
 */
async function resendEmail(emailLogId, { log = noopLogger } = {}) {
  const emailLog = await EmailLog.findById(emailLogId);
  if (!emailLog) {
    const error = new Error('Email log entry not found');
    error.status = 404;
    error.code = 'EMAIL_NOT_FOUND';
    throw error;
  }

  let rendered;
  if (emailLog.template && hasTemplate(emailLog.template)) {
    rendered = renderTemplate(emailLog.template, emailLog.data || {});
  } else if (emailLog.data?.html) {
    rendered = { subject: emailLog.subject, html: emailLog.data.html, text: emailLog.data.text || '' };
  } else {
    const error = new Error('This email cannot be re-rendered — no template or stored body');
    error.status = 422;
    error.code = 'EMAIL_NOT_RESENDABLE';
    throw error;
  }

  emailLog.status = 'queued';
  emailLog.error = undefined;
  emailLog.subject = rendered.subject;
  await emailLog.save();

  const result = await enqueueDelivery({
    emailLog,
    to: emailLog.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    replyTo: emailLog.replyTo,
    tags: emailLog.tags,
    // A resend is intentionally a new attempt, so the key carries a fresh nonce.
    dedupeKey: `resend-${emailLog.id}-${crypto.randomUUID()}`,
    template: emailLog.template || 'raw',
    log,
  });

  if (result.skipped) {
    emailLog.status = 'failed';
    emailLog.error = `resend skipped: ${result.reason}`;
    await emailLog.save().catch(() => {});
  }
  return { ...result, id: emailLog.id, status: emailLog.status };
}

module.exports = {
  configureEmail,
  getEmailConfig,
  isEmailConfigured,
  shouldDeliver,
  templateContext,
  renderTemplate,
  sendEmail,
  sendRaw,
  queueEmail,
  enqueueDelivery,
  deliverOutboxEvent,
  resendEmail,
  buildMessage,
  orderEmailData,
  orderRecipient,
  setTransportForTesting,
  resetEmailServiceForTesting,
  TEMPLATE_NAMES,
  BACKOFF_MS,
};
