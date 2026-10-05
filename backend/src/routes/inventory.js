const express = require('express');
const { z } = require('zod');
const Inventory = require('../../models/Inventory');
const { validate } = require('../middleware/validate');
const { requireRoles } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../lib/errors');
module.exports = ({ auth }) => {
  const router = express.Router();
  router.use(auth, requireRoles('warehouse', 'catalog_manager', 'admin', 'super_admin'));
  router.get('/', asyncHandler(async (req, res) => { const filter = {}; if (req.query.sku) filter.sku = req.query.sku; if (req.query.low === 'true') filter.$expr = { $lte: [{ $subtract: ['$onHand','$reserved'] }, '$reorderLevel'] }; res.json({ data: await Inventory.find(filter).sort({ updatedAt: -1 }) }); }));
  router.patch('/:sku', validate(z.object({ onHand: z.number().int().nonnegative().optional(), adjustment: z.number().int().optional(), reorderLevel: z.number().int().nonnegative().optional(), location: z.string().optional(), reason: z.string().min(3) })), audit('inventory.adjust', 'Inventory'), asyncHandler(async (req, res) => {
    const update = { $set: {} }; if (req.body.onHand !== undefined) update.$set.onHand = req.body.onHand; if (req.body.reorderLevel !== undefined) update.$set.reorderLevel = req.body.reorderLevel; if (req.body.location !== undefined) update.$set.location = req.body.location; if (req.body.adjustment) update.$inc = { onHand: req.body.adjustment }; 
    const item = await Inventory.findOneAndUpdate({ sku: req.params.sku.toUpperCase(), warehouseId: req.query.warehouseId || 'PRIMARY' }, update, { new: true, runValidators: true }); if (!item) throw new AppError(404, 'SKU_NOT_FOUND', 'Inventory SKU not found'); res.json({ data: item });
  }));
  return router;
};
