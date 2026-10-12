const mongoose = require('mongoose');

const contentRevisionSchema = new mongoose.Schema({
  contentKey: { type: String, required: true, index: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changes: [{
    field: { type: String, required: true },
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
  }],
}, { timestamps: true });

contentRevisionSchema.index({ contentKey: 1, createdAt: -1 });

module.exports = mongoose.model('ContentRevision', contentRevisionSchema);
