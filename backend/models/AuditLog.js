const mongoose = require('mongoose');
const schema = new mongoose.Schema({ actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, actorEmail: String, action: { type: String, required: true, index: true }, entity: String, entityId: String, before: mongoose.Schema.Types.Mixed, after: mongoose.Schema.Types.Mixed, ip: String, userAgent: String, requestId: String }, { timestamps: true });
schema.index({ createdAt: -1 });
module.exports = mongoose.model('AuditLog', schema);
