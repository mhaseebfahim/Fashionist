// Shared demo data used by the client mock adapter AND server/scripts/seed.js.
// Plain JS (no JSX / browser APIs) so Node can import it too.
// Fashionist is a menswear store: topwear, bottomwear, jackets, suits, footwear and accessories.

const u = (id, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;

// Every photo below was checked by eye — menswear only, no women's/kids' shots.
export const IMG = {
  // t-shirts & polos
  tee1: u('1521572163474-6864f9cf17ab'), tee2: u('1583743814966-8936f5b7be1a'), tee3: u('1576566588028-4147f3842f27'), tee4: u('1586790170083-2f9ceadc732d'),
  tee5: u('1618354691373-d851c5c3a990'), tee6: u('1622445275463-afa2ab738c34'), tee7: u('1564859228273-274232fdb516'), tee8: u('1622519407650-3df9883f76a5'),
  teeStack: u('1562157873-818bc0726f68'), teeRack: u('1489987707025-afc232f7ea0f'), polo: u('1472099645785-5658abf4ff4e'),
  // shirts
  denimShirt: u('1596755094514-f87e34085b2c'), flannel: u('1607345366928-199ea26cfe3e'), tieDye: u('1626497764746-6dc36546b388'), polka: u('1563389234808-52344934935c'),
  whiteShirt: u('1621072156002-e2fccdc0b176'), stripeRack: u('1596609548086-85bbf8ddb6b9'), shirtTrio: u('1602810318383-e386cc2a3ccf'), shirtTie: u('1598033129183-c4f50c736f10'),
  blueShirt: u('1620012253295-c15cc3e65df4'), shirtRack: u('1603252109303-2751441dd157'), shirtTies: u('1598032895397-b9472444bf93'),
  // hoodies & sweatshirts
  hoodie: u('1556821840-3a63f95609a7'), sweatWhite: u('1620799140408-edc6dcb6d633'), sweatBlack: u('1578681994506-b8f463449011'), sweatNavy: u('1614975059251-992f11792b9f'), hoodieRose: u('1516826957135-700dedea698c'),
  // jeans, trousers, shorts
  jeans1: u('1542272604-787c3835535d'), jeans3: u('1604176354204-9268737828e4'), jeans4: u('1565084888279-aca607ecce0c'), jeans5: u('1582552938357-32b906df40cb'), jeans6: u('1555689502-c4b22d76c56f'),
  trouser: u('1624378439575-d8705ad7ae80'), chino: u('1473966968600-fa801b869a1a'), chinoLook: u('1488161628813-04466f872be2'), shorts1: u('1506629082955-511b1aa562c8'), shorts2: u('1617952236317-0bd127407984'),
  // jackets
  bomber: u('1591047139829-d91aecb6caea'), leather: u('1551028719-00167b16eac5'), leatherMan: u('1520975954732-35dd22299614'), brownJacket: u('1614252369475-531eba835eb1'), denimJacket: u('1611312449408-fcece27cdbb7'), suede: u('1617114919297-3c8ddb01f599'),
  // suits & blazers
  suit1: u('1507679799987-c73779587ccf'), suit2: u('1617137968427-85924c800a22'), suitCheck: u('1594938298603-c8148c4dae35'), suitGreen: u('1593032465175-481ac7f401a0'), suitMan: u('1519085360753-af0119f7cbe7'),
  blazerBlack: u('1617127365659-c47fa864d8bc'), blazers: u('1600091166971-7f9faad6c1e2'), flatlay: u('1593030761757-71fae45fa0e7'),
  // footwear
  sneaker1: u('1549298916-b41d501d3772'), sneaker2: u('1603808033192-082d6919d3e1'), sneaker3: u('1555274175-6cbf6f3b137b'), sneaker4: u('1539185441755-769473a23570'), sneaker5: u('1460353581641-37baddab0fa2'),
  derby: u('1614252235316-8c857d38b5f4'), monk: u('1533867617858-e7b97e060509'), boots1: u('1608256246200-53e635b5b65f'), boots2: u('1520639888713-7851133b1ed0'),
  // accessories
  watch1: u('1523170335258-f5ed11844a49'), watch2: u('1524592094714-0f0654e20314'), sun1: u('1511499767150-a48a237f0083'), sun2: u('1572635196237-14b3f281503f'),
  belt: u('1624222247344-550fb60583dc'), wallet: u('1627123424574-724758594e93'), cap: u('1588850561407-ed78c282e89b'), beanie: u('1576871337632-b9aef4c17ab9'), backpack: u('1553062407-98eeb64c6a62'),
  // editorial (wide)
  crew: u('1490578474895-699cd4e2cf59', 1600), rack: u('1489987707025-afc232f7ea0f', 1600), look: u('1593030761757-71fae45fa0e7', 1600), denimWall: u('1565084888279-aca607ecce0c', 1600), street: u('1617114919297-3c8ddb01f599', 1600), tailoring: u('1594938298603-c8148c4dae35', 1600),
};

export const slugify = (s) => String(s).toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// parent: slug of the parent category (null = top level)
export const categories = [
  { slug: 'topwear', name: 'Topwear', nameUr: 'ٹاپ ویئر', image: IMG.tee4, sortOrder: 1, parent: null },
  { slug: 'bottomwear', name: 'Bottomwear', nameUr: 'باٹم ویئر', image: IMG.jeans6, sortOrder: 2, parent: null },
  { slug: 'suits-blazers', name: 'Suits & Blazers', nameUr: 'سوٹس اور بلیزرز', image: IMG.suitCheck, sortOrder: 3, parent: null },
  { slug: 'footwear', name: 'Footwear', nameUr: 'جوتے', image: IMG.sneaker1, sortOrder: 4, parent: null },
  { slug: 'accessories', name: 'Accessories', nameUr: 'لوازمات', image: IMG.watch1, sortOrder: 5, parent: null },
  { slug: 't-shirts', name: 'T-Shirts', nameUr: 'ٹی شرٹس', image: IMG.tee1, sortOrder: 1, parent: 'topwear' },
  { slug: 'polo-shirts', name: 'Polo Shirts', nameUr: 'پولو شرٹس', image: IMG.polo, sortOrder: 2, parent: 'topwear' },
  { slug: 'casual-shirts', name: 'Casual Shirts', nameUr: 'کیژول شرٹس', image: IMG.flannel, sortOrder: 3, parent: 'topwear' },
  { slug: 'formal-shirts', name: 'Formal Shirts', nameUr: 'فارمل شرٹس', image: IMG.shirtTie, sortOrder: 4, parent: 'topwear' },
  { slug: 'hoodies-sweatshirts', name: 'Hoodies & Sweatshirts', nameUr: 'ہوڈیز اور سویٹ شرٹس', image: IMG.hoodie, sortOrder: 5, parent: 'topwear' },
  { slug: 'jackets', name: 'Jackets', nameUr: 'جیکٹس', image: IMG.leatherMan, sortOrder: 6, parent: 'topwear' },
  { slug: 'jeans', name: 'Jeans', nameUr: 'جینز', image: IMG.jeans1, sortOrder: 1, parent: 'bottomwear' },
  { slug: 'trousers-chinos', name: 'Trousers & Chinos', nameUr: 'ٹراؤزرز اور چینوز', image: IMG.chino, sortOrder: 2, parent: 'bottomwear' },
  { slug: 'shorts', name: 'Shorts', nameUr: 'شارٹس', image: IMG.shorts2, sortOrder: 3, parent: 'bottomwear' },
  { slug: 'suits', name: 'Suits', nameUr: 'سوٹس', image: IMG.suit1, sortOrder: 1, parent: 'suits-blazers' },
  { slug: 'blazers', name: 'Blazers', nameUr: 'بلیزرز', image: IMG.blazerBlack, sortOrder: 2, parent: 'suits-blazers' },
  { slug: 'sneakers', name: 'Sneakers', nameUr: 'سنیکرز', image: IMG.sneaker2, sortOrder: 1, parent: 'footwear' },
  { slug: 'formal-shoes', name: 'Formal Shoes', nameUr: 'فارمل جوتے', image: IMG.derby, sortOrder: 2, parent: 'footwear' },
  { slug: 'boots', name: 'Boots', nameUr: 'بوٹس', image: IMG.boots1, sortOrder: 3, parent: 'footwear' },
  { slug: 'watches', name: 'Watches', nameUr: 'گھڑیاں', image: IMG.watch2, sortOrder: 1, parent: 'accessories' },
  { slug: 'sunglasses', name: 'Sunglasses', nameUr: 'دھوپ کے چشمے', image: IMG.sun1, sortOrder: 2, parent: 'accessories' },
  { slug: 'belts-wallets', name: 'Belts & Wallets', nameUr: 'بیلٹ اور والٹ', image: IMG.belt, sortOrder: 3, parent: 'accessories' },
  { slug: 'caps-bags', name: 'Caps & Bags', nameUr: 'کیپس اور بیگز', image: IMG.backpack, sortOrder: 4, parent: 'accessories' },
];

const SIZES = { T: ['S', 'M', 'L', 'XL', 'XXL'], W: ['30', '32', '34', '36', '38'], SU: ['38', '40', '42', '44'], SH: ['40', '41', '42', '43', '44'], O: ['One Size'] };

// [title, titleUr, category, price, compareAt, attributes, colours, sizeSet, tags, images, featured]
const P = [
  // ---- T-shirts ----
  ['Essential Crew Neck Tee', 'ایسنشل کریو نیک ٹی شرٹ', 't-shirts', 1490, 0, { fabric: 'Cotton', fit: 'Regular', sleeve: 'Short', occasion: 'Casual' }, ['White', 'Black', 'Navy'], 'T', ['new', 'basics', 'summer'], ['tee1', 'tee4'], true],
  ['Heavyweight Oversized Tee', 'ہیوی ویٹ اوور سائز ٹی شرٹ', 't-shirts', 1990, 0, { fabric: 'Cotton', fit: 'Oversized', sleeve: 'Short', occasion: 'Casual' }, ['Black', 'White'], 'T', ['new', 'streetwear'], ['tee2', 'tee6']],
  ['Original Graphic Print Tee', 'اوریجنل گرافک پرنٹ ٹی شرٹ', 't-shirts', 1790, 2190, { fabric: 'Cotton', fit: 'Regular', sleeve: 'Short', occasion: 'Casual' }, ['Beige'], 'T', ['graphic', 'streetwear'], ['tee3', 'tee7']],
  ['Sunset Back Print Tee', 'سن سیٹ بیک پرنٹ ٹی شرٹ', 't-shirts', 1890, 0, { fabric: 'Cotton', fit: 'Relaxed', sleeve: 'Short', occasion: 'Casual' }, ['White'], 'T', ['graphic', 'summer'], ['tee7', 'tee3']],
  ['Contrast Stitch Ribbed Tee', 'کنٹراسٹ سٹچ ربڈ ٹی شرٹ', 't-shirts', 1690, 0, { fabric: 'Cotton Blend', fit: 'Slim', sleeve: 'Short', occasion: 'Casual' }, ['Black'], 'T', ['new'], ['tee8', 'tee5']],
  ['Pima Cotton V-Neck Tee', 'پیما کاٹن وی نیک ٹی شرٹ', 't-shirts', 2290, 0, { fabric: 'Pima Cotton', fit: 'Slim', sleeve: 'Short', occasion: 'Casual' }, ['White', 'Grey'], 'T', ['basics'], ['tee4', 'tee1']],
  ['Everyday Basics Tee 3-Pack', 'روزمرہ بیسک ٹی شرٹس تین پیک', 't-shirts', 3490, 4470, { fabric: 'Cotton', fit: 'Regular', sleeve: 'Short', occasion: 'Casual' }, ['Mixed'], 'T', ['basics', 'value', 'sale'], ['teeStack', 'teeRack'], true],
  ['Longline Slub Tee', 'لانگ لائن سلب ٹی شرٹ', 't-shirts', 1590, 0, { fabric: 'Slub Cotton', fit: 'Relaxed', sleeve: 'Short', occasion: 'Casual' }, ['Olive', 'Charcoal'], 'T', ['streetwear'], ['teeRack', 'tee5']],
  ['Logo Badge Crew Tee', 'لوگو بیج کریو ٹی شرٹ', 't-shirts', 1690, 1990, { fabric: 'Cotton', fit: 'Regular', sleeve: 'Short', occasion: 'Casual' }, ['Black'], 'T', ['sale'], ['tee5', 'tee2']],
  // ---- Polo shirts ----
  ['Classic Pique Polo', 'کلاسک پیکے پولو شرٹ', 'polo-shirts', 2490, 0, { fabric: 'Pique Cotton', fit: 'Regular', sleeve: 'Short', occasion: 'Smart Casual' }, ['Olive', 'Navy', 'White'], 'T', ['new', 'summer'], ['polo', 'teeStack'], true],
  ['Tipped Collar Polo', 'ٹپڈ کالر پولو شرٹ', 'polo-shirts', 2790, 3290, { fabric: 'Pique Cotton', fit: 'Slim', sleeve: 'Short', occasion: 'Smart Casual' }, ['Black', 'White'], 'T', ['sale'], ['polo', 'tee8']],
  ['Knitted Resort Polo', 'نٹڈ ریزورٹ پولو شرٹ', 'polo-shirts', 3290, 0, { fabric: 'Cotton Knit', fit: 'Relaxed', sleeve: 'Short', occasion: 'Smart Casual' }, ['Sand', 'Navy'], 'T', ['new'], ['polo', 'tee4']],
  // ---- Casual shirts ----
  ['Washed Denim Shirt', 'واشڈ ڈینم شرٹ', 'casual-shirts', 3990, 0, { fabric: 'Denim', fit: 'Regular', sleeve: 'Full', occasion: 'Casual' }, ['Indigo'], 'T', ['new', 'denim'], ['denimShirt', 'jeans4'], true],
  ['Brushed Flannel Check Shirt', 'برشڈ فلالین چیک شرٹ', 'casual-shirts', 3790, 0, { fabric: 'Flannel', fit: 'Regular', sleeve: 'Full', occasion: 'Casual' }, ['Olive', 'Maroon'], 'T', ['winter', 'check'], ['flannel', 'stripeRack']],
  ['Tie-Dye Resort Shirt', 'ٹائی ڈائی ریزورٹ شرٹ', 'casual-shirts', 3290, 3790, { fabric: 'Viscose', fit: 'Relaxed', sleeve: 'Half', occasion: 'Vacation' }, ['Sky', 'Rust'], 'T', ['summer', 'sale'], ['tieDye', 'polka']],
  ['Polka Dot Short Sleeve Shirt', 'پولکا ڈاٹ ہاف سلیو شرٹ', 'casual-shirts', 2990, 0, { fabric: 'Cotton', fit: 'Slim', sleeve: 'Half', occasion: 'Casual' }, ['Navy'], 'T', ['summer'], ['polka', 'tieDye']],
  ['Oxford Button-Down Shirt', 'آکسفورڈ بٹن ڈاؤن شرٹ', 'casual-shirts', 3490, 0, { fabric: 'Oxford Cotton', fit: 'Regular', sleeve: 'Full', occasion: 'Smart Casual' }, ['White', 'Light Blue'], 'T', ['new', 'basics'], ['whiteShirt', 'shirtRack'], true],
  ['Linen Blend Camp Collar Shirt', 'لینن بلینڈ کیمپ کالر شرٹ', 'casual-shirts', 3690, 0, { fabric: 'Linen Blend', fit: 'Relaxed', sleeve: 'Half', occasion: 'Vacation' }, ['Sand', 'White'], 'T', ['summer', 'new'], ['whiteShirt', 'tieDye']],
  ['Striped Cotton Shirt', 'دھاری دار کاٹن شرٹ', 'casual-shirts', 2990, 3490, { fabric: 'Cotton', fit: 'Regular', sleeve: 'Full', occasion: 'Casual' }, ['Navy'], 'T', ['sale'], ['stripeRack', 'polka']],
  // ---- Formal shirts ----
  ['Slim Fit Poplin Dress Shirt', 'سلم فٹ پاپلن ڈریس شرٹ', 'formal-shirts', 3290, 0, { fabric: 'Poplin', fit: 'Slim', sleeve: 'Full', occasion: 'Formal' }, ['White', 'Light Blue'], 'T', ['office', 'basics'], ['shirtTie', 'shirtRack'], true],
  ['Non-Iron Twill Formal Shirt', 'نان آئرن ٹوئل فارمل شرٹ', 'formal-shirts', 3790, 0, { fabric: 'Twill', fit: 'Regular', sleeve: 'Full', occasion: 'Formal' }, ['Light Blue', 'Pink'], 'T', ['office', 'new'], ['blueShirt', 'shirtTies']],
  ['Premium Satin Finish Shirt', 'پریمیم ساٹن فنش شرٹ', 'formal-shirts', 3990, 4690, { fabric: 'Cotton Satin', fit: 'Slim', sleeve: 'Full', occasion: 'Party' }, ['Grey', 'White', 'Maroon'], 'T', ['party', 'sale'], ['shirtTrio', 'shirtRack']],
  ['Cutaway Collar Business Shirt', 'کٹ اوے کالر بزنس شرٹ', 'formal-shirts', 3490, 0, { fabric: 'Cotton', fit: 'Regular', sleeve: 'Full', occasion: 'Formal' }, ['White'], 'T', ['office'], ['shirtTies', 'shirtTie']],
  // ---- Hoodies & sweatshirts ----
  ['Fleece Pullover Hoodie', 'فلیس پل اوور ہوڈی', 'hoodies-sweatshirts', 3990, 4790, { fabric: 'Fleece', fit: 'Regular', sleeve: 'Full', occasion: 'Casual' }, ['Grey', 'Black'], 'T', ['winter', 'sale'], ['hoodie', 'sweatBlack'], true],
  ['Essential Crew Sweatshirt', 'ایسنشل کریو سویٹ شرٹ', 'hoodies-sweatshirts', 3290, 0, { fabric: 'Cotton Fleece', fit: 'Regular', sleeve: 'Full', occasion: 'Casual' }, ['White', 'Navy'], 'T', ['winter', 'basics'], ['sweatWhite', 'sweatNavy']],
  ['Embroidered Chest Sweatshirt', 'کڑھائی والی سویٹ شرٹ', 'hoodies-sweatshirts', 3590, 0, { fabric: 'Cotton Fleece', fit: 'Relaxed', sleeve: 'Full', occasion: 'Casual' }, ['Black', 'Navy'], 'T', ['new', 'streetwear'], ['sweatBlack', 'sweatNavy']],
  ['Garment-Dyed Hoodie', 'گارمنٹ ڈائیڈ ہوڈی', 'hoodies-sweatshirts', 4290, 0, { fabric: 'French Terry', fit: 'Oversized', sleeve: 'Full', occasion: 'Casual' }, ['Pink', 'Grey'], 'T', ['new', 'streetwear'], ['hoodieRose', 'hoodie']],
  // ---- Jeans ----
  ['Slim Fit Stretch Jeans', 'سلم فٹ اسٹریچ جینز', 'jeans', 4490, 5290, { fabric: 'Stretch Denim', fit: 'Slim', occasion: 'Casual' }, ['Indigo', 'Black'], 'W', ['denim', 'new', 'sale'], ['jeans1', 'jeans3'], true],
  ['Ripped Skinny Jeans', 'رپڈ اسکنی جینز', 'jeans', 4290, 0, { fabric: 'Stretch Denim', fit: 'Skinny', occasion: 'Casual' }, ['Light Blue'], 'W', ['denim', 'streetwear'], ['jeans5', 'jeans6']],
  ['Straight Fit Selvedge Jeans', 'سٹریٹ فٹ سیلوج جینز', 'jeans', 5990, 0, { fabric: 'Selvedge Denim', fit: 'Straight', occasion: 'Casual' }, ['Indigo'], 'W', ['denim', 'premium'], ['jeans4', 'jeans1']],
  ['Tapered Washed Jeans', 'ٹیپرڈ واشڈ جینز', 'jeans', 4790, 0, { fabric: 'Denim', fit: 'Tapered', occasion: 'Casual' }, ['Blue'], 'W', ['denim', 'new'], ['jeans6', 'jeans3']],
  ['Relaxed Fit Light Wash Jeans', 'ریلیکسڈ فٹ لائٹ واش جینز', 'jeans', 4590, 0, { fabric: 'Denim', fit: 'Relaxed', occasion: 'Casual' }, ['Light Blue'], 'W', ['denim'], ['jeans5', 'jeans4']],
  ['Black Distressed Jeans', 'بلیک ڈسٹریسڈ جینز', 'jeans', 4390, 4990, { fabric: 'Stretch Denim', fit: 'Slim', occasion: 'Casual' }, ['Black'], 'W', ['denim', 'sale', 'streetwear'], ['jeans3', 'jeans1']],
  // ---- Trousers & chinos ----
  ['Slim Stretch Chinos', 'سلم اسٹریچ چینوز', 'trousers-chinos', 3490, 0, { fabric: 'Cotton Twill', fit: 'Slim', occasion: 'Smart Casual' }, ['Khaki', 'Navy', 'Black'], 'W', ['new', 'basics'], ['chino', 'chinoLook'], true],
  ['Wool-Blend Formal Trousers', 'وول بلینڈ فارمل ٹراؤزر', 'trousers-chinos', 4490, 0, { fabric: 'Wool Blend', fit: 'Slim', occasion: 'Formal' }, ['Charcoal', 'Black'], 'W', ['office'], ['trouser', 'flatlay']],
  ['Cargo Jogger Pants', 'کارگو جوگر پینٹ', 'trousers-chinos', 3290, 3790, { fabric: 'Cotton', fit: 'Tapered', occasion: 'Casual' }, ['Olive', 'Khaki'], 'W', ['streetwear', 'sale'], ['chino', 'chinoLook']],
  ['Pleated Smart Trousers', 'پلیٹڈ اسمارٹ ٹراؤزر', 'trousers-chinos', 3990, 0, { fabric: 'Poly Viscose', fit: 'Regular', occasion: 'Formal' }, ['Navy', 'Grey'], 'W', ['office', 'new'], ['trouser', 'chinoLook']],
  ['Drawstring Linen Pants', 'ڈوری والی لینن پینٹ', 'trousers-chinos', 3290, 0, { fabric: 'Linen', fit: 'Relaxed', occasion: 'Vacation' }, ['Sand', 'White'], 'W', ['summer'], ['chinoLook', 'chino']],
  // ---- Shorts ----
  ['Cotton Chino Shorts', 'کاٹن چینو شارٹس', 'shorts', 2290, 0, { fabric: 'Cotton Twill', fit: 'Regular', occasion: 'Casual' }, ['Maroon', 'Khaki'], 'W', ['summer', 'new'], ['shorts2', 'shorts1'], true],
  ['Jersey Lounge Shorts', 'جرسی لاؤنج شارٹس', 'shorts', 1790, 0, { fabric: 'Cotton Jersey', fit: 'Relaxed', occasion: 'Lounge' }, ['Grey'], 'W', ['summer', 'basics'], ['shorts1', 'shorts2']],
  ['Quick-Dry Swim Shorts', 'کوئک ڈرائی سوئم شارٹس', 'shorts', 1990, 2490, { fabric: 'Polyester', fit: 'Regular', occasion: 'Vacation' }, ['Navy', 'Maroon'], 'W', ['summer', 'sale'], ['shorts2', 'shorts1']],
  ['Drawstring Gym Shorts', 'ڈوری والی جم شارٹس', 'shorts', 1690, 0, { fabric: 'Polyester', fit: 'Regular', occasion: 'Sports' }, ['Grey', 'Black'], 'W', ['sports'], ['shorts1', 'shorts2']],
  // ---- Jackets ----
  ['Classic Bomber Jacket', 'کلاسک بمبر جیکٹ', 'jackets', 6990, 8490, { fabric: 'Nylon', fit: 'Regular', occasion: 'Casual' }, ['Tan', 'Black'], 'T', ['winter', 'sale'], ['bomber', 'leatherMan'], true],
  ['Biker Leather Jacket', 'بائیکر لیدر جیکٹ', 'jackets', 14990, 0, { fabric: 'Genuine Leather', fit: 'Slim', occasion: 'Casual' }, ['Black'], 'T', ['winter', 'premium', 'new'], ['leather', 'leatherMan'], true],
  ['Suede Trucker Jacket', 'سویڈ ٹرکر جیکٹ', 'jackets', 9990, 0, { fabric: 'Suede', fit: 'Regular', occasion: 'Smart Casual' }, ['Tan'], 'T', ['winter'], ['suede', 'brownJacket']],
  ['Washed Denim Jacket', 'واشڈ ڈینم جیکٹ', 'jackets', 5990, 0, { fabric: 'Denim', fit: 'Regular', occasion: 'Casual' }, ['Indigo'], 'T', ['denim', 'new'], ['denimJacket', 'denimShirt']],
  ['Leather Racer Jacket', 'لیدر ریسر جیکٹ', 'jackets', 13990, 15990, { fabric: 'Genuine Leather', fit: 'Slim', occasion: 'Casual' }, ['Brown'], 'T', ['winter', 'premium', 'sale'], ['brownJacket', 'suede']],
  ['Utility Field Jacket', 'یوٹیلیٹی فیلڈ جیکٹ', 'jackets', 6490, 0, { fabric: 'Cotton Canvas', fit: 'Regular', occasion: 'Casual' }, ['Olive'], 'T', ['winter'], ['chinoLook', 'bomber']],
  // ---- Suits ----
  ['Navy Two-Piece Suit', 'نیوی ٹو پیس سوٹ', 'suits', 18990, 22990, { fabric: 'Wool Blend', fit: 'Slim', occasion: 'Formal' }, ['Navy'], 'SU', ['wedding', 'office', 'sale'], ['suit1', 'suitMan'], true],
  ['Royal Blue Slim Suit', 'رائل بلیو سلم سوٹ', 'suits', 16990, 0, { fabric: 'Poly Viscose', fit: 'Slim', occasion: 'Party' }, ['Blue'], 'SU', ['party', 'new'], ['suit2', 'suit1']],
  ['Prince of Wales Check Three-Piece Suit', 'پرنس آف ویلز چیک تھری پیس سوٹ', 'suits', 24990, 0, { fabric: 'Tweed Wool', fit: 'Tailored', occasion: 'Wedding' }, ['Blue'], 'SU', ['wedding', 'premium', 'new'], ['suitCheck', 'suit2'], true],
  ['Emerald Wedding Suit', 'ایمرلڈ ویڈنگ سوٹ', 'suits', 21990, 0, { fabric: 'Wool Blend', fit: 'Tailored', occasion: 'Wedding' }, ['Green'], 'SU', ['wedding', 'party'], ['suitGreen', 'suitMan']],
  ['Midnight Black Tuxedo', 'مڈنائٹ بلیک ٹکسیڈو', 'suits', 23990, 26990, { fabric: 'Wool Blend', fit: 'Slim', occasion: 'Wedding' }, ['Black'], 'SU', ['wedding', 'premium', 'sale'], ['suitMan', 'blazerBlack']],
  // ---- Blazers ----
  ['Black Textured Blazer', 'بلیک ٹیکسچرڈ بلیزر', 'blazers', 9990, 11990, { fabric: 'Poly Viscose', fit: 'Slim', occasion: 'Party' }, ['Black'], 'SU', ['party', 'sale'], ['blazerBlack', 'blazers'], true],
  ['Windowpane Check Blazer', 'ونڈو پین چیک بلیزر', 'blazers', 10990, 0, { fabric: 'Wool Blend', fit: 'Regular', occasion: 'Smart Casual' }, ['Grey'], 'SU', ['check', 'new'], ['blazers', 'flatlay']],
  ['Camel Smart Blazer', 'کیمل اسمارٹ بلیزر', 'blazers', 9490, 0, { fabric: 'Cotton Blend', fit: 'Regular', occasion: 'Smart Casual' }, ['Tan'], 'SU', ['office'], ['flatlay', 'blazers']],
  // ---- Sneakers ----
  ['Tan Leather Low-Top Sneakers', 'ٹین لیدر لو ٹاپ سنیکرز', 'sneakers', 7990, 0, { material: 'Leather', occasion: 'Casual' }, ['Tan'], 'SH', ['new', 'footwear'], ['sneaker1', 'sneaker2'], true],
  ['Minimal White Court Sneakers', 'منیمل وائٹ کورٹ سنیکرز', 'sneakers', 5990, 6990, { material: 'Synthetic Leather', occasion: 'Casual' }, ['White'], 'SH', ['basics', 'sale'], ['sneaker2', 'sneaker3'], true],
  ['Knit Runner Sneakers', 'نٹ رنر سنیکرز', 'sneakers', 6490, 0, { material: 'Knit Mesh', occasion: 'Sports' }, ['White'], 'SH', ['sports'], ['sneaker3', 'sneaker5']],
  ['Olive Suede Trainers', 'زیتونی سویڈ ٹرینرز', 'sneakers', 6990, 0, { material: 'Suede', occasion: 'Casual' }, ['Olive'], 'SH', ['new'], ['sneaker4', 'sneaker1']],
  ['Grey Mesh Sports Shoes', 'گرے میش اسپورٹس شوز', 'sneakers', 5490, 0, { material: 'Mesh', occasion: 'Sports' }, ['Grey'], 'SH', ['sports'], ['sneaker5', 'sneaker3']],
  // ---- Formal shoes & boots ----
  ['Brown Leather Derby Shoes', 'براؤن لیدر ڈربی شوز', 'formal-shoes', 8990, 0, { material: 'Genuine Leather', occasion: 'Formal' }, ['Brown'], 'SH', ['office', 'wedding'], ['derby', 'monk']],
  ['Double Monk Strap Shoes', 'ڈبل مونک اسٹریپ شوز', 'formal-shoes', 9990, 11490, { material: 'Genuine Leather', occasion: 'Formal' }, ['Brown'], 'SH', ['wedding', 'sale'], ['monk', 'derby'], true],
  ['Leather Lace-Up Boots', 'لیدر لیس اپ بوٹس', 'boots', 10990, 0, { material: 'Genuine Leather', occasion: 'Casual' }, ['Brown'], 'SH', ['winter', 'new'], ['boots1', 'boots2']],
  ['Rugged Work Boots', 'مضبوط ورک بوٹس', 'boots', 11990, 0, { material: 'Nubuck Leather', occasion: 'Outdoor' }, ['Tan'], 'SH', ['winter'], ['boots2', 'boots1']],
  // ---- Accessories ----
  ['Chronograph Steel Watch', 'کرونوگراف اسٹیل گھڑی', 'watches', 14990, 17990, { material: 'Stainless Steel' }, ['Silver'], 'O', ['premium', 'gift', 'sale'], ['watch1', 'watch2'], true],
  ['Minimal Leather Strap Watch', 'منیمل لیدر اسٹریپ گھڑی', 'watches', 7990, 0, { material: 'Leather' }, ['Brown'], 'O', ['gift', 'new'], ['watch2', 'watch1']],
  ['Round Metal Sunglasses', 'گول میٹل دھوپ کا چشمہ', 'sunglasses', 2990, 0, { material: 'Metal' }, ['Gold'], 'O', ['summer'], ['sun1', 'sun2']],
  ['Classic Wayfarer Sunglasses', 'کلاسک وے فیرر دھوپ کا چشمہ', 'sunglasses', 2490, 2990, { material: 'Acetate' }, ['Black'], 'O', ['summer', 'sale'], ['sun2', 'sun1']],
  ['Full-Grain Leather Belt', 'فل گرین لیدر بیلٹ', 'belts-wallets', 2490, 0, { material: 'Genuine Leather' }, ['Brown', 'Black'], 'O', ['basics', 'gift'], ['belt', 'wallet']],
  ['Bifold Leather Wallet', 'بائی فولڈ لیدر والٹ', 'belts-wallets', 2290, 0, { material: 'Genuine Leather' }, ['Brown'], 'O', ['gift', 'new'], ['wallet', 'belt']],
  ['Classic Trucker Cap', 'کلاسک ٹرکر کیپ', 'caps-bags', 1290, 0, { material: 'Cotton Mesh' }, ['White'], 'O', ['summer'], ['cap', 'beanie']],
  ['Ribbed Knit Beanie', 'ربڈ نٹ بینی ٹوپی', 'caps-bags', 990, 0, { material: 'Acrylic Knit' }, ['Black', 'Maroon'], 'O', ['winter'], ['beanie', 'cap']],
  ['Everyday Laptop Backpack', 'روزمرہ لیپ ٹاپ بیگ', 'caps-bags', 4990, 5990, { material: 'Water-resistant Polyester' }, ['Navy'], 'O', ['office', 'sale'], ['backpack', 'wallet']],
];

const CARE = { Cotton: 'Machine wash cold, tumble dry low.', Denim: 'Wash inside out in cold water to keep the colour.', Leather: 'Wipe clean; condition every few months.' };
const care = (a) => CARE[Object.keys(CARE).find((k) => (a.fabric || a.material || '').includes(k))] || 'Follow the care label.';
const describe = (title, a) =>
  a.fabric
    ? `${title} in ${a.fabric.toLowerCase()} with a ${String(a.fit || 'regular').toLowerCase()} fit — made for ${String(a.occasion || 'everyday').toLowerCase()} wear. ${care(a)}`
    : `${title} in ${String(a.material).toLowerCase()} — built to last and finished with care. ${care(a)}`;

const SIZE_GUIDE = {
  T: 'Chest (inches): S 36–38 · M 38–40 · L 40–42 · XL 42–44 · XXL 44–46. Between sizes? Choose the larger one.',
  W: 'Waist (inches): 30 · 32 · 34 · 36 · 38. Inseam 32". Measure around your natural waist.',
  SU: 'Jacket chest (inches): 38 · 40 · 42 · 44. Trousers come one size down and can be altered.',
  SH: 'EU sizes: 40 (UK 6) · 41 (UK 7) · 42 (UK 8) · 43 (UK 9) · 44 (UK 10).',
  O: '',
};

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
  description: describe(title, attributes),
  descriptionUr: `${titleUr} — معیاری مردانہ لباس، پورے پاکستان میں کیش آن ڈیلیوری۔`,
  sizeGuide: SIZE_GUIDE[set],
  seo: { metaTitle: `${title} | Fashionist`, metaDescription: `Shop the ${title} at Fashionist menswear. Cash on Delivery across Pakistan.` },
  variants: colours.flatMap((c, ci) =>
    SIZES[set].map((s, si) => ({ sku: `FN${String(i + 1).padStart(3, '0')}-${c.replace(/\s+/g, '').slice(0, 3).toUpperCase()}-${s.replace(/\s+/g, '').toUpperCase()}`, size: s, colour: c, stock: (i * 7 + ci * 5 + si * 3) % 15 || 6 }))
  ),
  rating: 0,
  numReviews: 0,
  soldCount: (i * 37) % 260,
}));

