// In-browser mock of the Fashionist REST API (used when VITE_USE_MOCK=true).
// Mirrors the server's routes and business rules; state persists in localStorage.
import * as seed from './seedData.js';
import { canTransition, couponDiscount, couponError, isWithinReturnWindow, MAX_QTY, shippingFeeFor } from '../../utils/rules.js';

const KEY = 'fashionist:mockdb:v1';
const id = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const now = () => new Date().toISOString();
const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();

function fresh() {
  const categories = seed.categories.map((c) => ({ _id: id(), parent: null, isActive: true, ...c }));
  const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
  const products = seed.products.map((p, i) => ({ _id: id(), ...p, category: catBySlug[p.category]._id, createdAt: daysAgo(i) }));
  const admin = { _id: 'admin', name: 'Store Owner', email: 'admin@fashionist.pk', phone: '03001234567', role: 'admin', password: 'Admin@123', addresses: [], language: 'en', createdAt: daysAgo(90) };
  const demo = {
    _id: 'demo',
    name: 'Ayesha Khan',
    email: 'ayesha@example.com',
    phone: '03214567890',
    role: 'customer',
    password: 'Customer@123',
    language: 'en',
    createdAt: daysAgo(40),
    addresses: [{ _id: id(), label: 'Home', name: 'Ayesha Khan', phone: '03214567890', city: 'Lahore', area: 'DHA Phase 5', street: 'House 12, Street 4', isDefault: true }],
  };
  const names = ['Hamza Ali', 'Sana Tariq', 'Bilal Ahmed', 'Mahnoor Shah', 'Usman Raza', 'Fatima Noor'];
  const others = names.map((n, i) => ({ _id: `c${i}`, name: n, email: `${n.split(' ')[0].toLowerCase()}@example.com`, phone: `0300${String(1000000 + i * 1234567).slice(0, 7)}`, role: 'customer', password: 'Customer@123', addresses: [], language: 'en', createdAt: daysAgo(30 - i) }));
  const users = [admin, demo, ...others];
  const cities = ['Lahore', 'Karachi', 'Multan', 'Islamabad', 'Faisalabad', 'Peshawar'];
  const statuses = ['Delivered', 'Delivered', 'Shipped', 'Confirmed', 'Pending', 'Delivered', 'Cancelled', 'Delivered'];
  const orders = Array.from({ length: 28 }, (_, i) => {
    const u = i === 0 ? demo : users[2 + (i % others.length)];
    const p = products[(i * 3) % products.length];
    const v = p.variants[i % p.variants.length];
    const qty = 1 + (i % 2);
    const status = i === 0 ? 'Delivered' : statuses[i % statuses.length];
    const created = daysAgo(i === 0 ? 3 : (i * 29) / 28 + 0.3);
    const subtotal = p.price * qty;
    const shippingFee = subtotal >= 5000 ? 0 : 200;
    return {
      _id: id(),
      orderNumber: `FN-${created.slice(2, 10).replace(/-/g, '')}-${(4096 + i * 977).toString(16).toUpperCase().slice(-4)}`,
      user: u._id,
      items: [{ product: p._id, title: p.title, image: p.images[0], sku: v.sku, size: v.size, colour: v.colour, price: p.price, qty }],
      shippingAddress: { name: u.name, phone: u.phone, city: cities[i % cities.length], area: 'Model Town', street: `House ${i + 3}` },
      subtotal,
      discount: 0,
      shippingFee,
      total: subtotal + shippingFee,
      paymentMethod: 'COD',
      paymentStatus: status === 'Delivered' ? 'Paid' : 'Unpaid',
      status,
      statusHistory: [{ status: 'Pending', at: created }, ...(status !== 'Pending' && status !== 'Cancelled' ? [{ status: 'Confirmed', at: created }] : []), ...(status === 'Cancelled' ? [{ status: 'Cancelled', at: created }] : []), ...(['Shipped', 'Delivered'].includes(status) ? [{ status: 'Shipped', at: created }] : []), ...(status === 'Delivered' ? [{ status: 'Delivered', at: created }] : [])],
      courier: ['Shipped', 'Delivered'].includes(status) ? 'TCS' : undefined,
      trackingNumber: ['Shipped', 'Delivered'].includes(status) ? `TCS${770000 + i}` : undefined,
      deliveredAt: status === 'Delivered' ? (i === 0 ? daysAgo(2) : created) : undefined,
      returnRequest: i === 5 ? { type: 'exchange', reason: 'Need a size larger please', status: 'Requested', requestedAt: daysAgo(1) } : undefined,
      createdAt: created,
    };
  });
  const reviews = products.slice(0, 6).flatMap((p, i) => [
    { _id: id(), product: p._id, user: others[i % others.length]._id, rating: 5, comment: seed.reviewQuotes[i % 4].text, status: 'Approved', createdAt: daysAgo(i + 2) },
    { _id: id(), product: p._id, user: others[(i + 1) % others.length]._id, rating: 4, comment: 'Lovely fabric and quick COD delivery.', status: 'Approved', createdAt: daysAgo(i + 5) },
  ]);
  return { categories, products, users, orders, reviews, coupons: seed.coupons.map((c) => ({ _id: id(), usedCount: 0, usedBy: [], ...c })), settings: structuredClone(seed.settings), wishlists: {}, carts: {}, logs: [] };
}

