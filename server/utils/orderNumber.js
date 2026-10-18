import crypto from 'node:crypto';

export function generateOrderNumber(date = new Date()) {
  const yymmdd = date.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `FN-${yymmdd}-${rand}`;
}
