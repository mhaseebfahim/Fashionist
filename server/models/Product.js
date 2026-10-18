import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  size: String,
  colour: String,
  stock: { type: Number, default: 0, min: 0 },
});

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    titleUr: String,
    slug: { type: String, required: true, unique: true },
    description: String,
    descriptionUr: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: Number,
    images: [String],
    attributes: { type: Map, of: String, default: {} },
    variants: [variantSchema],
    sizeGuide: String,
    tags: [String],
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    seo: { metaTitle: String, metaDescription: String },
  },
  { timestamps: true }
);

productSchema.index({ 'variants.sku': 1 }, { unique: true });
productSchema.index({ title: 'text', description: 'text', tags: 'text' });

export default mongoose.model('Product', productSchema);
