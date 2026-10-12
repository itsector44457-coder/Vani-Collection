const mongoose = require('mongoose');

const categorySetupSchema = new mongoose.Schema({
  _id: { type: String, enum: ['initial-seed'], default: 'initial-seed' },
  initializedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CategorySetup', categorySetupSchema);
