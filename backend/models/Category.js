const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  description: { type: String, trim: true, maxlength: 500 },
  /** Long-form buying-guide copy rendered on the public category landing page. */
  guideContent: { type: String, trim: true, maxlength: 12000, default: '' },
  /** Per-category SERP copy; empty fields fall back to generated landing-page metadata. */
  seo: {
    title: { type: String, trim: true, maxlength: 120, default: '' },
    description: { type: String, trim: true, maxlength: 320, default: '' },
  },
  /** Visible landing-page FAQs. The storefront also marks these up as FAQPage when present. */
  faqs: {
    type: [{
      _id: false,
      question: { type: String, trim: true, maxlength: 300 },
      answer: { type: String, trim: true, maxlength: 2000 },
    }],
    default: [],
  },
  bannerImage: { type: String, trim: true, maxlength: 2000, default: '' },
  navigationGroup: { type: String, trim: true, maxlength: 60, default: 'Collections' },
  position: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

categorySchema.index({ isActive: 1, position: 1, name: 1 });
module.exports = mongoose.model('Category', categorySchema);
