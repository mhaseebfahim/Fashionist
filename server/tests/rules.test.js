import { canTransition, isWithinReturnWindow } from '../utils/orderStatus.js';
import { computeTotals, couponError } from '../utils/totals.js';
import { generateOrderNumber } from '../utils/orderNumber.js';
import { cleanCms, parseCsv } from '../utils/helpers.js';

const settings = { shippingRates: new Map([['Multan', 150]]), defaultShippingFee: 250, freeShippingAbove: 5000 };

test('status transitions follow the rules', () => {
  expect(canTransition('Pending', 'Confirmed')).toBe(true);
  expect(canTransition('Confirmed', 'Cancelled')).toBe(true);
  expect(canTransition('Delivered', 'Returned')).toBe(true);
  expect(canTransition('Pending', 'Shipped')).toBe(false);
  expect(canTransition('Shipped', 'Cancelled')).toBe(false);
});

test('return window is 7 days', () => {
  const now = new Date('2026-10-18');
  expect(isWithinReturnWindow(new Date('2026-10-12'), 7, now)).toBe(true);
  expect(isWithinReturnWindow(new Date('2026-10-01'), 7, now)).toBe(false);
});

test('totals: city fee, free shipping, coupon cap, FREESHIP', () => {
  const lines = [{ price: 2000, qty: 1 }];
  expect(computeTotals({ lines, city: 'Multan', settings })).toEqual({ subtotal: 2000, discount: 0, shippingFee: 150, total: 2150 });
  expect(computeTotals({ lines, city: 'Quetta', settings }).shippingFee).toBe(250);
  expect(computeTotals({ lines: [{ price: 20000, qty: 1 }], city: 'Quetta', settings, coupon: { type: 'percent', value: 10, maxDiscount: 1000 } }).discount).toBe(1000);
  expect(computeTotals({ lines, city: 'Quetta', settings, coupon: { type: 'freeship' } }).shippingFee).toBe(0);
});

test('coupon once per customer and min order', () => {
  const c = { isActive: true, minOrder: 1000, usedBy: ['u1'], usedCount: 1 };
  expect(couponError(c, 'u1', 5000)).toMatch(/already used/);
  expect(couponError(c, 'u2', 500)).toMatch(/Minimum/);
  expect(couponError(c, 'u2', 5000)).toBeNull();
});

test('order number format FN-YYMMDD-XXXX', () => {
  expect(generateOrderNumber(new Date('2026-10-18'))).toMatch(/^FN-261018-[0-9A-F]{4}$/);
});

test('CMS sanitiser strips scripts and javascript: links', () => {
  const out = cleanCms({ html: '<p onclick="x()">Hi</p><script>bad()</script>', title: '<b>Eid</b>', link: 'javascript:alert(1)' });
  expect(out).toEqual({ html: '<p>Hi</p>', title: 'Eid', link: 'alert(1)' });
});

test('CSV parser handles quotes and CRLF', () => {
  expect(parseCsv('title,price\r\n"Lawn, 3pc",4990\r\n')).toEqual([{ title: 'Lawn, 3pc', price: '4990' }]);
});