export const customers = [
  { name: 'Ayesha Khan', email: 'ayesha.fashionist@gmail.com', phone: '03214567890', addresses: [{ label: 'Home', name: 'Ayesha Khan', phone: '03214567890', city: 'Lahore', area: 'DHA Phase 5', street: 'House 12, Street 4', isDefault: true }] },
  { name: 'Hamza Ali', email: 'hamza.fashionist@gmail.com', phone: '03001112233', addresses: [{ label: 'Home', name: 'Hamza Ali', phone: '03001112233', city: 'Karachi', area: 'Clifton Block 5', street: 'Flat 7, Sea View Apartments', isDefault: true }] },
  { name: 'Sana Tariq', email: 'sana.fashionist@outlook.com', phone: '03335556677', addresses: [{ label: 'Home', name: 'Sana Tariq', phone: '03335556677', city: 'Multan', area: 'Gulgasht Colony', street: 'House 45-B', isDefault: true }] },
];
export const CUSTOMER_PASSWORD = 'Customer@123';

export const coupons = [
  { code: 'WELCOME10', type: 'percent', value: 10, maxDiscount: 1000, minOrder: 0, isActive: true },
  { code: 'EID500', type: 'fixed', value: 500, minOrder: 5000, isActive: true },
  { code: 'FREESHIP', type: 'freeship', value: 0, minOrder: 2000, isActive: true },
];

