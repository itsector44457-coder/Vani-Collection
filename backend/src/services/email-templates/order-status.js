const {
  layout,
  textFooter,
  heading,
  paragraph,
  eyebrow,
  bulletproofButton,
  keyValue,
  escapeHtml,
  dateLabel,
  BRAND,
  SANS,
} = require('./layout');
const { normalizeOrder, paymentLabel } = require('./order-helpers');

/**
 * Sent by `PATCH /api/orders/:id/status` and by `POST /api/shipments/:orderId/create`.
 *
 * One template, six statuses — each with its own subject, headline and CTA so the inbox thread
 * reads like a fulfilment story instead of six identical "your order updated" emails.
 */
const VARIANTS = {
  confirmed: {
    label: 'Confirmed',
    eyebrow: 'Payment received',
    heading: 'Your order is confirmed',
    body: 'Payment is captured and your pieces are reserved with the atelier. We will start cutting and stitching shortly.',
    cta: 'Track this order',
  },
  processing: {
    label: 'Processing',
    eyebrow: 'In the atelier',
    heading: 'We are preparing your order',
    body: 'Your pieces are with our artisans now — hand-block printing and finishing take a little longer than factory-made garments, and it shows.',
    cta: 'Track this order',
  },
  packed: {
    label: 'Packed',
    eyebrow: 'Ready to leave',
    heading: 'Your order is packed',
    body: 'Everything is folded in acid-free tissue and sealed. The courier pickup is next, and you will get a tracking number as soon as it is generated.',
    cta: 'Track this order',
  },
  shipped: {
    label: 'Shipped',
    eyebrow: 'On the way',
    heading: 'Your order has shipped',
    body: 'Your parcel is with the courier. Use the tracking number below to follow it to your doorstep.',
    cta: 'Track my parcel',
  },
  delivered: {
    label: 'Delivered',
    eyebrow: 'Delivered',
    heading: 'Your order has arrived',
    body: 'We hope you love it. Exchanges and returns stay open for 7 days from delivery — and a review from you helps another shopper choose well.',
    cta: 'Review your order',
  },
  cancelled: {
    label: 'Cancelled',
    eyebrow: 'Cancelled',
    heading: 'Your order was cancelled',
    body: 'This order has been cancelled and the reserved stock released. Any amount already captured is refunded to the original payment method.',
    cta: 'View my orders',
  },
};

/**
 * @param {{order: object, firstName?: string, status: string, note?: string, trackUrl?: string}} data
 */
module.exports = function orderStatus(data = {}, ctx) {
  const order = normalizeOrder(data.order);
  const status = String(data.status || order.status || '').toLowerCase();
  const variant = VARIANTS[status] || VARIANTS.processing;
  const firstName = String(data.firstName || '').trim() || (order.customerName || '').split(' ')[0];
  const shipment = order.shipment || {};
  const hasShipment = Boolean(shipment.awb || shipment.trackingUrl || shipment.courier);
  const trackUrl = shipment.trackingUrl || data.trackUrl || `${ctx.storefrontUrl}/account/track`;

  const subject = status === 'shipped' && shipment.courier
    ? `Shipped via ${shipment.courier} · ${order.orderNumber}`
    : `${variant.label} · Order ${order.orderNumber}`;
  const preheader = status === 'shipped' && shipment.awb
    ? `AWB ${shipment.awb} — follow your parcel to your doorstep.`
    : `Order ${order.orderNumber}: ${variant.body.slice(0, 92)}…`;

  const shipmentRows = [
    hasShipment ? keyValue('Courier', shipment.courier || shipment.provider || '—') : '',
    shipment.awb ? keyValue('AWB / tracking number', shipment.awb, { strong: true }) : '',
    shipment.estimatedDelivery ? keyValue('Estimated delivery', dateLabel(shipment.estimatedDelivery)) : '',
    shipment.status ? keyValue('Courier status', String(shipment.status).replace(/_/g, ' ')) : '',
  ].join('');

  const body = `
      ${eyebrow(variant.eyebrow)}
      ${heading(variant.heading)}
      ${paragraph(`Hi${firstName ? ` ${firstName}` : ''}, ${variant.body}`)}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 6px;background:${BRAND.cream};border:1px solid ${BRAND.line};border-radius:14px;">
        <tr><td style="padding:14px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${keyValue('Order number', order.orderNumber, { strong: true })}
            ${keyValue('Order total', order.totals.total)}
            ${keyValue('Payment', paymentLabel(order.paymentMethod))}
            ${shipmentRows}
          </table>
        </td></tr>
      </table>

      ${
        order.items.length
          ? `<div style="margin-top:22px;">${eyebrow(`${order.items.length} piece${order.items.length === 1 ? '' : 's'} in this order`)}
          <p style="margin:0;font-family:${SANS};font-size:13.5px;line-height:1.8;color:${BRAND.ink};">
            ${order.items.map((item) => escapeHtml(`${item.quantity} × ${item.name}${item.size ? ` · Size ${item.size}` : ''}`)).join('<br />')}
          </p></div>`
          : ''
      }

      ${
        data.note
          ? `<p style="margin:20px 0 0;font-family:${SANS};font-size:12.5px;line-height:1.65;color:${BRAND.muted};">Note from our team: ${escapeHtml(data.note)}</p>`
          : ''
      }

      <div style="margin-top:26px;">
        ${bulletproofButton(
          status === 'delivered' ? `${ctx.storefrontUrl}/account/orders/${escapeHtml(order.id)}` : trackUrl,
          variant.cta,
          { background: status === 'cancelled' ? BRAND.wine : BRAND.crimson }
        )}
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
    `Hi${firstName ? ` ${firstName}` : ''}, ${variant.body}\n\n` +
    `Order number: ${order.orderNumber}\n` +
    `Order total: ${order.totals.total}\n` +
    `Payment: ${paymentLabel(order.paymentMethod)}\n` +
    (shipment.courier ? `Courier: ${shipment.courier}\n` : '') +
    (shipment.awb ? `AWB / tracking number: ${shipment.awb}\n` : '') +
    (shipment.estimatedDelivery ? `Estimated delivery: ${dateLabel(shipment.estimatedDelivery)}\n` : '') +
    (order.items.length
      ? `\nItems\n-----\n${order.items.map((item) => `  • ${item.quantity} × ${item.name}${item.size ? ` (Size ${item.size})` : ''}`).join('\n')}\n`
      : '') +
    (data.note ? `\nNote from our team: ${data.note}\n` : '') +
    `\n${variant.cta}: ${status === 'delivered' ? `${ctx.storefrontUrl}/account/orders/${order.id}` : trackUrl}\n` +
    textFooter({ supportEmail: ctx.supportEmail, storefrontUrl: ctx.storefrontUrl });

  return { subject, html, text, transactional: true };
};

module.exports.VARIANTS = VARIANTS;
module.exports.SUPPORTED_STATUSES = Object.keys(VARIANTS);
