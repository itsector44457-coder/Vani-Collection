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
  // ------------------------------------------------------------------- wishlist
  /**
   * Serialises wishlist items with `productId` as a plain string.
   *
   * The query populates `items.productId` so the account UI gets names, images and prices in the
   * same round trip, but populate replaces the ObjectId with the whole Product document — and the
   * storefront compares against string ids (`wishlist.includes(product.id)`). Returning the raw
   * populated items handed the browser objects where it expected strings, so a signed-in shopper's
   * wishlist silently never matched and the object leaked into localStorage as "[object Object]".
   * The populated document moves to `product`; the id stays a string.
   */
  const serializeWishlist = (items) => (items || [])
    .map((item) => {
      const populated = item.productId && typeof item.productId === 'object' ? item.productId : null;
      const productId = populated ? String(populated._id) : String(item.productId || '');
      return { productId, sku: item.sku || undefined, addedAt: item.addedAt, product: populated };
    })
    // A populated ref that no longer resolves (archived/deleted product) comes back as null.
    .filter((item) => item.productId);

  /** A single item, or a whole guest list to merge on sign-in. */
  const wishlistItem = z.object({ productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'productId must be a product id'), sku: z.string().max(64).optional() });
  const wishlistPutSchema = z.object({
    productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'productId must be a product id').optional(),
    sku: z.string().max(64).optional(),
    items: z.array(wishlistItem).max(200).optional(),
  }).refine((value) => Boolean(value.productId) || Boolean(value.items?.length), { message: 'productId or items is required' });

  router.get('/wishlist', asyncHandler(async (req, res) => {
    const wishlist = await Wishlist.findOne({ userId: req.user.id }).populate('items.productId');
    const data = serializeWishlist(wishlist?.items);
    res.json({ data, meta: { total: data.length } });
  }));

  router.put('/wishlist', validate(wishlistPutSchema), asyncHandler(async (req, res) => {
    const incoming = req.body.items?.length ? req.body.items : [{ productId: req.body.productId, sku: req.body.sku }];

    // De-duplicate the request itself first: the same product can appear twice in a guest list.
    const seen = new Set();
    const unique = [];
    for (const item of incoming) {
      const productId = String(item.productId);
      if (seen.has(productId)) continue;
      seen.add(productId);
      unique.push({ productId, sku: item.sku });
    }
    if (!unique.length) throw new AppError(422, 'WISHLIST_EMPTY', 'At least one productId is required');

    const before = await Wishlist.findOne({ userId: req.user.id }).select('items.productId');
    const existing = new Set((before?.items || []).map((item) => String(item.productId)));

    // Ensure the document exists up front. A conditional upsert cannot be used for the insert
    // itself: when the guard does not match, upsert would try to INSERT a second Wishlist for the
    // same user and break the unique userId index.
    if (!before) await Wishlist.create({ userId: req.user.id, items: [] });

    // One guarded $push per product, in a single bulkWrite round trip. Each filter is evaluated
    // against the committed document and MongoDB serialises writes to the same doc, so this stays
    // idempotent even under the concurrent PUTs a sign-in merge fires.
    //
    // $push rather than $addToSet deliberately: the guard already proves the product is absent, and
    // $addToSet on a subdocument compares *every* field — including the `addedAt` default Mongoose
    // applies while casting the update — so the old code appended a fresh duplicate row on every
    // single call and a second row whenever the same product arrived with a different sku.
    const additions = unique.filter((item) => !existing.has(item.productId));
    if (additions.length) {
      await Wishlist.bulkWrite(additions.map((item) => ({
        updateOne: {
          filter: { userId: req.user.id, 'items.productId': { $ne: item.productId } },
          update: { $push: { items: item } },
        },
      })));
    }

    const wishlist = await Wishlist.findOne({ userId: req.user.id }).populate('items.productId');
    const data = serializeWishlist(wishlist?.items);
    // `added` + `alreadySaved` reconcile against the entries the caller *sent*, not the de-duplicated
    // set, so the client can tell "you asked for 3, 1 was new and 2 were already saved" apart from
    // "you asked for 2". A guest list can legitimately carry the same product twice.
    res.json({ data, meta: { total: data.length, added: additions.length, alreadySaved: incoming.length - additions.length } });
  }));

  router.delete('/wishlist/:productId', validate(z.object({ productId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'productId must be a product id') }), 'params'), asyncHandler(async (req, res) => {
    // $pull matches every item for that product regardless of sku, so removing a wishlisted product
    // clears it completely instead of leaving a stale size behind.
    const wishlist = await Wishlist.findOneAndUpdate({ userId: req.user.id }, { $pull: { items: { productId: req.params.productId } } }, { new: true }).populate('items.productId');
    const data = serializeWishlist(wishlist?.items);
    res.json({ data, meta: { total: data.length } });
  }));
  router.get('/exports/orders', asyncHandler(async (req, res) => {
    const orders = await Order.find({ customerId: req.user.id }).lean();
    const rows = [['orderNumber','date','status','paymentStatus','total']];
    orders.forEach((o) => rows.push([o.orderNumber, o.createdAt.toISOString(), o.status, o.payment.status, o.amounts.total]));
    res.type('text/csv').send(rows.map((r) => r.join(',')).join('\n'));
  }));
  return router;
};
