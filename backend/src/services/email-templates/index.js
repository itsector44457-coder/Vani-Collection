/**
 * Template registry.
 *
 * Every entry is a plain function `(data, ctx) => { subject, html, text, transactional }` where
 * `ctx` is `{ storefrontUrl, supportEmail, logoUrl }`. No build step, no template engine — just
 * JavaScript, so a template can be unit-tested by calling it directly.
 */

const templates = {
  welcome: require('./welcome'),
  'password-reset': require('./password-reset'),
  'password-changed': require('./password-changed'),
  'order-confirmation': require('./order-confirmation'),
  'order-status': require('./order-status'),
  'order-cancelled': require('./order-cancelled'),
  'refund-processed': require('./refund-processed'),
  'return-status': require('./return-status'),
  'email-verification': require('./email-verification'),
};

/** Names accepted by `renderTemplate`. */
const TEMPLATE_NAMES = Object.keys(templates);

/**
 * Templates that are not strictly transactional, so they carry an unsubscribe link (or the
 * provider-safe `{{unsubscribe}}` token) to stay compliant with bulk-mail rules.
 * Everything else — order updates, password resets, refunds — is transactional and must not.
 */
const NON_TRANSACTIONAL = ['welcome'];

const hasTemplate = (name) => Object.prototype.hasOwnProperty.call(templates, name);

module.exports = { templates, TEMPLATE_NAMES, NON_TRANSACTIONAL, hasTemplate };
