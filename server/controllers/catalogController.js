import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Settings from '../models/Settings.js';
import { AppError, asyncHandler } from '../utils/AppError.js';
import { parseQuery, scoreProduct, searchFields, termRegex } from '../utils/search.js';

const SORTS = { newest: { createdAt: -1, _id: -1 }, priceAsc: { price: 1 }, priceDesc: { price: -1 }, popular: { soldCount: -1 }, rating: { rating: -1, numReviews: -1 } };
export const ATTR_FILTERS = ['fabric', 'fit', 'sleeve', 'occasion', 'material'];
const list = (v) => String(v).split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);

/** Category id plus every descendant id. */
export async function categorySubtree(slug) {
  const root = await Category.findOne({ slug, isActive: true });
  if (!root) return null;
  const all = await Category.find().select('_id parent').lean();
  const ids = [root._id];
  for (let i = 0; i < ids.length; i++) all.filter((c) => String(c.parent) === String(ids[i])).forEach((c) => ids.push(c._id));
  return ids;
}

export const listCategories = asyncHandler(async (_req, res) => {
  res.json({ categories: await Category.find({ isActive: true }).sort('sortOrder name') });
});

/** Category docs with each one's own + parent names, so "jeans" finds products filed under Bottomwear › Jeans. */
async function categoryIndex() {
  const cats = await Category.find().select('name nameUr slug parent').lean();
  const byId = new Map(cats.map((c) => [String(c._id), c]));
  const names = (c) => [c.name, c.nameUr, c.slug.replace(/-/g, ' ')].filter(Boolean);
  return new Map(cats.map((c) => [String(c._id), [...names(c), ...(c.parent && byId.get(String(c.parent)) ? names(byId.get(String(c.parent))) : [])]]));
}

/** Mongo filter shared by the product list and its facets (everything except search text). */
async function productFilter(query, { skip = [] } = {}) {
  const { category, minPrice, maxPrice, size, colour, attr, inStock, featured, ids, tag, sale } = query;
  const filter = { isActive: true };
  if (category) {
    const sub = await categorySubtree(String(category));
    if (!sub) return null;
    filter.category = { $in: sub };
  }
  if (minPrice || maxPrice) filter.price = { ...(minPrice && { $gte: +minPrice }), ...(maxPrice && { $lte: +maxPrice }) };
  const variant = {};
  if (size && !skip.includes('size')) variant.size = { $in: list(size) };
  if (colour && !skip.includes('colour')) variant.colour = { $in: list(colour) };
  if (inStock === 'true') variant.stock = { $gt: 0 };
  if (Object.keys(variant).length) filter.variants = { $elemMatch: variant };
  if (attr && typeof attr === 'object') for (const [k, v] of Object.entries(attr)) if (ATTR_FILTERS.includes(k) && !skip.includes(k)) filter[`attributes.${k}`] = { $in: list(v) };
  if (featured === 'true') filter.isFeatured = true;
  if (tag) filter.tags = { $in: list(tag).map((t) => t.toLowerCase()) };
  if (sale === 'true') filter.$expr = { $gt: ['$compareAtPrice', '$price'] };
  if (ids) filter._id = { $in: list(ids).filter((x) => mongoose.isValidObjectId(x)) };
  return filter;
}

/**
 * Text search: every term must match the title, category, tags, attributes, colours or description.
 * Mongo narrows the candidates with regexes, then each is scored (title hits first) in memory —
 * fine for a boutique catalogue of a few thousand products.
 */
