const { createHash } = require('node:crypto');
const { AppError } = require('./errors');

const mediaFolder = (resourceType) => `vani-collection/${resourceType === 'video' ? 'videos' : 'products'}`;

const contentPublicId = (buffer, resourceType) =>
  `${mediaFolder(resourceType)}/sha256_${createHash('sha256').update(buffer).digest('hex')}`;

const isDuplicateAssetError = (error) =>
  error?.http_code === 409 || /already exists/i.test(error?.message || '');

// The Cloudinary SDK rejects with a plain object shaped { error: { http_code, message } }
// (not an Error), so the Express handler falls back to a 500 and returns a generic message.
// Translate it into a clear AppError so a misconfigured media library surfaces the real cause.
function normalizeCloudinaryError(error) {
  const httpCode = error?.error?.http_code || error?.http_code;
  const message = error?.error?.message || error?.message || 'Cloudinary request failed';
  if (httpCode === 401 || httpCode === 403) {
    throw new AppError(503, 'MEDIA_NOT_CONFIGURED', `Cloudinary credentials rejected by provider: ${message}`);
  }
  throw new AppError(502, 'MEDIA_REQUEST_FAILED', message);
}

async function uploadOrReuse(cloudinary, file, resourceType) {
  const folder = mediaFolder(resourceType);
  const publicId = contentPublicId(file.buffer, resourceType);
  const uploaded = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId.slice(folder.length + 1),
        unique_filename: false,
        overwrite: false,
        resource_type: resourceType,
      },
      (error, result) => error ? reject(error) : resolve(result),
    ).end(file.buffer);
  }).catch(async (error) => {
    if (!isDuplicateAssetError(error)) throw error;
    return cloudinary.api.resource(publicId, { resource_type: resourceType });
  });

  if (!uploaded?.secure_url) throw new Error('Cloudinary did not return a secure media URL');
  return {
    url: uploaded.secure_url,
    publicId: uploaded.public_id || publicId,
    width: uploaded.width,
    height: uploaded.height,
    duration: uploaded.duration,
  };
}

async function listCloudinaryAssets(cloudinary, resourceType, cursor) {
  const folder = mediaFolder(resourceType);
  let request = cloudinary.search
    .expression(`folder="${folder}" AND resource_type=${resourceType}`)
    .sort_by('created_at', 'desc')
    .max_results(60);
  if (cursor) request = request.next_cursor(cursor);
  let result;
  try { result = await request.execute(); } catch (error) { throw normalizeCloudinaryError(error); }
  return {
    assets: (result.resources || []).map((asset) => ({
      assetId: asset.asset_id,
      publicId: asset.public_id,
      url: asset.secure_url,
      resourceType: asset.resource_type,
      format: asset.format,
      bytes: asset.bytes,
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
      createdAt: asset.created_at,
    })),
    total: result.total_count || 0,
    nextCursor: result.next_cursor || null,
  };
}

async function countCloudinaryAssets(cloudinary, resourceType) {
  let result;
  try {
    result = await cloudinary.search
      .expression(`folder="${mediaFolder(resourceType)}" AND resource_type=${resourceType}`)
      .max_results(1)
      .execute();
  } catch (error) { throw normalizeCloudinaryError(error); }
  return result.total_count || 0;
}

module.exports = { contentPublicId, countCloudinaryAssets, isDuplicateAssetError, listCloudinaryAssets, uploadOrReuse };
