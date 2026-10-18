import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import { asyncHandler } from '../utils/AppError.js';
import { MAX_QTY_PER_VARIANT } from '../utils/totals.js';

export const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  res.json({ items: cart?.items || [] });
});

/** Replaces the saved cart with the client's cart (client keeps the cart for guests). */
export const saveCart = asyncHandler(async (req, res) => {
  const items = (req.body.items || [])
    .filter((i) => i.product && i.sku && i.qty > 0)
    .map((i) => ({ product: i.product, sku: i.sku, qty: Math.min(i.qty, MAX_QTY_PER_VARIANT) }));
  const cart = await Cart.findOneAndUpdate({ user: req.user._id }, { items }, { upsert: true, new: true });
  res.json({ items: cart.items });
});

export const getWishlist = asyncHandler(async (req, res) => {
  const w = await Wishlist.findOne({ user: req.user._id }).populate('products');
  res.json({ products: w?.products || [] });
});

export const toggleWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const w = (await Wishlist.findOne({ user: req.user._id })) || new Wishlist({ user: req.user._id, products: [] });
  const i = w.products.findIndex((p) => String(p) === productId);
  i >= 0 ? w.products.splice(i, 1) : w.products.push(productId);
  await w.save();
  res.json({ products: w.products, added: i < 0 });
});