async function searchProducts(filter, q) {
  const terms = parseQuery(q);
  if (!terms.length) return null;
  const cats = await categoryIndex();
  const and = terms.map((alts) => {
    const re = termRegex(alts);
    const catIds = [...cats].filter(([, names]) => re.test(names.join(' '))).map(([id]) => new mongoose.Types.ObjectId(id));
    return { $or: [{ title: re }, { titleUr: re }, { tags: re }, { description: re }, { 'variants.colour': re }, ...ATTR_FILTERS.map((k) => ({ [`attributes.${k}`]: re })), ...(catIds.length ? [{ category: { $in: catIds } }] : [])] };
  });
  const found = await Product.find({ ...filter, $and: [...(filter.$and || []), ...and] }).limit(500).populate('category', 'name nameUr slug');
  return found
    .map((p) => ({ p, score: scoreProduct(searchFields(p, cats.get(String(p.category?._id)) || []), terms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.soldCount - a.p.soldCount)
    .map((x) => x.p);
}

const SORTERS = { newest: (a, b) => b.createdAt - a.createdAt, priceAsc: (a, b) => a.price - b.price, priceDesc: (a, b) => b.price - a.price, popular: (a, b) => b.soldCount - a.soldCount, rating: (a, b) => b.rating - a.rating || b.numReviews - a.numReviews };

export const listProducts = asyncHandler(async (req, res) => {
  const { q, sort } = req.query;
  const limit = Math.min(Math.max(+req.query.limit || 12, 1), 48);
  const page = Math.max(+req.query.page || 1, 1);
  const empty = { products: [], meta: { total: 0, page, pages: 0, limit } };
  const filter = await productFilter(req.query);
  if (!filter) return res.json(empty);

  if (q && String(q).trim()) {
    const hits = await searchProducts(filter, q);
    if (hits) {
      // Relevance by default; an explicit sort choice from the shopper wins.
      if (SORTERS[sort]) hits.sort(SORTERS[sort]);
      return res.json({ products: hits.slice((page - 1) * limit, page * limit), meta: { total: hits.length, page, pages: Math.ceil(hits.length / limit), limit } });
    }
  }
  const [products, total] = await Promise.all([
    Product.find(filter).sort(SORTS[sort] || SORTS.newest).skip((page - 1) * limit).limit(limit).populate('category', 'name nameUr slug'),
    Product.countDocuments(filter),
  ]);
  res.json({ products, meta: { total, page, pages: Math.ceil(total / limit), limit } });
});

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
export const sortSizes = (sizes) =>
  [...sizes].sort((a, b) => {
    const [ia, ib] = [SIZE_ORDER.indexOf(a), SIZE_ORDER.indexOf(b)];
    if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    const [na, nb] = [parseFloat(a), parseFloat(b)];
    return Number.isNaN(na) || Number.isNaN(nb) ? String(a).localeCompare(b) : na - nb;
  });

/** Filter options (with counts) for the current category / search, so the shop never offers a dead-end choice. */
export const productFacets = asyncHandler(async (req, res) => {
  const filter = await productFilter({ category: req.query.category, tag: req.query.tag, sale: req.query.sale });
  const none = { sizes: [], colours: [], attributes: {}, price: { min: 0, max: 0 }, total: 0 };
  if (!filter) return res.json({ facets: none });
  const ps = req.query.q && String(req.query.q).trim() ? (await searchProducts(filter, req.query.q)) ?? (await Product.find(filter).lean()) : await Product.find(filter).select('price variants attributes').lean();
  const count = (vals) => Object.entries(vals.reduce((m, v) => (v ? ((m[v] = (m[v] || 0) + 1), m) : m), {})).map(([value, n]) => ({ value, count: n }));
  const attrOf = (p) => (p.attributes instanceof Map ? Object.fromEntries(p.attributes) : p.attributes || {});
  const sizes = count(ps.flatMap((p) => [...new Set(p.variants.map((v) => v.size))]));
  const facets = {
    total: ps.length,
    sizes: sortSizes(sizes.map((s) => s.value)).map((v) => sizes.find((s) => s.value === v)),
    colours: count(ps.flatMap((p) => [...new Set(p.variants.map((v) => v.colour))])).sort((a, b) => b.count - a.count),
    attributes: Object.fromEntries(ATTR_FILTERS.map((k) => [k, count(ps.map((p) => attrOf(p)[k])).sort((a, b) => b.count - a.count)]).filter(([, v]) => v.length > 1)),
    price: { min: ps.length ? Math.min(...ps.map((p) => p.price)) : 0, max: ps.length ? Math.max(...ps.map((p) => p.price)) : 0 },
  };
  res.json({ facets });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true }).populate('category', 'name nameUr slug parent');
  if (!product) throw new AppError('Product not found', 404);
  const related = await Product.find({ category: product.category._id, _id: { $ne: product._id }, isActive: true }).limit(8).populate('category', 'name nameUr slug');
  res.json({ product, related });
});

export const productReviews = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid id', 400);
  const reviews = await Review.find({ product: req.params.id, status: 'Approved' }).populate('user', 'name').sort('-createdAt').limit(50);
  const dist = [5, 4, 3, 2, 1].map((n) => ({ rating: n, count: reviews.filter((r) => r.rating === n).length }));
  const avg = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;
  res.json({ reviews, summary: { avg, count: reviews.length, dist } });
});

