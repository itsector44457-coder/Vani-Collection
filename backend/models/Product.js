const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  sizes: [{ type: String }], // Example: ['M', 'L', 'XL', 'XXL']
  images: [{ type: String }], // Photos from Cloudinary
  boomerangVideo: { type: String }, // Reels/Boomerang Video URL from Cloudinary
  inStock: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);