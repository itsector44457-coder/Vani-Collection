const {
  layout,
  textFooter,
  heading,
  paragraph,
  eyebrow,
  bulletproofButton,
  keyValue,
  escapeHtml,
  inr,
  dateLabel,
  BRAND,
  SANS,
} = require('./layout');
const { normalizeOrder, toPlain } = require('./order-helpers');

/**
 * Sent by `PATCH /api/returns/:id` on every step of the return ladder.
 *
 * @param {{returnRequest: object, order?: object, firstName?: string, status?: string, adminNote?: string}} data
 */
const VARIANTS = {
  requested: {
    label: 'Requested',
    heading: 'We received your return request',
    body: 'Our team reviews returns within one working day. You will get an email the moment it is approved and a pickup slot is confirmed.',
    cta: 'View my returns',
  },
  approved: {
    label: 'Approved',
    heading: 'Your return is approved',
    body: 'Please keep the pieces unwashed and unused with their tags intact, in the original packaging. Our courier partner will pick them up.',
    cta: 'View my returns',
  },
  rejected: {
    label: 'Not approved',
    heading: 'We could not approve this return',
    body: 'The reason is written below. If you think we got this wrong, reply to this email with photographs and we will take another look.',
    cta: 'Contact support',
    tone: BRAND.wine,
  },
  pickup_scheduled: {
    label: 'Pickup scheduled',
    heading: 'Pickup is scheduled',
    body: 'A courier will collect the pieces at the address on your order. Keep them packed and ready, and hand them over against the pickup code.',
    cta: 'View my returns',
  },
  received: {
    label: 'Received',
    heading: 'Your return reached our atelier',
    body: 'The parcel is with us. A quality check follows before the refund is released.',
    cta: 'View my returns',
  },
  quality_check: {
    label: 'Quality check',
    heading: 'Your return is being inspected',
    body: 'We check tags, stitching and wash marks — usually within 48 hours of receiving the parcel. The refund is released as soon as this passes.',
    cta: 'View my returns',
  },
  refund_pending: {
    label: 'Refund pending',
    heading: 'Quality check passed — refund on the way',
    body: 'The refund has been queued to your original payment method. Banks usually post it within 3–7 working days.',
    cta: 'View my returns',
  },
  completed: {
    label: 'Completed',
    heading: 'Your return is complete',
    body: 'Everything is settled. Thank you for giving us the chance to make it right — we would love to see you back in the atelier.',
    cta: 'Continue shopping',
  },
};

