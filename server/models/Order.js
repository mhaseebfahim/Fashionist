import mongoose from 'mongoose';
import { ORDER_STATUSES } from '../utils/orderStatus.js';
import { DELIVERY_METHODS, RIDER_VEHICLES } from '../utils/totals.js';

const { ObjectId } = mongoose.Schema.Types;

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: ObjectId, ref: 'User', required: true },
    items: [
      {
        product: { type: ObjectId, ref: 'Product' },
        title: String,
        image: String,
        sku: String,
        size: String,
        colour: String,
        price: Number,
        qty: Number,
      },
    ],
    shippingAddress: { name: String, phone: String, city: String, area: String, street: String },
    subtotal: Number,
    discount: { type: Number, default: 0 },
    coupon: { code: String, amount: Number },
    shippingFee: Number,
    total: Number,
    paymentMethod: { type: String, enum: ['COD'], default: 'COD' },
    paymentStatus: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
    status: { type: String, enum: ORDER_STATUSES, default: 'Pending' },
    statusHistory: [{ status: String, at: { type: Date, default: Date.now }, by: { type: ObjectId, ref: 'User' }, note: String }],
    deliveryMethod: { type: String, enum: DELIVERY_METHODS, default: 'standard' },
    sameDayEta: { type: String, enum: ['today', 'tomorrow'] }, // same-day only: decided by the cut-off when placed
    rider: { name: String, phone: String, vehicle: { type: String, enum: RIDER_VEHICLES } },
    courier: String,
    trackingNumber: String,
    deliveredAt: Date,
    returnRequest: {
      type: { type: String, enum: ['return', 'exchange'] },
      reason: String,
      status: { type: String, enum: ['Requested', 'Approved', 'Rejected'] },
      requestedAt: Date,
      note: String,
      decidedAt: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
