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
    { label: 'Women', labelUr: 'خواتین', link: '/shop/women', image: IMG.w3, children: [{ label: 'Lawn', labelUr: 'لان', link: '/shop/lawn' }, { label: 'Formal', labelUr: 'فارمل', link: '/shop/formal' }, { label: 'Bridal', labelUr: 'برائیڈل', link: '/shop/bridal' }] },
    { label: 'Men', labelUr: 'مرد', link: '/shop/men', image: IMG.m3, children: [{ label: 'Kurta', labelUr: 'کرتا', link: '/shop/kurta' }, { label: 'Shalwar Kameez', labelUr: 'شلوار قمیض', link: '/shop/shalwar-kameez' }] },
    { label: 'Kids', labelUr: 'بچے', link: '/shop/kids', image: IMG.k2, children: [] },
    { label: 'Unstitched', labelUr: 'ان سلا', link: '/shop/unstitched', image: IMG.f1, children: [{ label: 'Sold by the metre', labelUr: 'فی میٹر', link: '/search?q=metre' }] },
    { label: 'Accessories', labelUr: 'لوازمات', link: '/shop/accessories', image: IMG.a2, children: [{ label: 'Khussa', labelUr: 'کھسہ', link: '/shop/khussa' }, { label: 'Jewellery', labelUr: 'زیورات', link: '/shop/jewellery' }] },
  ],
  footer: [
    { title: 'Shop', titleUr: 'خریداری', links: [{ label: 'Women', labelUr: 'خواتین', link: '/shop/women' }, { label: 'Men', labelUr: 'مرد', link: '/shop/men' }, { label: 'Kids', labelUr: 'بچے', link: '/shop/kids' }, { label: 'Unstitched', labelUr: 'ان سلا', link: '/shop/unstitched' }] },
    { title: 'Help', titleUr: 'مدد', links: [{ label: 'Shipping', labelUr: 'شپنگ', link: '/pages/shipping' }, { label: 'Returns & Exchanges', labelUr: 'واپسی', link: '/pages/returns' }, { label: 'FAQ', labelUr: 'سوالات', link: '/pages/faq' }, { label: 'My orders', labelUr: 'میرے آرڈرز', link: '/account/orders' }] },
    { title: 'Company', titleUr: 'کمپنی', links: [{ label: 'About', labelUr: 'ہمارے بارے میں', link: '/pages/about' }, { label: 'Contact', labelUr: 'رابطہ', link: '/pages/contact' }, { label: 'Privacy', labelUr: 'رازداری', link: '/pages/privacy' }] },
  ],
};

export const announcement = {
  enabled: true,
  background: '#141414',
  link: '/shop',
  messages: [
    { text: 'Free delivery over PKR 5,000', textUr: '5,000 روپے سے زائد پر مفت ڈیلیوری' },
    { text: 'Cash on Delivery nationwide', textUr: 'پورے پاکستان میں کیش آن ڈیلیوری' },
    { text: '7-day easy returns', textUr: '7 دن میں آسان واپسی' },
  ],
};

const s = (order, type, title, titleUr, content, extra = {}) => ({ type, title, titleUr, subtitle: extra.subtitle || '', subtitleUr: extra.subtitleUr || '', content, order, isVisible: true, startAt: null, endAt: null });

