const { layout, textFooter, heading, paragraph, eyebrow, bulletproofButton, escapeHtml, BRAND, SANS } = require('./layout');

/**
 * Sent right after `POST /api/auth/register`.
 * Non-transactional in spirit (a marketing-adjacent greeting), so it carries the unsubscribe link.
 *
 * @param {{firstName?: string, lastName?: string, email?: string}} data
 * @param {{storefrontUrl: string, supportEmail: string, logoUrl?: string}} ctx
 */
module.exports = function welcome(data = {}, ctx) {
  const firstName = String(data.firstName || '').trim();
  const name = firstName || 'there';
  const subject = `Welcome to Vani Collection${firstName ? `, ${firstName}` : ''}`;
  const preheader = 'Your account is live — 100-count mul cotton, Bagru handblock prints and festive heirlooms await.';

  const perks = [
    ['Track every order', 'Live AWB tracking and status emails at each step of fulfilment.'],
    ['Save your wishlist', 'Pieces you love stay synced across every device you sign in from.'],
    ['Earn rewards', 'Points on every delivered order, redeemable against your next purchase.'],
  ]
    .map(
      ([title, copy]) => `
        <tr>
          <td style="padding:0 0 14px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="top" width="10" style="padding-top:7px;"><span style="display:block;width:6px;height:6px;border-radius:50%;background:${BRAND.gold};font-size:0;line-height:0;">&nbsp;</span></td>
                <td valign="top">
                  <p style="margin:0;font-family:${SANS};font-size:14px;font-weight:700;color:${BRAND.ink};">${escapeHtml(title)}</p>
                  <p style="margin:3px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${BRAND.muted};">${escapeHtml(copy)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    )
    .join('');

  const body = `
      ${eyebrow('Namaste')}
      ${heading(`Welcome, ${name}`)}
      ${paragraph('Your Vani Collection account is ready. Every piece in our atelier is hand-spun, hand-block printed and finished by artisans we work with directly — and now you can follow each of them from the loom to your doorstep.')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;">${perks}</table>
      ${bulletproofButton(`${ctx.storefrontUrl}/products`, 'Start exploring the collection')}
      ${paragraph('Start with the Summer Bagru Edit in pure mul cotton, or jump straight to the festive heirlooms in Chanderi silk.', 'margin-top:18px;text-align:center;font-size:13px;')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;background:${BRAND.cream};border:1px solid ${BRAND.line};border-radius:14px;">
        <tr><td style="padding:16px 18px;">
          <p style="margin:0 0 4px;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND.crimson};">Your account</p>
          <p style="margin:0;font-family:${SANS};font-size:13.5px;color:${BRAND.ink};">${escapeHtml(data.email || '')}</p>
        </td></tr>
      </table>`;

  const html = layout({
    subject,
    preheader,
    body,
    transactional: false,
    storefrontUrl: ctx.storefrontUrl,
    supportEmail: ctx.supportEmail,
    logoUrl: ctx.logoUrl,
    unsubscribeUrl: data.unsubscribeUrl || '',
  });

  const text = `${subject}\n${'='.repeat(subject.length)}\n\nWelcome${firstName ? `, ${firstName}` : ''} — your Vani Collection account is live.\n\n` +
    `• Track every order — live AWB tracking and status emails at each step.\n` +
    `• Save your wishlist — synced across every device you sign in from.\n` +
    `• Earn rewards — points on every delivered order.\n\n` +
    `Start exploring: ${ctx.storefrontUrl}/products\n` +
    (data.email ? `Signed in as: ${data.email}\n` : '') +
    textFooter({ supportEmail: ctx.supportEmail, storefrontUrl: ctx.storefrontUrl, transactional: false, unsubscribeUrl: data.unsubscribeUrl || '' });

  return { subject, html, text, transactional: false };
};
