const express = require('express');
const Reel = require('../../models/Reel');
const { asyncHandler } = require('../lib/errors');

module.exports = () => {
  const router = express.Router();

  router.get('/', asyncHandler(async (_req, res) => {
    const reels = await Reel.find({ isActive: true })
      .select('title description videoUrl thumbnailUrl productId position')
      .populate({ path: 'productId', select: 'name slug images variants.price status fabric craft category shortDescription description', match: { status: 'active' } })
      .sort({ position: 1, createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ data: reels.filter((reel) => reel.productId) });
  }));

  return router;
};