let db;
const load = () => {
  if (db) return db;
  try {
    db = JSON.parse(localStorage.getItem(KEY)) || fresh();
  } catch {
    db = fresh();
  }
  return db;
};
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* storage full / private mode — keep in memory */
  }
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new HttpError(status, message);
};

const publicUser = (u) => {
  if (!u) return u;
  const { password, ...rest } = u;
  return rest;
};
const catOf = (p) => {
  const c = db.categories.find((x) => x._id === p.category);
  return { ...p, category: c ? { _id: c._id, name: c.name, nameUr: c.nameUr, slug: c.slug } : p.category };
};
const currentUser = (cfg, required = true) => {
  const token = (cfg.headers?.Authorization || cfg.headers?.authorization || '').replace('Bearer ', '');
  const u = db.users.find((x) => `mock.${x._id}` === token);
  if (!u && required) fail(401, 'Please log in');
  if (u?.isBlocked) fail(403, 'Your account has been blocked');
  return u;
};
const requireAdmin = (cfg) => {
  const u = currentUser(cfg);
  if (u.role !== 'admin') fail(403, 'Admin access only');
  return u;
};
const log = (u, action, targetType, targetId, details) => db.logs.unshift({ _id: id(), admin: { name: u.name }, action, targetType, targetId, details, createdAt: now() });
const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function changeStatus(order, to, by, extra = {}) {
  if (!canTransition(order.status, to)) fail(400, `Cannot move order from ${order.status} to ${to}`);
  if (to === 'Shipped') {
    if (!extra.courier || !extra.trackingNumber) fail(400, 'Courier and tracking number are required to ship');
    Object.assign(order, { courier: extra.courier, trackingNumber: extra.trackingNumber });
  }
  if (to === 'Delivered') Object.assign(order, { deliveredAt: now(), paymentStatus: 'Paid' });
  if (to === 'Cancelled' || to === 'Returned')
    order.items.forEach((i) => {
      const p = db.products.find((x) => x._id === i.product);
      const v = p?.variants.find((x) => x.sku === i.sku);
      if (v) (v.stock += i.qty), (p.soldCount -= i.qty);
    });
  order.status = to;
  order.statusHistory.push({ status: to, at: now(), note: extra.note, by });
}

