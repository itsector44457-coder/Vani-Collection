const { layout, textFooter, heading, paragraph, eyebrow } = require('./layout');

module.exports = function accountEmailChanged(data = {}, ctx) {
  const firstName = String(data.firstName || '').trim();
  const email = String(data.email || '').trim();
  const subject = 'Your Vani Collection account email changed';
  const preheader = 'A security update was made to your Vani Collection account.';
  const body = `
      ${eyebrow('Security notification')}
      ${heading('Account email updated')}
      ${paragraph(`Hi${firstName ? ` ${firstName}` : ''}, the email address for your Vani Collection account was changed.`)}
      ${paragraph(`The account now uses ${email}. If you did not make this change, contact support immediately.`)}`;
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
    `Hi${firstName ? ` ${firstName}` : ''}, your account email was changed to ${email}.\n` +
    'If you did not make this change, contact support immediately.\n\n' +
    textFooter({ supportEmail: ctx.supportEmail, storefrontUrl: ctx.storefrontUrl });
  return { subject, html, text, transactional: true };
};
