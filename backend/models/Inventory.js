const mongoose = require('mongoose');
const inventorySchema = new mongoose.Schema({
  sku: { type: String, required: true, uppercase: true, trim: true },
  warehouseId: { type: String, required: true, default: 'PRIMARY' },
  onHand: { type: Number, default: 0, min: 0 }, reserved: { type: Number, default: 0, min: 0 },
  reorderLevel: { type: Number, default: 3 }, location: String,
  version: { type: Number, default: 0 }, lastErpSyncAt: Date,
}, { timestamps: true, optimisticConcurrency: true });
inventorySchema.index({ sku: 1, warehouseId: 1 }, { unique: true });
inventorySchema.virtual('available').get(function () { return Math.max(0, this.onHand - this.reserved); });
inventorySchema.set('toJSON', { virtuals: true });
module.exports = mongoose.model('Inventory', inventorySchema);