function listProducts(q) {
  let list = db.products.filter((p) => p.isActive);
  if (q.category) {
    const c = db.categories.find((x) => x.slug === q.category);
    const ids = c ? [c._id, ...db.categories.filter((x) => x.parent === c._id).map((x) => x._id)] : [];
    list = list.filter((p) => ids.includes(p.category));
  }
  if (q.q) {
    const s = String(q.q).toLowerCase();
    list = list.filter((p) => [p.title, p.titleUr, p.description, ...(p.tags || []), ...Object.values(p.attributes || {})].join(' ').toLowerCase().includes(s));
  }
  if (q.minPrice) list = list.filter((p) => p.price >= +q.minPrice);
  if (q.maxPrice) list = list.filter((p) => p.price <= +q.maxPrice);
  if (q.sizes) list = list.filter((p) => p.variants.some((v) => q.sizes.split(',').includes(v.size)));
  if (q.colours) list = list.filter((p) => p.variants.some((v) => q.colours.split(',').includes(v.colour)));
  if (q.inStock === 'true') list = list.filter((p) => p.variants.some((v) => v.stock > 0));
  if (q.featured === 'true') list = list.filter((p) => p.isFeatured);
  if (q.tag) list = list.filter((p) => p.tags?.includes(q.tag));
  if (q.fabric) list = list.filter((p) => q.fabric.split(',').includes(p.attributes?.fabric));
  const sorters = { newest: (a, b) => b.createdAt.localeCompare(a.createdAt), 'price-asc': (a, b) => a.price - b.price, 'price-desc': (a, b) => b.price - a.price, popular: (a, b) => b.soldCount - a.soldCount, rating: (a, b) => b.rating - a.rating };
  list = [...list].sort(sorters[q.sort] || sorters.newest);
  const limit = Math.min(+q.limit || 12, 48);
  const page = Math.max(+q.page || 1, 1);
  return { products: list.slice((page - 1) * limit, page * limit).map(catOf), total: list.length, page, pages: Math.ceil(list.length / limit) };
}

function dashboard(q) {
  const days = +q.days || 30;
  const since = Date.now() - days * 86400000;
  const live = db.orders.filter((o) => new Date(o.createdAt) >= since && o.status !== 'Cancelled');
  const revenue = live.reduce((s, o) => s + o.total, 0);
  const group = (arr, key, init, add) => Object.entries(arr.reduce((m, x) => ((m[key(x)] = add(m[key(x)] || init(), x)), m), {}));
  const daily = group(live, (o) => o.createdAt.slice(0, 10), () => ({ revenue: 0, orders: 0 }), (a, o) => ({ revenue: a.revenue + o.total, orders: a.orders + 1 }))
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const items = live.flatMap((o) => o.items);
  const topProducts = group(items, (i) => i.title, () => ({ qty: 0, revenue: 0 }), (a, i) => ({ qty: a.qty + i.qty, revenue: a.revenue + i.qty * i.price }))
    .map(([title, v]) => ({ title, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
  return {
    revenue,
    orders: live.length,
    aov: live.length ? Math.round(revenue / live.length) : 0,
    customers: db.users.filter((u) => u.role === 'customer').length,
    lowStock: db.products.filter((p) => p.variants.some((v) => v.stock <= db.settings.lowStockLevel)).length,
    pendingReturns: db.orders.filter((o) => o.returnRequest?.status === 'Requested').length,
    daily,
    byStatus: group(db.orders, (o) => o.status, () => 0, (a) => a + 1).map(([status, count]) => ({ status, count })),
    topProducts,
    byCity: group(live, (o) => o.shippingAddress.city, () => 0, (a) => a + 1).map(([city, orders]) => ({ city, orders })).sort((a, b) => b.orders - a.orders),
  };
}

const parseCsv = (text) => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const split = (l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).slice(0, -1).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim());
  const header = split(lines[0]);
  return lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [header[i], v])));
};

