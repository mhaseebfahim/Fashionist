// In-browser mock of the Fashionist REST API (VITE_USE_MOCK=true). Mirrors the server's routes,
// envelope ({ success, data, meta }) and business rules; state persists in localStorage.
import * as seed from './seedData.js';
import { cmsDefaults } from '../../cms/defaults.js';
import { ATTR_FILTERS, ORDER_STATUSES, canTransition, couponDiscount, couponError, deliveryFeeFor, isWithinReturnWindow, MAX_QTY, PHONE_RE, sameDayFor } from '../../utils/rules.js';

const KEY = 'fashionist:mockdb:v4';
const ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {};
// Mirrors the server flags. Set VITE_MOCK_EMAIL_VERIFICATION=true to try the OTP flow in the mock (code shown in a toast).
const MOCK_OTP = ENV.VITE_MOCK_EMAIL_VERIFICATION === 'true';
const DOMAINS = ['gmail.com', 'outlook.com'];
const allowedEmail = (e) => {
  const m = String(e || '').trim().toLowerCase().match(/^([a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?)@([a-z0-9.-]+)$/);
  return !!m && !m[1].includes('..') && DOMAINS.includes(m[2]);
};
const newOtp = (u) => ((u.otp = String(Math.floor(100000 + Math.random() * 900000))), (u.otpExpires = Date.now() + 600000), (u.otpAttempts = 0), u.otp);
const id = () => Array.from({ length: 24 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
const now = () => new Date().toISOString();
const iso = (d) => (d instanceof Date ? d.toISOString() : d);
const clone = (x) => JSON.parse(JSON.stringify(x));
const DAY = 86400000;

function fresh() {
  const categories = [];
  for (const c of seed.categories) categories.push({ _id: id(), isActive: true, ...c, parent: c.parent ? categories.find((x) => x.slug === c.parent)._id : null, createdAt: now() });
  const catId = Object.fromEntries(categories.map((c) => [c.slug, c._id]));
  const products = seed.products.map((p, i) => ({ _id: id(), ...clone(p), category: catId[p.category], createdAt: new Date(Date.now() - i * 3600000).toISOString() }));
  const admin = { _id: id(), isEmailVerified: true, name: 'Store Owner', email: 'admin.fashionist@gmail.com', phone: '001234567', role: 'admin', password: 'Admin@123', addresses: [], language: 'en', createdAt: new Date(Date.now() - 90 * DAY).toISOString() };
  const customers = seed.customers.map((c, i) => ({ _id: id(), isEmailVerified: true, ...clone(c), addresses: c.addresses.map((a) => ({ _id: id(), ...a })), role: 'customer', password: seed.CUSTOMER_PASSWORD, language: 'en', createdAt: new Date(Date.now() - (40 - i * 12) * DAY).toISOString() }));
  const orders = seed.makeOrders(products, customers).map((o) => clone({ _id: id(), ...o }));
  const reviews = seed.makeReviews(orders).map((r) => ({ _id: id(), ...r, createdAt: now() }));
  reviews.forEach((r) => {
    const p = products.find((x) => x._id === r.product);
    const rs = reviews.filter((x) => x.product === p._id);
    p.rating = Math.round((rs.reduce((s, x) => s + x.rating, 0) / rs.length) * 10) / 10;
    p.numReviews = rs.length;
  });
  const slugToId = Object.fromEntries(products.map((p) => [p.slug, p._id]));
  const sections = cmsDefaults.sections.map((s) => {
    const content = s.type === 'shopTheLook' ? { ...s.content, hotspots: s.content.hotspots.map((h) => ({ ...h, productId: slugToId[h.productSlug] })) } : s.content;
    const fields = clone({ ...s, content });
    return { _id: id(), ...fields, status: 'published', published: { ...clone(fields), at: now() } };
  });
  return {
    categories,
    products,
    users: [admin, ...customers],
    orders,
    reviews,
    coupons: seed.coupons.map((c) => ({ _id: id(), usedCount: 0, usedBy: [], createdAt: now(), ...c })),
    settings: clone(seed.settings),
    wishlists: {},
    carts: {},
    logs: [],
    media: Object.entries(seed.IMG).map(([k, url]) => ({ _id: id(), url, alt: k, folder: 'seed', createdAt: now() })),
    cms: { theme: clone(cmsDefaults.theme), navigation: clone(cmsDefaults.navigation), announcement: clone(cmsDefaults.announcement), sections, pages: cmsDefaults.pages.map((p) => ({ _id: id(), ...clone(p) })) },
  };
}

let db;
const load = () => {
  if (db) return db;
  try {
    db = JSON.parse(localStorage.getItem(KEY)) || fresh();
  } catch {
    db = fresh();
  }
  db.settings.sameDay ||= clone(seed.settings.sameDay); // demo data saved before same-day existed
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
  constructor(status, message, errors, code) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.code = code;
  }
}
const fail = (status, message, errors, code) => {
  throw new HttpError(status, message, errors, code);
};
const need = (cond, msg, status = 422) => cond || fail(status, msg);

const pub = (u) => {
  if (!u) return u;
  const { password, otp, otpExpires, otpAttempts, resetToken, ...rest } = u;
  return rest;
};
const catRef = (cid) => {
  const c = db.categories.find((x) => x._id === cid);
  return c ? { _id: c._id, name: c.name, nameUr: c.nameUr, slug: c.slug, parent: c.parent } : cid;
};
const withCat = (p) => ({ ...p, category: catRef(p.category) });
const currentUser = (cfg, required = true) => {
  const token = String(cfg.headers?.Authorization || cfg.headers?.authorization || '').replace('Bearer ', '');
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
const log = (action, targetType, targetId, details) => db.logs.unshift({ _id: id(), admin: { name: 'Store Owner' }, action, targetType, targetId: targetId ? String(targetId) : '', details, createdAt: now() });
const slugify = seed.slugify;
const inRange = (d, q, days = 30) => {
  const to = q.to ? new Date(`${q.to}T23:59:59`) : new Date();
  const from = q.from ? new Date(`${q.from}T00:00:00`) : new Date(to.getTime() - days * DAY);
  const t = new Date(d);
  return t >= from && t <= to;
};
const strip = (v, k = '') => {
  if (Array.isArray(v)) return v.map((x) => strip(x));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([kk, vv]) => [kk, strip(vv, kk)]));
  if (typeof v !== 'string') return v;
  if (k === 'html' || k === 'htmlUr') return v.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, '');
  return v.replace(/<[^>]*>/g, '').replace(/^\s*javascript:/i, '');
};
const csv = (fields, rows) => [fields.join(','), ...rows.map((r) => fields.map((f) => `"${String(f.split('.').reduce((o, k) => o?.[k], r) ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
const subtree = (slug) => {
  const root = db.categories.find((c) => c.slug === slug && c.isActive);
  if (!root) return null;
  const ids = [root._id];
  for (let i = 0; i < ids.length; i++) db.categories.filter((c) => c.parent === ids[i]).forEach((c) => ids.push(c._id));
  return ids;
};

function changeStatus(order, to, extra = {}) {
  if (!canTransition(order.status, to)) fail(400, `Cannot move order from ${order.status} to ${to}`);
  if (to === 'Shipped' && order.deliveryMethod === 'same_day') {
    const r = extra.rider;
    if (!r?.name || !PHONE_RE.test(r?.phone || '')) fail(400, 'Choose a rider to send this same-day order');
    order.rider = { name: r.name, phone: r.phone, vehicle: r.vehicle || 'Bike' };
    Object.assign(order, { courier: `${order.rider.vehicle} rider · ${r.name}`, trackingNumber: r.phone });
  } else if (to === 'Shipped') {
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
  order.statusHistory.push({ status: to, at: now(), note: extra.note });
}

function listProducts(q) {
  let list = db.products.filter((p) => p.isActive);
  if (q.category) {
    const ids = subtree(q.category) || [];
    list = list.filter((p) => ids.includes(p.category));
  }
  if (q.q) {
    const words = String(q.q).toLowerCase().split(/\s+/).filter(Boolean);
    list = list.filter((p) => {
      const hay = [p.title, p.titleUr, p.description, ...(p.tags || []), ...Object.values(p.attributes || {})].join(' ').toLowerCase();
      return words.some((w) => hay.includes(w));
    });
  }
  if (q.minPrice) list = list.filter((p) => p.price >= +q.minPrice);
  if (q.maxPrice) list = list.filter((p) => p.price <= +q.maxPrice);
  const sizes = q.size?.split(',');
  const colours = q.colour?.split(',');
  if (sizes || colours || q.inStock === 'true') list = list.filter((p) => p.variants.some((v) => (!sizes || sizes.includes(v.size)) && (!colours || colours.includes(v.colour)) && (q.inStock !== 'true' || v.stock > 0)));
  const attr = q.attr || Object.fromEntries(Object.entries(q).filter(([k]) => k.startsWith('attr[')).map(([k, v]) => [k.slice(5, -1), v]));
  for (const [k, v] of Object.entries(attr || {})) if (ATTR_FILTERS.includes(k)) list = list.filter((p) => String(v).split(',').includes(p.attributes?.[k]));
  if (q.featured === 'true') list = list.filter((p) => p.isFeatured);
  if (q.ids) {
    const ids = q.ids.split(',');
    list = list.filter((p) => ids.includes(p._id)).sort((a, b) => ids.indexOf(a._id) - ids.indexOf(b._id));
  }
  const sorters = { newest: (a, b) => b.createdAt.localeCompare(a.createdAt), priceAsc: (a, b) => a.price - b.price, priceDesc: (a, b) => b.price - a.price, popular: (a, b) => b.soldCount - a.soldCount, rating: (a, b) => b.rating - a.rating };
  if (!q.ids) list = [...list].sort(sorters[q.sort] || sorters.newest);
  const limit = Math.min(Math.max(+q.limit || 12, 1), 48);
  const page = Math.max(+q.page || 1, 1);
  return { products: list.slice((page - 1) * limit, page * limit).map(withCat), meta: { total: list.length, page, pages: Math.ceil(list.length / limit), limit } };
}

const lowRows = () => {
  const lvl = db.settings.lowStockLevel;
  return db.products.filter((p) => p.isActive).flatMap((p) => p.variants.filter((v) => v.stock <= lvl).map((v) => ({ productId: p._id, title: p.title, image: p.images[0], ...v }))).sort((a, b) => a.stock - b.stock);
};
const group = (arr, key, init, add) => Object.entries(arr.reduce((m, x) => ((m[key(x)] = add(m[key(x)] ?? init(), x)), m), {}));

function dashboard(q) {
  const live = (o) => o.status !== 'Cancelled';
  const range = db.orders.filter((o) => inRange(o.createdAt, q));
  const rangeLive = range.filter(live);
  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);
  const sum = (os) => os.reduce((s, o) => s + o.total, 0);
  const lvl = db.settings.lowStockLevel;
  return {
    kpis: {
      todaySales: sum(db.orders.filter((o) => live(o) && o.createdAt.slice(0, 10) === today)),
      todayOrders: db.orders.filter((o) => o.createdAt.slice(0, 10) === today).length,
      monthRevenue: sum(db.orders.filter((o) => live(o) && o.createdAt.slice(0, 7) === month)),
      revenue: sum(rangeLive),
      orders: rangeLive.length,
      aov: rangeLive.length ? Math.round(sum(rangeLive) / rangeLive.length) : 0,
      newCustomers: db.users.filter((u) => u.role === 'customer' && inRange(u.createdAt, q)).length,
      lowStock: db.products.filter((p) => p.isActive && p.variants.some((v) => v.stock <= lvl)).length,
      pendingReturns: db.orders.filter((o) => o.returnRequest?.status === 'Requested').length,
    },
    byStatus: group(range, (o) => o.status, () => 0, (a) => a + 1).map(([status, count]) => ({ status, count })),
    daily: group(rangeLive, (o) => o.createdAt.slice(0, 10), () => ({ revenue: 0, orders: 0 }), (a, o) => ({ revenue: a.revenue + o.total, orders: a.orders + 1 })).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
    topProducts: group(rangeLive.flatMap((o) => o.items), (i) => i.title, () => ({ qty: 0, revenue: 0, image: '' }), (a, i) => ({ image: i.image, qty: a.qty + i.qty, revenue: a.revenue + i.qty * i.price })).map(([title, v]) => ({ title, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    recentOrders: [...db.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    lowStockList: lowRows().slice(0, 8),
  };
}

function report(q) {
  const os = db.orders.filter((o) => inRange(o.createdAt, q) && !['Cancelled', 'Returned'].includes(o.status));
  const items = os.flatMap((o) => o.items);
  const catName = (pid) => {
    const p = db.products.find((x) => x._id === pid);
    return db.categories.find((c) => c._id === p?.category)?.name || 'Uncategorised';
  };
  const agg = (key, name) => group(items, key, () => ({ qty: 0, revenue: 0 }), (a, i) => ({ qty: a.qty + i.qty, revenue: a.revenue + i.qty * i.price })).map(([k, v]) => ({ [name]: k, ...v })).sort((a, b) => b.revenue - a.revenue);
  return {
    byDay: group(os, (o) => o.createdAt.slice(0, 10), () => ({ revenue: 0, orders: 0 }), (a, o) => ({ revenue: a.revenue + o.total, orders: a.orders + 1 })).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
    byCategory: agg((i) => catName(i.product), 'category'),
    byProduct: agg((i) => i.title, 'product').slice(0, 50),
    totals: { revenue: os.reduce((s, o) => s + o.total, 0), orders: os.length, discount: os.reduce((s, o) => s + o.discount, 0), shipping: os.reduce((s, o) => s + o.shippingFee, 0), units: items.reduce((s, i) => s + i.qty, 0) },
  };
}

const parseCsv = (text) => {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim());
  const split = (l) => (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || []).slice(0, -1).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim());
  const header = split(lines[0] || '');
  return lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [header[i], v])));
};
function analyseCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length) fail(422, 'CSV is empty or missing a header row');
  const skuOwner = Object.fromEntries(db.products.flatMap((p) => p.variants.map((v) => [v.sku, p.slug])));
  const seen = new Set();
  return rows.map((r, i) => {
    const errors = [];
    const sku = String(r.sku || '').toUpperCase();
    const cat = db.categories.find((c) => c.slug === slugify(r.category || ''));
    if (!r.title) errors.push('title is required');
    if (!sku) errors.push('sku is required');
    if (!(+r.price > 0)) errors.push('price must be a positive number');
    if (r.stock && !/^\d+$/.test(r.stock)) errors.push('stock must be a whole number');
    if (!cat) errors.push(`unknown category "${r.category}"`);
    if (seen.has(sku)) errors.push('duplicate SKU in file');
    if (skuOwner[sku] && skuOwner[sku] !== slugify(r.title || '')) errors.push('SKU belongs to another product');
    seen.add(sku);
    return { line: i + 2, data: { ...r, sku, category: cat?._id }, errors };
  });
}

const cmsBundle = (preview) => {
  const t = new Date();
  const live = (s) => s.isVisible && (!s.startAt || new Date(s.startAt) <= t) && (!s.endAt || new Date(s.endAt) >= t);
  const F = ['title', 'titleUr', 'subtitle', 'subtitleUr', 'content', 'order', 'isVisible', 'startAt', 'endAt'];
  const pick = (o) => Object.fromEntries(F.map((k) => [k, o[k]]));
  const sections = db.cms.sections.map((s) => (preview ? { _id: s._id, type: s.type, ...pick(s) } : s.published && { _id: s._id, type: s.type, ...s.published })).filter((s) => s && live(s)).sort((a, b) => a.order - b.order);
  return { theme: db.cms.theme, navigation: db.cms.navigation, announcement: db.cms.announcement, sections };
};
const SECTION_FIELDS = ['title', 'titleUr', 'subtitle', 'subtitleUr', 'content', 'order', 'isVisible', 'startAt', 'endAt'];
const pickSection = (b) => Object.fromEntries(SECTION_FIELDS.filter((k) => b[k] !== undefined).map((k) => [k, strip(b[k], k)]));

const crud = (name, coll, label, validateFn = () => {}) => [
  ['post', new RegExp(`^/admin/${name}$`), ({ cfg, body }) => {
    requireAdmin(cfg);
    validateFn(body);
    const doc = { _id: id(), createdAt: now(), ...body };
    coll().unshift(doc);
    log(`${label}.create`, label, doc._id);
    return [201, { [label]: doc }];
  }],
  ['put', new RegExp(`^/admin/${name}/([^/]+)$`), ({ cfg, m, body }) => {
    requireAdmin(cfg);
    validateFn(body, m[1]);
    const doc = coll().find((x) => x._id === m[1]) || fail(404, 'Not found');
    Object.assign(doc, body, { _id: doc._id });
    log(`${label}.update`, label, doc._id);
    return { [label]: doc };
  }],
];

/* ------------------------- routes ------------------------- */
const findMyOrder = (cfg, idOrNo) => {
  const u = currentUser(cfg);
  return db.orders.find((x) => (x._id === idOrNo || x.orderNumber === idOrNo) && x.user === u._id) || fail(404, 'Order not found');
};
const addrCheck = (a) => {
  need(a?.name?.trim()?.length >= 2, 'Name is required');
  need(/^03\d{9}$/.test(a?.phone || ''), 'Mobile must be 03XXXXXXXXX');
  need(a?.city, 'City is required');
  need(a?.street?.trim()?.length >= 3, 'Street address is required');
};
const normaliseDefault = (u, preferId) => {
  if (!u.addresses.length) return;
  const target = u.addresses.find((a) => a._id === preferId) ? preferId : u.addresses.find((a) => a.isDefault)?._id || u.addresses[0]._id;
  u.addresses.forEach((a) => (a.isDefault = a._id === target));
};

const routes = [
  ['get', /^\/health$/, () => ({ ok: true, name: 'Fashionist API (mock)' })],
  /* ---- auth ---- */
  ['post', /^\/auth\/register$/, ({ body }) => {
    need(body.name?.trim().length >= 2, 'Name is required');
    need(/^\S+@\S+\.\S+$/.test(body.email || ''), 'Enter a valid email');
    need(/^03\d{9}$/.test(body.phone || ''), 'Mobile must be 03XXXXXXXXX');
    need(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(body.password || ''), 'Password needs 8+ characters with upper case, lower case and a number');
    if (!allowedEmail(body.email)) fail(422, 'Please use an email ending in @gmail.com or @outlook.com');
    const email = body.email.trim().toLowerCase();
    const existing = db.users.find((u) => u.email === email);
    if (existing && (existing.isEmailVerified !== false || !MOCK_OTP)) fail(409, 'Email already registered');
    const u = existing || { _id: id(), email, role: 'customer', addresses: [], language: 'en', createdAt: now() };
    Object.assign(u, { name: body.name.trim(), phone: body.phone, password: body.password, isEmailVerified: !MOCK_OTP });
    if (!existing) db.users.push(u);
    if (MOCK_OTP) return [201, { verificationRequired: true, email, message: `Demo mode — your code is ${newOtp(u)}` }];
    return [201, { token: `mock.${u._id}`, user: pub(u) }];
  }],
  ['post', /^\/auth\/login$/, ({ body }) => {
    const u = db.users.find((x) => x.email === String(body.email).toLowerCase() && x.password === body.password);
    if (!u) fail(401, 'Invalid email or password');
    if (u.isBlocked) fail(403, 'Your account has been blocked');
    if (MOCK_OTP && u.isEmailVerified === false && u.role !== 'admin') fail(403, `Please verify your email (demo code: ${newOtp(u)})`, undefined, 'EMAIL_NOT_VERIFIED');
    return { token: `mock.${u._id}`, user: pub(u) };
  }],
  ['post', /^\/auth\/forgot-password$/, ({ body }) => {
    const u = db.users.find((x) => x.email === String(body.email).toLowerCase());
    if (u) u.resetToken = 'a'.repeat(63) + Math.floor(Math.random() * 10);
    return { message: 'If that email exists, a reset link has been sent', ...(u && { devToken: u.resetToken }) };
  }],
  ['post', /^\/auth\/reset-password\/(.+)$/, ({ m, body }) => {
    const u = db.users.find((x) => x.resetToken && x.resetToken === m[1]) || fail(400, 'Reset link is invalid or has expired');
    need(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(body.password || ''), 'Password needs 8+ characters with upper case, lower case and a number');
    u.password = body.password;
    delete u.resetToken;
    return { token: `mock.${u._id}`, user: pub(u) };
  }],
  ['get', /^\/auth\/config$/, () => ({ emailVerification: MOCK_OTP, googleEnabled: false, googleClientId: null, allowedEmailDomains: DOMAINS })],
  ['post', /^\/auth\/verify-email$/, ({ body }) => {
    const u = db.users.find((x) => x.email === String(body.email).toLowerCase());
    if (!u || u.isEmailVerified !== false) fail(400, 'Nothing to verify for this email');
    if (!u.otp || u.otpExpires < Date.now()) fail(400, 'Code expired — request a new one', undefined, 'OTP_EXPIRED');
    if (u.otpAttempts >= 5) fail(429, 'Too many wrong codes — request a new one', undefined, 'OTP_LOCKED');
    if (String(body.otp) !== u.otp) fail(400, `Incorrect code (${5 - ++u.otpAttempts} attempts left)`, undefined, 'OTP_INVALID');
    Object.assign(u, { isEmailVerified: true, otp: undefined });
    return { token: `mock.${u._id}`, user: pub(u) };
  }],
  ['post', /^\/auth\/resend-otp$/, ({ body }) => {
    const u = db.users.find((x) => x.email === String(body.email).toLowerCase());
    const message = 'If the account needs verification, a new code has been sent';
    return u && u.isEmailVerified === false ? { message, devOtp: newOtp(u) } : { message };
  }],
  ['post', /^\/auth\/google$/, () => fail(400, 'Google sign-in is not enabled')],
  ['get', /^\/auth\/me$/, ({ cfg }) => ({ user: pub(currentUser(cfg)) })],
  ['patch', /^\/auth\/me$/, ({ cfg, body }) => {
    const u = currentUser(cfg);
    if (body.phone !== undefined) need(/^03\d{9}$/.test(body.phone), 'Mobile must be 03XXXXXXXXX');
    ['name', 'phone', 'language'].forEach((k) => body[k] !== undefined && (u[k] = body[k]));
    return { user: pub(u) };
  }],
  ['get', /^\/auth\/addresses$/, ({ cfg }) => ({ addresses: currentUser(cfg).addresses })],
  ['post', /^\/auth\/addresses$/, ({ cfg, body }) => {
    const u = currentUser(cfg);
    addrCheck(body);
    const a = { _id: id(), label: body.label || 'Home', ...body, isDefault: !!body.isDefault };
    u.addresses.push(a);
    normaliseDefault(u, a.isDefault ? a._id : null);
    return [201, { addresses: u.addresses }];
  }],
  ['put', /^\/auth\/addresses\/([^/]+)$/, ({ cfg, m, body }) => {
    const u = currentUser(cfg);
    const a = u.addresses.find((x) => x._id === m[1]) || fail(404, 'Address not found');
    Object.assign(a, body, { _id: a._id });
    addrCheck(a);
    normaliseDefault(u, body.isDefault ? a._id : null);
    return { addresses: u.addresses };
  }],
  ['delete', /^\/auth\/addresses\/([^/]+)$/, ({ cfg, m }) => {
    const u = currentUser(cfg);
    u.addresses = u.addresses.filter((a) => a._id !== m[1]);
    normaliseDefault(u);
    return { addresses: u.addresses };
  }],

  /* ---- catalogue ---- */
  ['get', /^\/categories$/, () => ({ categories: db.categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder) })],
  ['get', /^\/products$/, ({ params }) => listProducts(params)],
  ['get', /^\/products\/([^/]+)\/reviews$/, ({ m }) => {
    const reviews = db.reviews.filter((r) => r.product === m[1] && r.status === 'Approved').map((r) => ({ ...r, user: { name: db.users.find((u) => u._id === r.user)?.name || 'Customer' } }));
    const avg = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;
    return { reviews, summary: { avg, count: reviews.length, dist: [5, 4, 3, 2, 1].map((n) => ({ rating: n, count: reviews.filter((r) => r.rating === n).length })) } };
  }],
  ['post', /^\/products\/([^/]+)\/reviews$/, ({ cfg, m, body }) => {
    const u = currentUser(cfg);
    need(+body.rating >= 1 && +body.rating <= 5, 'Rating must be 1–5');
    const order = db.orders.find((o) => o.user === u._id && ['Delivered', 'Returned'].includes(o.status) && o.items.some((i) => i.product === m[1])) || fail(403, 'You can review a product only after it is delivered');
    if (db.reviews.some((r) => r.product === m[1] && r.user === u._id)) fail(409, 'You have already reviewed this product');
    const review = { _id: id(), product: m[1], user: u._id, order: order._id, rating: +body.rating, comment: strip(body.comment || ''), status: 'Approved', createdAt: now() };
    db.reviews.push(review);
    refreshRating(m[1]);
    return [201, { review }];
  }],
  ['get', /^\/products\/([^/]+)$/, ({ m }) => {
    const p = db.products.find((x) => x.slug === m[1] && x.isActive) || fail(404, 'Product not found');
    return { product: withCat(p), related: db.products.filter((x) => x.category === p.category && x._id !== p._id && x.isActive).slice(0, 8).map(withCat) };
  }],
  ['get', /^\/settings\/public$/, () => {
    const { store, shippingRates, defaultShippingFee, freeShippingAbove, returnWindowDays, sameDay: { enabled, city, fee, cutoffHour } = {} } = db.settings;
    return { settings: { store, shippingRates, defaultShippingFee, freeShippingAbove, returnWindowDays, sameDay: { enabled: !!enabled, city, fee, cutoffHour } } };
  }],
  ['get', /^\/cms$/, () => cmsBundle(false)],
  ['get', /^\/cms\/pages\/([^/]+)$/, ({ m }) => ({ page: db.cms.pages.find((p) => p.slug === m[1] && p.isPublished) || fail(404, 'Page not found') })],

  /* ---- cart / wishlist ---- */
  ['get', /^\/wishlist$/, ({ cfg }) => {
    const u = currentUser(cfg);
    return { products: (db.wishlists[u._id] || []).map((pid) => db.products.find((p) => p._id === pid)).filter(Boolean).map(withCat) };
  }],
  ['post', /^\/wishlist\/(.+)$/, ({ cfg, m }) => {
    const u = currentUser(cfg);
    const w = (db.wishlists[u._id] ||= []);
    const i = w.indexOf(m[1]);
    i >= 0 ? w.splice(i, 1) : w.push(m[1]);
    return { products: w, added: i < 0 };
  }],
  ['get', /^\/cart$/, ({ cfg }) => ({ items: db.carts[currentUser(cfg)._id] || [] })],
  ['put', /^\/cart$/, ({ cfg, body }) => ({ items: (db.carts[currentUser(cfg)._id] = body.items || []) })],

  /* ---- orders ---- */
  ['post', /^\/orders$/, ({ cfg, body }) => {
    const u = currentUser(cfg);
    need(body.items?.length, 'Your cart is empty');
    addrCheck(body.shippingAddress);
    const qtyBySku = {};
    body.items.forEach((i) => {
      need(Number.isInteger(+i.qty) && +i.qty >= 1 && +i.qty <= MAX_QTY, 'Quantity must be 1–10');
      qtyBySku[i.sku] = (qtyBySku[i.sku] || 0) + +i.qty;
    });
    // "Transaction": validate every line first, then apply.
    const lines = Object.entries(qtyBySku).map(([sku, qty]) => {
      if (qty > MAX_QTY) fail(400, `Max ${MAX_QTY} units per item (${sku})`);
      const p = db.products.find((x) => x.isActive && x.variants.some((v) => v.sku === sku && v.stock >= qty)) || fail(409, `Out of stock: ${sku}`);
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
    const method = body.deliveryMethod === 'same_day' ? 'same_day' : 'standard';
    const sameDay = sameDayFor(body.shippingAddress.city, db.settings);
    if (method === 'same_day' && !sameDay.available) fail(400, db.settings.sameDay?.enabled ? `Same-day delivery is only available in ${db.settings.sameDay.city}` : 'Same-day delivery is currently unavailable');
    const shippingFee = coupon?.type === 'freeship' ? 0 : deliveryFeeFor(body.shippingAddress.city, db.settings, subtotal - discount, method);
    lines.forEach(({ p, v, line }) => ((v.stock -= line.qty), (p.soldCount += line.qty)));
    if (coupon) coupon.usedCount++, coupon.usedBy.push(u._id);
    const { name, phone, city, area, street } = body.shippingAddress;
    const order = {
      _id: id(),
      orderNumber: `FN-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 65536).toString(16).toUpperCase().padStart(4, '0')}`,
      user: u._id,
      items: lines.map((l) => l.line),
      shippingAddress: { name, phone, city, area, street },
      subtotal,
      discount,
      coupon: coupon ? { code: coupon.code, amount: discount } : undefined,
      shippingFee,
      total: subtotal - discount + shippingFee,
      deliveryMethod: method,
      sameDayEta: method === 'same_day' ? sameDay.eta : undefined,
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
  ['get', /^\/orders\/my$/, ({ cfg }) => ({ orders: db.orders.filter((o) => o.user === currentUser(cfg)._id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) })],
  ['post', /^\/orders\/validate-coupon$/, ({ cfg, body }) => {
    const u = currentUser(cfg);
    const c = db.coupons.find((x) => x.code === String(body.code).toUpperCase());
    const err = couponError(c, u._id, +body.subtotal);
    if (err) fail(400, err);
    const discount = couponDiscount(c, +body.subtotal);
    const freeShipping = c.type === 'freeship';
    return { code: c.code, type: c.type, discount, freeShipping, shippingFee: freeShipping ? 0 : deliveryFeeFor(body.city, db.settings, +body.subtotal - discount, sameDayFor(body.city, db.settings).available ? body.deliveryMethod : 'standard') };
  }],
  ['get', /^\/orders\/([^/]+)$/, ({ cfg, m }) => ({ order: findMyOrder(cfg, m[1]) })],
  ['post', /^\/orders\/([^/]+)\/cancel$/, ({ cfg, m }) => {
    const o = findMyOrder(cfg, m[1]);
    if (o.status !== 'Pending') fail(400, 'Only pending orders can be cancelled');
    changeStatus(o, 'Cancelled', { note: 'Cancelled by customer' });
    return { order: o };
  }],
  ['post', /^\/orders\/([^/]+)\/return$/, ({ cfg, m, body }) => {
    const o = findMyOrder(cfg, m[1]);
    need(['return', 'exchange'].includes(body.type), 'Choose return or exchange');
    need(String(body.reason || '').trim().length >= 5, 'Please tell us the reason (5+ characters)');
    if (o.status !== 'Delivered') fail(400, 'Only delivered orders can be returned');
    if (!isWithinReturnWindow(o.deliveredAt, db.settings.returnWindowDays)) fail(400, `Returns are accepted within ${db.settings.returnWindowDays} days of delivery`);
    if (o.returnRequest?.status) fail(400, 'A return request already exists for this order');
    o.returnRequest = { type: body.type, reason: strip(body.reason), status: 'Requested', requestedAt: now() };
    return { order: o };
  }],

  /* ---- admin: overview ---- */
  ['get', /^\/admin\/dashboard$/, ({ cfg, params }) => (requireAdmin(cfg), dashboard(params))],
  ['get', /^\/admin\/notifications$/, ({ cfg }) => {
    requireAdmin(cfg);
    const pending = db.orders.filter((o) => o.status === 'Pending');
    const returns = db.orders.filter((o) => o.returnRequest?.status === 'Requested');
    const low = lowRows();
    return {
      items: [
        ...pending.slice(0, 5).map((o) => ({ type: 'order', title: `New order ${o.orderNumber}`, text: `PKR ${o.total.toLocaleString()}`, link: `/admin/orders?open=${o._id}`, at: o.createdAt })),
        ...returns.slice(0, 5).map((o) => ({ type: 'return', title: `Return requested — ${o.orderNumber}`, text: o.returnRequest.reason, link: '/admin/returns', at: o.returnRequest.requestedAt })),
        ...low.slice(0, 5).map((r) => ({ type: 'stock', title: `Low stock: ${r.sku}`, text: `${r.title} — ${r.stock} left`, link: '/admin/inventory?low=true', at: null })),
      ],
      counts: { orders: pending.length, returns: returns.length, lowStock: low.length },
    };
  }],
  ['get', /^\/admin\/search$/, ({ cfg, params }) => {
    requireAdmin(cfg);
    const q = String(params.q || '').toLowerCase();
    if (q.length < 2) return { orders: [], products: [], customers: [] };
    const has = (...xs) => xs.some((x) => String(x || '').toLowerCase().includes(q));
    return {
      orders: db.orders.filter((o) => has(o.orderNumber, o.shippingAddress.phone, o.shippingAddress.name)).slice(0, 5),
      products: db.products.filter((p) => has(p.title, ...p.variants.map((v) => v.sku))).slice(0, 5),
      customers: db.users.filter((u) => u.role === 'customer' && has(u.name, u.email, u.phone)).slice(0, 5).map(pub),
    };
  }],

  /* ---- admin: products ---- */
  ['get', /^\/admin\/products$/, ({ cfg, params }) => {
    requireAdmin(cfg);
    const s = (params.q || '').toLowerCase();
    const lvl = db.settings.lowStockLevel;
    let list = db.products.filter((p) => !s || p.title.toLowerCase().includes(s) || p.variants.some((v) => v.sku.toLowerCase().startsWith(s)));
    if (params.category) list = list.filter((p) => p.category === params.category);
    if (params.status === 'active') list = list.filter((p) => p.isActive);
    if (params.status === 'hidden') list = list.filter((p) => !p.isActive);
    if (params.stock === 'out') list = list.filter((p) => p.variants.every((v) => v.stock === 0));
    if (params.stock === 'low') list = list.filter((p) => p.variants.some((v) => v.stock <= lvl));
    return { products: list.map(withCat) };
  }],
  ['post', /^\/admin\/products\/bulk$/, ({ cfg, body }) => {
    requireAdmin(cfg);
    need(body.ids?.length, 'Select at least one product');
    const set = new Set(body.ids);
    const hits = db.products.filter((p) => set.has(p._id));
    if (body.action === 'activate') hits.forEach((p) => (p.isActive = true));
    else if (body.action === 'hide') hits.forEach((p) => (p.isActive = false));
    else if (body.action === 'category') {
      need(db.categories.some((c) => c._id === body.category), 'Category not found');
      hits.forEach((p) => (p.category = body.category));
    } else if (body.action === 'delete') {
      db.products = db.products.filter((p) => !set.has(p._id));
      db.reviews = db.reviews.filter((r) => !set.has(r.product));
    } else fail(422, 'Unknown action');
    log(`product.bulk.${body.action}`, 'Product', '', { count: hits.length });
    return { modified: hits.length };
  }],
  ['get', /^\/admin\/products\/([^/]+)$/, ({ cfg, m }) => (requireAdmin(cfg), { product: db.products.find((p) => p._id === m[1]) || fail(404, 'Product not found') })],
  ['post', /^\/admin\/products$/, ({ cfg, body }) => {
    requireAdmin(cfg);
    const p = productBody(body);
    validateProduct(p);
    db.products.unshift({ _id: id(), rating: 0, numReviews: 0, soldCount: 0, isActive: true, createdAt: now(), ...p });
    log('product.create', 'Product', db.products[0]._id, { title: p.title });
    return [201, { product: db.products[0] }];
  }],
  ['put', /^\/admin\/products\/([^/]+)$/, ({ cfg, m, body }) => {
    requireAdmin(cfg);
    const p = db.products.find((x) => x._id === m[1]) || fail(404, 'Product not found');
    const next = { ...p, ...productBody(body) };
    validateProduct(next, p._id);
    Object.assign(p, next);
    log('product.update', 'Product', p._id, { title: p.title, fields: Object.keys(body) });
    return { product: p };
  }],
  ['delete', /^\/admin\/products\/([^/]+)$/, ({ cfg, m }) => {
    requireAdmin(cfg);
    const p = db.products.find((x) => x._id === m[1]) || fail(404, 'Product not found');
    db.products = db.products.filter((x) => x._id !== m[1]);
    db.reviews = db.reviews.filter((r) => r.product !== m[1]);
    log('product.delete', 'Product', m[1], { title: p.title });
    return { ok: true };
  }],
  ['post', /^\/admin\/bulk-import\/preview$/, ({ cfg, body }) => {
    requireAdmin(cfg);
    const rows = analyseCsv(body.csv);
    return { rows, valid: rows.filter((r) => !r.errors.length).length, invalid: rows.filter((r) => r.errors.length).length };
  }],
  ['post', /^\/admin\/bulk-import$/, ({ cfg, body }) => {
    requireAdmin(cfg);
    const rows = analyseCsv(body.csv);
    const grouped = {};
    rows.filter((r) => !r.errors.length).forEach(({ data: r }) => {
      const slug = slugify(r.title);
      grouped[slug] ||= { title: r.title, titleUr: r.titleUr, slug, category: r.category, price: +r.price, compareAtPrice: r.compareAtPrice ? +r.compareAtPrice : undefined, description: r.description, images: (r.images || '').split('|').filter(Boolean), tags: (r.tags || '').split('|').filter(Boolean), attributes: Object.fromEntries((r.attributes || '').split(';').map((kv) => kv.split('=').map((s) => s.trim())).filter(([k, v]) => k && v)), variants: [] };
      grouped[slug].variants.push({ sku: r.sku, size: r.size, colour: r.colour, stock: +r.stock || 0 });
    });
    let created = 0;
    let updated = 0;
    Object.values(grouped).forEach((g) => {
      const ex = db.products.find((p) => p.slug === g.slug);
      if (ex) Object.assign(ex, g), updated++;
      else db.products.unshift({ _id: id(), rating: 0, numReviews: 0, soldCount: 0, isActive: true, createdAt: now(), ...g }), created++;
    });
    const errors = rows.filter((r) => r.errors.length).map((r) => ({ line: r.line, message: r.errors.join('; ') }));
    log('product.bulkImport', 'Product', '', { created, updated, errors: errors.length });
    return { created, updated, skipped: errors.length, errors };
  }],

  /* ---- admin: categories & inventory ---- */
  ['get', /^\/admin\/categories$/, ({ cfg }) => (requireAdmin(cfg), { categories: [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder) })],
  ['patch', /^\/admin\/categories\/reorder$/, ({ cfg, body }) => {
    requireAdmin(cfg);
    body.items.forEach((i) => Object.assign(db.categories.find((c) => c._id === i.id) || {}, { sortOrder: i.sortOrder, parent: i.parent || null }));
    log('category.reorder', 'Category', '', { count: body.items.length });
    return { categories: [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder) };
  }],
  ...crud('categories', () => db.categories, 'category', (b, selfId) => {
    need(b.name?.trim().length >= 2, 'Name is required');
    b.slug = slugify(b.slug || b.name);
    if (db.categories.some((c) => c.slug === b.slug && c._id !== selfId)) fail(409, 'Duplicate value for slug');
    if (selfId && b.parent === selfId) fail(400, 'A category cannot be its own parent');
    b.parent ||= null;
    b.sortOrder = +b.sortOrder || 0;
  }),
  ['delete', /^\/admin\/categories\/([^/]+)$/, ({ cfg, m }) => {
    requireAdmin(cfg);
    if (db.products.some((p) => p.category === m[1])) fail(400, 'Category has products; move them or deactivate the category');
    if (db.categories.some((c) => c.parent === m[1])) fail(400, 'Category has sub-categories');
    db.categories = db.categories.filter((c) => c._id !== m[1]);
    log('category.delete', 'Category', m[1]);
    return { ok: true };
  }],
  ['get', /^\/admin\/inventory\/export$/, ({ cfg }) => (requireAdmin(cfg), csv(['title', 'sku', 'size', 'colour', 'stock'], db.products.flatMap((p) => p.variants.map((v) => ({ title: p.title, ...v })))))],
  ['get', /^\/admin\/inventory$/, ({ cfg, params }) => {
    requireAdmin(cfg);
    const lvl = db.settings.lowStockLevel;
    const rows = db.products.filter((p) => p.isActive).flatMap((p) => p.variants.map((v) => ({ productId: p._id, title: p.title, image: p.images[0], ...v, low: v.stock <= lvl })));
    return { rows: params.low === 'true' ? rows.filter((r) => r.low) : rows, lowStockLevel: lvl };
  }],
  ['patch', /^\/admin\/inventory$/, ({ cfg, body }) => {
    requireAdmin(cfg);
    need(Number.isInteger(body.stock) && body.stock >= 0, 'Stock must be a whole number ≥ 0');
    const v = db.products.flatMap((p) => p.variants).find((x) => x.sku === body.sku) || fail(404, 'SKU not found');
    v.stock = body.stock;
    log('inventory.update', 'Variant', body.sku, { stock: body.stock });
    return { ok: true };
  }],

  /* ---- admin: orders & returns ---- */
  ['get', /^\/admin\/orders\/export$/, ({ cfg, params }) => (requireAdmin(cfg), csv(['orderNumber', 'createdAt', 'status', 'paymentStatus', 'shippingAddress.name', 'shippingAddress.phone', 'shippingAddress.city', 'deliveryMethod', 'subtotal', 'discount', 'shippingFee', 'total'], filterOrders(params)))],
  ['get', /^\/admin\/orders$/, ({ cfg, params }) => {
    requireAdmin(cfg);
    const all = filterOrders({ ...params, status: '' });
    const list = params.status ? all.filter((o) => o.status === params.status) : all;
    const counts = { All: all.length, ...Object.fromEntries(ORDER_STATUSES.map((s) => [s, all.filter((o) => o.status === s).length])) };
    const limit = Math.min(+params.limit || 50, 200);
    const page = Math.max(+params.page || 1, 1);
    return { orders: list.slice((page - 1) * limit, page * limit).map((o) => ({ ...o, user: pub(db.users.find((u) => u._id === o.user)) })), counts, meta: { total: list.length, page, pages: Math.ceil(list.length / limit) } };
  }],
  ['post', /^\/admin\/orders\/bulk-status$/, ({ cfg, body }) => {
    requireAdmin(cfg);
    if (body.status === 'Shipped') fail(400, 'Shipping needs a courier and tracking number per order — ship orders one by one');
    const results = body.ids.map((oid) => {
      const o = db.orders.find((x) => x._id === oid);
      if (!o) return { id: oid, ok: false, message: 'Not found' };
      try {
        const from = o.status;
        changeStatus(o, body.status, { note: body.note });
        log('order.status', 'Order', o.orderNumber, { from, to: body.status, bulk: true });
        return { id: oid, orderNumber: o.orderNumber, ok: true };
      } catch (e) {
        return { id: oid, orderNumber: o.orderNumber, ok: false, message: e.message };
      }
    });
    return { results, updated: results.filter((r) => r.ok).length };
  }],
  ['get', /^\/admin\/orders\/([^/]+)\/invoice$/, ({ cfg, m }) => {
    requireAdmin(cfg);
    const o = db.orders.find((x) => x._id === m[1]) || fail(404, 'Order not found');
    return { order: { ...o, user: pub(db.users.find((u) => u._id === o.user)) }, store: db.settings.store };
  }],
  ['get', /^\/admin\/orders\/([^/]+)$/, ({ cfg, m }) => {
    requireAdmin(cfg);
    const o = db.orders.find((x) => x._id === m[1]) || fail(404, 'Order not found');
    return { order: { ...o, user: pub(db.users.find((u) => u._id === o.user)) } };
  }],
  ['patch', /^\/admin\/orders\/([^/]+)\/status$/, ({ cfg, m, body }) => {
    requireAdmin(cfg);
    need(['Confirmed', 'Shipped', 'Delivered', 'Cancelled'].includes(body.status), 'Invalid status');
    const o = db.orders.find((x) => x._id === m[1]) || fail(404, 'Order not found');
    const from = o.status;
    changeStatus(o, body.status, body);
    log('order.status', 'Order', o.orderNumber, { from, to: o.status });
    return { order: { ...o, user: pub(db.users.find((u) => u._id === o.user)) } };
  }],
  ['get', /^\/admin\/returns$/, ({ cfg, params }) => {
    requireAdmin(cfg);
    return { orders: db.orders.filter((o) => o.returnRequest?.status && (!params.status || o.returnRequest.status === params.status)).sort((a, b) => iso(b.returnRequest.requestedAt).localeCompare(iso(a.returnRequest.requestedAt))).map((o) => ({ ...o, user: pub(db.users.find((u) => u._id === o.user)) })) };
  }],
  ['patch', /^\/admin\/returns\/([^/]+)$/, ({ cfg, m, body }) => {
    requireAdmin(cfg);
    const o = db.orders.find((x) => x._id === m[1]);
    if (!o || o.returnRequest?.status !== 'Requested') fail(400, 'No pending return request for this order');
    need(['Approved', 'Rejected'].includes(body.decision), 'Decision must be Approved or Rejected');
    if (body.decision === 'Approved') changeStatus(o, 'Returned', { note: body.note || `${o.returnRequest.type} approved` });
    Object.assign(o.returnRequest, { status: body.decision, note: strip(body.note || ''), decidedAt: now() });
    log('order.return', 'Order', o.orderNumber, { decision: body.decision, note: body.note });
    return { order: o };
  }],

  /* ---- admin: customers, coupons, reviews ---- */
  ['get', /^\/admin\/customers$/, ({ cfg, params }) => {
    requireAdmin(cfg);
    const q = (params.q || '').toLowerCase();
    return {
      customers: db.users
        .filter((u) => u.role === 'customer' && (!q || [u.name, u.email, u.phone].some((x) => String(x).toLowerCase().includes(q))))
        .map((u) => {
          const os = db.orders.filter((o) => o.user === u._id);
          return { ...pub(u), orders: os.length, spent: os.filter((o) => !['Cancelled', 'Returned'].includes(o.status)).reduce((s, o) => s + o.total, 0) };
        }),
    };
  }],
  ['get', /^\/admin\/customers\/([^/]+)$/, ({ cfg, m }) => {
    requireAdmin(cfg);
    const u = db.users.find((x) => x._id === m[1] && x.role === 'customer') || fail(404, 'Customer not found');
    const orders = db.orders.filter((o) => o.user === u._id);
    return { customer: pub(u), orders, totalSpend: orders.filter((o) => !['Cancelled', 'Returned'].includes(o.status)).reduce((s, o) => s + o.total, 0) };
  }],
  ['patch', /^\/admin\/customers\/([^/]+)$/, ({ cfg, m, body }) => {
    requireAdmin(cfg);
    const u = db.users.find((x) => x._id === m[1] && x.role === 'customer') || fail(404, 'Customer not found');
    u.isBlocked = !!body.isBlocked;
    log(u.isBlocked ? 'customer.block' : 'customer.unblock', 'User', u._id, { email: u.email });
    return { user: pub(u) };
  }],
  ['get', /^\/admin\/coupons$/, ({ cfg }) => {
    requireAdmin(cfg);
    return {
      coupons: db.coupons.map(({ usedBy, ...c }) => {
        const os = db.orders.filter((o) => o.coupon?.code === c.code);
        return { ...c, uniqueCustomers: usedBy.length, stats: { orders: os.length, discountGiven: os.reduce((s, o) => s + o.discount, 0), revenue: os.reduce((s, o) => s + o.total, 0) } };
      }),
    };
  }],
  ...crud('coupons', () => db.coupons, 'coupon', (b, selfId) => {
    b.code = String(b.code || '').toUpperCase();
    need(/^[A-Z0-9]{3,20}$/.test(b.code), 'Code: 3–20 letters/numbers');
    need(['percent', 'fixed', 'freeship'].includes(b.type), 'Invalid coupon type');
    if (b.type === 'percent') need(+b.value > 0 && +b.value <= 100, 'Percent must be 1–100');
    if (db.coupons.some((c) => c.code === b.code && c._id !== selfId)) fail(409, 'Duplicate value for code');
    delete b.stats;
    delete b.uniqueCustomers;
    if (!selfId) Object.assign(b, { usedCount: 0, usedBy: [] });
  }),
  ['delete', /^\/admin\/coupons\/([^/]+)$/, ({ cfg, m }) => {
    requireAdmin(cfg);
    db.coupons = db.coupons.filter((c) => c._id !== m[1]);
    log('coupon.delete', 'Coupon', m[1]);
    return { ok: true };
  }],
  ['get', /^\/admin\/reviews$/, ({ cfg, params }) => {
    requireAdmin(cfg);
    return {
      reviews: db.reviews
        .filter((r) => (!params.rating || r.rating === +params.rating) && (!params.status || r.status === params.status))
        .map((r) => {
          const p = db.products.find((x) => x._id === r.product) || {};
          return { ...r, user: { name: db.users.find((u) => u._id === r.user)?.name }, product: { _id: p._id, title: p.title, slug: p.slug, images: p.images } };
        }),
    };
  }],
  ['patch', /^\/admin\/reviews\/([^/]+)$/, ({ cfg, m, body }) => {
    requireAdmin(cfg);
    const r = db.reviews.find((x) => x._id === m[1]) || fail(404, 'Review not found');
    r.status = body.status;
    refreshRating(r.product);
    log('review.status', 'Review', r._id, { status: r.status });
    return { review: r };
  }],

  /* ---- admin: reports, settings, activity, media ---- */
  ['get', /^\/admin\/reports\/export$/, ({ cfg, params }) => {
    requireAdmin(cfg);
    const r = report(params);
    const type = ['day', 'category', 'product'].includes(params.type) ? params.type : 'day';
    return csv({ day: ['date', 'orders', 'revenue'], category: ['category', 'qty', 'revenue'], product: ['product', 'qty', 'revenue'] }[type], { day: r.byDay, category: r.byCategory, product: r.byProduct }[type]);
  }],
  ['get', /^\/admin\/reports$/, ({ cfg, params }) => (requireAdmin(cfg), report(params))],
  ['get', /^\/admin\/settings$/, ({ cfg }) => (requireAdmin(cfg), { settings: db.settings })],
  ['put', /^\/admin\/settings$/, ({ cfg, body }) => {
    requireAdmin(cfg);
    db.settings = { ...db.settings, ...body, store: { ...db.settings.store, ...(body.store || {}) }, emailNotifications: { ...db.settings.emailNotifications, ...(body.emailNotifications || {}) } };
    log('settings.update', 'Settings', '', { fields: Object.keys(body) });
    return { settings: db.settings };
  }],
  ['get', /^\/admin\/activity$/, ({ cfg, params }) => {
    requireAdmin(cfg);
    return { logs: db.logs.filter((l) => (!params.q || l.action.startsWith(params.q)) && ((!params.from && !params.to) || inRange(l.createdAt, params, 3650))) };
  }],
  ['get', /^\/admin\/media$/, ({ cfg, params }) => {
    requireAdmin(cfg);
    const q = (params.q || '').toLowerCase();
    return { media: db.media.filter((m) => (!q || `${m.alt} ${m.url.slice(0, 200)}`.toLowerCase().includes(q)) && (!params.folder || m.folder === params.folder)) };
  }],
  ['post', /^\/admin\/media$/, ({ cfg, body }) => {
    requireAdmin(cfg);
    need(/^(https?:|data:image\/)/.test(body.url || ''), 'A full image URL is required');
    const m = { _id: id(), url: body.url, alt: body.alt || '', folder: body.folder || 'general', createdAt: now() };
    db.media.unshift(m);
    log('media.add', 'Media', m._id);
    return [201, { media: [m] }];
  }],
  ['delete', /^\/admin\/media\/([^/]+)$/, ({ cfg, m }) => {
    requireAdmin(cfg);
    db.media = db.media.filter((x) => x._id !== m[1]);
    log('media.delete', 'Media', m[1]);
    return { ok: true };
  }],

  /* ---- admin: CMS ---- */
  ['get', /^\/admin\/cms\/preview$/, ({ cfg }) => (requireAdmin(cfg), cmsBundle(true))],
  ['post', /^\/admin\/cms\/theme\/reset$/, ({ cfg }) => {
    requireAdmin(cfg);
    db.cms.theme = clone(cmsDefaults.theme);
    log('cms.theme.reset', 'theme', '');
    return { theme: db.cms.theme };
  }],
  ...['theme', 'navigation', 'announcement'].flatMap((k) => [
    ['get', new RegExp(`^/admin/cms/${k}$`), ({ cfg }) => (requireAdmin(cfg), { [k]: db.cms[k] })],
    ['put', new RegExp(`^/admin/cms/${k}$`), ({ cfg, body }) => {
      requireAdmin(cfg);
      if (k === 'theme') ['primaryColor', 'accentColor'].forEach((f) => body[f] && need(/^#[0-9a-fA-F]{6}$/.test(body[f]), `${f} must be a hex colour`));
      db.cms[k] = { ...db.cms[k], ...strip(body) };
      log(`cms.${k}.update`, k, '');
      return { [k]: db.cms[k] };
    }],
  ]),
  ['get', /^\/admin\/cms\/sections$/, ({ cfg }) => (requireAdmin(cfg), { sections: [...db.cms.sections].sort((a, b) => a.order - b.order) })],
  ['post', /^\/admin\/cms\/sections$/, ({ cfg, body }) => {
    requireAdmin(cfg);
    const s = { _id: id(), type: body.type, order: db.cms.sections.length, isVisible: true, content: {}, ...pickSection(body), status: 'draft', published: null };
    db.cms.sections.push(s);
    log('cms.section.create', 'HomepageSection', s._id, { type: s.type });
    return [201, { section: s }];
  }],
  ['patch', /^\/admin\/cms\/sections\/reorder$/, ({ cfg, body }) => {
    requireAdmin(cfg);
    body.ids.forEach((sid, order) => Object.assign(db.cms.sections.find((s) => s._id === sid) || {}, { order, status: 'draft' }));
    log('cms.section.reorder', 'HomepageSection', '');
    return { sections: [...db.cms.sections].sort((a, b) => a.order - b.order) };
  }],
  ['post', /^\/admin\/cms\/sections\/publish$/, ({ cfg }) => {
    requireAdmin(cfg);
    db.cms.sections.forEach((s) => Object.assign(s, { status: 'published', published: { ...clone(pickSection({ ...s, content: s.content })), at: now() } }));
    log('cms.homepage.publish', 'HomepageSection', '', { sections: db.cms.sections.length });
    return { sections: db.cms.sections };
  }],
  ['post', /^\/admin\/cms\/sections\/revert$/, ({ cfg }) => {
    requireAdmin(cfg);
    db.cms.sections = db.cms.sections.filter((s) => s.published).map((s) => ({ ...s, ...clone(s.published), status: 'published' }));
    log('cms.homepage.revert', 'HomepageSection', '');
    return { sections: [...db.cms.sections].sort((a, b) => a.order - b.order) };
  }],
  ['put', /^\/admin\/cms\/sections\/([^/]+)$/, ({ cfg, m, body }) => {
    requireAdmin(cfg);
    const s = db.cms.sections.find((x) => x._id === m[1]) || fail(404, 'Section not found');
    Object.assign(s, pickSection(body), { status: 'draft' });
    log('cms.section.update', 'HomepageSection', s._id, { type: s.type });
    return { section: s };
  }],
  ['post', /^\/admin\/cms\/sections\/([^/]+)\/duplicate$/, ({ cfg, m }) => {
    requireAdmin(cfg);
    const src = db.cms.sections.find((x) => x._id === m[1]) || fail(404, 'Section not found');
    db.cms.sections.forEach((s) => s.order > src.order && s.order++);
    const s = { ...clone(src), _id: id(), order: src.order + 1, title: `${src.title || ''} (copy)`, status: 'draft', published: null };
    db.cms.sections.push(s);
    log('cms.section.duplicate', 'HomepageSection', s._id);
    return [201, { section: s }];
  }],
  ['delete', /^\/admin\/cms\/sections\/([^/]+)$/, ({ cfg, m }) => {
    requireAdmin(cfg);
    db.cms.sections = db.cms.sections.filter((s) => s._id !== m[1]);
    log('cms.section.delete', 'HomepageSection', m[1]);
    return { ok: true };
  }],
  ['get', /^\/admin\/cms\/pages$/, ({ cfg }) => (requireAdmin(cfg), { pages: [...db.cms.pages].sort((a, b) => a.slug.localeCompare(b.slug)) })],
  ...crud('cms/pages', () => db.cms.pages, 'page', (b, selfId) => {
    Object.assign(b, strip(b));
    need(b.title?.trim().length >= 2, 'Title is required');
    b.slug = slugify(b.slug || b.title);
    if (db.cms.pages.some((p) => p.slug === b.slug && p._id !== selfId)) fail(409, 'Duplicate value for slug');
  }),
  ['delete', /^\/admin\/cms\/pages\/([^/]+)$/, ({ cfg, m }) => {
    requireAdmin(cfg);
    db.cms.pages = db.cms.pages.filter((p) => p._id !== m[1]);
    log('cms.page.delete', 'Page', m[1]);
    return { ok: true };
  }],
];

function refreshRating(pid) {
  const p = db.products.find((x) => x._id === pid);
  if (!p) return;
  const rs = db.reviews.filter((r) => r.product === pid && r.status === 'Approved');
  p.rating = rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : 0;
  p.numReviews = rs.length;
}

function productBody(b) {
  const out = { ...b };
  ['_id', 'rating', 'numReviews', 'soldCount', 'createdAt'].forEach((k) => delete out[k]);
  if (out.category && typeof out.category === 'object') out.category = out.category._id;
  if (out.title && !out.slug) out.slug = slugify(out.title);
  if (out.slug) out.slug = slugify(out.slug);
  if (out.variants) out.variants = out.variants.map((v) => ({ ...v, sku: String(v.sku || '').toUpperCase().trim(), stock: Math.max(0, parseInt(v.stock) || 0) }));
  return out;
}

function validateProduct(p, selfId) {
  const errors = [];
  if (!(p.title?.trim().length >= 2)) errors.push({ field: 'title', message: 'Title is required' });
  if (!db.categories.some((c) => c._id === p.category)) errors.push({ field: 'category', message: 'Category is required' });
  if (!(+p.price >= 0)) errors.push({ field: 'price', message: 'Price must be ≥ 0' });
  if (!p.variants?.length) errors.push({ field: 'variants', message: 'At least one variant is required' });
  p.variants?.forEach((v) => !/^[A-Z0-9-]{2,40}$/.test(v.sku) && errors.push({ field: 'variants.sku', message: `SKU "${v.sku}": letters, numbers and dashes only` }));
  if (errors.length) fail(422, errors[0].message, errors);
  const skus = p.variants.map((v) => v.sku);
  if (new Set(skus).size !== skus.length) fail(409, 'Duplicate value for variants.sku');
  const taken = new Set(db.products.filter((x) => x._id !== selfId).flatMap((x) => x.variants.map((v) => v.sku)));
  const dup = skus.find((s) => taken.has(s));
  if (dup) fail(409, `Duplicate value for variants.sku (${dup})`);
  if (db.products.some((x) => x.slug === p.slug && x._id !== selfId)) fail(409, 'Duplicate value for slug');
}

function filterOrders(q) {
  let list = [...db.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (q.status) list = list.filter((o) => o.status === q.status);
  if (q.city) list = list.filter((o) => o.shippingAddress.city === q.city);
  if (q.delivery) list = list.filter((o) => (o.deliveryMethod === 'same_day') === (q.delivery === 'same_day'));
  if (q.q) {
    const s = q.q.toLowerCase();
    list = list.filter((o) => [o.orderNumber, o.shippingAddress.phone, o.shippingAddress.name].some((x) => String(x).toLowerCase().includes(s)));
  }
  if (q.from || q.to) list = list.filter((o) => inRange(o.createdAt, q, 3650));
  return list;
}

export async function mockAdapter(cfg) {
  load();
  await new Promise((r) => setTimeout(r, 180 + Math.random() * 220));
  const url = new URL(cfg.url, 'http://mock');
  const path = url.pathname.replace(/^\/api/, '').replace(/\/$/, '') || '/';
  const params = { ...Object.fromEntries(url.searchParams), ...Object.fromEntries(Object.entries(cfg.params || {}).filter(([, v]) => v !== undefined && v !== '')) };
  const body = typeof cfg.data === 'string' ? JSON.parse(cfg.data || '{}') : cfg.data || {};
  const method = (cfg.method || 'get').toLowerCase();
  const respond = (status, data) => ({ data, status, statusText: String(status), headers: {}, config: cfg, request: {} });
  for (const [mth, re, handler] of routes) {
    const m = path.match(re);
    if (mth !== method || !m) continue;
    try {
      const out = handler({ cfg, m, params, body });
      save();
      if (typeof out === 'string') return respond(200, out);
      const [status, payload] = Array.isArray(out) ? out : [200, out];
      const { meta, ...data } = payload;
      return respond(status, { success: true, data, ...(meta && { meta }) });
    } catch (e) {
      if (!(e instanceof HttpError)) console.error(e);
      const err = new Error(e.message);
      err.config = cfg;
      err.isAxiosError = true;
      err.response = respond(e.status || 500, { success: false, message: e.message, ...(e.code && { code: e.code }), ...(e.errors && { errors: e.errors }) });
      throw err;
    }
  }
  const err = new Error(`Not found: ${method.toUpperCase()} ${path}`);
  err.config = cfg;
  err.response = respond(404, { success: false, message: err.message });
  throw err;
}

export const resetMockDb = () => {
  db = fresh();
  save();
};
