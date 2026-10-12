const express = require('express');
const { z } = require('zod');
const Content = require('../../models/Content');
const ContentRevision = require('../../models/ContentRevision');
const { validate } = require('../middleware/validate');
const { requireRoles } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../lib/errors');

const contentSchema = z.object({ key: z.string().min(2), kind: z.enum(['page','section','banner','faq','policy','testimonial','lookbook','product_collection']), title: z.string().optional(), subtitle: z.string().optional(), body: z.string().optional(), blocks: z.unknown().optional(), media: z.array(z.object({ url: z.string().refine((value) => (value.startsWith('/') && !value.startsWith('//')) || /^https?:\/\//i.test(value), 'Expected an HTTP URL or root-relative path'), alt: z.string().optional(), kind: z.string().optional() })).optional(), ctaLabel: z.string().optional(), ctaHref: z.string().optional(), position: z.number().optional(), locale: z.string().optional(), status: z.enum(['draft','published']).optional() });

const snapshotFields = (document) => ({
  kind: document.kind,
  title: document.title,
  subtitle: document.subtitle,
  body: document.body,
  blocks: document.blocks,
  media: document.media,
  ctaLabel: document.ctaLabel,
  ctaHref: document.ctaHref,
  position: document.position,
  locale: document.locale,
  status: document.status,
});

function changedFields(before, after) {
  const previous = before || {};
  const next = after || {};
  return Object.keys({ ...previous, ...next })
    .filter((field) => JSON.stringify(previous[field]) !== JSON.stringify(next[field]))
    .map((field) => ({ field, before: previous[field], after: next[field] }));
}

module.exports = ({ auth }) => {
  const router = express.Router();
  router.get('/manage', auth, requireRoles('catalog_manager','admin','super_admin'), asyncHandler(async (_req, res) => {
    const data = await Content.find({}).sort({ kind: 1, position: 1, key: 1 }).populate('updatedBy', 'email firstName lastName');
    res.json({ data });
  }));
  router.get('/manage/:key/revisions', auth, requireRoles('catalog_manager','admin','super_admin'), asyncHandler(async (req, res) => {
    const data = await ContentRevision.find({ contentKey: req.params.key })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('changedBy', 'email firstName lastName')
      .lean();
    res.json({ data });
  }));
  router.get('/:key', asyncHandler(async (req, res) => { const item = await Content.findOne({ key: req.params.key, status: 'published' }); if (!item) throw new AppError(404, 'CONTENT_NOT_FOUND', 'Content not found'); res.json({ data: item }); }));
  router.get('/', asyncHandler(async (req, res) => { const filter = { status: 'published' }; if (req.query.kind) filter.kind = req.query.kind; res.json({ data: await Content.find(filter).sort({ position: 1 }) }); }));
  router.post('/', auth, requireRoles('catalog_manager','admin','super_admin'), validate(contentSchema), audit('content.create','Content'), asyncHandler(async (req, res) => {
    const item = await Content.create({ ...req.body, updatedBy: req.user.id });
    await ContentRevision.create({ contentKey: item.key, changedBy: req.user.id, changes: changedFields({}, snapshotFields(item)) });
    res.status(201).json({ data: item });
  }));
  router.put('/:key', auth, requireRoles('catalog_manager','admin','super_admin'), validate(contentSchema.partial()), audit('content.update','Content'), asyncHandler(async (req, res) => {
    const existing = await Content.findOne({ key: req.params.key });
    const before = existing ? snapshotFields(existing) : {};
    const item = await Content.findOneAndUpdate({ key: req.params.key }, { ...req.body, updatedBy: req.user.id }, { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true });
    const changes = changedFields(before, snapshotFields(item));
    if (changes.length) await ContentRevision.create({ contentKey: item.key, changedBy: req.user.id, changes });
    res.json({ data: item });
  }));
  router.delete('/:key', auth, requireRoles('admin','super_admin'), audit('content.delete','Content'), asyncHandler(async (req, res) => { await Content.deleteOne({ key: req.params.key }); res.status(204).end(); }));
  return router;
};
