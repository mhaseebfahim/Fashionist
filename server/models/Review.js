import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;
const reviewSchema = new mongoose.Schema(
  {
    product: { type: ObjectId, ref: 'Product', required: true },
    user: { type: ObjectId, ref: 'User', required: true },
    order: { type: ObjectId, ref: 'Order', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, maxlength: 1000 },
    status: { type: String, enum: ['Approved', 'Hidden'], default: 'Approved' },
  },
  { timestamps: true }
);
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
