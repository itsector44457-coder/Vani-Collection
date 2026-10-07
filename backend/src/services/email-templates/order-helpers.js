/**
 * Order-shape helpers shared by the transactional templates.
 *
 * Routes hand templates either a Mongoose document, a lean object or a plain JS fixture (tests,
 * the admin "resend" action). Everything here is defensive: a missing field must degrade to empty
 * copy, never throw — an email must not be able to break an order request.
 */

const { inr, dateLabel } = require('./layout');

const toPlain = (value) => {
  if (!value) return {};
  if (typeof value.toObject === 'function') return value.toObject({ virtuals: true });
  return value;
};

/** Reads an amount off an order that may be a Mongoose doc, a lean object or a partial fixture. */
const amountOf = (order, key, fallback = 0) => {
  const value = order?.amounts?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

/** Normalises the order snapshot the templates render. */
function normalizeOrder(order) {
  const plain = toPlain(order);
  const items = (plain.items || []).map((item) => ({
    sku: item.sku,
    name: item.name || item.sku,
    size: item.size,
    color: item.color,
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.unitPrice) || 0,
    lineTotal: Number(item.lineTotal) || (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1),
    gstRate: Number(item.gstRate) || 0,
  }));
  const total = amountOf(plain, 'total', items.reduce((sum, item) => sum + item.lineTotal, 0));
  return {
    id: String(plain.id || plain._id || ''),
    orderNumber: plain.orderNumber || '—',
    status: plain.status || '',
    createdAt: plain.createdAt ? dateLabel(plain.createdAt) : '',
    customerEmail: plain.shippingAddress?.email || plain.guestEmail || '',
    customerName: plain.shippingAddress?.fullName || '',
    shippingAddress: plain.shippingAddress || null,
    billingAddress: plain.billingAddress || null,
    paymentMethod: plain.payment?.method || '',
    paymentStatus: plain.payment?.status || '',
    shipment: plain.shipment || null,
    notes: plain.notes || '',
    items,
    amounts: {
      subtotal: amountOf(plain, 'subtotal', items.reduce((sum, item) => sum + item.lineTotal, 0)),
      discount: amountOf(plain, 'discount'),
      shipping: amountOf(plain, 'shipping'),
      tax: amountOf(plain, 'tax'),
      total,
      couponCode: plain.couponCode || '',
    },
    totals: {
      subtotal: inr(amountOf(plain, 'subtotal', items.reduce((sum, item) => sum + item.lineTotal, 0))),
      discount: inr(amountOf(plain, 'discount')),
      shipping: inr(amountOf(plain, 'shipping')),
      tax: inr(amountOf(plain, 'tax')),
      total: inr(total),
    },
  };
}

const PAYMENT_LABELS = { razorpay: 'Prepaid (Razorpay)', cod: 'Cash on delivery', upi: 'UPI' };

const paymentLabel = (method) => PAYMENT_LABELS[String(method || '').toLowerCase()] || 'Prepaid';

/** One-line address used in subject lines and text alternatives. */
const oneLineAddress = (address) =>
  [address?.line1, address?.city, address?.state, address?.pincode].filter(Boolean).join(', ');

module.exports = { toPlain, amountOf, normalizeOrder, paymentLabel, oneLineAddress };
