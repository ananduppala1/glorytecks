import { randomUUID } from 'crypto';
import { UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../config/cloudinary';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import { DetectedFormat } from '../utils/fileSignature';

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  resourceType: string;
}

/**
 * Resolve the client's requested destination against the allowlist.
 *
 * The folder is the only part of the storage path a caller influences, and it
 * is never concatenated as given: an unrecognised value is refused outright
 * rather than sanitised into something adjacent. That removes traversal
 * (`../../`), absolute paths, encoded separators, control characters, unicode
 * lookalikes and length abuse in one step, because none of them can equal an
 * entry in a fixed list of lowercase slugs.
 */
export function resolveFolder(requested: unknown, fallback: string): string {
  if (requested === undefined || requested === null || requested === '') return fallback;

  // multer's field parser yields an array when a field is repeated, so a
  // caller can make `folder` a non-string. Anything but a plain string is a
  // malformed request, not a folder.
  if (typeof requested !== 'string') {
    throw ApiError.badRequest('Invalid upload destination');
  }

  const value = requested.trim().toLowerCase();
  if (!env.upload.folders.includes(value)) {
    throw ApiError.badRequest('Invalid upload destination');
  }
  return value;
}

/**
 * Build the storage identifier for an asset.
 *
 * The client's filename is NEVER the identifier. A random UUID is, so:
 *  - two uploads can never collide, and none can overwrite an existing asset;
 *  - the stored path cannot be predicted or enumerated;
 *  - nothing the user typed — separators, dots, RTL overrides, a second
 *    extension — can influence how the object is addressed or served.
 *
 * The sanitised original name is kept only as a trailing, cosmetic slug so
 * assets stay recognisable in the Cloudinary console.
 */
function buildPublicId(safeName: string): string {
  const stem = safeName.replace(/\.[^.]*$/, '').slice(0, 40) || 'file';
  return `${randomUUID()}-${stem}`;
}

/**
 * Stream a verified buffer to Cloudinary.
 *
 * Only ever called with a buffer that `middlewares/upload` has already parsed
 * and identified — `format` is the *detected* format, not a client claim.
 */
export async function uploadVerifiedBuffer(
  buffer: Buffer,
  opts: { folder: string; format: DetectedFormat; safeName: string },
): Promise<UploadResult> {
  if (!env.cloudinary.enabled) {
    throw ApiError.serviceUnavailable('File uploads are not configured');
  }

  const folder = [env.cloudinary.folder, opts.folder].filter(Boolean).join('/');
  const publicId = buildPublicId(opts.safeName);

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        // The resource type is derived from the bytes, never guessed. 'auto'
        // would let Cloudinary re-classify content and serve it under a type
        // we did not intend.
        resource_type: opts.format.resourceType,
        // The identifier above is already unique and already safe; taking the
        // filename into the public id would hand that control back.
        use_filename: false,
        unique_filename: false,
        overwrite: false,
        // Pin the stored format so Cloudinary cannot infer a different one.
        format: opts.format.ext,
        invalidate: false,
      },
      (error, uploaded) => {
        if (error || !uploaded) {
          reject(error ?? new Error('Cloudinary returned no result'));
          return;
        }
        resolve(uploaded);
      },
    );
    stream.end(buffer);
  }).catch((error: unknown) => {
    // Cloudinary's messages can name the cloud, the preset and the account
    // plan. Log them; return nothing but a generic failure to the caller.
    logger.error('Cloudinary upload failed', {
      reason: error instanceof Error ? error.message : 'unknown',
      folder,
    });
    throw ApiError.internal('Upload failed. Please try again.');
  });

  // The provider's answer is input too. If it stored something other than what
  // we sent — a different resource type, a different format — the asset is not
  // what the rest of the system will assume it is, so remove it and fail.
  const expectedFormats = opts.format.cloudinaryFormats;
  const reportedFormat = String(result.format ?? '').toLowerCase();
  const resourceTypeOk = result.resource_type === opts.format.resourceType;
  const formatOk = expectedFormats.includes(reportedFormat);

  if (!resourceTypeOk || !formatOk) {
    logger.error('Cloudinary stored an unexpected asset type', {
      expectedResourceType: opts.format.resourceType,
      gotResourceType: result.resource_type,
      expectedFormats,
      gotFormat: reportedFormat,
      publicId: result.public_id,
    });
    await deleteAsset(result.public_id, result.resource_type as 'image' | 'raw').catch(() => {
      /* best effort — the failure is already being reported */
    });
    throw ApiError.badRequest('File could not be stored in a supported format');
  }

  if (!result.secure_url || !result.secure_url.startsWith('https://')) {
    logger.error('Cloudinary returned a non-HTTPS asset URL', { publicId: result.public_id });
    throw ApiError.internal('Upload failed. Please try again.');
  }

  // Only the fields the admin UI needs. Nothing from the provider's response
  // is spread wholesale — it carries signatures, api keys on some plans, and
  // account metadata.
  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: reportedFormat,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
    resourceType: result.resource_type,
  };
}

/** Remove an asset by public id (best-effort; used when replacing media). */
export async function deleteAsset(
  publicId: string,
  resourceType: 'image' | 'raw' = 'image',
): Promise<void> {
  if (!env.cloudinary.enabled) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
