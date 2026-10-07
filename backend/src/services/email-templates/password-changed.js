const { layout, textFooter, heading, paragraph, eyebrow, bulletproofButton, dateLabel, BRAND, SANS } = require('./layout');

/**
 * Sent by `POST /api/auth/reset-password` once the new password is stored.
 * A password change invalidates every existing refresh token, so the copy says so explicitly.
 *
 * @param {{firstName?: string, changedAt?: Date|string, ip?: string}} data
 */
module.exports = function passwordChanged(data = {}, ctx) {
  const firstName = String(data.firstName || '').trim();
  const changedAt = dateLabel(data.changedAt || new Date());
  const subject = 'Your Vani Collection password was changed';
  const preheader = 'All other devices have been signed out of your account.';

  const body = `
      ${eyebrow('Account security')}
      ${heading('Password changed')}
      ${paragraph(`Hi${firstName ? ` ${firstName}` : ''}, the password for your Vani Collection account was updated on ${changedAt}.`)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;background:${BRAND.cream};border:1px solid ${BRAND.line};border-radius:14px;">
        <tr><td style="padding:14px 16px;">
          <p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.65;color:${BRAND.ink};">
            Every other signed-in session has been ended. Sign in again on the devices you still use.
          </p>
        </td></tr>
      </table>
      ${paragraph('Was this not you? Lock the account immediately and tell us — we can freeze orders and refunds while you get it back.')}
      ${bulletproofButton(`${ctx.storefrontUrl}/account`, 'Review my account', { background: BRAND.wine })}`;

  const html = layout({
    subject,
    preheader,
    body,
    transactional: true,
    storefrontUrl: ctx.storefrontUrl,
    supportEmail: ctx.supportEmail,
    logoUrl: ctx.logoUrl,
  });

  const text = `${subject}\n${'='.repeat(subject.length)}\n\n` +
    `Hi${firstName ? ` ${firstName}` : ''}, the password for your Vani Collection account was updated on ${changedAt}.\n\n` +
    `Every other signed-in session has been ended — sign in again on the devices you still use.\n\n` +
    `Was this not you? Tell us straight away at ${ctx.supportEmail} and review your account: ${ctx.storefrontUrl}/account\n` +
    textFooter({ supportEmail: ctx.supportEmail, storefrontUrl: ctx.storefrontUrl });

  return { subject, html, text, transactional: true };
};
