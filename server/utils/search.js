// Product search that forgives the way people actually type: partial words ("shir"), plurals ("jeans"),
// common Roman-Urdu spellings ("pent", "shert", "jens") and related words ("pant" also finds chinos/joggers).
// Mirrored in client/src/utils/search.js for the mock API — keep the two in sync.

// Spelling fixes / plurals → one canonical word.
const ALIASES = {
  pent: 'pant', pents: 'pant', pants: 'pant', paint: 'pant', paints: 'pant', pnt: 'pant', trousers: 'trouser', trouzer: 'trouser',
  shert: 'shirt', shart: 'shirt', sheart: 'shirt', shirts: 'shirt', qameez: 'shirt', kameez: 'shirt',
  tshirt: 't-shirt', tshirts: 't-shirt', teeshirt: 't-shirt', tees: 't-shirt', tee: 't-shirt',
  jean: 'jeans', jeen: 'jeans', jeens: 'jeans', jens: 'jeans', jins: 'jeans', jinz: 'jeans', jeanz: 'jeans', denims: 'denim',
  short: 'shorts', shoert: 'shorts', shots: 'shorts', nicker: 'shorts', nikar: 'shorts',
  shoes: 'shoe', shoos: 'shoe', joota: 'shoe', jootay: 'shoe', jootey: 'shoe', sneakers: 'sneaker', snikar: 'sneaker', snicker: 'sneaker', joggers: 'jogger', trainers: 'trainer',
  jackets: 'jacket', jaket: 'jacket', jacet: 'jacket', coat: 'jacket', coats: 'jacket', hoodies: 'hoodie', hoody: 'hoodie', hudi: 'hoodie',
  suits: 'suit', soot: 'suit', blazers: 'blazer', blazor: 'blazer', tux: 'tuxedo',
  watches: 'watch', gharri: 'watch', ghari: 'watch', glasses: 'sunglass', sunglasses: 'sunglass', chashma: 'sunglass', shades: 'sunglass',
  belts: 'belt', wallets: 'wallet', caps: 'cap', topi: 'cap', bags: 'bag', backpacks: 'backpack', boot: 'boots',
  polos: 'polo', chinos: 'chino', leathar: 'leather', lether: 'leather', shadi: 'wedding', barat: 'wedding', walima: 'wedding', office: 'formal',
  black: 'black', kala: 'black', safaid: 'white', sufaid: 'white', neela: 'blue', laal: 'red',
};

// Canonical word → every word that should count as a match.
const RELATED = {
  pant: ['pant', 'trouser', 'chino', 'jogger', 'jeans'],
  trouser: ['trouser', 'pant', 'chino'],
  'shirt': ['shirt'],
  't-shirt': ['t-shirt', 'tee'],
  jeans: ['jeans', 'denim'],
  shorts: ['shorts'], // listed so "shorts" is not singularised to "short" (= short-sleeve)
  boots: ['boots'],
  shoe: ['shoe', 'sneaker', 'trainer', 'boots', 'derby', 'monk', 'footwear'],
  sneaker: ['sneaker', 'trainer'],
  jacket: ['jacket', 'bomber'],
  hoodie: ['hoodie', 'sweatshirt'],
  sweatshirt: ['sweatshirt', 'hoodie'],
  suit: ['suit', 'tuxedo'],
  wedding: ['wedding', 'tuxedo', 'suit'],
  sunglass: ['sunglass', 'wayfarer'],
  cap: ['cap', 'beanie'],
  bag: ['bag', 'backpack'],
  formal: ['formal', 'office', 'business', 'dress shirt'],
  red: ['red', 'maroon'],
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MAX_TERMS = 6;

/** Splits a query into terms; each term is the list of words any of which may match. */
export function parseQuery(q) {
  const text = String(q || '')
    .toLowerCase()
    .slice(0, 100)
    .replace(/\bt[\s-]?shirts?\b/g, 't-shirt')
    .replace(/\bpolo[\s-]?shirts?\b/g, 'polo')
    .replace(/\bsun[\s-]?glass(es)?\b/g, 'sunglass');
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) || [];
  const terms = [];
  for (const raw of words) {
    if (raw.length < 2 && !/\p{Script=Arabic}/u.test(raw)) continue;
    let w = ALIASES[raw] || raw;
    // Generic plural: "watches" → "watch" handled above; "hoodies" → "hoodie"
    if (!ALIASES[raw] && !RELATED[w] && w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
    const alts = [...new Set(RELATED[w] || [w])];
    if (!terms.some((t) => t[0] === alts[0])) terms.push(alts);
    if (terms.length >= MAX_TERMS) break;
  }
  return terms;
}

// Short words must start a word ("red" ≠ "tailored", "cap" ≠ "escape"); longer ones may match anywhere ("shir" → "shirt").
const part = (a) => (a.length <= 3 ? `\\b${escapeRe(a)}` : escapeRe(a));
export const termRegex = (alts) => new RegExp(alts.map(part).join('|'), 'i');

/** Text a product is searchable by, split by weight. `catNames` = its category (and parent) names/slugs. */
export function searchFields(p, catNames = []) {
  const attrs = p.attributes instanceof Map ? Object.fromEntries(p.attributes) : p.attributes || {};
  return {
    title: `${p.title} ${p.titleUr || ''}`,
    category: catNames.join(' '),
    other: [...(p.tags || []), ...Object.values(attrs), ...(p.variants || []).map((v) => v.colour), p.description || ''].join(' '),
  };
}

/** Score for one product: every term must match somewhere (else 0). Title hits weigh most. */
export function scoreProduct(fields, terms) {
  let score = 0;
  for (const alts of terms) {
    const re = termRegex(alts);
    const s = (re.test(fields.title) ? 6 : 0) + (re.test(fields.category) ? 4 : 0) + (re.test(fields.other) ? 1 : 0);
    if (!s) return 0;
    // Bonus when the title has the exact word, not just a fragment
    score += s + (new RegExp(`\\b(${alts.map(escapeRe).join('|')})(e?s)?\\b`, 'i').test(fields.title) ? 3 : 0);
    // The word the shopper meant beats its relatives: "pant" → Pants first, then chinos, then jeans.
    const first = alts.findIndex((a) => termRegex([a]).test(fields.title) || termRegex([a]).test(fields.category));
    if (first >= 0) score += Math.max(0, 3 - first);
  }
  return score;
}
