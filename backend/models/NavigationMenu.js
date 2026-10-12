const mongoose = require('mongoose');

const navigationMenuSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, enum: ['lookbook', 'shop-by-price'] },
  label: { type: String, required: true, trim: true, maxlength: 60 },
  position: { type: Number, default: 0 },
  columns: [{
    title: { type: String, required: true, trim: true, maxlength: 60 },
    items: [{
      label: { type: String, required: true, trim: true, maxlength: 80 },
      href: { type: String, trim: true, maxlength: 300 },
      categorySlug: { type: String, trim: true, lowercase: true },
    }],
  }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('NavigationMenu', navigationMenuSchema);
