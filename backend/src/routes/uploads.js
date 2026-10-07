const express = require('express');
const multer = require('multer');
const { z } = require('zod');
const { requireRoles } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../lib/errors');

let cloudinary = null;
try { cloudinary = require('cloudinary').v2; } catch { cloudinary = null; }

const MAX_VIDEO_BYTES = 300 * 1024 * 1024; // 300 MB — signed uploads stream browser → Cloudinary.

function configure() {
  if (!cloudinary || !process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_SECRET) {
    throw new AppError(503, 'MEDIA_NOT_CONFIGURED', 'Cloudinary credentials are not configured');
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

const ALLOWED_FOLDERS = {
  reels: 'vani-collection/reels',
  products: 'vani-collection/products',
  content: 'vani-collection/content',
};

const signatureQuery = z.object({
  type: z.enum(['video', 'image']).catch('video'),
  folder: z.enum(['reels', 'products', 'content']).catch('reels'),
});

module.exports = ({ auth }) => {
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 6 } });

  router.post('/images', auth, requireRoles('catalog_manager','admin','super_admin'), upload.array('files', 6), asyncHandler(async (req, res) => {
    if (!req.files?.length) throw new AppError(422, 'NO_FILES', 'At least one image file is required');
    const sdk = configure();
    const uploaded = await Promise.all(req.files.map((file) => new Promise((resolve, reject) => {
      sdk.uploader.upload_stream({ folder: 'vani-collection/products', resource_type: 'image' }, (error, result) => (error ? reject(error) : resolve({ url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height }))).end(file.buffer);
    })));
    res.status(201).json({ data: uploaded });
  }));

  /**
   * Signed direct upload for large media (reel videos).
   *
   * The browser POSTs the file straight to `https://api.cloudinary.com/v1_1/<cloud>/<type>/upload`
   * with the returned signature, which keeps multi-hundred-MB videos off this server while still
   * requiring a staff session to mint a signature.
   *
   * Signed params must match the form fields exactly (plus `file` and `api_key`, which Cloudinary
   * excludes from the signature).
   */
  router.get('/signature', auth, requireRoles('catalog_manager', 'admin', 'super_admin'), (req, res) => {
    const sdk = configure();
    // Parsed here rather than through the validate middleware: Express 5 exposes `req.query` as a
    // getter, so the middleware cannot swap the parsed value back onto the request.
    const { type: resourceType, folder } = signatureQuery.parse({ type: req.query.type, folder: req.query.folder });
    const target = ALLOWED_FOLDERS[folder];
    const timestamp = Math.round(Date.now() / 1000);
    const params = { folder: target, timestamp };
    res.json({
      data: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        signature: sdk.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET),
        timestamp,
        folder: target,
        resourceType,
        uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
        maxBytes: resourceType === 'video' ? MAX_VIDEO_BYTES : 8 * 1024 * 1024,
      },
    });
  });

  return router;
};
