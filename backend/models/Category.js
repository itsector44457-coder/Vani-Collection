const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  description: { type: String, trim: true, maxlength: 500 },
  navigationGroup: { type: String, trim: true, maxlength: 60, default: 'Collections' },
  position: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

categorySchema.index({ isActive: 1, position: 1, name: 1 });
module.exports = mongoose.model('Category', categorySchema);
