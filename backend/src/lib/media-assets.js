const { createHash } = require('node:crypto');

const mediaFolder = (resourceType) => `vani-collection/${resourceType === 'video' ? 'videos' : 'products'}`;

const contentPublicId = (buffer, resourceType) =>
  `${mediaFolder(resourceType)}/sha256_${createHash('sha256').update(buffer).digest('hex')}`;

const isDuplicateAssetError = (error) =>
  error?.http_code === 409 || /already exists/i.test(error?.message || '');

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
  const result = await request.execute();
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
  const result = await cloudinary.search
    .expression(`folder="${mediaFolder(resourceType)}" AND resource_type=${resourceType}`)
    .max_results(1)
    .execute();
  return result.total_count || 0;
}

module.exports = { contentPublicId, countCloudinaryAssets, isDuplicateAssetError, listCloudinaryAssets, uploadOrReuse };
