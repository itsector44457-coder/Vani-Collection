const mongoose = require('mongoose');

/**
 * A shoppable short-form video (the `/reels` feed on the storefront).
 *
 * Videos live in Cloudinary; only the delivered URL plus the public_id are stored here so the
 * asset can be destroyed when the reel is deleted.
 */
const reelSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  caption: { type: String, trim: true, maxlength: 500 },
  /** Short label shown as a pill over the video, e.g. "Bagru Handblock". */
  tag: { type: String, trim: true, maxlength: 60 },
  videoUrl: { type: String, required: true, trim: true },
  videoPublicId: { type: String, trim: true },
  posterUrl: { type: String, trim: true },
  posterPublicId: { type: String, trim: true },
  provider: { type: String, enum: ['cloudinary', 'external'], default: 'cloudinary' },
  // Cloudinary metadata captured at upload time — lets the feed reserve the right aspect ratio.
  durationSec: { type: Number, min: 0 },
  width: { type: Number, min: 0 },
  height: { type: Number, min: 0 },
  bytes: { type: Number, min: 0 },
  format: { type: String, trim: true, maxlength: 20 },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
  position: { type: Number, default: 0, index: true },
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  // Counters are denormalised so the public feed never has to aggregate.
  likes: { type: Number, default: 0, min: 0 },
  views: { type: Number, default: 0, min: 0 },
  shares: { type: Number, default: 0, min: 0 },
  cartAdds: { type: Number, default: 0, min: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

reelSchema.index({ status: 1, position: 1, createdAt: -1 });

/**
 * One like per person. `identity` is `u:<userId>` for signed-in shoppers and `a:<browserId>` for
 * guests, so liking is idempotent and the counter cannot be inflated by refreshing.
 */
const reelLikeSchema = new mongoose.Schema({
  reel: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', required: true },
  identity: { type: String, required: true, maxlength: 80 },
  createdAt: { type: Date, default: Date.now },
});
reelLikeSchema.index({ reel: 1, identity: 1 }, { unique: true });

/** View deduplication window — a repeat view inside 24h does not count twice. */
const VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;
const reelViewSchema = new mongoose.Schema({
  reel: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', required: true },
  identity: { type: String, required: true, maxlength: 80 },
  expiresAt: { type: Date, default: () => new Date(Date.now() + VIEW_WINDOW_MS) },
});
reelViewSchema.index({ reel: 1, identity: 1 }, { unique: true });
reelViewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = {
  Reel: mongoose.model('Reel', reelSchema),
  ReelLike: mongoose.model('ReelLike', reelLikeSchema),
  ReelView: mongoose.model('ReelView', reelViewSchema),
};
