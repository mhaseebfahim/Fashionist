import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Cart from '../models/Cart.js';
import Settings from '../models/Settings.js';
import { AppError, asyncHandler } from '../utils/AppError.js';
import { MAX_QTY_PER_VARIANT, computeTotals, couponDiscount, couponError, deliveryFeeFor, sameDayFor } from '../utils/totals.js';
import { canTransition, isWithinReturnWindow, RESTOCK_STATUSES } from '../utils/orderStatus.js';
import { generateOrderNumber } from '../utils/orderNumber.js';
import { emails } from '../utils/email.js';

const restoreStock = (order, session) =>
  Promise.all(order.items.map((i) => Product.updateOne({ _id: i.product, 'variants.sku': i.sku }, { $inc: { 'variants.$.stock': i.qty, soldCount: -i.qty } }, { session })));

/**
 * Applies a status transition with every server rule. Used by admin actions and customer cancel.
 * Cancelled / Returned restore stock inside a transaction.
 */
export async function changeStatus(order, to, { by, note, courier, trackingNumber, rider } = {}) {
  if (!canTransition(order.status, to)) throw new AppError(`Cannot move order from ${order.status} to ${to}`, 400);
  if (to === 'Shipped' && order.deliveryMethod === 'same_day') {
    // Local same-day orders go out with one of the store's riders; their number doubles as the "tracking" contact.
    if (!rider?.name || !rider?.phone) throw new AppError('Choose a rider to send this same-day order', 400);
    order.rider = { name: rider.name, phone: rider.phone, vehicle: rider.vehicle || 'Bike' };
    order.courier = `${order.rider.vehicle} rider · ${rider.name}`;
    order.trackingNumber = rider.phone;
  } else if (to === 'Shipped') {
    if (!courier || !trackingNumber) throw new AppError('Courier and tracking number are required to ship', 400);
    order.courier = courier;
    order.trackingNumber = trackingNumber;
  }
  if (to === 'Delivered') {
    order.deliveredAt = new Date();
    order.paymentStatus = 'Paid';
  }
  order.status = to;
  order.statusHistory.push({ status: to, by, note });
  if (!RESTOCK_STATUSES.includes(to)) return order.save();

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await restoreStock(order, session);
      await order.save({ session });
    });
  } finally {
    await session.endSession();
  }
  return order;
}

export const createOrder = asyncHandler(async (req, res) => {
  const { items = [], shippingAddress, couponCode, deliveryMethod = 'standard' } = req.body;
  // Merge duplicate SKUs; client prices are ignored entirely.
  const qtyBySku = new Map();
  for (const i of items) qtyBySku.set(i.sku, (qtyBySku.get(i.sku) || 0) + Number(i.qty));
  for (const [sku, qty] of qtyBySku) if (qty > MAX_QTY_PER_VARIANT) throw new AppError(`Max ${MAX_QTY_PER_VARIANT} units per item (${sku})`, 400);

  const settings = await Settings.current();
  const sameDay = sameDayFor(shippingAddress.city, settings);
  if (deliveryMethod === 'same_day' && !sameDay.available)
    throw new AppError(settings.sameDay?.enabled ? `Same-day delivery is only available in ${settings.sameDay.city}` : 'Same-day delivery is currently unavailable', 400);
  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      const lines = [];
      for (const [sku, qty] of qtyBySku) {
        const product = await Product.findOneAndUpdate(
          { isActive: true, variants: { $elemMatch: { sku, stock: { $gte: qty } } } },
          { $inc: { 'variants.$.stock': -qty, soldCount: qty } },
          { new: true, session }
        );
        if (!product) throw new AppError(`Out of stock: ${sku}`, 409);
        const v = product.variants.find((x) => x.sku === sku);
        lines.push({ product: product._id, title: product.title, image: product.images[0], sku, size: v.size, colour: v.colour, price: product.price, qty });
      }

      let coupon = null;
      if (couponCode) {
        coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase() }).session(session);
        const err = couponError(coupon, req.user._id, lines.reduce((s, l) => s + l.price * l.qty, 0));
        if (err) throw new AppError(err, 400);
        const r = await Coupon.updateOne(
          { _id: coupon._id, usedBy: { $ne: req.user._id }, ...(coupon.usageLimit && { usedCount: { $lt: coupon.usageLimit } }) },
          { $inc: { usedCount: 1 }, $push: { usedBy: req.user._id } },
          { session }
        );
        if (!r.modifiedCount) throw new AppError('Coupon can no longer be used', 400);
      }
      const totals = computeTotals({ lines, coupon, city: shippingAddress.city, settings, deliveryMethod });
      [order] = await Order.create(
        [
          {
            orderNumber: generateOrderNumber(),
            user: req.user._id,
            items: lines,
            shippingAddress: (({ name, phone, city, area, street }) => ({ name, phone, city, area, street }))(shippingAddress),
            ...totals,
            deliveryMethod,
            sameDayEta: deliveryMethod === 'same_day' ? sameDay.eta : undefined,
            coupon: coupon ? { code: coupon.code, amount: totals.discount } : undefined,
            statusHistory: [{ status: 'Pending', by: req.user._id, note: deliveryMethod === 'same_day' ? `Same-day delivery (${sameDay.eta})` : undefined }],
          },
        ],
        { session }
      );
      await Cart.updateOne({ user: req.user._id }, { items: [] }, { session });
    });
  } finally {
    await session.endSession();
  }
  emails.orderPlaced(order, req.user, settings);
  res.status(201).json({ order });
});

export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal, city, deliveryMethod } = req.body;
  const coupon = await Coupon.findOne({ code: String(code).toUpperCase() });
  const err = couponError(coupon, req.user._id, +subtotal);
  if (err) throw new AppError(err, 400);
  const discount = couponDiscount(coupon, +subtotal);
  const settings = await Settings.current();
  const freeShipping = coupon.type === 'freeship';
  res.json({ code: coupon.code, type: coupon.type, discount, freeShipping, shippingFee: freeShipping ? 0 : deliveryFeeFor(city, settings, +subtotal - discount, sameDayFor(city, settings).available ? deliveryMethod : 'standard') });
});

export const myOrders = asyncHandler(async (req, res) => {
  res.json({ orders: await Order.find({ user: req.user._id }).sort('-createdAt') });
});

// Customers can only ever load their own orders.
const findMine = async (req) => {
  const q = mongoose.isValidObjectId(req.params.id) ? { _id: req.params.id } : { orderNumber: String(req.params.id) };
  const order = await Order.findOne({ ...q, user: req.user._id });
  if (!order) throw new AppError('Order not found', 404);
  return order;
};

export const getMyOrder = asyncHandler(async (req, res) => res.json({ order: await findMine(req) }));

export const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await findMine(req);
  if (order.status !== 'Pending') throw new AppError('Only pending orders can be cancelled', 400);
  res.json({ order: await changeStatus(order, 'Cancelled', { by: req.user._id, note: 'Cancelled by customer' }) });
});

export const requestReturn = asyncHandler(async (req, res) => {
  const order = await findMine(req);
  const { returnWindowDays } = await Settings.current();
  if (order.status !== 'Delivered') throw new AppError('Only delivered orders can be returned', 400);
  if (!isWithinReturnWindow(order.deliveredAt, returnWindowDays)) throw new AppError(`Returns are accepted within ${returnWindowDays} days of delivery`, 400);
  if (order.returnRequest?.status) throw new AppError('A return request already exists for this order', 400);
  order.returnRequest = { type: req.body.type, reason: req.body.reason, status: 'Requested', requestedAt: new Date() };
  await order.save();
  res.json({ order });
});
