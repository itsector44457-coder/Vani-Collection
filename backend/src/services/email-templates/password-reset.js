const { layout, textFooter, heading, paragraph, eyebrow, bulletproofButton, escapeHtml, BRAND, SANS } = require('./layout');

/**
 * Sent by `POST /api/auth/forgot-password`.
 *
 * Transactional and security-sensitive: the reset link is the single most valuable string in the
 * email, so it is also written out in full in the plain-text alternative (some clients refuse to
 * render buttons) and the copy never confirms whether the address exists.
 *
 * @param {{firstName?: string, resetUrl: string, expiresInMinutes?: number}} data
 */
module.exports = function passwordReset(data = {}, ctx) {
  const firstName = String(data.firstName || '').trim();
  const expiresInMinutes = Number(data.expiresInMinutes) > 0 ? Number(data.expiresInMinutes) : 30;
  const subject = 'Reset your Vani Collection password';
  const preheader = `Use this link within ${expiresInMinutes} minutes to choose a new password.`;
  const resetUrl = String(data.resetUrl || '');

  const body = `
      ${eyebrow('Account security')}
      ${heading('Reset your password')}
      ${paragraph(`Hi${firstName ? ` ${firstName}` : ''}, we received a request to reset the password for your Vani Collection account.`)}
      ${bulletproofButton(resetUrl, 'Choose a new password')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;background:${BRAND.cream};border:1px solid ${BRAND.line};border-radius:14px;">
        <tr><td style="padding:14px 16px;">
          <p style="margin:0 0 6px;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND.crimson};">This link expires in ${escapeHtml(expiresInMinutes)} minutes</p>
          <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.6;color:${BRAND.muted};word-break:break-all;">
            <a href="${escapeHtml(resetUrl)}" style="color:${BRAND.crimson};text-decoration:underline;word-break:break-all;">${escapeHtml(resetUrl)}</a>
          </p>
        </td></tr>
      </table>
      ${paragraph('If you did not ask for this, you can safely ignore this email — your password stays exactly as it is. Signing in elsewhere is not affected.', 'margin-top:20px;font-size:13px;')}
      <p style="margin:16px 0 0;padding-top:14px;border-top:1px solid ${BRAND.line};font-family:${SANS};font-size:11.5px;line-height:1.6;color:${BRAND.muted};">
        For your safety we never send your password by email, and our team will never ask you for it.
      </p>`;

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
    `Hi${firstName ? ` ${firstName}` : ''}, we received a request to reset your Vani Collection password.\n\n` +
    `Choose a new password: ${resetUrl}\n\n` +
    `This link expires in ${expiresInMinutes} minutes and can be used once.\n\n` +
    `If you did not request this, ignore this email — your password stays as it is.\n` +
    `We never send your password by email and our team will never ask you for it.\n` +
    textFooter({ supportEmail: ctx.supportEmail, storefrontUrl: ctx.storefrontUrl });

  return { subject, html, text, transactional: true };
};
