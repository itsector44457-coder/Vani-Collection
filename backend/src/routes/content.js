const express = require('express');
const { z } = require('zod');
const Content = require('../../models/Content');
const { validate } = require('../middleware/validate');
const { requireRoles } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { AppError, asyncHandler } = require('../lib/errors');

const contentSchema = z.object({ key: z.string().min(2), kind: z.enum(['page','section','banner','faq','policy','testimonial','lookbook']), title: z.string().optional(), subtitle: z.string().optional(), body: z.string().optional(), blocks: z.unknown().optional(), media: z.array(z.object({ url: z.url(), alt: z.string().optional(), kind: z.string().optional() })).optional(), ctaLabel: z.string().optional(), ctaHref: z.string().optional(), position: z.number().optional(), locale: z.string().optional(), status: z.enum(['draft','published']).optional() });

module.exports = ({ auth }) => {
  const router = express.Router();
  router.get('/:key', asyncHandler(async (req, res) => { const item = await Content.findOne({ key: req.params.key, status: 'published' }); if (!item) throw new AppError(404, 'CONTENT_NOT_FOUND', 'Content not found'); res.json({ data: item }); }));
  router.get('/', asyncHandler(async (req, res) => { const filter = { status: 'published' }; if (req.query.kind) filter.kind = req.query.kind; res.json({ data: await Content.find(filter).sort({ position: 1 }) }); }));
  router.post('/', auth, requireRoles('catalog_manager','admin','super_admin'), validate(contentSchema), audit('content.create','Content'), asyncHandler(async (req, res) => res.status(201).json({ data: await Content.create({ ...req.body, updatedBy: req.user.id }) })));
  router.put('/:key', auth, requireRoles('catalog_manager','admin','super_admin'), validate(contentSchema.partial()), audit('content.update','Content'), asyncHandler(async (req, res) => { const item = await Content.findOneAndUpdate({ key: req.params.key }, { ...req.body, updatedBy: req.user.id }, { new: true, upsert: true, runValidators: true }); res.json({ data: item }); }));
  router.delete('/:key', auth, requireRoles('admin','super_admin'), audit('content.delete','Content'), asyncHandler(async (req, res) => { await Content.deleteOne({ key: req.params.key }); res.status(204).end(); }));
  return router;
};
