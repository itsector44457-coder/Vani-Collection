const express = require('express');
const multer = require('multer');
const { requireRoles } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../lib/errors');

let cloudinary = null;
try { cloudinary = require('cloudinary').v2; } catch { cloudinary = null; }

module.exports = ({ auth }) => {
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 6 } });

  router.post('/images', auth, requireRoles('catalog_manager','admin','super_admin'), upload.array('files', 6), asyncHandler(async (req, res) => {
    if (!req.files?.length) throw new AppError(422, 'NO_FILES', 'At least one image file is required');
    if (!cloudinary || !process.env.CLOUDINARY_CLOUD_NAME) throw new AppError(503, 'MEDIA_NOT_CONFIGURED', 'Cloudinary credentials are not configured');
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
    const uploaded = await Promise.all(req.files.map((file) => new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder: 'vani-collection/products', resource_type: 'image' }, (error, result) => (error ? reject(error) : resolve({ url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height }))).end(file.buffer);
    })));
    res.status(201).json({ data: uploaded });
  }));
  return router;
};
