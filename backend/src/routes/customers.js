const express = require('express');
const { z } = require('zod');
const User = require('../../models/User');
const Order = require('../../models/Order');
const { Wishlist } = require('../../models/Engagement');
const { validate } = require('../middleware/validate');
const { AppError, asyncHandler } = require('../lib/errors');

const addressSchema = z.object({ label: z.enum(['home','work','other']).default('home'), fullName: z.string().min(2), phone: z.string().regex(/^[6-9]\d{9}$/), line1: z.string().min(5), line2: z.string().optional(), landmark: z.string().optional(), city: z.string().min(2), state: z.string().min(2), pincode: z.string().regex(/^\d{6}$/), country: z.string().default('IN'), isDefault: z.boolean().optional() });

module.exports = ({ auth }) => {
  const router = express.Router();
  router.use(auth);
  router.get('/profile', asyncHandler(async (req, res) => res.json({ data: req.user.toSafeJSON() })));
  router.patch('/profile', validate(z.object({ firstName: z.string().min(1).optional(), lastName: z.string().optional(), phone: z.string().regex(/^[6-9]\d{9}$/).optional() })), asyncHandler(async (req, res) => { Object.assign(req.user, req.body); await req.user.save(); res.json({ data: req.user.toSafeJSON() }); }));
  router.get('/addresses', asyncHandler(async (req, res) => res.json({ data: req.user.addresses })));
  router.post('/addresses', validate(addressSchema), asyncHandler(async (req, res) => {
    if (req.body.isDefault) req.user.addresses.forEach((a) => { a.isDefault = false; });
    req.user.addresses.push(req.body); await req.user.save(); res.status(201).json({ data: req.user.addresses });
  }));
  router.patch('/addresses/:id', validate(addressSchema.partial()), asyncHandler(async (req, res) => {
    const address = req.user.addresses.id(req.params.id); if (!address) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
    if (req.body.isDefault) req.user.addresses.forEach((a) => { a.isDefault = false; });
    Object.assign(address, req.body); await req.user.save(); res.json({ data: req.user.addresses });
  }));
  router.delete('/addresses/:id', asyncHandler(async (req, res) => { const address = req.user.addresses.id(req.params.id); if (!address) throw new AppError(404, 'ADDRESS_NOT_FOUND', 'Address not found'); address.deleteOne(); await req.user.save(); res.status(204).end(); }));
  router.get('/wishlist', asyncHandler(async (req, res) => res.json({ data: (await Wishlist.findOne({ userId: req.user.id }).populate('items.productId'))?.items || [] })));
  router.put('/wishlist', validate(z.object({ productId: z.string(), sku: z.string().optional() })), asyncHandler(async (req, res) => {
    const wishlist = await Wishlist.findOneAndUpdate({ userId: req.user.id }, { $addToSet: { items: { productId: req.body.productId, sku: req.body.sku } } }, { upsert: true, new: true }); res.json({ data: wishlist.items });
  }));
  router.delete('/wishlist/:productId', asyncHandler(async (req, res) => { const wishlist = await Wishlist.findOneAndUpdate({ userId: req.user.id }, { $pull: { items: { productId: req.params.productId } } }, { new: true }); res.json({ data: wishlist?.items || [] }); }));
  router.get('/exports/orders', asyncHandler(async (req, res) => {
    const orders = await Order.find({ customerId: req.user.id }).lean();
    const rows = [['orderNumber','date','status','paymentStatus','total']];
    orders.forEach((o) => rows.push([o.orderNumber, o.createdAt.toISOString(), o.status, o.payment.status, o.amounts.total]));
    res.type('text/csv').send(rows.map((r) => r.join(',')).join('\n'));
  }));
  return router;
};
