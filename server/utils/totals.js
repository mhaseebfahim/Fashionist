export const MAX_QTY_PER_VARIANT = 10;

export function shippingFeeFor(city, settings, subtotal) {
  if (subtotal >= settings.freeShippingAbove) return 0;
  const rates = settings.shippingRates instanceof Map ? settings.shippingRates : new Map(Object.entries(settings.shippingRates || {}));
  return rates.get(city) ?? settings.defaultShippingFee;
}

export function couponDiscount(coupon, subtotal) {
  if (!coupon || coupon.type === 'freeship') return 0;
  let d = coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount) d = Math.min(d, coupon.maxDiscount);
  return Math.min(d, subtotal);
}

/** Validates a coupon for a user + subtotal. Returns an error message or null. */
export function couponError(coupon, userId, subtotal, now = new Date()) {
  if (!coupon || !coupon.isActive) return 'Invalid coupon';
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) return 'Coupon has expired';
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return 'Coupon usage limit reached';
  if (subtotal < (coupon.minOrder || 0)) return `Minimum order PKR ${coupon.minOrder} for this coupon`;
  if (userId && (coupon.usedBy || []).some((u) => String(u) === String(userId))) return 'You have already used this coupon';
  return null;
}

export function computeTotals({ lines, coupon, city, settings }) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const discount = couponDiscount(coupon, subtotal);
  const shippingFee = coupon?.type === 'freeship' ? 0 : shippingFeeFor(city, settings, subtotal - discount);
  return { subtotal, discount, shippingFee, total: subtotal - discount + shippingFee };
}
