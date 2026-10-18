import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    items: [{ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, sku: String, qty: { type: Number, min: 1, max: 10 } }],
  },
  { timestamps: true }
);

export default mongoose.model('Cart', cartSchema);