export const settings = {
  store: { name: 'Fashionist', logo: '', phone: '0300 1234567', email: 'hello@fashionist.store', whatsapp: '', address: 'Gulgasht Colony, Multan, Pakistan' },
  shippingRates: { Multan: 150, Lahore: 200, Karachi: 250, Islamabad: 220, Rawalpindi: 220 },
  defaultShippingFee: 250,
  freeShippingAbove: 5000,
  // Demo riders — replace with real numbers in Admin → Settings → Same-day delivery.
  sameDay: {
    enabled: true,
    city: 'Multan',
    fee: 250,
    cutoffHour: 15,
    riders: [
      { name: 'Bike Rider 1', phone: '03000000001', vehicle: 'Bike', isActive: true },
      { name: 'Rickshaw 1', phone: '03000000002', vehicle: 'Rickshaw', isActive: true },
    ],
  },
  lowStockLevel: 5,
  returnWindowDays: 7,
  emailNotifications: { orderPlaced: true, statusChanged: true, lowStock: true },
};

const REVIEW_TEXT = [
  'Quality is even better in person. Delivered in two days and paid at my door.',
  'Fits perfectly — the size guide was spot on.',
  'Colour is exactly like the photos. Ordering another one for my brother.',
  'Solid fabric, quick COD delivery and neat packaging.',
  'Worn it to the office all week — still looks sharp.',
  'Great value for the price. Exchange for a bigger size was effortless.',
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
