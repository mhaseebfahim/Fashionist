// Default CMS content — seeded into MongoDB and used by the storefront as a fallback
// when /api/cms is unreachable. Plain JS so the server seeder can import it.
import { IMG } from '../services/mock/seedData.js';

export const FONT_PAIRS = {
  classic: { label: 'Cormorant Garamond + Manrope', heading: 'Cormorant Garamond', body: 'Manrope' },
  bodoni: { label: 'Bodoni Moda + Manrope', heading: 'Bodoni Moda', body: 'Manrope' },
  soft: { label: 'Cormorant Garamond + Jost', heading: 'Cormorant Garamond', body: 'Jost' },
};

export const SECTION_TYPES = ['hero', 'categoryMosaic', 'productRail', 'shopTheLook', 'spotlight', 'mostLoved', 'promiseStrip', 'testimonials', 'lookbookGrid', 'newsletter', 'richText', 'banner'];

export const theme = {
  primaryColor: '#E11D48',
  accentColor: '#B08D57',
  fontPair: 'classic',
  headingFont: 'Cormorant Garamond',
  bodyFont: 'Manrope',
  buttonStyle: 'sharp',
  logo: '',
  favicon: '',
  darkModeEnabled: true,
};

export const navigation = {
  header: [
    { label: 'New Arrivals', labelUr: 'نئی آمد', link: '/shop?tag=new', image: IMG.tee6, children: [{ label: 'Just landed', labelUr: 'ابھی آیا', link: '/shop?tag=new' }, { label: 'On sale', labelUr: 'سیل', link: '/shop?sale=true' }, { label: 'Best sellers', labelUr: 'سب سے زیادہ فروخت', link: '/shop?sort=popular' }] },
    { label: 'Topwear', labelUr: 'ٹاپ ویئر', link: '/shop/topwear', image: IMG.tee4, children: [{ label: 'T-Shirts', labelUr: 'ٹی شرٹس', link: '/shop/t-shirts' }, { label: 'Polo Shirts', labelUr: 'پولو شرٹس', link: '/shop/polo-shirts' }, { label: 'Casual Shirts', labelUr: 'کیژول شرٹس', link: '/shop/casual-shirts' }, { label: 'Formal Shirts', labelUr: 'فارمل شرٹس', link: '/shop/formal-shirts' }, { label: 'Hoodies & Sweatshirts', labelUr: 'ہوڈیز اور سویٹ شرٹس', link: '/shop/hoodies-sweatshirts' }] },
    { label: 'Bottomwear', labelUr: 'باٹم ویئر', link: '/shop/bottomwear', image: IMG.jeans6, children: [{ label: 'Jeans', labelUr: 'جینز', link: '/shop/jeans' }, { label: 'Trousers & Chinos', labelUr: 'ٹراؤزرز اور چینوز', link: '/shop/trousers-chinos' }, { label: 'Shorts', labelUr: 'شارٹس', link: '/shop/shorts' }] },
    { label: 'Jackets', labelUr: 'جیکٹس', link: '/shop/jackets', image: IMG.leatherMan, children: [{ label: 'Leather jackets', labelUr: 'لیدر جیکٹس', link: '/search?q=leather jacket' }, { label: 'Denim jackets', labelUr: 'ڈینم جیکٹس', link: '/search?q=denim jacket' }] },
    { label: 'Suits & Blazers', labelUr: 'سوٹس اور بلیزرز', link: '/shop/suits-blazers', image: IMG.suitCheck, children: [{ label: 'Suits', labelUr: 'سوٹس', link: '/shop/suits' }, { label: 'Blazers', labelUr: 'بلیزرز', link: '/shop/blazers' }, { label: 'Wedding edit', labelUr: 'شادی کا انتخاب', link: '/search?q=wedding' }] },
    { label: 'Footwear', labelUr: 'جوتے', link: '/shop/footwear', image: IMG.sneaker1, children: [{ label: 'Sneakers', labelUr: 'سنیکرز', link: '/shop/sneakers' }, { label: 'Formal Shoes', labelUr: 'فارمل جوتے', link: '/shop/formal-shoes' }, { label: 'Boots', labelUr: 'بوٹس', link: '/shop/boots' }] },
    { label: 'Accessories', labelUr: 'لوازمات', link: '/shop/accessories', image: IMG.watch1, children: [{ label: 'Watches', labelUr: 'گھڑیاں', link: '/shop/watches' }, { label: 'Sunglasses', labelUr: 'دھوپ کے چشمے', link: '/shop/sunglasses' }, { label: 'Belts & Wallets', labelUr: 'بیلٹ اور والٹ', link: '/shop/belts-wallets' }, { label: 'Caps & Bags', labelUr: 'کیپس اور بیگز', link: '/shop/caps-bags' }] },
  ],
  footer: [
    { title: 'Shop', titleUr: 'خریداری', links: [{ label: 'New Arrivals', labelUr: 'نئی آمد', link: '/shop?tag=new' }, { label: 'Topwear', labelUr: 'ٹاپ ویئر', link: '/shop/topwear' }, { label: 'Bottomwear', labelUr: 'باٹم ویئر', link: '/shop/bottomwear' }, { label: 'Footwear', labelUr: 'جوتے', link: '/shop/footwear' }, { label: 'Sale', labelUr: 'سیل', link: '/shop?sale=true' }] },
    { title: 'Help', titleUr: 'مدد', links: [{ label: 'Shipping', labelUr: 'شپنگ', link: '/pages/shipping' }, { label: 'Returns & Exchanges', labelUr: 'واپسی', link: '/pages/returns' }, { label: 'FAQ', labelUr: 'سوالات', link: '/pages/faq' }, { label: 'My orders', labelUr: 'میرے آرڈرز', link: '/account/orders' }] },
    { title: 'Company', titleUr: 'کمپنی', links: [{ label: 'About', labelUr: 'ہمارے بارے میں', link: '/pages/about' }, { label: 'Contact', labelUr: 'رابطہ', link: '/pages/contact' }, { label: 'Privacy', labelUr: 'رازداری', link: '/pages/privacy' }] },
  ],
};

