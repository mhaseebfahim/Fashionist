import mongoose from 'mongoose';
import { Parser } from 'json2csv';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Coupon from '../models/Coupon.js';
import Review from '../models/Review.js';
import Settings from '../models/Settings.js';
import ActivityLog from '../models/ActivityLog.js';
import { Media } from '../models/Cms.js';
import { AppError, asyncHandler } from '../utils/AppError.js';
import { dateRange, escapeRegex, logActivity, parseCsv, slugify, toWhatsapp } from '../utils/helpers.js';
import { cloudinaryReady, removeFromCloudinary, toCloudinary } from '../middleware/upload.js';
import { refreshRating } from './catalogController.js';

const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sumRevenue = async (match) => (await Order.aggregate([{ $match: { ...match, status: { $ne: 'Cancelled' } } }, { $group: { _id: null, v: { $sum: '$total' }, n: { $sum: 1 } } }]))[0] || { v: 0, n: 0 };
const lowStockRows = async (level, limit = 0) => {
  const rows = await Product.aggregate([{ $match: { isActive: true } }, { $unwind: '$variants' }, { $match: { 'variants.stock': { $lte: level } } }, { $sort: { 'variants.stock': 1 } }, ...(limit ? [{ $limit: limit }] : []), { $project: { productId: '$_id', title: 1, image: { $first: '$images' }, sku: '$variants.sku', size: '$variants.size', colour: '$variants.colour', stock: '$variants.stock' } }]);
  return rows;
};

/* ---------- Overview ---------- */
export const dashboard = asyncHandler(async (req, res) => {
  const { from, to } = dateRange(req.query, 30);
  const now = new Date();
  const { lowStockLevel } = await Settings.current();
  const inRange = { createdAt: { $gte: from, $lte: to } };
  const [today, month, range, newCustomers, byStatus, daily, topProducts, recentOrders, lowStock, lowCount, pendingReturns] = await Promise.all([
    sumRevenue({ createdAt: { $gte: startOfDay(now) } }),
    sumRevenue({ createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } }),
    sumRevenue(inRange),
    User.countDocuments({ role: 'customer', ...inRange }),
    Order.aggregate([{ $match: inRange }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { ...inRange, status: { $ne: 'Cancelled' } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Order.aggregate([{ $match: { ...inRange, status: { $ne: 'Cancelled' } } }, { $unwind: '$items' }, { $group: { _id: '$items.title', image: { $first: '$items.image' }, qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } }, { $sort: { revenue: -1 } }, { $limit: 5 }]),
    Order.find().sort('-createdAt').limit(8).select('orderNumber shippingAddress total status createdAt'),
    lowStockRows(lowStockLevel, 8),
    Product.countDocuments({ isActive: true, variants: { $elemMatch: { stock: { $lte: lowStockLevel } } } }),
    Order.countDocuments({ 'returnRequest.status': 'Requested' }),
  ]);
  res.json({
    kpis: { todaySales: today.v, todayOrders: today.n, monthRevenue: month.v, revenue: range.v, orders: range.n, aov: range.n ? Math.round(range.v / range.n) : 0, newCustomers, lowStock: lowCount, pendingReturns },
    byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
    daily: daily.map((d) => ({ date: d._id, revenue: d.revenue, orders: d.orders })),
    topProducts: topProducts.map((p) => ({ title: p._id, image: p.image, qty: p.qty, revenue: p.revenue })),
    recentOrders,
    lowStockList: lowStock,
  });
});

export const notifications = asyncHandler(async (_req, res) => {
  const { lowStockLevel } = await Settings.current();
  const [pending, returns, low] = await Promise.all([
    Order.find({ status: 'Pending' }).sort('-createdAt').limit(5).select('orderNumber total createdAt deliveryMethod'),
    Order.find({ 'returnRequest.status': 'Requested' }).sort('-returnRequest.requestedAt').limit(5).select('orderNumber returnRequest'),
    lowStockRows(lowStockLevel, 5),
  ]);
  const items = [
    ...pending.map((o) => ({ type: 'order', title: `${o.deliveryMethod === 'same_day' ? '⚡ Same-day order' : 'New order'} ${o.orderNumber}`, text: `PKR ${o.total.toLocaleString()}`, link: `/admin/orders?open=${o._id}`, at: o.createdAt })),
    ...returns.map((o) => ({ type: 'return', title: `Return requested — ${o.orderNumber}`, text: o.returnRequest.reason, link: '/admin/returns', at: o.returnRequest.requestedAt })),
    ...low.map((r) => ({ type: 'stock', title: `Low stock: ${r.sku}`, text: `${r.title} — ${r.stock} left`, link: '/admin/inventory?low=true', at: null })),
  ];
  res.json({ items, counts: { orders: await Order.countDocuments({ status: 'Pending' }), returns: returns.length, lowStock: low.length } });
});

export const search = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  if (q.length < 2) return res.json({ orders: [], products: [], customers: [] });
  const re = new RegExp(escapeRegex(q), 'i');
  const [orders, products, customers] = await Promise.all([
    Order.find({ $or: [{ orderNumber: re }, { 'shippingAddress.phone': re }, { 'shippingAddress.name': re }] }).limit(5).select('orderNumber shippingAddress.name total status'),
    Product.find({ $or: [{ title: re }, { 'variants.sku': re }] }).limit(5).select('title images price'),
    User.find({ role: 'customer', $or: [{ name: re }, { email: re }, { phone: re }] }).limit(5).select('name email phone'),
  ]);
  res.json({ orders, products, customers });
});

