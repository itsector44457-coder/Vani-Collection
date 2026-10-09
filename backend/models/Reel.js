const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  videoUrl: { type: String, required: true, trim: true },
  thumbnailUrl: { type: String, trim: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  position: { type: Number, default: 0, index: true },
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, optimisticConcurrency: true });

// Index for efficient sorting by position
reelSchema.index({ position: 1, isActive: 1 });

module.exports = mongoose.model('Reel', reelSchema);