/* ------------------------- routes ------------------------- */
const routes = [
  ['post', /^\/auth\/register$/, ({ body }) => {
    if (db.users.some((u) => u.email === body.email?.toLowerCase())) fail(409, 'Email already registered');
    const u = { _id: id(), name: body.name, email: body.email.toLowerCase(), phone: body.phone, password: body.password, role: 'customer', addresses: [], language: 'en', createdAt: now() };
    db.users.push(u);
    return [201, { token: `mock.${u._id}`, user: publicUser(u) }];
  }],
  ['post', /^\/auth\/login$/, ({ body }) => {
    const u = db.users.find((x) => x.email === body.email?.toLowerCase() && x.password === body.password);
    if (!u) fail(401, 'Invalid email or password');
    if (u.isBlocked) fail(403, 'Your account has been blocked');
    return { token: `mock.${u._id}`, user: publicUser(u) };
  }],
  ['post', /^\/auth\/forgot-password$/, () => ({ message: 'If that email exists, a reset link has been sent', devToken: 'demo-token' })],
  ['post', /^\/auth\/reset-password\/(.+)$/, ({ body }) => {
    const u = db.users.find((x) => x._id === 'demo');
    u.password = body.password;
    return { token: `mock.${u._id}`, user: publicUser(u) };
  }],
  ['get', /^\/auth\/me$/, ({ cfg }) => ({ user: publicUser(currentUser(cfg)) })],
  ['patch', /^\/auth\/me$/, ({ cfg, body }) => {
    const u = currentUser(cfg);
    ['name', 'phone', 'language', 'addresses'].forEach((k) => body[k] !== undefined && (u[k] = body[k]));
    u.addresses = (u.addresses || []).map((a) => ({ _id: a._id || id(), ...a }));
    if (u.addresses.length && !u.addresses.some((a) => a.isDefault)) u.addresses[0].isDefault = true;
    return { user: publicUser(u) };
  }],

  ['get', /^\/categories$/, () => ({ categories: db.categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder) })],
  ['get', /^\/products$/, ({ params }) => listProducts(params)],
  ['get', /^\/products\/([^/]+)$/, ({ m }) => {
    const p = db.products.find((x) => x.slug === m[1] && x.isActive);
    if (!p) fail(404, 'Product not found');
    const reviews = db.reviews.filter((r) => r.product === p._id && r.status === 'Approved').map((r) => ({ ...r, user: { name: db.users.find((u) => u._id === r.user)?.name || 'Customer' } }));
    const related = db.products.filter((x) => x.category === p.category && x._id !== p._id && x.isActive).slice(0, 8).map(catOf);
    return { product: catOf(p), reviews, related };
  }],
  ['get', /^\/settings$/, () => ({ settings: db.settings })],
  ['post', /^\/reviews$/, ({ cfg, body }) => {
    const u = currentUser(cfg);
    const order = db.orders.find((o) => o.user === u._id && o.status === 'Delivered' && o.items.some((i) => i.product === body.productId));
    if (!order) fail(403, 'You can review a product only after it is delivered');
    if (db.reviews.some((r) => r.product === body.productId && r.user === u._id)) fail(409, 'You have already reviewed this product');
    const review = { _id: id(), product: body.productId, user: u._id, order: order._id, rating: +body.rating, comment: body.comment, status: 'Approved', createdAt: now() };
    db.reviews.push(review);
    const p = db.products.find((x) => x._id === body.productId);
    const rs = db.reviews.filter((r) => r.product === p._id && r.status === 'Approved');
    p.rating = Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10;
    p.numReviews = rs.length;
    return [201, { review }];
  }],
  ['post', /^\/coupons\/validate$/, ({ cfg, body }) => {
    const u = currentUser(cfg);
    const c = db.coupons.find((x) => x.code === String(body.code).toUpperCase());
    const err = couponError(c, u._id, +body.subtotal);
    if (err) fail(400, err);
    const discount = couponDiscount(c, +body.subtotal);
    return { code: c.code, discount, shippingFee: shippingFeeFor(body.city, db.settings, +body.subtotal - discount) };
  }],

  ['get', /^\/me\/wishlist$/, ({ cfg }) => {
    const u = currentUser(cfg);
    return { products: (db.wishlists[u._id] || []).map((pid) => db.products.find((p) => p._id === pid)).filter(Boolean).map(catOf) };
  }],
  ['post', /^\/me\/wishlist\/(.+)$/, ({ cfg, m }) => {
    const u = currentUser(cfg);
    const w = (db.wishlists[u._id] ||= []);
    const i = w.indexOf(m[1]);
    i >= 0 ? w.splice(i, 1) : w.push(m[1]);
    return { products: w, added: i < 0 };
  }],
  ['get', /^\/me\/cart$/, ({ cfg }) => ({ items: db.carts[currentUser(cfg)._id] || [] })],
  ['put', /^\/me\/cart$/, ({ cfg, body }) => ({ items: (db.carts[currentUser(cfg)._id] = body.items || []) })],
  ['post', /^\/me\/orders$/, ({ cfg, body }) => {
    const u = currentUser(cfg);
    if (!body.items?.length) fail(400, 'Your cart is empty');
    const qtyBySku = {};
    body.items.forEach((i) => (qtyBySku[i.sku] = (qtyBySku[i.sku] || 0) + +i.qty));
    // "Transaction": validate every line first, then apply.
    const lines = Object.entries(qtyBySku).map(([sku, qty]) => {
      if (qty > MAX_QTY) fail(400, `Max ${MAX_QTY} units per item (${sku})`);
      const p = db.products.find((x) => x.isActive && x.variants.some((v) => v.sku === sku && v.stock >= qty));
      if (!p) fail(409, `Out of stock: ${sku}`);
      const v = p.variants.find((x) => x.sku === sku);
      return { p, v, line: { product: p._id, title: p.title, image: p.images[0], sku, size: v.size, colour: v.colour, price: p.price, qty } };
    });
    const subtotal = lines.reduce((s, l) => s + l.line.price * l.line.qty, 0);
    let coupon = null;
    if (body.couponCode) {
      coupon = db.coupons.find((x) => x.code === String(body.couponCode).toUpperCase());
      const err = couponError(coupon, u._id, subtotal);
      if (err) fail(400, err);
    }
    const discount = couponDiscount(coupon, subtotal);
    const shippingFee = shippingFeeFor(body.shippingAddress.city, db.settings, subtotal - discount);
    lines.forEach(({ p, v, line }) => ((v.stock -= line.qty), (p.soldCount += line.qty)));
    if (coupon) coupon.usedCount++, coupon.usedBy.push(u._id);
    const d = new Date();
    const order = {
      _id: id(),
      orderNumber: `FN-${d.toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 65536).toString(16).toUpperCase().padStart(4, '0')}`,
      user: u._id,
      items: lines.map((l) => l.line),
      shippingAddress: body.shippingAddress,
      subtotal,
      discount,
      coupon: coupon ? { code: coupon.code, amount: discount } : undefined,
      shippingFee,
      total: subtotal - discount + shippingFee,
      paymentMethod: 'COD',
      paymentStatus: 'Unpaid',
      status: 'Pending',
      statusHistory: [{ status: 'Pending', at: now() }],
      createdAt: now(),
    };
    db.orders.unshift(order);
    db.carts[u._id] = [];
    return [201, { order }];
  }],
  ['get', /^\/me\/orders$/, ({ cfg }) => ({ orders: db.orders.filter((o) => o.user === currentUser(cfg)._id) })],
  ['get', /^\/me\/orders\/([^/]+)$/, ({ cfg, m }) => {
    const u = currentUser(cfg);
    const o = db.orders.find((x) => (x._id === m[1] || x.orderNumber === m[1]) && x.user === u._id);
    if (!o) fail(404, 'Order not found');
    return { order: o };
  }],
  ['post', /^\/me\/orders\/([^/]+)\/cancel$/, ({ cfg, m }) => {
    const u = currentUser(cfg);
    const o = db.orders.find((x) => x._id === m[1] && x.user === u._id);
    if (!o) fail(404, 'Order not found');
    if (o.status !== 'Pending') fail(400, 'Only pending orders can be cancelled');
    changeStatus(o, 'Cancelled', u._id, { note: 'Cancelled by customer' });
    return { order: o };
  }],
  ['post', /^\/me\/orders\/([^/]+)\/return$/, ({ cfg, m, body }) => {
    const u = currentUser(cfg);
    const o = db.orders.find((x) => x._id === m[1] && x.user === u._id);
    if (!o) fail(404, 'Order not found');
    if (o.status !== 'Delivered') fail(400, 'Only delivered orders can be returned');
    if (!isWithinReturnWindow(o.deliveredAt, db.settings.returnWindowDays)) fail(400, `Returns are accepted within ${db.settings.returnWindowDays} days of delivery`);
    if (o.returnRequest?.status) fail(400, 'A return request already exists for this order');
    o.returnRequest = { type: body.type, reason: body.reason, status: 'Requested', requestedAt: now() };
    return { order: o };
  }],

  /* ---- admin ---- */
  ['get', /^\/admin\/dashboard$/, ({ cfg, params }) => (requireAdmin(cfg), dashboard(params))],
  ['get', /^\/admin\/products$/, ({ cfg, params }) => {
    requireAdmin(cfg);
    const s = (params.q || '').toLowerCase();
    return { products: db.products.filter((p) => !s || p.title.toLowerCase().includes(s) || p.variants.some((v) => v.sku.toLowerCase() === s)).map(catOf) };
  }],
  ['get', /^\/admin\/products\/([^/]+)$/, ({ cfg, m }) => (requireAdmin(cfg), { product: db.products.find((p) => p._id === m[1]) || fail(404, 'Product not found') })],
  ['post', /^\/admin\/products$/, ({ cfg, body }) => {
    const a = requireAdmin(cfg);
    const skus = new Set(db.products.flatMap((p) => p.variants.map((v) => v.sku)));
    body.variants.forEach((v) => skus.has(v.sku) && fail(409, `Duplicate value for variants.sku (${v.sku})`));
    const p = { _id: id(), rating: 0, numReviews: 0, soldCount: 0, isActive: true, createdAt: now(), ...body, slug: body.slug || slugify(body.title) };
    if (db.products.some((x) => x.slug === p.slug)) fail(409, 'Duplicate value for slug');
    db.products.unshift(p);
    log(a, 'product.create', 'Product', p._id, { title: p.title });
    return [201, { product: p }];
  }],
  ['put', /^\/admin\/products\/([^/]+)$/, ({ cfg, m, body }) => {
    const a = requireAdmin(cfg);
    const p = db.products.find((x) => x._id === m[1]) || fail(404, 'Product not found');
    Object.assign(p, body);
    log(a, 'product.update', 'Product', p._id, { title: p.title });
    return { product: p };
  }],
  ['delete', /^\/admin\/products\/([^/]+)$/, ({ cfg, m }) => {
    const a = requireAdmin(cfg);
    const p = db.products.find((x) => x._id === m[1]);
    if (p) p.isActive = false;
    log(a, 'product.archive', 'Product', m[1]);
    return { ok: true };
  }],
  ['post', /^\/admin\/products\/import$/, ({ cfg, body }) => {
    const a = requireAdmin(cfg);
    const rows = parseCsv(body.csv || '');
    const errors = [];
    const grouped = {};
    rows.forEach((r, i) => {
      if (!r.title || !r.sku || !r.price) return errors.push({ line: i + 2, message: 'title, sku and price are required' });
      const c = db.categories.find((x) => x.slug === slugify(r.category));
      if (!c) return errors.push({ line: i + 2, message: `Unknown category "${r.category}"` });
      const slug = slugify(r.title);
      grouped[slug] ||= { title: r.title, slug, category: c._id, price: +r.price, compareAtPrice: r.compareAtPrice ? +r.compareAtPrice : undefined, description: r.description, images: (r.images || '').split('|').filter(Boolean), tags: (r.tags || '').split('|').filter(Boolean), attributes: Object.fromEntries((r.attributes || '').split(';').filter(Boolean).map((kv) => kv.split('='))), variants: [] };
      grouped[slug].variants.push({ sku: r.sku.toUpperCase(), size: r.size, colour: r.colour, stock: +r.stock || 0 });
    });
    let created = 0, updated = 0;
    Object.values(grouped).forEach((g) => {
      const ex = db.products.find((p) => p.slug === g.slug);
      if (ex) Object.assign(ex, g), updated++;
      else db.products.unshift({ _id: id(), rating: 0, numReviews: 0, soldCount: 0, isActive: true, createdAt: now(), ...g }), created++;
    });
    log(a, 'product.bulkImport', 'Product', '', { created, updated, errors: errors.length });
    return { created, updated, errors };
  }],
  ['get', /^\/admin\/inventory$/, ({ cfg, params }) => {
    requireAdmin(cfg);
    const lvl = db.settings.lowStockLevel;
    const rows = db.products.filter((p) => p.isActive).flatMap((p) => p.variants.map((v) => ({ productId: p._id, title: p.title, image: p.images[0], ...v, low: v.stock <= lvl })));
    return { rows: params.low === 'true' ? rows.filter((r) => r.low) : rows, lowStockLevel: lvl };
  }],
  ['patch', /^\/admin\/inventory$/, ({ cfg, body }) => {
    const a = requireAdmin(cfg);
    if (!Number.isInteger(body.stock) || body.stock < 0) fail(400, 'Stock must be a whole number ≥ 0');
    const v = db.products.flatMap((p) => p.variants).find((x) => x.sku === body.sku) || fail(404, 'SKU not found');
    v.stock = body.stock;
    log(a, 'inventory.update', 'Variant', body.sku, { stock: body.stock });
    return { ok: true };
  }],
  ['get', /^\/admin\/orders$/, ({ cfg, params }) => {
    requireAdmin(cfg);
    let list = db.orders;
    if (params.status) list = list.filter((o) => o.status === params.status);
    if (params.returns === 'true') list = list.filter((o) => o.returnRequest?.status);
    if (params.q) list = list.filter((o) => o.orderNumber.toLowerCase().includes(params.q.toLowerCase()) || o.shippingAddress.phone === params.q);
    return { orders: list.map((o) => ({ ...o, user: publicUser(db.users.find((u) => u._id === o.user)) })) };
  }],
  ['get', /^\/admin\/orders\/([^/]+)$/, ({ cfg, m }) => {
    requireAdmin(cfg);
    const o = db.orders.find((x) => x._id === m[1]) || fail(404, 'Order not found');
    return { order: { ...o, user: publicUser(db.users.find((u) => u._id === o.user)) } };
  }],
  ['patch', /^\/admin\/orders\/([^/]+)\/status$/, ({ cfg, m, body }) => {
    const a = requireAdmin(cfg);
    const o = db.orders.find((x) => x._id === m[1]) || fail(404, 'Order not found');
    const from = o.status;
    changeStatus(o, body.status, a._id, body);
    log(a, 'order.status', 'Order', o.orderNumber, { from, to: o.status });
    return { order: o };
  }],
  ['patch', /^\/admin\/orders\/([^/]+)\/return$/, ({ cfg, m, body }) => {
    const a = requireAdmin(cfg);
    const o = db.orders.find((x) => x._id === m[1]);
    if (!o || o.returnRequest?.status !== 'Requested') fail(400, 'No pending return request');
    if (body.decision === 'Approved') {
      changeStatus(o, 'Returned', a._id, { note: `${o.returnRequest.type} approved` });
      o.returnRequest.status = 'Approved';
    } else o.returnRequest.status = 'Rejected';
    log(a, 'order.return', 'Order', o.orderNumber, { decision: body.decision });
    return { order: o };
  }],
  ['post', /^\/admin\/categories$/, ({ cfg, body }) => {
    const a = requireAdmin(cfg);
    const c = { _id: id(), isActive: true, sortOrder: 99, parent: null, ...body, slug: body.slug || slugify(body.name) };
    db.categories.push(c);
    log(a, 'category.create', 'Category', c._id);
    return [201, { category: c }];
  }],
  ['put', /^\/admin\/categories\/([^/]+)$/, ({ cfg, m, body }) => {
    const a = requireAdmin(cfg);
    const c = db.categories.find((x) => x._id === m[1]) || fail(404, 'Not found');
    Object.assign(c, body);
    log(a, 'category.update', 'Category', c._id);
    return { category: c };
  }],
  ['delete', /^\/admin\/categories\/([^/]+)$/, ({ cfg, m }) => {
    const a = requireAdmin(cfg);
    if (db.products.some((p) => p.category === m[1])) fail(400, 'Category has products; deactivate it instead');
    db.categories = db.categories.filter((c) => c._id !== m[1]);
    log(a, 'category.delete', 'Category', m[1]);
    return { ok: true };
  }],
  ['get', /^\/admin\/customers$/, ({ cfg }) => {
    requireAdmin(cfg);
    return {
      customers: db.users
        .filter((u) => u.role === 'customer')
        .map((u) => {
          const os = db.orders.filter((o) => o.user === u._id);
          return { ...publicUser(u), orders: os.length, spent: os.reduce((s, o) => s + o.total, 0) };
        }),
    };
  }],
  ['patch', /^\/admin\/customers\/([^/]+)$/, ({ cfg, m, body }) => {
    const a = requireAdmin(cfg);
    const u = db.users.find((x) => x._id === m[1] && x.role === 'customer') || fail(404, 'Customer not found');
    u.isBlocked = !!body.isBlocked;
    log(a, u.isBlocked ? 'customer.block' : 'customer.unblock', 'User', u._id);
    return { user: publicUser(u) };
  }],
  ['get', /^\/admin\/coupons$/, ({ cfg }) => (requireAdmin(cfg), { coupons: db.coupons })],
  ['post', /^\/admin\/coupons$/, ({ cfg, body }) => {
    const a = requireAdmin(cfg);
    const code = String(body.code).toUpperCase();
    if (db.coupons.some((c) => c.code === code)) fail(409, 'Duplicate value for code');
    const c = { _id: id(), usedCount: 0, usedBy: [], isActive: true, ...body, code };
    db.coupons.unshift(c);
    log(a, 'coupon.create', 'Coupon', c._id, { code });
    return { coupon: c };
  }],
  ['put', /^\/admin\/coupons\/([^/]+)$/, ({ cfg, m, body }) => {
    const a = requireAdmin(cfg);
    const c = db.coupons.find((x) => x._id === m[1]) || fail(404, 'Not found');
    Object.assign(c, body);
    log(a, 'coupon.update', 'Coupon', c._id, { code: c.code });
    return { coupon: c };
  }],
  ['delete', /^\/admin\/coupons\/([^/]+)$/, ({ cfg, m }) => {
    const a = requireAdmin(cfg);
    db.coupons = db.coupons.filter((c) => c._id !== m[1]);
    log(a, 'coupon.delete', 'Coupon', m[1]);
    return { ok: true };
  }],
  ['get', /^\/admin\/reviews$/, ({ cfg }) => {
    requireAdmin(cfg);
    return { reviews: db.reviews.map((r) => ({ ...r, user: { name: db.users.find((u) => u._id === r.user)?.name }, product: (({ _id, title, slug }) => ({ _id, title, slug }))(db.products.find((p) => p._id === r.product) || {}) })) };
  }],
  ['patch', /^\/admin\/reviews\/([^/]+)$/, ({ cfg, m, body }) => {
    const a = requireAdmin(cfg);
    const r = db.reviews.find((x) => x._id === m[1]) || fail(404, 'Not found');
    r.status = body.status;
    log(a, 'review.status', 'Review', r._id, { status: r.status });
    return { review: r };
  }],
  ['put', /^\/admin\/settings$/, ({ cfg, body }) => {
    const a = requireAdmin(cfg);
    db.settings = { ...db.settings, ...body, store: { ...db.settings.store, ...(body.store || {}) } };
    log(a, 'settings.update', 'Settings', '');
    return { settings: db.settings };
  }],
  ['get', /^\/admin\/activity$/, ({ cfg }) => (requireAdmin(cfg), { logs: db.logs })],
];

