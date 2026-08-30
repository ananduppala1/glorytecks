import { UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../config/cloudinary';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

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
 * Stream a buffer to Cloudinary. Stores only the resulting URL in Mongo
 * (never the binary), per the project's storage policy.
 */
export function uploadBuffer(
  buffer: Buffer,
  opts: { folder?: string; resourceType?: 'image' | 'raw' | 'auto'; filename?: string } = {},
): Promise<UploadResult> {
  if (!env.cloudinary.enabled) {
    return Promise.reject(
      ApiError.serviceUnavailable('File uploads are not configured (set Cloudinary env vars)'),
    );
  }

  const folder = [env.cloudinary.folder, opts.folder].filter(Boolean).join('/');

  return new Promise<UploadResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: opts.resourceType ?? 'auto',
        use_filename: Boolean(opts.filename),
        filename_override: opts.filename,
        unique_filename: true,
        overwrite: false,
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          reject(ApiError.internal(error?.message ?? 'Upload failed'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
          resourceType: result.resource_type,
        });
      },
    );
    stream.end(buffer);
  });
}

/** Remove an asset by public id (best-effort; used when replacing media). */
export async function deleteAsset(publicId: string, resourceType: 'image' | 'raw' = 'image'): Promise<void> {
  if (!env.cloudinary.enabled) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