export const announcement = {
  enabled: true,
  background: '#141414',
  link: '/shop?tag=new',
  messages: [
    { text: 'New arrivals every week — shop the latest drop', textUr: 'ہر ہفتے نئی آمد — تازہ ترین کلیکشن دیکھیں' },
    { text: 'Free delivery over PKR 5,000 · Same-day delivery in Multan', textUr: '5,000 روپے سے زائد پر مفت ڈیلیوری · ملتان میں اسی دن ڈیلیوری' },
    { text: 'Cash on Delivery nationwide · 7-day easy exchanges', textUr: 'پورے پاکستان میں کیش آن ڈیلیوری · 7 دن میں آسان تبادلہ' },
  ],
};

const s = (order, type, title, titleUr, content, extra = {}) => ({ type, title, titleUr, subtitle: extra.subtitle || '', subtitleUr: extra.subtitleUr || '', content, order, isVisible: true, startAt: null, endAt: null });

export const sections = [
  s(0, 'hero', 'Hero', '', {
    label: 'Menswear · 2026',
    slides: [
      { eyebrow: 'New Season', eyebrowUr: 'نیا سیزن', title: 'Built for Every Day', titleUr: 'ہر دن کے لیے', text: 'Tees, shirts and denim cut for Pakistani summers and city winters — paid at your door.', textUr: 'ٹی شرٹس، شرٹس اور جینز — ہر موسم کے لیے، ادائیگی ڈیلیوری پر۔', image: IMG.crew, ctaText: 'Shop New Arrivals', ctaTextUr: 'نئی آمد دیکھیں', ctaLink: '/shop?tag=new', cta2Text: 'Shop Topwear', cta2TextUr: 'ٹاپ ویئر', cta2Link: '/shop/topwear' },
      { eyebrow: 'Tailoring', eyebrowUr: 'ٹیلرنگ', title: 'Sharp for the Big Day', titleUr: 'خاص دن کے لیے', text: 'Suits, tuxedos and blazers for weddings, office and everything in between.', textUr: 'شادی، دفتر اور ہر موقع کے لیے سوٹس اور بلیزرز۔', image: IMG.tailoring, ctaText: 'Shop Suits', ctaTextUr: 'سوٹس', ctaLink: '/shop/suits-blazers', cta2Text: 'Formal Shoes', cta2TextUr: 'فارمل جوتے', cta2Link: '/shop/formal-shoes' },
      { eyebrow: 'Denim', eyebrowUr: 'ڈینم', title: 'The Denim Edit', titleUr: 'ڈینم ایڈٹ', text: 'Slim, straight, tapered or relaxed — find the fit that is yours.', textUr: 'سلم، سٹریٹ، ٹیپرڈ یا ریلیکسڈ — اپنا فٹ چنیں۔', image: IMG.denimWall, ctaText: 'Shop Jeans', ctaTextUr: 'جینز', ctaLink: '/shop/jeans', cta2Text: 'Shop Bottomwear', cta2TextUr: 'باٹم ویئر', cta2Link: '/shop/bottomwear' },
    ],
  }),
  s(1, 'categoryMosaic', 'Shop by Category', 'زمرہ کے مطابق', { items: [{ category: 'topwear', image: IMG.tee4, tall: true }, { category: 'bottomwear', image: IMG.jeans6 }, { category: 'jackets', image: IMG.leatherMan }, { category: 'footwear', image: IMG.sneaker1 }, { category: 'accessories', image: IMG.watch1 }] }, { subtitle: 'Fashionist Men' }),
  s(2, 'productRail', 'New Arrivals', 'نئی آمد', { source: 'new', category: '', productIds: [], limit: 12 }, { subtitle: 'Fresh this week', subtitleUr: 'اس ہفتے نیا' }),
  s(3, 'shopTheLook', 'Shop the Look', 'یہ لُک خریدیں', {
    image: IMG.look,
    hotspots: [
      { x: 20, y: 45, productSlug: 'slim-fit-stretch-jeans' },
      { x: 48, y: 25, productSlug: 'oxford-button-down-shirt' },
      { x: 80, y: 40, productSlug: 'camel-smart-blazer' },
      { x: 45, y: 85, productSlug: 'brown-leather-derby-shoes' },
    ],
  }, { subtitle: 'Styled by Fashionist' }),
  s(4, 'spotlight', 'Suited & Booted', 'سوٹ اور بوٹ', { image: IMG.suitGreen, eyebrow: 'Wedding Season', eyebrowUr: 'شادیوں کا موسم', text: 'Three-piece checks, emerald wedding suits and double-monk shoes — everything for the baraat and the walima.', textUr: 'تھری پیس سوٹس، ویڈنگ سوٹس اور مونک شوز — بارات اور ولیمے کے لیے۔', ctaText: 'Shop the Wedding Edit', ctaTextUr: 'شادی کا انتخاب', ctaLink: '/search?q=wedding' }),
  s(5, 'productRail', 'On Sale', 'سیل', { source: 'sale', category: '', productIds: [], limit: 12 }, { subtitle: 'Limited-time prices', subtitleUr: 'محدود وقت کی قیمتیں' }),
  s(6, 'mostLoved', 'Most Loved', 'سب سے زیادہ فروخت', { tabs: ['topwear', 'bottomwear', 'footwear', 'accessories'], limit: 4 }),
  s(7, 'promiseStrip', 'Our Promise', 'ہمارا وعدہ', {
    items: [
      { icon: 'cod', title: 'Cash on Delivery', titleUr: 'کیش آن ڈیلیوری', text: 'Pay when it arrives', textUr: 'پہنچنے پر ادائیگی' },
      { icon: 'truck', title: 'Nationwide Delivery', titleUr: 'ملک بھر میں ڈیلیوری', text: 'Same day in Multan', textUr: 'ملتان میں اسی دن' },
      { icon: 'returns', title: '7-Day Exchanges', titleUr: '7 دن تبادلہ', text: 'Wrong size? Swap it', textUr: 'غلط سائز؟ بدل لیں' },
      { icon: 'shield', title: 'Quality Checked', titleUr: 'معیار کی جانچ', text: 'Every piece inspected', textUr: 'ہر چیز چیک شدہ' },
    ],
  }),
  s(8, 'testimonials', 'Loved Across Pakistan', 'پورے پاکستان کی پسند', {
    items: [
      { name: 'Ali H., Multan', rating: 5, text: 'Ordered at noon, the rider dropped it the same evening. The denim fits perfectly.', textUr: 'دوپہر کو آرڈر کیا، شام کو مل گیا۔ جینز بالکل فٹ ہے۔' },
      { name: 'Hamza R., Karachi', rating: 5, text: 'The Oxford shirt is my new office favourite — crisp even after a long day.', textUr: 'آکسفورڈ شرٹ اب دفتر کی پسندیدہ ہے۔' },
      { name: 'Usman T., Lahore', rating: 4, text: 'Bought the check three-piece for my brother’s wedding. Tailoring is on point.', textUr: 'بھائی کی شادی کے لیے تھری پیس لیا — بہترین ٹیلرنگ۔' },
      { name: 'Bilal S., Islamabad', rating: 5, text: 'Exchanged sneakers for a bigger size with zero hassle. Cash on delivery made it easy.', textUr: 'سنیکرز کا سائز آسانی سے بدل گیا۔' },
    ],
  }),
  s(9, 'lookbookGrid', 'The Lookbook', 'لُک بُک', { handle: '@fashionist.store', images: [IMG.leatherMan, IMG.suitMan, IMG.tee6, IMG.chinoLook, IMG.polka, IMG.suede] }),
  s(10, 'newsletter', 'Join the Fashionist circle', 'فیشنسٹ سرکل میں شامل ہوں', { text: 'First look at new drops, private sales and styling notes.', textUr: 'نئے ڈراپس اور خصوصی سیلز سب سے پہلے۔' }),
];

