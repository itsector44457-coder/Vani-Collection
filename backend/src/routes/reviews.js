const express = require('express');
const { z } = require('zod');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const Review = require('../../models/Review');
const { validate } = require('../middleware/validate');
const { requireRoles } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../lib/errors');

module.exports = ({ auth }) => {
  const router = express.Router();
  router.get('/product/:productId', asyncHandler(async (req, res) => {
    const data = await Review.find({ productId: req.params.productId, status: 'published' }).sort({ createdAt: -1 }).limit(100);
    res.json({ data });
  }));
  router.post('/', auth, validate(z.object({ productId: z.string(), orderId: z.string().optional(), rating: z.number().int().min(1).max(5), title: z.string().max(120).optional(), body: z.string().min(10).max(4000), images: z.array(z.url()).max(4).default([]) })), asyncHandler(async (req, res) => {
    const product = await Product.findOne({ _id: req.body.productId, status: 'active' }); if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    const purchased = await Order.exists({ customerId: req.user.id, 'items.productId': product._id, status: { $in: ['delivered','shipped','packed'] } });
    const review = await Review.create({ ...req.body, userId: req.user.id, customerName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Verified Buyer', verifiedPurchase: Boolean(purchased) });
    res.status(201).json({ data: review, meta: { moderation: 'pending', message: 'Review submitted for moderation' } });
  }));
  // Moderation queue. The product ref is populated so support can see what is being reviewed
  // without a second lookup; `productTitle` is projected alongside for convenience.
  router.get('/', auth, requireRoles('support','admin','super_admin'), asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.rating) filter.rating = Number(req.query.rating);
    if (req.query.productId) filter.productId = req.query.productId;
    const limit = Math.min(500, Number(req.query.limit) || 200);
    const rows = await Review.find(filter).populate('productId', 'name slug').sort({ createdAt: -1 }).limit(limit).lean();
    const data = rows.map((row) => ({ ...row, productTitle: row.productId?.name || undefined }));
    const counts = await Review.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    res.json({ data, meta: { total: data.length, counts: Object.fromEntries(counts.map((row) => [row._id, row.count])) } });
  }));
  router.patch('/:id', auth, requireRoles('support','admin','super_admin'), validate(z.object({ status: z.enum(['pending','published','rejected']).optional(), adminReply: z.string().max(2000).optional() })), asyncHandler(async (req, res) => {
    const review = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!review) throw new AppError(404, 'REVIEW_NOT_FOUND', 'Review not found'); res.json({ data: review });
  }));
  router.get('/summary/:productId', asyncHandler(async (req, res) => {
    const [summary] = await Review.aggregate([{ $match: { productId: new (require('mongoose').Types.ObjectId)(req.params.productId), status: 'published' } }, { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 }, ratings: { $push: '$rating' } } }]);
    res.json({ data: summary ? { average: Math.round(summary.average * 10) / 10, count: summary.count, distribution: summary.ratings.reduce((acc, r) => ({ ...acc, [r]: (acc[r] || 0) + 1 }), {}) } : { average: 0, count: 0, distribution: {} } });
  }));
  return router;
};
