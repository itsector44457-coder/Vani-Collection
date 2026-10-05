const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true, uppercase: true, trim: true },
  barcode: { type: String, trim: true }, size: String, color: String,
  mrp: { type: Number, required: true, min: 0 }, price: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, min: 0, select: false }, weightGrams: { type: Number, default: 500 },
  active: { type: Boolean, default: true },
}, { _id: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, index: true },
  description: String, shortDescription: String,
  category: { type: String, required: true, index: true }, subcategory: String,
  brand: { type: String, default: 'Vani Collection' }, fabric: String, craft: String,
  hsnCode: String, gstRate: { type: Number, default: 5 },
  images: [{ url: String, alt: String, position: Number }], videos: [{ url: String, kind: String }],
  variants: { type: [variantSchema], validate: [(v) => v.length > 0, 'At least one variant is required'] },
  tags: [String], badges: [String],
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft', index: true },
  featured: { type: Boolean, default: false }, seo: { title: String, description: String },
  erpProductId: { type: String, sparse: true, index: true }, erpUpdatedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, optimisticConcurrency: true });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ 'variants.sku': 1 }, { unique: true });
module.exports = mongoose.model('Product', productSchema);
