export const pkr = (n) => `PKR ${Math.round(n || 0).toLocaleString('en-PK')}`;
export const pct = (price, compare) => (compare > price ? Math.round(((compare - price) / compare) * 100) : 0);
export const date = (d, lang = 'en') => (d ? new Date(d).toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const totalStock = (p) => p.variants?.reduce((s, v) => s + v.stock, 0) || 0;
export const isNew = (p) => p.tags?.includes('new');
export const tr = (obj, field, lang) => (lang === 'ur' && obj?.[`${field}Ur`]) || obj?.[field] || '';
export const colourHex = {
  Ivory: '#F4EEE3', Rose: '#E11D48', Ink: '#141414', Gold: '#B08D57', Blush: '#FFE4E6', Sage: '#9CA889', Sand: '#E3D5BC', Rust: '#A4532F', Stone: '#8A8178', White: '#FFFFFF', Sky: '#A9C4DB',
  Black: '#111111', Navy: '#1F2A44', Grey: '#9CA3AF', Charcoal: '#36454F', Olive: '#6B7036', Khaki: '#B9A27A', Beige: '#E8DCC4', Maroon: '#6E1F2B', Pink: '#F4B6C2',
  'Light Blue': '#A7C7E7', Indigo: '#2E3A6E', Blue: '#2F5DA8', Brown: '#6B4226', Tan: '#C19A6B', Green: '#1F5E3B', Silver: '#C0C0C0', Red: '#C0392B',
  Mixed: 'conic-gradient(#111 0 33%, #fff 0 66%, #1F2A44 0)',
};

/** Any Pakistani mobile format → "923001234567" for wa.me (mirrors server/utils/helpers.js toWhatsapp); null if invalid. */
export function waNumber(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (/^03\d{9}$/.test(d)) return `92${d.slice(1)}`;
  if (/^3\d{9}$/.test(d)) return `92${d}`;
  if (/^923\d{9}$/.test(d)) return d;
  if (/^00923\d{9}$/.test(d)) return d.slice(2);
  return null;
}
/** wa.me link with an optional pre-filled message, or null when no valid number is set. */
export const waHref = (raw, text) => {
  const n = waNumber(raw);
  return n ? `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}` : null;
};
