const express = require('express');
const { z } = require('zod');
const { Reel, ReelLike, ReelView } = require('../../models/Reel');
const Product = require('../../models/Product');
const { validate } = require('../middleware/validate');
const { requireRoles } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../lib/errors');

let cloudinary = null;
try { cloudinary = require('cloudinary').v2; } catch { cloudinary = null; }

const objectId = /^[0-9a-f]{24}$/i;
const PRODUCT_FIELDS = 'name slug category status images variants.sku variants.size variants.price variants.mrp variants.active';

const reelInput = z.object({
  title: z.string().min(2).max(160),
  caption: z.string().max(500).optional(),
  tag: z.string().max(60).optional(),
  videoUrl: z.url(),
  videoPublicId: z.string().max(400).optional(),
  posterUrl: z.url().optional(),
  posterPublicId: z.string().max(400).optional(),
  provider: z.enum(['cloudinary', 'external']).optional(),
  durationSec: z.number().nonnegative().optional(),
  width: z.number().int().nonnegative().optional(),
  height: z.number().int().nonnegative().optional(),
  bytes: z.number().int().nonnegative().optional(),
  format: z.string().max(20).optional(),
  productId: z.string().regex(objectId).nullable().optional(),
  position: z.number().int().min(0).max(9999).optional(),
  status: z.enum(['draft', 'published']).optional(),
});

const engageInput = z.object({
  action: z.enum(['like', 'unlike', 'view', 'share', 'cart_add']),
  identity: z.string().min(6).max(64).optional(),
});

/** Flattens a reel and folds the linked product into the shape the storefront renders. */
function serialize(reel) {
  const doc = typeof reel.toObject === 'function' ? reel.toObject() : { ...reel };
  const product = doc.productId;
  const flat = { ...doc, _id: String(doc._id), productId: null, product: null };
  if (!product) return flat;
  flat.productId = String(product._id || product);
  if (!product.name) return flat; // populate missed (deleted product) — keep the id, drop the card
  const variants = (product.variants || []).filter((variant) => variant.active !== false);
  const prices = variants.map((variant) => variant.price).filter((price) => typeof price === 'number');
  const mrps = variants.map((variant) => variant.mrp).filter((price) => typeof price === 'number');
  flat.product = {
    id: String(product._id),
    name: product.name,
    slug: product.slug,
    category: product.category,
    image: product.images?.[0]?.url || '',
    price: prices.length ? Math.min(...prices) : 0,
    mrp: mrps.length ? Math.min(...mrps) : 0,
    sizes: [...new Set(variants.map((variant) => variant.size).filter(Boolean))],
    // Full sellable variants so the reel can add to the real cart without a second round trip.
    variants: variants
      .filter((variant) => variant.sku)
      .map((variant) => ({ sku: variant.sku, size: variant.size, color: variant.color, price: variant.price, mrp: variant.mrp })),
    status: product.status,
  };
  return flat;
}

/** Best-effort Cloudinary cleanup; a missing asset must never fail the delete. */
async function destroyAssets(reel) {
  if (!cloudinary || !process.env.CLOUDINARY_CLOUD_NAME) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  const targets = [
    { publicId: reel.videoPublicId, resourceType: 'video' },
    { publicId: reel.posterPublicId, resourceType: 'image' },
  ].filter((target) => target.publicId);
  await Promise.all(targets.map((target) => cloudinary.uploader.destroy(target.publicId, { resource_type: target.resourceType }).catch(() => null)));
}

