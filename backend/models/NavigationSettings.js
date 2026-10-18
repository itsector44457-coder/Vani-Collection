const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true, maxlength: 60 },
  href: { type: String, required: true, trim: true, maxlength: 300 },
  isActive: { type: Boolean, default: true },
}, { _id: false });

const navigationSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'storefront', unique: true },
  theme: { type: String, enum: ['atelier', 'midnight', 'forest', 'custom'], default: 'atelier' },
  brandName: { type: String, default: 'Vani Collection', trim: true, maxlength: 80 },
  brandTagline: { type: String, default: 'Speciality in Fancy Kurties & Party Wear Dresses', trim: true, maxlength: 100 },
  logoUrl: { type: String, default: '', trim: true, maxlength: 500 },
  collectionLabel: { type: String, default: 'Collections', trim: true, maxlength: 60 },
  announcements: { type: [String], default: [] },
  links: { type: [linkSchema], default: [] },
  colors: {
    announcementBg: { type: String, default: '#1c1917' },
    announcementText: { type: String, default: '#dfc28c' },
    announcementBorder: { type: String, default: '#2d2520' },
    headerBg: { type: String, default: '#faf7f2' },
    headerText: { type: String, default: '#292524' },
    accent: { type: String, default: '#881337' },
    mobileDrawerBg: { type: String, default: '#faf7f2' },
    mobileBottomBg: { type: String, default: '#faf7f2' },
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('NavigationSettings', navigationSettingsSchema);