/* ---------- Products ---------- */
export const listProducts = asyncHandler(async (req, res) => {
  const { q, category, status, stock } = req.query;
  const filter = {};
  if (q) filter.$or = [{ title: new RegExp(escapeRegex(q), 'i') }, { 'variants.sku': new RegExp(`^${escapeRegex(q)}`, 'i') }];
  if (category && mongoose.isValidObjectId(category)) filter.category = category;
  if (status === 'active') filter.isActive = true;
  if (status === 'hidden') filter.isActive = false;
  if (stock === 'out') filter.variants = { $not: { $elemMatch: { stock: { $gt: 0 } } } };
  if (stock === 'low') filter['variants.stock'] = { $lte: (await Settings.current()).lowStockLevel };
  res.json({ products: await Product.find(filter).populate('category', 'name slug').sort('-createdAt') });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  res.json({ product });
});

const productBody = (b) => {
  const out = { ...b };
  delete out._id;
  delete out.rating;
  delete out.numReviews;
  delete out.soldCount;
  if (out.title && !out.slug) out.slug = slugify(out.title);
  if (out.slug) out.slug = slugify(out.slug);
  if (out.variants) out.variants = out.variants.map((v) => ({ ...v, sku: String(v.sku).toUpperCase().trim(), stock: Math.max(0, parseInt(v.stock) || 0) }));
  return out;
};

