const {
  layout,
  textFooter,
  heading,
  paragraph,
  eyebrow,
  keyValue,
  escapeHtml,
  inr,
  dateLabel,
  BRAND,
  SANS,
} = require('./layout');
const { normalizeOrder, paymentLabel } = require('./order-helpers');

/**
 * Sent by `POST /api/refunds/:orderId` once the provider accepted the refund.
 *
 * The provider's own status wording is deliberately kept out of the headline: `pending` in
 * Razorpay is normal and reading it as a failure generates support tickets.
 *
 * @param {{order: object, firstName?: string, refund?: {id?: string, amountRupees?: number, status?: string}, reason?: string}} data
 */
module.exports = function refundProcessed(data = {}, ctx) {
  const order = normalizeOrder(data.order);
  const firstName = String(data.firstName || '').trim() || (order.customerName || '').split(' ')[0];
  const refund = data.refund || {};
  // `amountRupees` is the contract — Razorpay reports paise, so the route converts before calling.
  const amount = Number(refund.amountRupees) > 0 ? Number(refund.amountRupees) : order.amounts.total;
  const reason = String(data.reason || '').trim();
  const subject = `Refund initiated · ${inr(amount)} for order ${order.orderNumber}`;
  const preheader = `Back to your ${paymentLabel(order.paymentMethod).toLowerCase()} in 3–7 working days.`;

  const body = `
      ${eyebrow('Refund')}
      ${heading(`${inr(amount)} is on its way back`)}
      ${paragraph(`Hi${firstName ? ` ${firstName}` : ''}, we have initiated a refund against order ${order.orderNumber}. It is credited to the original payment method — no action is needed from you.`)}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 20px;background:${BRAND.cream};border:1px solid ${BRAND.line};border-radius:14px;">
        <tr><td style="padding:16px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${keyValue('Order number', order.orderNumber, { strong: true })}
            ${keyValue('Refund amount', inr(amount), { strong: true })}
            ${keyValue('Refunded to', paymentLabel(order.paymentMethod))}
            ${refund.id ? keyValue('Provider refund id', refund.id) : ''}
            ${keyValue('Initiated on', dateLabel(new Date()))}
            ${keyValue('Expected by', dateLabel(new Date(Date.now() + 7 * 86400000)))}
          </table>
        </td></tr>
      </table>

      ${
        reason
          ? `<p style="margin:0 0 16px;font-family:${SANS};font-size:13px;line-height:1.65;color:${BRAND.muted};">Reason recorded: <strong style="color:${BRAND.ink};font-weight:600;">${escapeHtml(reason)}</strong></p>`
          : ''
      }

      ${
        order.items.length
          ? `<div style="margin-bottom:18px;">${eyebrow('Refunded against')}
            <p style="margin:0;font-family:${SANS};font-size:13.5px;line-height:1.8;color:${BRAND.ink};">
              ${order.items.map((item) => escapeHtml(`${item.quantity} × ${item.name}${item.size ? ` · Size ${item.size}` : ''}`)).join('<br />')}
            </p></div>`
          : ''
      }

      <p style="margin:0;padding-top:16px;border-top:1px solid ${BRAND.line};font-family:${SANS};font-size:12.5px;line-height:1.7;color:${BRAND.muted};">
        Card and UPI refunds normally settle in 3–7 working days; netbanking can take up to 10. Cash-on-delivery amounts are returned to the bank account you share with our support team.
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
    `Hi${firstName ? ` ${firstName}` : ''}, we have initiated a refund against order ${order.orderNumber}.\n\n` +
    `Order number: ${order.orderNumber}\n` +
    `Refund amount: ${inr(amount)}\n` +
    `Refunded to: ${paymentLabel(order.paymentMethod)}\n` +
    (refund.id ? `Provider refund id: ${refund.id}\n` : '') +
    `Initiated on: ${dateLabel(new Date())}\n` +
    `Expected by: ${dateLabel(new Date(Date.now() + 7 * 86400000))}\n` +
    (reason ? `\nReason recorded: ${reason}\n` : '') +
    `\nCard and UPI refunds normally settle in 3–7 working days; netbanking can take up to 10.\n` +
    textFooter({ supportEmail: ctx.supportEmail, storefrontUrl: ctx.storefrontUrl });

  return { subject, html, text, transactional: true };
};