module.exports = function returnStatus(data = {}, ctx) {
  const request = toPlain(data.returnRequest);
  const order = normalizeOrder(data.order);
  const status = String(data.status || request.status || 'requested').toLowerCase();
  const variant = VARIANTS[status] || VARIANTS.requested;
  const firstName = String(data.firstName || '').trim() || (order.customerName || '').split(' ')[0];
  const returnNumber = request.returnNumber || '—';
  const adminNote = String(data.adminNote ?? request.adminNote ?? '').trim();
  const refundAmount = Number(request.refundAmount) > 0 ? Number(request.refundAmount) : 0;
  const returnItems = (request.items || []).map((item) => ({
    sku: item.sku,
    name: item.sku,
    quantity: Number(item.quantity) || 1,
    reason: item.reason,
    condition: item.condition,
  }));

  const subject = `Return ${variant.label.toLowerCase()} · ${returnNumber}`;
  const preheader = refundAmount > 0 && ['refund_pending', 'completed'].includes(status)
    ? `${inr(refundAmount)} is being returned to your original payment method.`
    : variant.body.slice(0, 96);

  const timeline = ['requested', 'approved', 'pickup_scheduled', 'received', 'quality_check', 'refund_pending', 'completed'];
  const rejected = status === 'rejected';
  const currentIndex = timeline.indexOf(status);

  const timelineRows = rejected
    ? ''
    : timeline
        .map((step, index) => {
          const done = index <= currentIndex;
          const label = VARIANTS[step]?.label || step;
          return `
        <tr>
          <td valign="top" width="22" style="padding:0 10px 0 0;">
            <span style="display:block;width:11px;height:11px;border-radius:50%;margin-top:4px;background:${done ? BRAND.crimson : BRAND.line};font-size:0;line-height:0;">&nbsp;</span>
          </td>
          <td valign="top" style="padding:0 0 12px;border-bottom:0;">
            <p style="margin:0;font-family:${SANS};font-size:12.5px;${done ? `font-weight:700;color:${BRAND.ink};` : `color:${BRAND.muted};`}">${escapeHtml(label)}</p>
          </td>
        </tr>`;
        })
        .join('');

  const itemsRows = returnItems.length
    ? `<div style="margin:20px 0 0;">${eyebrow('Pieces in this return')}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${returnItems
            .map(
              (item) => `
            <tr>
              <td valign="top" style="padding:7px 0;border-bottom:1px solid ${BRAND.line};font-family:${SANS};font-size:13px;color:${BRAND.ink};">
                ${escapeHtml(`${item.quantity} × ${item.sku}`)}
                ${item.reason ? `<br /><span style="font-size:11.5px;color:${BRAND.muted};">Reason: ${escapeHtml(item.reason)}</span>` : ''}
              </td>
            </tr>`
            )
            .join('')}
        </table>
      </div>`
    : '';

  const body = `
      ${eyebrow(`Return ${returnNumber}`)}
      ${heading(variant.heading)}
      ${paragraph(`Hi${firstName ? ` ${firstName}` : ''}, ${variant.body}`)}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 4px;background:${BRAND.cream};border:1px solid ${BRAND.line};border-radius:14px;">
        <tr><td style="padding:15px 17px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${keyValue('Return number', returnNumber, { strong: true })}
            ${keyValue('Order number', order.orderNumber)}
            ${keyValue('Return type', String(request.type || 'return') === 'exchange' ? 'Exchange' : 'Return')}
            ${refundAmount > 0 ? keyValue('Refund amount', inr(refundAmount), { strong: true }) : ''}
            ${request.refundId ? keyValue('Refund reference', request.refundId) : ''}
            ${keyValue('Updated on', dateLabel(request.updatedAt || new Date()))}
          </table>
        </td></tr>
      </table>

      ${
        adminNote
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;background:${rejected ? '#fdf3f5' : '#f7f2ec'};border-left:3px solid ${rejected ? BRAND.crimson : BRAND.gold};border-radius:0 12px 12px 0;">
              <tr><td style="padding:13px 16px;">
                <p style="margin:0 0 4px;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND.crimson};">Note from our team</p>
                <p style="margin:0;font-family:${SANS};font-size:13.5px;line-height:1.65;color:${BRAND.ink};">${escapeHtml(adminNote)}</p>
              </td></tr>
            </table>`
          : ''
      }

      ${itemsRows}

      ${
        timelineRows
          ? `<div style="margin:24px 0 0;">
              ${eyebrow('Where this return stands')}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;">${timelineRows}</table>
            </div>`
          : ''
      }

      <div style="margin-top:24px;">
        ${bulletproofButton(
          variant.cta === 'Continue shopping' ? `${ctx.storefrontUrl}/products` : `${ctx.storefrontUrl}/account/returns`,
          variant.cta,
          { background: variant.tone || BRAND.crimson }
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
    `Return number: ${returnNumber}\n` +
    (order.orderNumber && order.orderNumber !== '—' ? `Order number: ${order.orderNumber}\n` : '') +
    `Return type: ${String(request.type || 'return') === 'exchange' ? 'Exchange' : 'Return'}\n` +
    (refundAmount > 0 ? `Refund amount: ${inr(refundAmount)}\n` : '') +
    (request.refundId ? `Refund reference: ${request.refundId}\n` : '') +
    (adminNote ? `\nNote from our team: ${adminNote}\n` : '') +
    (returnItems.length ? `\nPieces in this return\n---------------------\n${returnItems.map((item) => `  • ${item.quantity} × ${item.sku}${item.reason ? ` — ${item.reason}` : ''}`).join('\n')}\n` : '') +
    `\nView your returns: ${ctx.storefrontUrl}/account/returns\n` +
    textFooter({ supportEmail: ctx.supportEmail, storefrontUrl: ctx.storefrontUrl });

  return { subject, html, text, transactional: true };
};

module.exports.VARIANTS = VARIANTS;
module.exports.SUPPORTED_STATUSES = Object.keys(VARIANTS);