export async function refreshRating(productId) {
  const [s] = await Review.aggregate([{ $match: { product: new mongoose.Types.ObjectId(String(productId)), status: 'Approved' } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  await Product.updateOne({ _id: productId }, { rating: Math.round((s?.avg || 0) * 10) / 10, numReviews: s?.n || 0 });
}

export const createReview = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  if (!mongoose.isValidObjectId(productId)) throw new AppError('Invalid product', 400);
  const order = await Order.findOne({ user: req.user._id, status: { $in: ['Delivered', 'Returned'] }, 'items.product': productId });
  if (!order) throw new AppError('You can review a product only after it is delivered', 403);
  if (await Review.exists({ product: productId, user: req.user._id })) throw new AppError('You have already reviewed this product', 409);
  const review = await Review.create({ product: productId, user: req.user._id, order: order._id, rating: req.body.rating, comment: req.body.comment });
  await refreshRating(productId);
  res.status(201).json({ review });
});

// Riders' names and numbers are internal — the storefront only learns the offer itself.
const publicSameDay = ({ enabled, city, fee, cutoffHour } = {}) => ({ enabled: !!enabled, city, fee, cutoffHour });

export const publicSettings = asyncHandler(async (_req, res) => {
  const s = await Settings.current();
  res.json({ settings: { store: s.store, shippingRates: Object.fromEntries(s.shippingRates || []), defaultShippingFee: s.defaultShippingFee, freeShippingAbove: s.freeShippingAbove, returnWindowDays: s.returnWindowDays, sameDay: publicSameDay(s.sameDay) } });
});

/** XML sitemap of every live product, category and CMS page (served at fashionist.store/sitemap.xml via Vercel rewrite). */
export const sitemap = asyncHandler(async (_req, res) => {
  const { env } = await import('../config/env.js');
  const { Page } = await import('../models/Cms.js');
  const [products, categories, pages] = await Promise.all([
    Product.find({ isActive: true }).select('slug updatedAt').lean(),
    Category.find({ isActive: true }).select('slug updatedAt').lean(),
    Page.find({ isPublished: true }).select('slug updatedAt').lean(),
  ]);
  const url = (path, d, p = '0.7') => `<url><loc>${env.siteUrl}${path}</loc>${d ? `<lastmod>${new Date(d).toISOString().slice(0, 10)}</lastmod>` : ''}<priority>${p}</priority></url>`;
  const body = [url('/', null, '1.0'), url('/shop', null, '0.9'), ...categories.map((c) => url(`/shop/${c.slug}`, c.updatedAt, '0.8')), ...products.map((p) => url(`/product/${p.slug}`, p.updatedAt)), ...pages.map((p) => url(`/pages/${p.slug}`, p.updatedAt, '0.4'))].join('');
  res.set('Cache-Control', 'public, max-age=3600').type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`);
});
