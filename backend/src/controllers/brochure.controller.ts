import { Request, Response } from 'express';
import https from 'https';
import http from 'http';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { courseRepo, brochureRepo } from '../repositories';
import { CONTENT_STATUS } from '../constants';
import { cacheWrap, CACHE_TTL } from '../lib/cache';
import { logger } from '../config/logger';

interface BrochureInfo {
  url: string;
  title: string;
}

/**
 * Resolve the Cloudinary URL for a course brochure.
 *
 * Lookup order (unchanged):
 *  1. `courses.brochure_url` for the given slug.
 *  2. `brochures.file_url` where `course_slug` matches.
 *
 * The result is cached so repeated downloads don't hit the database each time.
 */
async function resolveBrochureUrl(courseSlug: string): Promise<BrochureInfo | null> {
  const cacheKey = `brochure:resolve:${courseSlug}`;

  return cacheWrap(cacheKey, CACHE_TTL.COURSES, async (): Promise<BrochureInfo | null> => {
    // 1. Check the course record first.
    const course = await courseRepo.findOne(
      { slug: courseSlug, status: CONTENT_STATUS.PUBLISHED },
      { fields: ['brochureUrl', 'title'] },
    );

    if (course?.brochureUrl) {
      return { url: course.brochureUrl, title: course.title ?? courseSlug };
    }

    // 2. Fall back to the standalone brochures table.
    const brochure = await brochureRepo.findOne(
      { courseSlug, isActive: true },
      { fields: ['fileUrl', 'title'] },
    );

    if (brochure?.fileUrl) {
      return { url: brochure.fileUrl, title: brochure.title ?? courseSlug };
    }

    return null;
  });
}

/**
 * Sanitise a string for use in a Content-Disposition filename.
 * Removes characters that are invalid or problematic in filenames.
 */
function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-. ]/g, '').replace(/\s+/g, '-');
}

/**
 * Public controller that proxies/streams course brochure PDFs so that the
 * Cloudinary URL is never exposed to the end user's browser address bar.
 *
 * Cloudinary remains the file store — this endpoint only reads the URL out of
 * PostgreSQL instead of MongoDB.
 *
 * GET /api/v1/public/brochures/:courseSlug/download
 */
export const brochureProxyController = {
  stream: asyncHandler(async (req: Request, res: Response) => {
    const courseSlug = req.params.courseSlug.toLowerCase();

    const info = await resolveBrochureUrl(courseSlug);
    if (!info) {
      throw ApiError.notFound('No brochure found for this course');
    }

    const filename = `${safeFilename(info.title)}-Brochure.pdf`;

    // Determine whether to force a download or display inline.
    // Default is inline (opens in the browser's PDF viewer); the caller can
    // request a download by appending `?dl=1` to the URL.
    const disposition = req.query.dl === '1' ? 'attachment' : 'inline';

    // Fetch the PDF from Cloudinary and stream it to the client.
    const getter = info.url.startsWith('https') ? https.get : http.get;

    await new Promise<void>((resolve, reject) => {
      getter(info.url, (upstream) => {
        if (!upstream.statusCode || upstream.statusCode >= 400) {
          logger.error(
            `Brochure proxy: Cloudinary returned ${upstream.statusCode} for ${courseSlug}`,
          );
          reject(ApiError.internal('Failed to fetch brochure file'));
          upstream.resume(); // drain the stream
          return;
        }

        // Forward Content-Type from Cloudinary, or default to PDF.
        const contentType = upstream.headers['content-type'] || 'application/pdf';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day

        // Forward Content-Length if Cloudinary provides it (enables progress bars).
        if (upstream.headers['content-length']) {
          res.setHeader('Content-Length', upstream.headers['content-length']);
        }

        upstream.pipe(res);

        upstream.on('end', resolve);
        upstream.on('error', (err) => {
          logger.error(`Brochure proxy: stream error for ${courseSlug}`, err);
          reject(ApiError.internal('Error streaming brochure file'));
        });
      }).on('error', (err) => {
        logger.error(`Brochure proxy: connection error for ${courseSlug}`, err);
        reject(ApiError.internal('Could not connect to file storage'));
      });
    });
  }),
};