export const sections = [
  s(0, 'hero', 'Hero', '', {
    label: 'SS 2026 Collection',
    slides: [
      { eyebrow: 'Eid 2026', eyebrowUr: 'عید 2026', title: 'The Eid Edit', titleUr: 'عید ایڈٹ', text: 'Hand-embroidered lawn, organza and silk — pieces made for the moments you will retell for years.', textUr: 'ہاتھ کی کڑھائی والی لان، آرگنزا اور سلک — ان لمحوں کے لیے جنہیں آپ برسوں یاد رکھیں گے۔', image: IMG.w1, ctaText: 'Shop Women', ctaTextUr: 'خواتین', ctaLink: '/shop/women', cta2Text: 'Shop Men', cta2TextUr: 'مرد', cta2Link: '/shop/men' },
      { eyebrow: 'Menswear', eyebrowUr: 'مردانہ', title: 'Quiet Tailoring', titleUr: 'خاموش ٹیلرنگ', text: 'Linen kurtas and jamawar waistcoats, cut with restraint and finished by hand.', textUr: 'لینن کرتے اور جامہ وار واسکٹ، سادگی سے تراشے گئے۔', image: IMG.m1, ctaText: 'Shop Men', ctaTextUr: 'مرد', ctaLink: '/shop/men', cta2Text: 'Shop Women', cta2TextUr: 'خواتین', cta2Link: '/shop/women' },
      { eyebrow: 'Unstitched', eyebrowUr: 'ان سلا', title: 'Silk, by the Metre', titleUr: 'میٹر کے حساب سے سلک', text: 'Raw silks and jacquards in heirloom colours. Your tailor, your silhouette.', textUr: 'روایتی رنگوں میں را سلک اور جیکارڈ۔', image: IMG.w2, ctaText: 'Shop Fabrics', ctaTextUr: 'کپڑا', ctaLink: '/shop/unstitched', cta2Text: 'Shop Women', cta2TextUr: 'خواتین', cta2Link: '/shop/women' },
    ],
  }),
  s(1, 'categoryMosaic', 'Shop by Category', 'زمرہ کے مطابق', { items: [{ category: 'women', image: IMG.w4, tall: true }, { category: 'men', image: IMG.m2 }, { category: 'kids', image: IMG.k1 }, { category: 'unstitched', image: IMG.f1 }, { category: 'accessories', image: IMG.a1 }] }, { subtitle: 'Fashionist' }),
  s(2, 'productRail', 'New In', 'نیا آیا ہے', { source: 'new', category: '', productIds: [], limit: 10 }, { subtitle: 'Fresh from the atelier', subtitleUr: 'اٹیلیئر سے تازہ' }),
  s(3, 'shopTheLook', 'Shop the Look', 'یہ لُک خریدیں', {
    image: IMG.look,
    hotspots: [
      { x: 38, y: 30, productSlug: 'noor-embroidered-lawn-kurta' },
      { x: 60, y: 55, productSlug: 'polki-choker-set' },
      { x: 46, y: 78, productSlug: 'mehr-chiffon-dupatta-set' },
      { x: 70, y: 22, productSlug: 'kundan-jhumka-earrings' },
    ],
  }, { subtitle: 'Styled by Fashionist' }),
  s(4, 'spotlight', 'Sold by the metre', 'میٹر کے حساب سے', { image: IMG.f2, eyebrow: 'Unstitched', eyebrowUr: 'ان سلا', text: 'Pure jacquards, raw silks and lawns — choose your length, design your own story with your tailor.', textUr: 'خالص جیکارڈ، را سلک اور لان — اپنی لمبائی چنیں، اپنی کہانی خود بنائیں۔', ctaText: 'Shop Fabrics', ctaTextUr: 'کپڑا خریدیں', ctaLink: '/shop/unstitched', dark: true }),
  s(5, 'mostLoved', 'Most Loved', 'سب سے زیادہ فروخت', { tabs: ['women', 'men', 'kids'], limit: 4 }),
  s(6, 'promiseStrip', 'Our Promise', 'ہمارا وعدہ', {
    items: [
      { icon: 'cod', title: 'Cash on Delivery', titleUr: 'کیش آن ڈیلیوری', text: 'Pay when it arrives', textUr: 'پہنچنے پر ادائیگی' },
      { icon: 'truck', title: 'Nationwide Delivery', titleUr: 'ملک بھر میں ڈیلیوری', text: 'Every city in Pakistan', textUr: 'پاکستان کا ہر شہر' },
      { icon: 'returns', title: '7-Day Returns', titleUr: '7 دن واپسی', text: 'Easy exchanges', textUr: 'آسان تبادلہ' },
      { icon: 'shield', title: 'Authentic Fabrics', titleUr: 'اصلی کپڑے', text: 'Crafted in Pakistan', textUr: 'پاکستان میں تیار' },
    ],
  }),
  s(7, 'testimonials', 'Loved Across Pakistan', 'پورے پاکستان کی پسند', {
    items: [
      { name: 'Ayesha K., Lahore', rating: 5, text: 'The embroidery is even more beautiful in person. Delivered in two days and paid at my door.', textUr: 'کڑھائی حقیقت میں اور بھی خوبصورت ہے۔ دو دن میں ڈیلیوری۔' },
      { name: 'Hamza R., Karachi', rating: 5, text: 'The linen kurta fits perfectly. Finally a brand that understands tailoring.', textUr: 'لینن کرتا بالکل فٹ ہے۔' },
      { name: 'Mahnoor S., Multan', rating: 4, text: 'Bought silk by the metre for my sister’s wedding — rich colour and true to the photos.', textUr: 'بہن کی شادی کے لیے سلک خریدی — شاندار رنگ۔' },
      { name: 'Sana T., Islamabad', rating: 5, text: 'Exchange was effortless. Fashionist is my go-to for Eid now.', textUr: 'تبادلہ بہت آسان تھا۔' },
    ],
  }),
  s(8, 'lookbookGrid', 'The Lookbook', 'لُک بُک', { handle: '@fashionist.store', images: [IMG.w5, IMG.m3, IMG.w6, IMG.k2, IMG.w8, IMG.m4] }),
  s(9, 'newsletter', 'Join the Fashionist circle', 'فیشنسٹ سرکل میں شامل ہوں', { text: 'First look at new drops, private sales and styling notes.', textUr: 'نئے ڈراپس اور خصوصی سیلز سب سے پہلے۔' }),
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
  page('about', 'Our Story', 'ہماری کہانی', 'Fashionist began in Multan with a simple belief: clothing should carry the stories of the people who wear it.', IMG.rack, [
    { type: 'twoColumn', left: 'The Atelier — every piece is designed in-house and finished by artisans across Punjab and Sindh: hand embroidery, tilla, gota and block print.', leftUr: '', right: 'Our Promise — authentic fabrics, honest prices, Cash on Delivery to every city in Pakistan and 7-day easy returns.', rightUr: '' },
  ]),
  page('contact', 'Contact Us', 'رابطہ کریں', 'We are here Monday to Saturday, 10am – 8pm PKT. Call, email or message us on WhatsApp.', IMG.rack2, [
    { type: 'heading', text: 'Visit the studio', textUr: 'اسٹوڈیو' },
    { type: 'paragraph', text: 'Gulgasht Colony, Multan, Pakistan · 0300 1234567 · hello@fashionist.store', textUr: '' },
  ]),
  page('shipping', 'Shipping', 'شپنگ', 'We deliver nationwide via trusted courier partners.', null, [
    { type: 'heading', text: 'Delivery times', textUr: 'ڈیلیوری کا وقت' },
    { type: 'paragraph', text: 'Major cities: 2–3 working days. Other cities: 3–5 working days.', textUr: '' },
    { type: 'heading', text: 'Delivery fee', textUr: 'ڈیلیوری فیس' },
    { type: 'paragraph', text: 'Multan PKR 150; other cities PKR 200–250. Free delivery on orders above PKR 5,000.', textUr: '' },
  ]),
  page('returns', 'Returns & Exchanges', 'واپسی اور تبادلہ', 'Changed your mind? You have 7 days from delivery.', null, [
    { type: 'heading', text: 'How to request', textUr: '' },
    { type: 'paragraph', text: 'Go to Account → Orders, open your delivered order and choose Return / Exchange.', textUr: '' },
    { type: 'heading', text: 'Conditions', textUr: '' },
    { type: 'paragraph', text: 'Items must be unworn, unwashed and with original tags. Unstitched fabric that has been cut cannot be returned.', textUr: '' },
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