export const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(productBody(req.body));
  logActivity(req, 'product.create', 'Product', product._id, { title: product.title });
  res.status(201).json({ product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  product.set(productBody(req.body));
  await product.save();
  logActivity(req, 'product.update', 'Product', product._id, { title: product.title, fields: Object.keys(req.body) });
  res.json({ product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const p = await Product.findByIdAndDelete(req.params.id);
  if (!p) throw new AppError('Product not found', 404);
  await Review.deleteMany({ product: p._id }); // order items are snapshots, so history stays intact
  logActivity(req, 'product.delete', 'Product', p._id, { title: p.title });
  res.json({ ok: true });
});

export const bulkProducts = asyncHandler(async (req, res) => {
  const { ids, action, category } = req.body;
  const q = { _id: { $in: ids } };
  let r;
  if (action === 'activate') r = await Product.updateMany(q, { isActive: true });
  else if (action === 'hide') r = await Product.updateMany(q, { isActive: false });
  else if (action === 'category') {
    if (!(await Category.exists({ _id: category }))) throw new AppError('Category not found', 404);
    r = await Product.updateMany(q, { category });
  } else {
    r = await Product.deleteMany(q);
    await Review.deleteMany({ product: { $in: ids } });
  }
  logActivity(req, `product.bulk.${action}`, 'Product', null, { ids, category });
  res.json({ modified: r.modifiedCount ?? r.deletedCount });
});

/* ---------- Bulk CSV import ---------- */
// One row per variant: title,titleUr,category,price,compareAtPrice,sku,size,colour,stock,images,description,tags,attributes
async function analyseCsv(csv) {
  const rows = parseCsv(String(csv || ''));
  if (!rows.length) throw new AppError('CSV is empty or missing a header row', 422);
  if (rows.length > 2000) throw new AppError('Max 2000 rows per import', 422);
  const cats = new Map((await Category.find()).map((c) => [c.slug, c._id]));
  const existingSkus = new Map();
  (await Product.find({ 'variants.sku': { $in: rows.map((r) => String(r.sku || '').toUpperCase()) } }).select('slug variants.sku')).forEach((p) => p.variants.forEach((v) => existingSkus.set(v.sku, p.slug)));
  const seen = new Set();
  return rows.map((r, i) => {
    const errors = [];
    const sku = String(r.sku || '').toUpperCase();
    if (!r.title) errors.push('title is required');
    if (!sku) errors.push('sku is required');
    if (!(+r.price > 0)) errors.push('price must be a positive number');
    if (r.stock && !/^\d+$/.test(r.stock)) errors.push('stock must be a whole number');
    if (!cats.has(slugify(r.category))) errors.push(`unknown category "${r.category}"`);
    if (seen.has(sku)) errors.push('duplicate SKU in file');
    if (existingSkus.has(sku) && existingSkus.get(sku) !== slugify(r.title)) errors.push('SKU belongs to another product');
    seen.add(sku);
    return { line: i + 2, data: { ...r, sku, category: cats.get(slugify(r.category)) }, errors };
  });
}

export const importPreview = asyncHandler(async (req, res) => {
  const rows = await analyseCsv(req.body.csv);
  res.json({ rows, valid: rows.filter((r) => !r.errors.length).length, invalid: rows.filter((r) => r.errors.length).length });
});

export const bulkImport = asyncHandler(async (req, res) => {
  const rows = await analyseCsv(req.body.csv);
  const grouped = new Map();
  for (const { data: r, errors } of rows) {
    if (errors.length) continue;
    const slug = slugify(r.title);
    const p = grouped.get(slug) || {
      title: r.title,
      titleUr: r.titleUr,
      slug,
      category: r.category,
      price: +r.price,
      compareAtPrice: r.compareAtPrice ? +r.compareAtPrice : undefined,
      description: r.description,
      images: (r.images || '').split('|').map((s) => s.trim()).filter(Boolean),
      tags: (r.tags || '').split('|').map((s) => s.trim()).filter(Boolean),
      attributes: Object.fromEntries((r.attributes || '').split(';').map((kv) => kv.split('=').map((s) => s.trim())).filter(([k, v]) => k && v)),
      variants: [],
    };
    p.variants.push({ sku: r.sku, size: r.size, colour: r.colour, stock: +r.stock || 0 });
    grouped.set(slug, p);
  }
  let created = 0;
  let updated = 0;
  const errors = rows.filter((r) => r.errors.length).map((r) => ({ line: r.line, message: r.errors.join('; ') }));
  for (const p of grouped.values()) {
    try {
      const existing = await Product.findOne({ slug: p.slug });
      if (existing) {
        existing.set(p);
        await existing.save();
        updated++;
      } else {
        await Product.create(p);
        created++;
      }
    } catch (e) {
      errors.push({ line: p.title, message: e.message });
    }
  }
  logActivity(req, 'product.bulkImport', 'Product', null, { created, updated, errors: errors.length });
  res.json({ created, updated, skipped: rows.length - rows.filter((r) => !r.errors.length).length, errors });
});

/* ---------- Inventory ---------- */
const inventoryRows = async () => {
  const { lowStockLevel } = await Settings.current();
  const products = await Product.find({ isActive: true }).select('title images variants').lean();
  return { lowStockLevel, rows: products.flatMap((p) => p.variants.map((v) => ({ productId: p._id, title: p.title, image: p.images?.[0], sku: v.sku, size: v.size, colour: v.colour, stock: v.stock, low: v.stock <= lowStockLevel }))) };
};
export const inventory = asyncHandler(async (req, res) => {
  const { rows, lowStockLevel } = await inventoryRows();
  res.json({ rows: req.query.low === 'true' ? rows.filter((r) => r.low) : rows, lowStockLevel });
});
export const exportInventory = asyncHandler(async (_req, res) => {
  const { rows } = await inventoryRows();
  res.header('Content-Type', 'text/csv').attachment('fashionist-inventory.csv').send(new Parser({ fields: ['title', 'sku', 'size', 'colour', 'stock', 'low'] }).parse(rows));
});
export const updateStock = asyncHandler(async (req, res) => {
  const { sku, stock } = req.body;
  const r = await Product.updateOne({ 'variants.sku': sku }, { $set: { 'variants.$.stock': stock } });
  if (!r.matchedCount) throw new AppError('SKU not found', 404);
  logActivity(req, 'inventory.update', 'Variant', sku, { stock });
  res.json({ ok: true });
});

/* ---------- Categories ---------- */
export const adminCategories = asyncHandler(async (_req, res) => res.json({ categories: await Category.find().sort('sortOrder name') }));
export const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create({ ...req.body, slug: slugify(req.body.slug || req.body.name) });
  logActivity(req, 'category.create', 'Category', category._id, { name: category.name });
  res.status(201).json({ category });
});
export const updateCategory = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (body.slug) body.slug = slugify(body.slug);
  if (body.parent && String(body.parent) === req.params.id) throw new AppError('A category cannot be its own parent', 400);
  const category = await Category.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
  if (!category) throw new AppError('Category not found', 404);
  logActivity(req, 'category.update', 'Category', category._id, { name: category.name });
  res.json({ category });
});
export const reorderCategories = asyncHandler(async (req, res) => {
  await Category.bulkWrite(req.body.items.map((i) => ({ updateOne: { filter: { _id: i.id }, update: { sortOrder: i.sortOrder, parent: i.parent || null } } })));
  logActivity(req, 'category.reorder', 'Category', null, { count: req.body.items.length });
  res.json({ categories: await Category.find().sort('sortOrder name') });
});
export const deleteCategory = asyncHandler(async (req, res) => {
  if (await Product.exists({ category: req.params.id })) throw new AppError('Category has products; move them or deactivate the category', 400);
  if (await Category.exists({ parent: req.params.id })) throw new AppError('Category has sub-categories', 400);
  await Category.findByIdAndDelete(req.params.id);
  logActivity(req, 'category.delete', 'Category', req.params.id);
  res.json({ ok: true });
});