const page = (slug, title, titleUr, intro, image, blocks, metaDescription) => ({
  slug,
  title,
  titleUr,
  isPublished: true,
  metaTitle: `${title} | Fashionist`,
  metaDescription: metaDescription || intro,
  blocks: [{ type: 'paragraph', text: intro, textUr: '' }, ...(image ? [{ type: 'image', image }] : []), ...blocks],
});

export const pages = [
  page('about', 'Our Story', 'ہماری کہانی', 'Fashionist began in Multan with a simple belief: every man deserves well-made clothes at an honest price, delivered to his door.', IMG.rack, [
    { type: 'twoColumn', left: 'The Edit — tees, shirts, denim, tailoring, footwear and accessories, chosen for fit, fabric and value. Every piece is quality-checked before it ships.', leftUr: '', right: 'Our Promise — honest prices, Cash on Delivery to every city in Pakistan, same-day delivery in Multan and 7-day easy exchanges.', rightUr: '' },
  ]),
  page('contact', 'Contact Us', 'رابطہ کریں', 'We are here Monday to Saturday, 10am – 8pm PKT. Call, email or message us on WhatsApp.', IMG.street, [
    { type: 'heading', text: 'Visit the studio', textUr: 'اسٹوڈیو' },
    { type: 'paragraph', text: 'Gulgasht Colony, Multan, Pakistan · 0300 1234567 · hello@fashionist.store', textUr: '' },
  ]),
  page('shipping', 'Shipping', 'شپنگ', 'We deliver nationwide via trusted courier partners.', null, [
    { type: 'heading', text: 'Delivery times', textUr: 'ڈیلیوری کا وقت' },
    { type: 'paragraph', text: 'Multan: same-day delivery by our own riders (order before the cut-off). Major cities: 2–3 working days. Other cities: 3–5 working days.', textUr: '' },
    { type: 'heading', text: 'Delivery fee', textUr: 'ڈیلیوری فیس' },
    { type: 'paragraph', text: 'Multan PKR 150; other cities PKR 200–250. Free delivery on orders above PKR 5,000.', textUr: '' },
  ]),
  page('returns', 'Returns & Exchanges', 'واپسی اور تبادلہ', 'Changed your mind? You have 7 days from delivery.', null, [
    { type: 'heading', text: 'How to request', textUr: '' },
    { type: 'paragraph', text: 'Go to Account → Orders, open your delivered order and choose Return / Exchange.', textUr: '' },
    { type: 'heading', text: 'Conditions', textUr: '' },
    { type: 'paragraph', text: 'Items must be unworn, unwashed and with original tags. Underwear, socks and opened fragrances cannot be returned.', textUr: '' },
  ]),
  page('privacy', 'Privacy Policy', 'رازداری کی پالیسی', 'We only collect what we need to deliver your order.', null, [
    { type: 'heading', text: 'What we collect', textUr: '' },
    { type: 'paragraph', text: 'Name, phone, email and delivery address.', textUr: '' },
    { type: 'heading', text: 'Security', textUr: '' },
    { type: 'paragraph', text: 'Passwords are hashed and never visible to anyone, including us. We never sell your data.', textUr: '' },
  ]),
  page('faq', 'FAQ', 'عام سوالات', 'Answers to what our customers ask most.', null, [
    {
      type: 'faq',
      items: [
        { q: 'Do you offer Cash on Delivery?', qUr: 'کیا کیش آن ڈیلیوری ہے؟', a: 'Yes — COD is our only payment method, available nationwide.', aUr: 'جی ہاں، پورے پاکستان میں۔' },
        { q: 'How do I find my size?', qUr: 'سائز کیسے معلوم کروں؟', a: 'Every product page has a size guide. Between sizes? Choose the larger one.', aUr: '' },
        { q: 'Can I change my order?', qUr: 'کیا آرڈر بدل سکتے ہیں؟', a: 'You can cancel while the order is still Pending from your account.', aUr: '' },
      ],
    },
  ]),
];

export const cmsDefaults = { theme, navigation, announcement, sections, pages };
