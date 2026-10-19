// Mirrors server/utils (orderStatus + totals). The client uses these only for previews and
// for the mock adapter — the real server always recomputes and enforces.
export const ORDER_FLOW = ['Pending', 'Confirmed', 'Shipped', 'Delivered'];
export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
export const TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: ['Returned'],
  Cancelled: [],
  Returned: [],
};
export const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);
export const MAX_QTY = 10;

export const isWithinReturnWindow = (deliveredAt, days = 7) => !!deliveredAt && Date.now() - new Date(deliveredAt).getTime() <= days * 86400000;

export function shippingFeeFor(city, s, subtotal) {
  if (!s) return 0;
  if (subtotal >= s.freeShippingAbove) return 0;
  return s.shippingRates?.[city] ?? s.defaultShippingFee;
}

/* ---- Local same-day delivery (mirrors server/utils/totals.js) ---- */
export const RIDER_VEHICLES = ['Bike', 'Rickshaw', 'Courier'];
const sameCity = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
export const pkHour = (d = new Date()) => +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Karachi' }).format(d);
export function sameDayFor(city, s, now = new Date()) {
  const sd = s?.sameDay;
  if (!sd?.enabled || !sameCity(city, sd.city)) return { available: false };
  return { available: true, eta: pkHour(now) < (sd.cutoffHour ?? 15) ? 'today' : 'tomorrow' };
}
export const deliveryFeeFor = (city, s, subtotal, method = 'standard') => (method === 'same_day' ? s?.sameDay?.fee ?? 0 : shippingFeeFor(city, s, subtotal));
/** "3 PM" style label for the cut-off hour. */
export const hourLabel = (h = 15) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

export function couponDiscount(c, subtotal) {
  if (!c || c.type === 'freeship') return 0;
  let d = c.type === 'percent' ? Math.round((subtotal * c.value) / 100) : c.value;
  if (c.maxDiscount) d = Math.min(d, c.maxDiscount);
  return Math.min(d, subtotal);
}

export function couponError(c, userId, subtotal) {
  if (!c || !c.isActive) return 'Invalid coupon';
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return 'Coupon has expired';
  if (c.usageLimit && c.usedCount >= c.usageLimit) return 'Coupon usage limit reached';
  if (subtotal < (c.minOrder || 0)) return `Minimum order PKR ${c.minOrder} for this coupon`;
  if ((c.usedBy || []).includes(userId)) return 'You have already used this coupon';
  return null;
}

export const PHONE_RE = /^03\d{9}$/;
export const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala', 'Hyderabad', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Abbottabad', 'Mardan', 'Sahiwal', 'Rahim Yar Khan', 'Dera Ghazi Khan', 'Gujrat'];
export const ATTR_FILTERS = ['fabric', 'fit', 'sleeve', 'occasion', 'material'];
