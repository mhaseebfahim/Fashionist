import { Parser } from 'json2csv';
import Order from '../models/Order.js';
import { asyncHandler } from '../utils/AppError.js';
import { dateRange } from '../utils/helpers.js';

async function buildReport(query) {
  const { from, to } = dateRange(query, 30);
  const match = { createdAt: { $gte: from, $lte: to }, status: { $nin: ['Cancelled', 'Returned'] } };
  const [byDay, byCategory, byProduct, [totals]] = await Promise.all([
    Order.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } }]),
    Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'p' } },
      { $lookup: { from: 'categories', localField: 'p.category', foreignField: '_id', as: 'c' } },
      { $group: { _id: { $ifNull: [{ $first: '$c.name' }, 'Uncategorised'] }, qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
      { $sort: { revenue: -1 } },
      { $project: { _id: 0, category: '$_id', qty: 1, revenue: 1 } },
    ]),
    Order.aggregate([{ $match: match }, { $unwind: '$items' }, { $group: { _id: '$items.title', qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } }, { $sort: { revenue: -1 } }, { $limit: 50 }, { $project: { _id: 0, product: '$_id', qty: 1, revenue: 1 } }]),
    Order.aggregate([{ $match: match }, { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 }, discount: { $sum: '$discount' }, shipping: { $sum: '$shippingFee' }, units: { $sum: { $sum: '$items.qty' } } } }]),
  ]);
  return { from, to, byDay, byCategory, byProduct, totals: totals ? { revenue: totals.revenue, orders: totals.orders, discount: totals.discount, shipping: totals.shipping, units: totals.units } : { revenue: 0, orders: 0, discount: 0, shipping: 0, units: 0 } };
}

export const reports = asyncHandler(async (req, res) => res.json(await buildReport(req.query)));

export const exportReport = asyncHandler(async (req, res) => {
  const r = await buildReport(req.query);
  const type = ['day', 'category', 'product'].includes(req.query.type) ? req.query.type : 'day';
  const rows = { day: r.byDay, category: r.byCategory, product: r.byProduct }[type];
  const fields = { day: ['date', 'orders', 'revenue'], category: ['category', 'qty', 'revenue'], product: ['product', 'qty', 'revenue'] }[type];
  res.header('Content-Type', 'text/csv').attachment(`fashionist-sales-by-${type}.csv`).send(new Parser({ fields }).parse(rows));
});
