const { layout, textFooter, heading, paragraph, eyebrow, escapeHtml, BRAND, SANS } = require('./layout');

module.exports = function staffInvitation(data = {}, ctx) {
  const firstName = String(data.firstName || '').trim();
  const email = String(data.email || '').trim();
  const temporaryPassword = String(data.temporaryPassword || '');
  const subject = 'Your Vani Collection admin account';
  const preheader = 'Your staff account is ready. Change the temporary password after your first sign-in.';
  const body = `
      ${eyebrow('Staff access')}
      ${heading(`Welcome${firstName ? `, ${firstName}` : ''}`)}
      ${paragraph('A Vani Collection staff account has been created for you. Use the credentials below to sign in, then set a new password before accessing the admin console.')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;background:${BRAND.cream};border:1px solid ${BRAND.line};border-radius:14px;">
        <tr><td style="padding:18px;font-family:${SANS};font-size:14px;line-height:1.8;color:${BRAND.ink};">
          <strong>Email:</strong> ${escapeHtml(email)}<br />
          <strong>Temporary password:</strong> <span style="font-family:monospace;">${escapeHtml(temporaryPassword)}</span>
        </td></tr>
      </table>
      ${paragraph('This temporary password is for first sign-in only. Do not forward this email; contact the person who invited you if you were not expecting it.', 'margin-top:20px;font-size:13px;')}`;
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
    `Hi${firstName ? ` ${firstName}` : ''}, a Vani Collection admin account is ready for you.\n\n` +
    `Sign in at ${ctx.storefrontUrl}/admin/login\nEmail: ${email}\nTemporary password: ${temporaryPassword}\n\n` +
    'Change the temporary password immediately after your first sign-in. Do not forward this email.\n\n' +
    textFooter({ supportEmail: ctx.supportEmail, storefrontUrl: ctx.storefrontUrl });
  return { subject, html, text, transactional: true };
};
