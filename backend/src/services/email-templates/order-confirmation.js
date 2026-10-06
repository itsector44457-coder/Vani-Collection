const {
  layout,
  textFooter,
  heading,
  paragraph,
  eyebrow,
  bulletproofButton,
  orderItemsTable,
  totalsTable,
  addressBlock,
  escapeHtml,
  inr,
  lines,
  BRAND,
  SANS,
} = require('./layout');
const { normalizeOrder, paymentLabel, oneLineAddress } = require('./order-helpers');

/**
 * Sent by `POST /api/orders` to the shopper's account email or the guest email on the order.
 *
 * @param {{order: object, firstName?: string, trackUrl?: string}} data
 */
module.exports = function orderConfirmation(data = {}, ctx) {
  const order = normalizeOrder(data.order);
  const firstName = String(data.firstName || '').trim() || (order.customerName || '').split(' ')[0];
  const subject = `Order confirmed · ${order.orderNumber}`;
  const preheader = `${order.items.length} piece${order.items.length === 1 ? '' : 's'} · ${order.totals.total} · we will email you the moment it ships.`;
  const trackUrl = data.trackUrl || `${ctx.storefrontUrl}/account/track`;
  const isCod = String(order.paymentMethod).toLowerCase() === 'cod';

  const paymentNote = isCod
    ? `Payment method: ${paymentLabel(order.paymentMethod)} — please keep ${order.totals.total} ready for the courier.`
    : `Payment method: ${paymentLabel(order.paymentMethod)}`;

  const body = `
      ${eyebrow('Thank you')}
      ${heading(`Order ${order.orderNumber} is confirmed`)}
      ${paragraph(`Hi${firstName ? ` ${firstName}` : ''}, your pieces are reserved with our atelier. We will email you at every step — packed, shipped with a tracking number, and delivered.`)}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 18px;background:${BRAND.cream};border:1px solid ${BRAND.line};border-radius:14px;">
        <tr>
          <td style="padding:14px 16px;font-family:${SANS};font-size:13px;line-height:1.7;color:${BRAND.ink};">
            <strong style="font-weight:700;">${escapeHtml(order.orderNumber)}</strong>
            &nbsp;·&nbsp; ${escapeHtml(order.createdAt)}
            &nbsp;·&nbsp; ${escapeHtml(paymentNote)}
          </td>
        </tr>
      </table>

      ${eyebrow('In this order')}
      ${orderItemsTable(order.items)}
      ${totalsTable(order.amounts)}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
        <tr>
          ${addressBlock('Shipping to', order.shippingAddress)}
          ${addressBlock('Billing', order.billingAddress)}
        </tr>
      </table>

      <div style="margin-top:26px;">
        ${bulletproofButton(trackUrl, 'Track this order')}
      </div>

      <p style="margin:20px 0 0;padding-top:16px;border-top:1px solid ${BRAND.line};font-family:${SANS};font-size:12.5px;line-height:1.7;color:${BRAND.muted};">
        Handcrafted pieces are made to order, so dispatch usually takes 2–3 working days. Free shipping applies above ${escapeHtml(inr(1999))}, and exchanges are open for 7 days after delivery.
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

  const itemList = order.items
    .map((item) => `  • ${item.quantity} × ${item.name}${item.size ? ` (Size ${item.size})` : ''} — ${inr(item.lineTotal)}`)
    .join('\n');

  const text = `${subject}\n${'='.repeat(subject.length)}\n\n` +
    `Hi${firstName ? ` ${firstName}` : ''}, thank you — order ${order.orderNumber} is confirmed.\n\n` +
    `Placed on: ${order.createdAt}\n${paymentNote}\n\n` +
    `Items\n-----\n${itemList}\n\n` +
    `Subtotal: ${order.totals.subtotal}\n` +
    (Number(order.amounts.discount) > 0 ? `Discount${order.amounts.couponCode ? ` (${order.amounts.couponCode})` : ''}: −${order.totals.discount}\n` : '') +
    (Number(order.amounts.shipping) > 0 ? `Shipping: ${order.totals.shipping}\n` : 'Shipping: Free\n') +
    `GST (inclusive): ${order.totals.tax}\n` +
    `Total: ${order.totals.total}\n\n` +
    `Shipping to\n-----------\n${lines([order.customerName, oneLineAddress(order.shippingAddress), order.shippingAddress?.phone].filter(Boolean))}\n\n` +
    `Track this order: ${trackUrl}\n\n` +
    `Handcrafted pieces are made to order, so dispatch usually takes 2–3 working days. Free shipping applies above ₹1,999 and exchanges are open for 7 days after delivery.\n` +
    textFooter({ supportEmail: ctx.supportEmail, storefrontUrl: ctx.storefrontUrl });

  return { subject, html, text, transactional: true };
};
