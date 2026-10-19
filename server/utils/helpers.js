import sanitizeHtml from 'sanitize-html';
import ActivityLog from '../models/ActivityLog.js';

export const slugify = (s) => String(s).toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Writes an ActivityLog entry; never blocks or fails the request. */
export const logActivity = (req, action, targetType, targetId, details) =>
  ActivityLog.create({ admin: req.user._id, action, targetType, targetId: targetId ? String(targetId) : '', details }).catch((e) => console.error('activity log', e.message));

const RICH_KEYS = new Set(['html', 'htmlUr']);
const RICH = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'span'],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
};

/**
 * Recursively cleans CMS input: rich-text keys go through sanitize-html; every other string has
 * markup stripped and `javascript:` URLs removed, so no script can reach the storefront.
 */
export function cleanCms(value, key = '') {
  if (Array.isArray(value)) return value.map((v) => cleanCms(v));
  if (value && typeof value === 'object' && !(value instanceof Date)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanCms(v, k)]));
  if (typeof value !== 'string') return value;
  if (RICH_KEYS.has(key)) return sanitizeHtml(value, RICH);
  return value.replace(/<[^>]*>/g, '').replace(/^\s*javascript:/i, '');
}

/** Tiny RFC-4180 CSV parser (quotes, escaped quotes, CRLF). Returns array of row objects. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') row.push(cell), (cell = '');
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell), rows.push(row), (row = []), (cell = '');
    } else cell += c;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  const [header = [], ...body] = rows.filter((r) => r.some((x) => x.trim()));
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}

export const dateRange = (q, defaultDays = 30) => {
  const to = q.to ? new Date(`${q.to}T23:59:59.999`) : new Date();
  const from = q.from ? new Date(`${q.from}T00:00:00`) : new Date(to.getTime() - defaultDays * 86400000);
  return { from, to };
};

/** Any Pakistani mobile format (0300 1234567, +92-300-1234567, 3001234567) → "923001234567" for wa.me; null if it is not one. */
export function toWhatsapp(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (/^03\d{9}$/.test(d)) return `92${d.slice(1)}`;
  if (/^3\d{9}$/.test(d)) return `92${d}`;
  if (/^923\d{9}$/.test(d)) return d;
  if (/^00923\d{9}$/.test(d)) return d.slice(2);
  return null;
}
