const express = require('express');
const { z } = require('zod');
const Coupon = require('../../models/Coupon');
const { checkCouponValidity, computeDiscount } = require('../services/pricing');
const { validate } = require('../middleware/validate');
const { requireRoles } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../lib/errors');

const couponSchema = z.object({ code: z.string().min(3).max(24), type: z.enum(['percentage','fixed']), value: z.number().positive(), minOrderValue: z.number().nonnegative().optional(), maxDiscount: z.number().positive().optional(), startsAt: z.coerce.date().optional(), endsAt: z.coerce.date().optional(), usageLimit: z.number().int().positive().optional(), perCustomerLimit: z.number().int().positive().optional(), active: z.boolean().optional(), applicableCategories: z.array(z.string()).optional(), excludedSkus: z.array(z.string()).optional() });

module.exports = ({ auth }) => {
  const router = express.Router();
  router.post('/validate', validate(z.object({ code: z.string().min(3), subtotal: z.number().nonnegative() })), asyncHandler(async (req, res) => {
    const coupon = await Coupon.findOne({ code: req.body.code.toUpperCase(), active: true });
    const validity = checkCouponValidity(coupon, req.body.subtotal);
    if (!validity.valid) throw new AppError(422, 'INVALID_COUPON', validity.reason);
    res.json({ data: { code: coupon.code, discount: computeDiscount(coupon, req.body.subtotal), type: coupon.type } });
  }));
  router.use(auth, requireRoles('finance','admin','super_admin'));
  router.get('/', asyncHandler(async (_req, res) => res.json({ data: await Coupon.find().sort({ createdAt: -1 }) })));
  router.post('/', validate(couponSchema), audit('coupon.create','Coupon'), asyncHandler(async (req, res) => res.status(201).json({ data: await Coupon.create(req.body) })));
  router.patch('/:id', validate(couponSchema.partial()), audit('coupon.update','Coupon'), asyncHandler(async (req, res) => { const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!coupon) throw new AppError(404,'COUPON_NOT_FOUND','Coupon not found'); res.json({ data: coupon }); }));
  router.delete('/:id', requireRoles('admin','super_admin'), audit('coupon.delete','Coupon'), asyncHandler(async (req, res) => { await Coupon.findByIdAndDelete(req.params.id); res.status(204).end(); }));
  return router;
};
