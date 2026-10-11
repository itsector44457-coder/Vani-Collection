const { layout, textFooter, heading, paragraph, eyebrow, escapeHtml, BRAND, SANS } = require('./layout');

module.exports = function signupOtp(data = {}, ctx) {
  const firstName = String(data.firstName || '').trim();
  const code = String(data.code || '');
  const subject = 'Your Vani Collection verification code';
  const preheader = 'Enter this one-time code to finish creating your account.';
  const body = `
      ${eyebrow('Verify your email')}
      ${heading('Your verification code')}
      ${paragraph(`Hi${firstName ? ` ${firstName}` : ''}, enter this code to verify your email and create your Vani Collection account.`)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;background:${BRAND.cream};border:1px solid ${BRAND.line};border-radius:14px;">
        <tr><td align="center" style="padding:22px 16px;font-family:${SANS};font-size:32px;font-weight:700;letter-spacing:10px;color:${BRAND.crimson};">
          ${escapeHtml(code)}
        </td></tr>
      </table>
      ${paragraph('This code expires in 10 minutes. If you did not request it, you can ignore this email.', 'margin-top:20px;font-size:13px;')}`;
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
    `Hi${firstName ? ` ${firstName}` : ''}, your Vani Collection verification code is ${code}.\n` +
    'It expires in 10 minutes. If you did not request it, ignore this email.\n\n' +
    textFooter({ supportEmail: ctx.supportEmail, storefrontUrl: ctx.storefrontUrl });
  return { subject, html, text, transactional: true };
};
