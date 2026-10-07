const {
  layout,
  textFooter,
  heading,
  paragraph,
  eyebrow,
  bulletproofButton,
  keyValue,
  orderItemsTable,
  totalsTable,
  escapeHtml,
  inr,
  BRAND,
  SANS,
} = require('./layout');
const { normalizeOrder, paymentLabel } = require('./order-helpers');

/**
 * Sent by `POST /api/orders/:id/cancel`.
 *
 * The copy differs by payment method: a COD cancellation simply releases the reservation, while a
 * captured prepaid amount sets a refund expectation (3–7 working days back to the source).
 *
 * @param {{order: object, firstName?: string, reason?: string}} data
 */
module.exports = function orderCancelled(data = {}, ctx) {
  const order = normalizeOrder(data.order);
  const firstName = String(data.firstName || '').trim() || (order.customerName || '').split(' ')[0];
  const reason = String(data.reason || '').trim();
  const isCod = String(order.paymentMethod).toLowerCase() === 'cod';
  const wasPaid = String(order.paymentStatus).toLowerCase() === 'paid';
  const subject = `Order cancelled · ${order.orderNumber}`;
  const preheader = isCod
    ? 'Nothing was charged — the reservation on your pieces has been released.'
    : `${order.totals.total} returns to your original payment method in 3–7 working days.`;

  const refundLine = isCod
    ? 'This was a cash-on-delivery order, so nothing was charged and there is nothing to refund.'
    : wasPaid
    ? `${inr(order.amounts.total)} has been queued for refund to your original payment method. Banks usually post it within 3–7 working days.`
    : 'No payment was captured for this order, so nothing will be charged.';

  const body = `
      ${eyebrow('Cancellation')}
      ${heading(`Order ${order.orderNumber} is cancelled`)}
      ${paragraph(`Hi${firstName ? ` ${firstName}` : ''}, this order has been cancelled and the reserved stock released. If this was not you, reply to this email and we will look into it straight away.`)}

      ${
        reason
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 16px;background:${BRAND.cream};border:1px solid ${BRAND.line};border-radius:14px;">
              <tr><td style="padding:13px 16px;">
                <p style="margin:0;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND.crimson};">Reason</p>
                <p style="margin:5px 0 0;font-family:${SANS};font-size:13.5px;line-height:1.6;color:${BRAND.ink};">${escapeHtml(reason)}</p>
              </td></tr>
            </table>`
          : ''
      }

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:6px;">
        <tr><td style="padding:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${keyValue('Order number', order.orderNumber, { strong: true })}
            ${keyValue('Placed on', order.createdAt)}
            ${keyValue('Payment', paymentLabel(order.paymentMethod))}
          </table>
        </td></tr>
      </table>

      ${eyebrow('Cancelled items')}
      ${orderItemsTable(order.items)}
      ${totalsTable(order.amounts)}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;background:${isCod ? BRAND.cream : '#f7f2ec'};border:1px solid ${BRAND.gold};border-radius:14px;">
        <tr><td style="padding:15px 17px;">
          <p style="margin:0 0 5px;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND.crimson};">About your money</p>
          <p style="margin:0;font-family:${SANS};font-size:13.5px;line-height:1.7;color:${BRAND.ink};">${escapeHtml(refundLine)}</p>
        </td></tr>
      </table>

      <div style="margin-top:26px;">
        ${bulletproofButton(`${ctx.storefrontUrl}/products`, 'Browse the collection again')}
      </div>`;

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
    `Hi${firstName ? ` ${firstName}` : ''}, order ${order.orderNumber} has been cancelled and the reserved stock released.\n\n` +
    (reason ? `Reason: ${reason}\n\n` : '') +
    `Placed on: ${order.createdAt}\nPayment: ${paymentLabel(order.paymentMethod)}\nOrder total: ${order.totals.total}\n\n` +
    `Cancelled items\n---------------\n${order.items.map((item) => `  • ${item.quantity} × ${item.name}${item.size ? ` (Size ${item.size})` : ''} — ${inr(item.lineTotal)}`).join('\n')}\n\n` +
    `${refundLine}\n\n` +
    `Browse the collection: ${ctx.storefrontUrl}/products\n` +
    textFooter({ supportEmail: ctx.supportEmail, storefrontUrl: ctx.storefrontUrl });

  return { subject, html, text, transactional: true };
};
