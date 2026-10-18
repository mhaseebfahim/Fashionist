import { FONT_PAIRS } from '../cms/defaults.js';

const hexToRgb = (hex) => {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const triplet = (rgb) => rgb.join(' ');
const darken = (rgb, k = 0.3) => rgb.map((c) => Math.round(c * (1 - k)));
const lighten = (rgb, k = 0.88) => rgb.map((c) => Math.round(c + (255 - c) * k));

/** Applies the CMS theme to the document: colour tokens, font pair, button shape, favicon. */
export function applyTheme(theme, root = document.documentElement) {
  if (!theme) return;
  const rose = hexToRgb(/^#[0-9a-f]{6}$/i.test(theme.primaryColor) ? theme.primaryColor : '#E11D48');
  const gold = hexToRgb(/^#[0-9a-f]{6}$/i.test(theme.accentColor) ? theme.accentColor : '#B08D57');
  root.style.setProperty('--rose', triplet(rose));
  root.style.setProperty('--rose-deep', triplet(darken(rose)));
  root.style.setProperty('--blush', triplet(lighten(rose)));
  root.style.setProperty('--gold', triplet(gold));
  const pair = FONT_PAIRS[theme.fontPair] || FONT_PAIRS.classic;
  root.style.setProperty('--font-display', `"${pair.heading}", Georgia, serif`);
  root.style.setProperty('--font-body', `"${pair.body}", system-ui, sans-serif`);
  root.style.setProperty('--btn-radius', theme.buttonStyle === 'pill' ? '9999px' : '0px');
  if (root === document.documentElement) {
    loadFonts(pair);
    if (theme.favicon) document.querySelector('link[rel="icon"]')?.setAttribute('href', theme.favicon);
  }
}

const loaded = new Set(['Cormorant Garamond', 'Manrope']);
function loadFonts(pair) {
  for (const f of [pair.heading, pair.body]) {
    if (loaded.has(f)) continue;
    loaded.add(f);
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(l);
  }
}
export { loadFonts };
