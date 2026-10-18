export const pkr = (n) => `PKR ${Math.round(n || 0).toLocaleString('en-PK')}`;
export const pct = (price, compare) => (compare > price ? Math.round(((compare - price) / compare) * 100) : 0);
export const date = (d, lang = 'en') => (d ? new Date(d).toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const totalStock = (p) => p.variants?.reduce((s, v) => s + v.stock, 0) || 0;
export const isNew = (p) => p.tags?.includes('new');
export const tr = (obj, field, lang) => (lang === 'ur' && obj?.[`${field}Ur`]) || obj?.[field] || '';
export const colourHex = { Ivory: '#F4EEE3', Rose: '#E11D48', Ink: '#141414', Gold: '#B08D57', Blush: '#FFE4E6', Sage: '#9CA889', Sand: '#EFE8DD', Rust: '#A4532F', Stone: '#8A8178', White: '#FFFFFF', Sky: '#A9C4DB' };
