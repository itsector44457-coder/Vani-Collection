const express = require('express');
const Reel = require('../../models/Reel');
const { asyncHandler } = require('../lib/errors');

module.exports = () => {
  const router = express.Router();

  router.get('/', asyncHandler(async (_req, res) => {
    const reels = await Reel.find({ isActive: true })
      .select('title description videoUrl thumbnailUrl productId position')
      .populate({
        path: 'productId',
        // The storefront video modal needs a real variant SKU and options to add the item to cart.
        // Keep costPrice excluded; only public pricing and sellable-variant fields are exposed.
        select: 'name slug images variants.sku variants.size variants.color variants.mrp variants.price variants.active status fabric craft category shortDescription description',
        match: { status: 'active' },
      })
      .sort({ position: 1, createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ data: reels.filter((reel) => reel.productId) });
  }));

  return router;
};
