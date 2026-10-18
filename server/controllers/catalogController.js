import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Settings from '../models/Settings.js';
import { AppError, asyncHandler } from '../utils/AppError.js';

const SORTS = { newest: { createdAt: -1, _id: -1 }, priceAsc: { price: 1 }, priceDesc: { price: -1 }, popular: { soldCount: -1 }, rating: { rating: -1, numReviews: -1 } };
export const ATTR_FILTERS = ['fabric', 'pieces', 'dupatta', 'soldBy', 'fit', 'work', 'material', 'age'];
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

export const listProducts = asyncHandler(async (req, res) => {
  const { category, q, minPrice, maxPrice, size, colour, attr, inStock, featured, ids, sort = 'newest' } = req.query;
  const filter = { isActive: true };
  if (category) {
    const sub = await categorySubtree(String(category));
    if (!sub) return res.json({ products: [], meta: { total: 0, page: 1, pages: 0 } });
    filter.category = { $in: sub };
  }
  if (q) filter.$text = { $search: String(q).slice(0, 100) };
  if (minPrice || maxPrice) filter.price = { ...(minPrice && { $gte: +minPrice }), ...(maxPrice && { $lte: +maxPrice }) };
  const variant = {};
  if (size) variant.size = { $in: list(size) };
  if (colour) variant.colour = { $in: list(colour) };
  if (inStock === 'true') variant.stock = { $gt: 0 };
  if (Object.keys(variant).length) filter.variants = { $elemMatch: variant };
  if (attr && typeof attr === 'object') for (const [k, v] of Object.entries(attr)) if (ATTR_FILTERS.includes(k)) filter[`attributes.${k}`] = { $in: list(v) };
  if (featured === 'true') filter.isFeatured = true;
  if (ids) filter._id = { $in: list(ids).filter((x) => mongoose.isValidObjectId(x)) };

  const limit = Math.min(Math.max(+req.query.limit || 12, 1), 48);
  const page = Math.max(+req.query.page || 1, 1);
  const [products, total] = await Promise.all([
    Product.find(filter).sort(SORTS[sort] || SORTS.newest).skip((page - 1) * limit).limit(limit).populate('category', 'name nameUr slug'),
    Product.countDocuments(filter),
  ]);
  res.json({ products, meta: { total, page, pages: Math.ceil(total / limit), limit } });
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

export const publicSettings = asyncHandler(async (_req, res) => {
  const s = await Settings.current();
  res.json({ settings: { store: s.store, shippingRates: Object.fromEntries(s.shippingRates || []), defaultShippingFee: s.defaultShippingFee, freeShippingAbove: s.freeShippingAbove, returnWindowDays: s.returnWindowDays } });
});
