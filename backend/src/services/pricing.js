const FREE_SHIPPING_THRESHOLD = 1999;
const STANDARD_SHIPPING_FEE = 99;

function shippingFeeFor(subtotalAfterDiscount, { threshold = FREE_SHIPPING_THRESHOLD, fee = STANDARD_SHIPPING_FEE } = {}) {
  return subtotalAfterDiscount >= threshold ? 0 : fee;
}

function checkCouponValidity(coupon, subtotal, now = new Date()) {
  if (!coupon || coupon.active === false) return { valid: false, reason: 'Coupon is invalid' };
  if (coupon.startsAt && new Date(coupon.startsAt) > now) return { valid: false, reason: 'Coupon is not active yet' };
  if (coupon.endsAt && new Date(coupon.endsAt) < now) return { valid: false, reason: 'Coupon has expired' };
  if (subtotal < (coupon.minOrderValue || 0)) return { valid: false, reason: `Minimum order value is ₹${coupon.minOrderValue}` };
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return { valid: false, reason: 'Coupon usage limit reached' };
  return { valid: true };
}

function computeDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  const raw = coupon.type === 'percentage' ? (subtotal * coupon.value) / 100 : coupon.value;
  const capped = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
  return Math.max(0, Math.min(Math.round(capped), subtotal));
}

function computeTotals({ subtotal, discount = 0, gstRate = 0 }) {
  const tax = gstRate > 0 ? Math.round(((subtotal * gstRate) / (100 + gstRate)) * 100) / 100 : 0;
  const shipping = shippingFeeFor(subtotal - discount);
  return { subtotal, discount, shipping, tax, total: subtotal - discount + shipping };
}

module.exports = { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE, shippingFeeFor, checkCouponValidity, computeDiscount, computeTotals };
