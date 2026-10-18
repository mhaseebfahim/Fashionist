import { Parser } from 'json2csv';
import Order from '../models/Order.js';
import Settings from '../models/Settings.js';
import { AppError, asyncHandler } from '../utils/AppError.js';
import { dateRange, escapeRegex, logActivity } from '../utils/helpers.js';
import { ORDER_STATUSES } from '../utils/orderStatus.js';
import { emails } from '../utils/email.js';
import { changeStatus } from './orderController.js';

function orderFilter(q) {
  const filter = {};
  if (q.status && ORDER_STATUSES.includes(q.status)) filter.status = q.status;
  if (q.city) filter['shippingAddress.city'] = q.city;
  if (q.q) {
    const re = new RegExp(escapeRegex(q.q), 'i');
    filter.$or = [{ orderNumber: re }, { 'shippingAddress.phone': re }, { 'shippingAddress.name': re }];
  }
  if (q.from || q.to) {
    const { from, to } = dateRange(q, 3650);
    filter.createdAt = { $gte: from, $lte: to };
  }
  return filter;
}

export const listOrders = asyncHandler(async (req, res) => {
  const filter = orderFilter(req.query);
  const { status, ...withoutStatus } = filter;
  const limit = Math.min(+req.query.limit || 50, 200);
  const page = Math.max(+req.query.page || 1, 1);
  const [orders, total, counts] = await Promise.all([
    Order.find(filter).populate('user', 'name email').sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
    Order.aggregate([{ $match: withoutStatus }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  const c = Object.fromEntries(counts.map((x) => [x._id, x.n]));
  res.json({ orders, counts: { All: counts.reduce((s, x) => s + x.n, 0), ...c }, meta: { total, page, pages: Math.ceil(total / limit) } });
});

export const exportOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find(orderFilter(req.query)).sort('-createdAt').lean();
  const fields = ['orderNumber', 'createdAt', 'status', 'paymentStatus', 'shippingAddress.name', 'shippingAddress.phone', 'shippingAddress.city', 'subtotal', 'discount', 'shippingFee', 'total', 'courier', 'trackingNumber'];
  res.header('Content-Type', 'text/csv').attachment('fashionist-orders.csv').send(new Parser({ fields }).parse(orders));
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!order) throw new AppError('Order not found', 404);
  res.json({ order });
});

export const invoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!order) throw new AppError('Order not found', 404);
  res.json({ order, store: (await Settings.current()).store });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) throw new AppError('Order not found', 404);
  const from = order.status;
  await changeStatus(order, req.body.status, { ...req.body, by: req.user._id });
  logActivity(req, 'order.status', 'Order', order._id, { orderNumber: order.orderNumber, from, to: order.status });
  emails.statusChanged(order, order.user, await Settings.current());
  res.json({ order });
});

export const bulkStatus = asyncHandler(async (req, res) => {
  const { ids, status, note } = req.body;
  if (status === 'Shipped') throw new AppError('Shipping needs a courier and tracking number per order — ship orders one by one', 400);
  const results = [];
  for (const id of ids) {
    const order = await Order.findById(id);
    if (!order) {
      results.push({ id, ok: false, message: 'Not found' });
      continue;
    }
    try {
      const from = order.status;
      await changeStatus(order, status, { by: req.user._id, note });
      results.push({ id, orderNumber: order.orderNumber, ok: true });
      logActivity(req, 'order.status', 'Order', order._id, { orderNumber: order.orderNumber, from, to: status, bulk: true });
    } catch (e) {
      results.push({ id, orderNumber: order.orderNumber, ok: false, message: e.message });
    }
  }
  res.json({ results, updated: results.filter((r) => r.ok).length });
});

export const listReturns = asyncHandler(async (req, res) => {
  const filter = { 'returnRequest.status': req.query.status || { $exists: true } };
  res.json({ orders: await Order.find(filter).populate('user', 'name email').sort('-returnRequest.requestedAt') });
});

export const decideReturn = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order || order.returnRequest?.status !== 'Requested') throw new AppError('No pending return request for this order', 400);
  const { decision, note } = req.body;
  if (decision === 'Approved') await changeStatus(order, 'Returned', { by: req.user._id, note: note || `${order.returnRequest.type} approved` });
  order.returnRequest.status = decision;
  order.returnRequest.note = note;
  order.returnRequest.decidedAt = new Date();
  await order.save();
  logActivity(req, 'order.return', 'Order', order._id, { orderNumber: order.orderNumber, decision, note });
  res.json({ order });
});
