const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  kind: { type: String, enum: ['page', 'section', 'banner', 'faq', 'policy', 'testimonial', 'lookbook'], required: true },
  title: String, subtitle: String, body: String, blocks: mongoose.Schema.Types.Mixed,
  media: [{ url: String, alt: String, kind: String }], ctaLabel: String, ctaHref: String,
  position: { type: Number, default: 0 }, locale: { type: String, default: 'en-IN' },
  status: { type: String, enum: ['draft', 'published'], default: 'published', index: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
module.exports = mongoose.model('Content', contentSchema);
