const express = require('express');
const multer = require('multer');
const { requireRoles } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../lib/errors');
const { countCloudinaryAssets, listCloudinaryAssets, uploadOrReuse } = require('../lib/media-assets');

let cloudinary = null;
try { cloudinary = require('cloudinary').v2; } catch { cloudinary = null; }

module.exports = ({ auth }) => {
  const router = express.Router();
  const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1073741824 /* 1 GB */ } });
  const videoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1073741824 /* 1 GB */ } });
  const configureCloudinary = () => {
    if (!cloudinary || !process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new AppError(503, 'MEDIA_NOT_CONFIGURED', 'Cloudinary credentials are not configured');
    }
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  };
  const handleUpload = (middleware) => (req, res, next) => middleware(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 422;
      return next(new AppError(status, error.code, error.message));
    }
    next(error);
  });

  router.get('/assets', auth, requireRoles('catalog_manager','admin','super_admin'), asyncHandler(async (req, res) => {
    const resourceType = req.query.type || 'image';
    if (!['image', 'video'].includes(resourceType)) {
      throw new AppError(422, 'INVALID_MEDIA_TYPE', 'Media type must be image or video');
    }
    const cursor = req.query.cursor;
    if (cursor !== undefined && (typeof cursor !== 'string' || cursor.length > 2048)) {
      throw new AppError(422, 'INVALID_CURSOR', 'Media cursor is invalid');
    }
    configureCloudinary();
    const result = await listCloudinaryAssets(cloudinary, resourceType, cursor);
    res.json({ data: result.assets, meta: { total: result.total, nextCursor: result.nextCursor } });
  }));

  router.get('/assets/counts', auth, requireRoles('catalog_manager','admin','super_admin'), asyncHandler(async (_req, res) => {
    configureCloudinary();
    const [images, videos] = await Promise.all([
      countCloudinaryAssets(cloudinary, 'image'),
      countCloudinaryAssets(cloudinary, 'video'),
    ]);
    res.json({ data: { images, videos, total: images + videos } });
  }));

  router.post('/images', auth, requireRoles('catalog_manager','admin','super_admin'), handleUpload(imageUpload.array('files')), asyncHandler(async (req, res) => {
    if (!req.files?.length) throw new AppError(422, 'NO_FILES', 'At least one image file is required');
    if (req.files.some((file) => !file.mimetype.startsWith('image/'))) throw new AppError(422, 'INVALID_MEDIA_TYPE', 'Only image files are accepted');
    configureCloudinary();
    const uploaded = await Promise.all(req.files.map((file) => uploadOrReuse(cloudinary, file, 'image')));
    res.status(201).json({ data: uploaded });
  }));
  router.post('/videos', auth, requireRoles('catalog_manager','admin','super_admin'), handleUpload(videoUpload.array('file')), asyncHandler(async (req, res) => {
    if (!req.files?.length) throw new AppError(422, 'NO_FILES', 'At least one video file is required');
    if (req.files.some((file) => !file.mimetype.startsWith('video/'))) throw new AppError(422, 'INVALID_MEDIA_TYPE', 'Only video files are accepted');
    configureCloudinary();
    const uploaded = await Promise.all(req.files.map((file) => uploadOrReuse(cloudinary, file, 'video')));
    res.status(201).json({ data: uploaded });
  }));
  return router;
};