/* ---------- Customers ---------- */
export const listCustomers = asyncHandler(async (req, res) => {
  const filter = { role: 'customer' };
  if (req.query.q) {
    const re = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ name: re }, { email: re }, { phone: re }];
  }
  const users = await User.find(filter).sort('-createdAt').lean();
  const stats = await Order.aggregate([{ $match: { user: { $in: users.map((u) => u._id) } } }, { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: { $cond: [{ $in: ['$status', ['Cancelled', 'Returned']] }, 0, '$total'] } } } }]);
  const m = new Map(stats.map((s) => [String(s._id), s]));
  res.json({ customers: users.map(({ passwordHash, ...u }) => ({ ...u, orders: m.get(String(u._id))?.orders || 0, spent: m.get(String(u._id))?.spent || 0 })) });
});
export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await User.findOne({ _id: req.params.id, role: 'customer' });
  if (!customer) throw new AppError('Customer not found', 404);
  const orders = await Order.find({ user: customer._id }).sort('-createdAt');
  res.json({ customer, orders, totalSpend: orders.filter((o) => !['Cancelled', 'Returned'].includes(o.status)).reduce((s, o) => s + o.total, 0) });
});
export const setBlocked = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate({ _id: req.params.id, role: 'customer' }, { isBlocked: req.body.isBlocked }, { new: true });
  if (!user) throw new AppError('Customer not found', 404);
  logActivity(req, user.isBlocked ? 'customer.block' : 'customer.unblock', 'User', user._id, { email: user.email });
  res.json({ user });
});

/* ---------- Coupons ---------- */
export const listCoupons = asyncHandler(async (_req, res) => {
  const coupons = await Coupon.find().sort('-createdAt').lean();
  const stats = await Order.aggregate([{ $match: { 'coupon.code': { $exists: true } } }, { $group: { _id: '$coupon.code', orders: { $sum: 1 }, discountGiven: { $sum: '$discount' }, revenue: { $sum: '$total' } } }]);
  const m = new Map(stats.map((s) => [s._id, s]));
  res.json({ coupons: coupons.map(({ usedBy, ...c }) => ({ ...c, uniqueCustomers: usedBy?.length || 0, stats: m.get(c.code) || { orders: 0, discountGiven: 0, revenue: 0 } })) });
});
export const saveCoupon = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  delete body.usedBy;
  delete body.usedCount;
  delete body.stats;
  const coupon = req.params.id ? await Coupon.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true }) : await Coupon.create(body);
  if (!coupon) throw new AppError('Coupon not found', 404);
  logActivity(req, req.params.id ? 'coupon.update' : 'coupon.create', 'Coupon', coupon._id, { code: coupon.code });
  res.status(req.params.id ? 200 : 201).json({ coupon });
});
export const deleteCoupon = asyncHandler(async (req, res) => {
  const c = await Coupon.findByIdAndDelete(req.params.id);
  logActivity(req, 'coupon.delete', 'Coupon', req.params.id, { code: c?.code });
  res.json({ ok: true });
});

