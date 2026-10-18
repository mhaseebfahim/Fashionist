// Shared demo data used by the client mock adapter AND server/scripts/seed.js.
// Plain JS (no JSX / browser APIs) so Node can import it too.

const u = (id, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;

export const IMG = {
  w1: u('1515886657613-9f3515b0c78f'),
  w2: u('1509631179647-0177331693ae'),
  w3: u('1496747611176-843222e1e57c'),
  w4: u('1529139574466-a303027c1d8b'),
  w5: u('1469334031218-e382a71b716b'),
  w6: u('1539109136881-3be0616acf4b'),
  w7: u('1485968579580-b6d095142e6e'),
  w8: u('1524504388940-b1c1722653e1'),
  m1: u('1507679799987-c73779587ccf'),
  m2: u('1503342217505-b0a15ec3261c'),
  m3: u('1617137968427-85924c800a22'),
  m4: u('1490578474895-699cd4e2cf59'),
  k1: u('1503919545889-aef636e10ad4'),
  k2: u('1519457431-44ccd64a579b'),
  f1: u('1558769132-cb1aea458c5e'),
  f2: u('1528459801416-a9e53bbf4e17'),
  a1: u('1611591437281-460bfbe1220a'),
  a2: u('1584917865442-de89df76afd3'),
  rack: u('1490481651871-ab68de25d43d', 1600),
  look: u('1483985988355-763728e1935b', 1600),
  rack2: u('1523381210434-271e8be1f52b', 1600),
};

export const slugify = (s) => String(s).toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// parent: slug of the parent category (null = top level)
export const categories = [
  { slug: 'women', name: 'Women', nameUr: 'خواتین', image: IMG.w1, sortOrder: 1, parent: null },
  { slug: 'men', name: 'Men', nameUr: 'مرد', image: IMG.m1, sortOrder: 2, parent: null },
  { slug: 'kids', name: 'Kids', nameUr: 'بچے', image: IMG.k1, sortOrder: 3, parent: null },
  { slug: 'unstitched', name: 'Unstitched', nameUr: 'ان سلا', image: IMG.f1, sortOrder: 4, parent: null },
  { slug: 'accessories', name: 'Accessories', nameUr: 'لوازمات', image: IMG.a1, sortOrder: 5, parent: null },
  { slug: 'lawn', name: 'Lawn', nameUr: 'لان', image: IMG.w3, sortOrder: 1, parent: 'women' },
  { slug: 'formal', name: 'Formal', nameUr: 'فارمل', image: IMG.w2, sortOrder: 2, parent: 'women' },
  { slug: 'bridal', name: 'Bridal', nameUr: 'برائیڈل', image: IMG.w5, sortOrder: 3, parent: 'women' },
  { slug: 'kurta', name: 'Kurta', nameUr: 'کرتا', image: IMG.m3, sortOrder: 1, parent: 'men' },
  { slug: 'shalwar-kameez', name: 'Shalwar Kameez', nameUr: 'شلوار قمیض', image: IMG.m2, sortOrder: 2, parent: 'men' },
  { slug: 'khussa', name: 'Khussa', nameUr: 'کھسہ', image: IMG.a2, sortOrder: 1, parent: 'accessories' },
  { slug: 'jewellery', name: 'Jewellery', nameUr: 'زیورات', image: IMG.a1, sortOrder: 2, parent: 'accessories' },
];

const SIZES = { W: ['XS', 'S', 'M', 'L', 'XL'], M: ['S', 'M', 'L', 'XL'], K: ['2Y', '4Y', '6Y', '8Y', '10Y'], F: ['1 metre'], O: ['One Size'], S: ['36', '37', '38', '39', '40'] };

// [title, titleUr, category, price, compareAt, attributes, colours, sizeSet, tags, images, featured]
const P = [
  ['Noor Embroidered Lawn Kurta', 'نور کڑھائی والا لان کرتا', 'lawn', 6490, 7990, { fabric: 'Lawn', pieces: '1 Piece', fit: 'Straight' }, ['Ivory', 'Rose'], 'W', ['eid', 'new'], ['w1', 'w5'], true],
  ['Gul Bahar Printed Lawn 3-Piece', 'گل بہار پرنٹڈ لان تھری پیس', 'lawn', 5990, 0, { fabric: 'Lawn', pieces: '3 Piece', dupatta: 'Chiffon' }, ['Blush', 'Sage'], 'W', ['new'], ['w3', 'w7']],
  ['Sehar Chikankari Lawn Shirt', 'سحر چکن کاری لان شرٹ', 'lawn', 4490, 5290, { fabric: 'Lawn', pieces: '1 Piece', work: 'Chikankari' }, ['White', 'Sky'], 'W', ['summer'], ['w4', 'w8']],
  ['Mehak Digital Lawn 2-Piece', 'مہک ڈیجیٹل لان ٹو پیس', 'lawn', 3990, 0, { fabric: 'Lawn', pieces: '2 Piece' }, ['Rust', 'Ink'], 'W', ['casual'], ['w6', 'w2']],
  ['Ruhi Schiffli Lawn Suit', 'روحی شفلی لان سوٹ', 'lawn', 7490, 8990, { fabric: 'Lawn', pieces: '3 Piece', dupatta: 'Organza' }, ['Ivory', 'Gold'], 'W', ['eid'], ['w5', 'w1']],
  ['Anaya Block Print Kurta', 'انایہ بلاک پرنٹ کرتا', 'lawn', 2990, 0, { fabric: 'Lawn', pieces: '1 Piece' }, ['Sand', 'Rose'], 'W', ['new', 'casual'], ['w8', 'w4']],
  ['Zara Silk Three-Piece', 'زارا ریشمی تین پیس', 'formal', 14990, 0, { fabric: 'Silk', pieces: '3 Piece', dupatta: 'Organza' }, ['Ink', 'Gold'], 'W', ['eid', 'formal', 'new'], ['w2', 'w6'], true],
  ['Mehr Chiffon Dupatta Set', 'مہر شیفون دوپٹہ سیٹ', 'formal', 8990, 11240, { fabric: 'Chiffon', pieces: '2 Piece', dupatta: 'Chiffon' }, ['Blush', 'Sage'], 'W', ['festive'], ['w3', 'w7'], true],
  ['Aiza Organza Angrakha', 'عائزہ آرگنزا انگرکھا', 'formal', 12490, 0, { fabric: 'Organza', pieces: '3 Piece' }, ['Ivory'], 'W', ['formal', 'new'], ['w5', 'w1'], true],
  ['Shanzay Velvet Shawl Suit', 'شانزے ویلویٹ شال سوٹ', 'formal', 18990, 21990, { fabric: 'Velvet', pieces: '3 Piece', dupatta: 'Velvet Shawl' }, ['Ink', 'Rose'], 'W', ['winter', 'formal'], ['w6', 'w2']],
  ['Laila Jamawar Kurta', 'لیلیٰ جامہ وار کرتا', 'formal', 9990, 0, { fabric: 'Jamawar', pieces: '1 Piece' }, ['Gold', 'Ink'], 'W', ['festive'], ['w7', 'w3']],
  ['Rania Bridal Lehenga', 'رانیہ برائیڈل لہنگا', 'bridal', 24990, 0, { fabric: 'Raw Silk', pieces: '3 Piece', work: 'Zardozi' }, ['Rose', 'Gold'], 'W', ['bridal', 'new'], ['w1', 'w2'], true],
  ['Mahrukh Nikkah Sharara', 'ماہ رخ نکاح شرارہ', 'bridal', 22490, 0, { fabric: 'Organza', pieces: '3 Piece', work: 'Gota' }, ['Ivory', 'Blush'], 'W', ['bridal'], ['w5', 'w3']],
  ['Dua Mehndi Gharara', 'دعا مہندی غرارہ', 'bridal', 16990, 19990, { fabric: 'Silk', pieces: '3 Piece', work: 'Gota' }, ['Sage', 'Gold'], 'W', ['bridal', 'eid'], ['w7', 'w4']],
  ['Saba Cotton Co-ord', 'صبا کاٹن کو آرڈ', 'women', 4990, 0, { fabric: 'Cotton', pieces: '2 Piece', fit: 'Relaxed' }, ['Sand', 'Ink'], 'W', ['casual', 'new'], ['w4', 'w8']],
  ['Hira Printed Khaddar Shirt', 'حرا پرنٹڈ کھدر شرٹ', 'women', 3490, 4360, { fabric: 'Khaddar', pieces: '1 Piece' }, ['Rust', 'Ink'], 'W', ['winter'], ['w6', 'w2']],
  ['Rumi Linen Kurta', 'رومی لینن کرتا', 'kurta', 6490, 0, { fabric: 'Linen', pieces: '1 Piece', fit: 'Regular' }, ['Ivory', 'Sand'], 'M', ['eid', 'new'], ['m1', 'm3'], true],
  ['Ayan Cotton Kurta', 'ایان کاٹن کرتا', 'kurta', 3990, 0, { fabric: 'Cotton', pieces: '1 Piece' }, ['White', 'Sky'], 'M', ['casual'], ['m4', 'm2']],
  ['Daud Embroidered Kurta', 'داؤد کڑھائی والا کرتا', 'kurta', 7990, 8990, { fabric: 'Cotton Silk', pieces: '1 Piece', work: 'Threadwork' }, ['Ink', 'Gold'], 'M', ['festive', 'new'], ['m3', 'm1']],
  ['Zayan Karandi Kurta', 'زیان کرنڈی کرتا', 'kurta', 5490, 0, { fabric: 'Karandi', pieces: '1 Piece' }, ['Stone', 'Ink'], 'M', ['winter'], ['m2', 'm4']],
  ['Faris Jacquard Kurta', 'فارس جیکارڈ کرتا', 'kurta', 6990, 0, { fabric: 'Jacquard', pieces: '1 Piece' }, ['Sand', 'Gold'], 'M', ['eid'], ['m1', 'm2']],
  ['Shahzad Wash & Wear Shalwar Kameez', 'شہزاد واش اینڈ ویئر شلوار قمیض', 'shalwar-kameez', 5490, 6490, { fabric: 'Wash & Wear', pieces: '2 Piece' }, ['Ink', 'Stone'], 'M', ['classic'], ['m2', 'm4']],
  ['Hamza Boski Shalwar Kameez', 'حمزہ بوسکی شلوار قمیض', 'shalwar-kameez', 8490, 0, { fabric: 'Boski', pieces: '2 Piece' }, ['Gold', 'Ivory'], 'M', ['eid', 'new'], ['m3', 'm1']],
  ['Umar Cotton Shalwar Kameez', 'عمر کاٹن شلوار قمیض', 'shalwar-kameez', 4490, 0, { fabric: 'Cotton', pieces: '2 Piece' }, ['White', 'Sky'], 'M', ['summer'], ['m4', 'm3']],
  ['Bilal Khaddar Shalwar Kameez', 'بلال کھدر شلوار قمیض', 'shalwar-kameez', 5990, 0, { fabric: 'Khaddar', pieces: '2 Piece' }, ['Rust', 'Stone'], 'M', ['winter'], ['m1', 'm4']],
  ['Daud Jamawar Waistcoat', 'داؤد جامہ وار واسکٹ', 'men', 8990, 0, { fabric: 'Jamawar', pieces: '1 Piece' }, ['Ink', 'Gold'], 'M', ['festive'], ['m3', 'm2']],
  ['Little Noor Frock', 'ننھی نور فراک', 'kids', 2990, 0, { fabric: 'Cotton', age: '2–10 yrs' }, ['Blush', 'Ivory'], 'K', ['eid', 'new'], ['k1', 'k2'], true],
  ['Mini Rumi Kurta Set', 'منی رومی کرتا سیٹ', 'kids', 3290, 3990, { fabric: 'Linen', pieces: '2 Piece' }, ['Ivory'], 'K', ['eid'], ['k2', 'k1']],
  ['Gudiya Gharara Set', 'گڑیا غرارہ سیٹ', 'kids', 4490, 0, { fabric: 'Silk', pieces: '3 Piece' }, ['Rose', 'Gold'], 'K', ['festive'], ['k1', 'k2']],
  ['Shehzada Sherwani', 'شہزادہ شیروانی', 'kids', 6990, 0, { fabric: 'Jamawar', pieces: '2 Piece' }, ['Ivory', 'Gold'], 'K', ['festive', 'new'], ['k2', 'k1']],
  ['Tara Printed Lawn Frock', 'تارا پرنٹڈ لان فراک', 'kids', 1990, 0, { fabric: 'Lawn' }, ['Sky', 'Blush'], 'K', ['summer'], ['k1', 'k2']],
  ['Gulnar Jacquard Fabric', 'گلنار جیکارڈ کپڑا', 'unstitched', 1990, 0, { fabric: 'Jacquard', soldBy: 'metre', width: '54 inch' }, ['Rose', 'Ink'], 'F', ['unstitched', 'new'], ['f1', 'f2'], true],
  ['Pure Raw Silk by the Metre', 'خالص را سلک فی میٹر', 'unstitched', 2490, 0, { fabric: 'Raw Silk', soldBy: 'metre', width: '44 inch' }, ['Gold', 'Ivory'], 'F', ['unstitched'], ['f2', 'f1']],
  ['Premium Lawn by the Metre', 'پریمیم لان فی میٹر', 'unstitched', 1990, 0, { fabric: 'Lawn', soldBy: 'metre', width: '42 inch' }, ['White', 'Blush'], 'F', ['unstitched', 'summer'], ['f1', 'f2']],
  ['Chiffon Dupatta Fabric', 'شیفون دوپٹہ کپڑا', 'unstitched', 2190, 0, { fabric: 'Chiffon', soldBy: 'metre', width: '44 inch' }, ['Sage', 'Blush'], 'F', ['unstitched'], ['f2', 'f1']],
  ['Unstitched Embroidered Lawn 3-Piece', 'ان سلا کڑھائی والا لان تھری پیس', 'unstitched', 5490, 6490, { fabric: 'Lawn', pieces: '3 Piece', dupatta: 'Chiffon' }, ['Ivory', 'Rose'], 'O', ['unstitched', 'eid'], ['f1', 'w3']],
  ['Kundan Jhumka Earrings', 'کندن جھمکے', 'jewellery', 2290, 0, { material: 'Gold-plated brass' }, ['Gold'], 'O', ['jewellery', 'new'], ['a1', 'a2']],
  ['Polki Choker Set', 'پولکی چوکر سیٹ', 'jewellery', 6990, 7990, { material: 'Polki & pearls' }, ['Gold'], 'O', ['jewellery', 'bridal'], ['a1', 'a2']],
  ['Tilla Khussa', 'تلہ کھسہ', 'khussa', 3490, 0, { material: 'Leather', work: 'Tilla' }, ['Gold', 'Ink'], 'S', ['khussa', 'eid'], ['a2', 'a1']],
  ['Velvet Khussa', 'ویلویٹ کھسہ', 'khussa', 2990, 3490, { material: 'Velvet' }, ['Rose', 'Ink'], 'S', ['khussa'], ['a2', 'a1']],
];

export const products = P.map(([title, titleUr, category, price, compareAtPrice, attributes, colours, set, tags, imgs, featured], i) => ({
  title,
  titleUr,
  slug: slugify(title),
  category, // slug — resolved to an id by the seeder / mock
  price,
  compareAtPrice: compareAtPrice || undefined,
  attributes,
  images: imgs.map((k) => IMG[k]),
  tags,
  isFeatured: !!featured,
  isActive: true,
  description: `${title} — crafted in Pakistan from ${attributes.fabric || attributes.material}. Finished by hand, made to be worn for every story you tell.`,
  descriptionUr: `${titleUr} — پاکستان میں تیار کردہ، ہاتھ سے مکمل کیا گیا۔`,
  sizeGuide: attributes.soldBy === 'metre' ? 'Sold by the metre: a shirt needs ~2.5 m, a full suit ~5 m. Set the quantity to the number of metres.' : '',
  seo: { metaTitle: `${title} | Fashionist`, metaDescription: `Shop ${title} at Fashionist. Cash on Delivery across Pakistan.` },
  variants: colours.flatMap((c, ci) =>
    SIZES[set].map((s, si) => ({ sku: `FN${String(i + 1).padStart(3, '0')}-${c.slice(0, 3).toUpperCase()}-${s.replace(/\s+/g, '').toUpperCase()}`, size: s, colour: c, stock: (i * 7 + ci * 5 + si * 3) % 15 }))
  ),
  rating: 0,
  numReviews: 0,
  soldCount: (i * 37) % 260,
}));

export const customers = [
  { name: 'Ayesha Khan', email: 'ayesha@example.com', phone: '03214567890', addresses: [{ label: 'Home', name: 'Ayesha Khan', phone: '03214567890', city: 'Lahore', area: 'DHA Phase 5', street: 'House 12, Street 4', isDefault: true }] },
  { name: 'Hamza Ali', email: 'hamza@example.com', phone: '03001112233', addresses: [{ label: 'Home', name: 'Hamza Ali', phone: '03001112233', city: 'Karachi', area: 'Clifton Block 5', street: 'Flat 7, Sea View Apartments', isDefault: true }] },
  { name: 'Sana Tariq', email: 'sana@example.com', phone: '03335556677', addresses: [{ label: 'Home', name: 'Sana Tariq', phone: '03335556677', city: 'Multan', area: 'Gulgasht Colony', street: 'House 45-B', isDefault: true }] },
];
export const CUSTOMER_PASSWORD = 'Customer@123';

export const coupons = [
  { code: 'WELCOME10', type: 'percent', value: 10, maxDiscount: 1000, minOrder: 0, isActive: true },
  { code: 'EID500', type: 'fixed', value: 500, minOrder: 5000, isActive: true },
  { code: 'FREESHIP', type: 'freeship', value: 0, minOrder: 2000, isActive: true },
];

export const settings = {
  store: { name: 'Fashionist', logo: '', phone: '0300 1234567', email: 'hello@fashionist.pk', whatsapp: '923001234567', address: 'Gulgasht Colony, Multan, Pakistan' },
  shippingRates: { Multan: 150, Lahore: 200, Karachi: 250, Islamabad: 220, Rawalpindi: 220 },
  defaultShippingFee: 250,
  freeShippingAbove: 5000,
  lowStockLevel: 5,
  returnWindowDays: 7,
  emailNotifications: { orderPlaced: true, statusChanged: true, lowStock: true },
};

const REVIEW_TEXT = [
  'The embroidery is even more beautiful in person. Delivered in two days and paid at my door.',
  'Fits perfectly — finally a brand that understands tailoring.',
  'Rich colour and exactly like the photos. Will order again for Eid.',
  'Lovely fabric, quick COD delivery and beautiful packaging.',
];

const day = 86400000;
/**
 * Builds 12 demo orders across every status. `products` and `users` must already have `_id`s.
 * users[0..2] are customers. Returns plain objects ready to insert.
 */
export function makeOrders(products, users, now = Date.now()) {
  const plan = [
    ['Pending', 0.2], ['Pending', 0.6], ['Confirmed', 1], ['Confirmed', 2], ['Shipped', 3], ['Shipped', 4],
    ['Delivered', 3, 'return'], ['Delivered', 6], ['Delivered', 10], ['Delivered', 18], ['Cancelled', 8], ['Returned', 22],
  ];
  return plan.map(([status, ago, ret], n) => {
    const user = users[n % users.length];
    const lines = [products[(n * 7) % products.length], products[(n * 11 + 3) % products.length]].slice(0, 1 + (n % 2)).map((p, k) => {
      const v = p.variants[(n + k) % p.variants.length];
      return { product: p._id, title: p.title, image: p.images[0], sku: v.sku, size: v.size, colour: v.colour, price: p.price, qty: 1 + ((n + k) % 2) };
    });
    const created = new Date(now - ago * day);
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const addr = user.addresses[0];
    const shippingFee = subtotal >= settings.freeShippingAbove ? 0 : settings.shippingRates[addr.city] ?? settings.defaultShippingFee;
    const flow = { Pending: ['Pending'], Confirmed: ['Pending', 'Confirmed'], Shipped: ['Pending', 'Confirmed', 'Shipped'], Delivered: ['Pending', 'Confirmed', 'Shipped', 'Delivered'], Cancelled: ['Pending', 'Cancelled'], Returned: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Returned'] }[status];
    const delivered = ['Delivered', 'Returned'].includes(status) ? new Date(created.getTime() + (ret ? 1 : 2) * day) : undefined;
    const yymmdd = created.toISOString().slice(2, 10).replace(/-/g, '');
    return {
      orderNumber: `FN-${yymmdd}-${(0xa1b0 + n * 0x13f).toString(16).toUpperCase().slice(-4)}`,
      user: user._id,
      items: lines,
      shippingAddress: { name: addr.name, phone: addr.phone, city: addr.city, area: addr.area, street: addr.street },
      subtotal,
      discount: 0,
      shippingFee,
      total: subtotal + shippingFee,
      paymentMethod: 'COD',
      paymentStatus: delivered ? 'Paid' : 'Unpaid',
      status,
      statusHistory: flow.map((s, k) => ({ status: s, at: new Date(created.getTime() + k * 0.4 * day) })),
      courier: ['Shipped', 'Delivered', 'Returned'].includes(status) ? 'TCS' : undefined,
      trackingNumber: ['Shipped', 'Delivered', 'Returned'].includes(status) ? `TCS77${String(4100 + n)}` : undefined,
      deliveredAt: status === 'Delivered' && ret ? new Date(now - 2 * day) : delivered,
      returnRequest: ret ? { type: 'exchange', reason: 'Need one size larger please', status: 'Requested', requestedAt: new Date(now - day) } : status === 'Returned' ? { type: 'return', reason: 'Colour did not suit me', status: 'Approved', requestedAt: new Date(now - 19 * day), decidedAt: new Date(now - 18 * day) } : undefined,
      createdAt: created,
    };
  });
}

/** One review per delivered line (unique product+user). */
export function makeReviews(orders) {
  const seen = new Set();
  return orders
    .filter((o) => ['Delivered', 'Returned'].includes(o.status))
    .flatMap((o) => o.items.map((i) => ({ product: i.product, user: o.user, order: o._id })))
    .filter((r) => {
      const k = `${r.product}:${r.user}`;
      return seen.has(k) ? false : seen.add(k);
    })
    .map((r, n) => ({ ...r, rating: n % 4 === 3 ? 4 : 5, comment: REVIEW_TEXT[n % REVIEW_TEXT.length], status: 'Approved' }));
}