export async function mockAdapter(cfg) {
  load();
  await new Promise((r) => setTimeout(r, 250 + Math.random() * 250));
  const url = new URL(cfg.url, 'http://mock');
  const path = url.pathname.replace(/^\/api/, '');
  const params = { ...Object.fromEntries(url.searchParams), ...(cfg.params || {}) };
  const body = typeof cfg.data === 'string' ? JSON.parse(cfg.data || '{}') : cfg.data || {};
  const method = (cfg.method || 'get').toLowerCase();
  const respond = (status, data) => ({ data, status, statusText: String(status), headers: {}, config: cfg, request: {} });
  for (const [mth, re, handler] of routes) {
    const m = path.match(re);
    if (mth !== method || !m) continue;
    try {
      const out = handler({ cfg, m, params, body });
      save();
      return Array.isArray(out) ? respond(out[0], out[1]) : respond(200, out);
    } catch (e) {
      const err = new Error(e.message);
      err.config = cfg;
      err.isAxiosError = true;
      err.response = respond(e.status || 500, { message: e.message });
      throw err;
    }
  }
  const err = new Error(`Mock: no route for ${method.toUpperCase()} ${path}`);
  err.response = respond(404, { message: err.message });
  throw err;
}

export const resetMockDb = () => {
  db = fresh();
  save();
};
