const { layout, textFooter, heading, paragraph, eyebrow, bulletproofButton, escapeHtml, BRAND, SANS } = require('./layout');

/**
 * Optional template — the signup flow does not gate on a verified address today, but the route can
 * start sending this the moment `emailVerified` is added to the User model.
 *
 * @param {{firstName?: string, verificationUrl: string}} data
 */
module.exports = function emailVerification(data = {}, ctx) {
  const firstName = String(data.firstName || '').trim();
  const verificationUrl = String(data.verificationUrl || '');
  const subject = 'Confirm your email address';
  const preheader = 'One tap and your Vani Collection account is fully verified.';

  const body = `
      ${eyebrow('Almost there')}
      ${heading('Confirm your email')}
      ${paragraph(`Hi${firstName ? ` ${firstName}` : ''}, tap the button below to confirm this email address belongs to you.`)}
      ${bulletproofButton(verificationUrl, 'Confirm email address')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;background:${BRAND.cream};border:1px solid ${BRAND.line};border-radius:14px;">
        <tr><td style="padding:14px 16px;">
          <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.6;color:${BRAND.muted};word-break:break-all;">
            Button not working? Open this link:
            <a href="${escapeHtml(verificationUrl)}" style="color:${BRAND.crimson};text-decoration:underline;word-break:break-all;">${escapeHtml(verificationUrl)}</a>
          </p>
        </td></tr>
      </table>
      ${paragraph('If you did not create a Vani Collection account, no action is needed — this invitation simply expires.', 'margin-top:20px;font-size:13px;')}`;

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
    `Hi${firstName ? ` ${firstName}` : ''}, confirm your email address to finish setting up your Vani Collection account.\n\n` +
    `Confirm: ${verificationUrl}\n\n` +
    `Did not sign up? Ignore this email and the invitation expires on its own.\n` +
    textFooter({ supportEmail: ctx.supportEmail, storefrontUrl: ctx.storefrontUrl });

  return { subject, html, text, transactional: true };
};