module.exports = ({ auth, optionalAuth }) => {
  const router = express.Router();
  const staff = [auth, requireRoles('catalog_manager', 'admin', 'super_admin')];

  /* ------------------------------------------------------------------ public */

  /** Published feed for `/reels`, ordered by the admin-controlled position. */
  router.get('/', asyncHandler(async (req, res) => {
    const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 30));
    const filter = { status: 'published' };
    if (objectId.test(String(req.query.productId || ''))) filter.productId = req.query.productId;
    if (req.query.tag) filter.tag = new RegExp(`^${String(req.query.tag).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const reels = await Reel.find(filter)
      .populate({ path: 'productId', select: PRODUCT_FIELDS })
      .sort({ position: 1, createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ data: reels.map(serialize), meta: { total: reels.length } });
  }));

  /**
   * Staff list — must be registered before `/:id`, otherwise Express matches `/admin` as an id and
   * the route answers 404 REEL_NOT_FOUND.
   */
  router.get('/admin', ...staff, asyncHandler(async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 100));
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.q) filter.$or = [
      { title: new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { caption: new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      { tag: new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    ];
    const [reels, total, published, drafts] = await Promise.all([
      Reel.find(filter).populate({ path: 'productId', select: PRODUCT_FIELDS }).sort({ position: 1, createdAt: -1 }).limit(limit).lean(),
      Reel.countDocuments(filter),
      // Counted independently of `filter` so the header totals stay right when a status filter is on.
      Reel.countDocuments({ status: 'published' }),
      Reel.countDocuments({ status: 'draft' }),
    ]);
    res.json({
      data: reels.map(serialize),
      meta: { total, published, drafts, limit },
    });
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    if (!objectId.test(req.params.id)) throw new AppError(404, 'REEL_NOT_FOUND', 'Reel not found');
    const reel = await Reel.findOne({ _id: req.params.id, status: 'published' })
      .populate({ path: 'productId', select: PRODUCT_FIELDS })
      .lean();
    if (!reel) throw new AppError(404, 'REEL_NOT_FOUND', 'Reel not found');
    res.json({ data: serialize(reel) });
  }));

  /**
   * Engagement: likes, views, shares and add-to-cart tracking.
   * Anonymous callers pass a stable browser id so a like is recorded once and views dedupe per 24h.
   */
  router.post('/:id/engage', optionalAuth, validate(engageInput), asyncHandler(async (req, res) => {
    if (!objectId.test(req.params.id)) throw new AppError(404, 'REEL_NOT_FOUND', 'Reel not found');
    const { action, identity } = req.body;
    const reel = await Reel.findById(req.params.id);
    if (!reel || reel.status !== 'published') throw new AppError(404, 'REEL_NOT_FOUND', 'Reel not found');

    const signedIn = Boolean(req.user);
    if (!signedIn && !identity) throw new AppError(422, 'IDENTITY_REQUIRED', 'An anonymous identifier is required to record engagement');
    const key = signedIn ? `u:${req.user.id}` : `a:${identity}`;
    let liked = await ReelLike.exists({ reel: reel.id, identity: key }).then(Boolean);

    if (action === 'like' && !liked) {
      await ReelLike.create({ reel: reel.id, identity: key }).catch((error) => { if (error.code !== 11000) throw error; });
      reel.likes += 1;
      liked = true;
    } else if (action === 'unlike' && liked) {
      await ReelLike.deleteOne({ reel: reel.id, identity: key });
      reel.likes = Math.max(0, reel.likes - 1);
      liked = false;
    } else if (action === 'view') {
      const inserted = await ReelView.create({ reel: reel.id, identity: key }).catch((error) => {
        if (error.code === 11000) return null;
        throw error;
      });
      if (inserted) reel.views += 1;
    } else if (action === 'share') {
      reel.shares += 1;
    } else if (action === 'cart_add') {
      reel.cartAdds += 1;
    }

    await reel.save();
    res.json({ data: { liked, likes: reel.likes, views: reel.views, shares: reel.shares, cartAdds: reel.cartAdds } });
  }));

  /* ------------------------------------------------------------------- admin */

  router.post('/', ...staff, validate(reelInput), audit('reel.create', 'Reel'), asyncHandler(async (req, res) => {
    const body = { ...req.body };
    if (body.productId === null) delete body.productId;
    if (body.productId && !(await Product.exists({ _id: body.productId }))) throw new AppError(422, 'PRODUCT_NOT_FOUND', 'The linked product does not exist');
    if (body.position === undefined) {
      const last = await Reel.findOne().sort({ position: -1 }).select('position').lean();
      body.position = (last?.position ?? -1) + 1;
    }
    const reel = await Reel.create({ ...body, createdBy: req.user.id, updatedBy: req.user.id });
    res.status(201).json({ data: serialize(await reel.populate({ path: 'productId', select: PRODUCT_FIELDS })) });
  }));

  router.patch('/reorder', ...staff, validate(z.object({ order: z.array(z.string().regex(objectId)).min(1) })), audit('reel.reorder', 'Reel'), asyncHandler(async (req, res) => {
    await Promise.all(req.body.order.map((id, index) => Reel.updateOne({ _id: id }, { position: index, updatedBy: req.user.id })));
    const reels = await Reel.find().populate({ path: 'productId', select: PRODUCT_FIELDS }).sort({ position: 1, createdAt: -1 }).lean();
    res.json({ data: reels.map(serialize) });
  }));

  router.patch('/:id', ...staff, validate(reelInput.partial()), audit('reel.update', 'Reel'), asyncHandler(async (req, res) => {
    if (!objectId.test(req.params.id)) throw new AppError(404, 'REEL_NOT_FOUND', 'Reel not found');
    const body = { ...req.body };
    if (body.productId === null) body.productId = undefined;
    if (body.productId && !(await Product.exists({ _id: body.productId }))) throw new AppError(422, 'PRODUCT_NOT_FOUND', 'The linked product does not exist');
    const reel = await Reel.findByIdAndUpdate(req.params.id, { ...body, updatedBy: req.user.id }, { new: true, runValidators: true });
    if (!reel) throw new AppError(404, 'REEL_NOT_FOUND', 'Reel not found');
    res.json({ data: serialize(await reel.populate({ path: 'productId', select: PRODUCT_FIELDS })) });
  }));

  router.delete('/:id', auth, requireRoles('admin', 'super_admin'), audit('reel.delete', 'Reel'), asyncHandler(async (req, res) => {
    if (!objectId.test(req.params.id)) throw new AppError(404, 'REEL_NOT_FOUND', 'Reel not found');
    const reel = await Reel.findById(req.params.id);
    if (!reel) throw new AppError(404, 'REEL_NOT_FOUND', 'Reel not found');
    const destroy = req.query.purge !== 'false';
    await Promise.all([ReelLike.deleteMany({ reel: reel.id }), ReelView.deleteMany({ reel: reel.id })]);
    await reel.deleteOne();
    if (destroy) await destroyAssets(reel);
    res.status(204).end();
  }));

  return router;
};

module.exports.serialize = serialize;
