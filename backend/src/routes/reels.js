const express = require('express');
const { z } = require('zod');
const Reel = require('../../models/Reel');
const Product = require('../../models/Product');
const { validate } = require('../middleware/validate');
const { requireRoles } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../lib/errors');

// Zod validation schemas
const createReelSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  videoUrl: z.string().url().trim(),
  thumbnailUrl: z.string().url().trim().optional(),
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
  position: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updateReelSchema = createReelSchema.partial();

module.exports = ({ auth }) => {
  const router = express.Router();

  // All routes require authentication and proper roles
  router.use(auth, requireRoles('catalog_manager', 'admin', 'super_admin'));

  // GET /api/admin/reels - List reels with pagination
  router.get('/', asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 25);
    const filter = {};
    
    // Optional filters
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }
    if (req.query.productId) {
      filter.productId = req.query.productId;
    }
    if (req.query.q) {
      filter.title = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    const [reels, total] = await Promise.all([
      Reel.find(filter)
        .populate('productId', 'name slug images')
        .populate('createdBy', 'email firstName lastName')
        .populate('updatedBy', 'email firstName lastName')
        .sort({ position: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Reel.countDocuments(filter),
    ]);

    res.json({
      data: reels,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }));

  // POST /api/admin/reels - Create new reel
  router.post('/', validate(createReelSchema), audit('reel.create', 'Reel'), asyncHandler(async (req, res) => {
    // Verify product exists
    const product = await Product.findById(req.body.productId);
    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Referenced product not found');
    }

    const reel = await Reel.create({
      ...req.body,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    const populatedReel = await Reel.findById(reel._id)
      .populate('productId', 'name slug images')
      .populate('createdBy', 'email firstName lastName')
      .populate('updatedBy', 'email firstName lastName');

    res.status(201).json({ data: populatedReel });
  }));

  // PATCH /api/admin/reels/:id - Update reel
  router.patch('/:id', validate(updateReelSchema), audit('reel.update', 'Reel'), asyncHandler(async (req, res) => {
    // If productId is being updated, verify it exists
    if (req.body.productId) {
      const product = await Product.findById(req.body.productId);
      if (!product) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Referenced product not found');
      }
    }

    const reel = await Reel.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user._id,
      },
      { new: true, runValidators: true }
    )
      .populate('productId', 'name slug images')
      .populate('createdBy', 'email firstName lastName')
      .populate('updatedBy', 'email firstName lastName');

    if (!reel) {
      throw new AppError(404, 'REEL_NOT_FOUND', 'Reel not found');
    }

    res.json({ data: reel });
  }));

  // DELETE /api/admin/reels/:id - Soft delete (set isActive: false)
  router.delete('/:id', audit('reel.delete', 'Reel'), asyncHandler(async (req, res) => {
    const reel = await Reel.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        updatedBy: req.user._id,
      },
      { new: true }
    );

    if (!reel) {
      throw new AppError(404, 'REEL_NOT_FOUND', 'Reel not found');
    }

    res.json({ data: reel });
  }));

  return router;
};