/* ---------- Reviews ---------- */
export const listReviews = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.rating) filter.rating = +req.query.rating;
  if (req.query.status) filter.status = req.query.status;
  res.json({ reviews: await Review.find(filter).populate('user', 'name').populate('product', 'title slug images').sort('-createdAt') });
});
export const setReviewStatus = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!review) throw new AppError('Review not found', 404);
  await refreshRating(review.product);
  logActivity(req, 'review.status', 'Review', review._id, { status: review.status });
  res.json({ review });
});

/* ---------- Settings ---------- */
export const getSettings = asyncHandler(async (_req, res) => res.json({ settings: await Settings.current() }));
export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.current();
  const { store, shippingRates, emailNotifications, sameDay, ...rest } = req.body;
  if (store) {
    if (store.whatsapp !== undefined && String(store.whatsapp).trim()) {
      const wa = toWhatsapp(store.whatsapp);
      if (!wa) throw new AppError('WhatsApp must be a Pakistani mobile number, e.g. 03001234567', 422, [{ field: 'store.whatsapp', message: 'Enter a mobile number like 03001234567' }]);
      store.whatsapp = wa;
    }
    settings.store = { ...settings.store.toObject(), ...store };
  }
  if (sameDay) {
    const { riders, ...opts } = sameDay;
    for (const k of ['enabled', 'city', 'fee', 'cutoffHour']) if (opts[k] !== undefined) settings.set(`sameDay.${k}`, opts[k]);
    if (riders) settings.sameDay.riders = riders.map(({ name, phone, vehicle, isActive }) => ({ name, phone, vehicle, isActive }));
  }
  if (shippingRates) settings.shippingRates = shippingRates;
  if (emailNotifications) settings.emailNotifications = { ...settings.emailNotifications.toObject(), ...emailNotifications };
  for (const k of ['defaultShippingFee', 'freeShippingAbove', 'lowStockLevel', 'returnWindowDays']) if (rest[k] !== undefined) settings[k] = rest[k];
  await settings.save();
  logActivity(req, 'settings.update', 'Settings', settings._id, { fields: Object.keys(req.body) });
  res.json({ settings });
});

/* ---------- Activity ---------- */
export const activity = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.q) filter.action = new RegExp(`^${escapeRegex(req.query.q)}`, 'i');
  if (req.query.from || req.query.to) {
    const { from, to } = dateRange(req.query, 3650);
    filter.createdAt = { $gte: from, $lte: to };
  }
  res.json({ logs: await ActivityLog.find(filter).populate('admin', 'name').sort('-createdAt').limit(300) });
});

/* ---------- Media library ---------- */
export const listMedia = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.q) filter.$or = [{ alt: new RegExp(escapeRegex(req.query.q), 'i') }, { url: new RegExp(escapeRegex(req.query.q), 'i') }];
  if (req.query.folder) filter.folder = req.query.folder;
  res.json({ media: await Media.find(filter).sort('-createdAt').limit(500) });
});
export const uploadMedia = asyncHandler(async (req, res) => {
  if (!cloudinaryReady()) throw new AppError('Cloudinary is not configured on the server (CLOUDINARY_* env vars)', 400);
  if (!req.files?.length) throw new AppError('No images received', 400);
  const folder = String(req.body.folder || 'general').replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'general';
  const uploaded = await Promise.all(req.files.map((f) => toCloudinary(f.buffer, `fashionist/${folder}`)));
  const media = await Media.insertMany(uploaded.map((u, i) => ({ ...u, folder, alt: req.files[i].originalname.replace(/\.[^.]+$/, '') })));
  logActivity(req, 'media.upload', 'Media', null, { count: media.length });
  res.status(201).json({ media });
});
export const addMediaUrl = asyncHandler(async (req, res) => {
  const media = await Media.create({ url: req.body.url, alt: req.body.alt, folder: req.body.folder || 'general' });
  logActivity(req, 'media.add', 'Media', media._id);
  res.status(201).json({ media: [media] });
});
export const deleteMedia = asyncHandler(async (req, res) => {
  const m = await Media.findByIdAndDelete(req.params.id);
  if (!m) throw new AppError('Not found', 404);
  removeFromCloudinary(m.publicId);
  logActivity(req, 'media.delete', 'Media', m._id);
  res.json({ ok: true });
});
