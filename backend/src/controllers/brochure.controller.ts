import { Request, Response } from 'express';
import https from 'https';
import { IncomingMessage } from 'http';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { courseRepo, brochureRepo } from '../repositories';
import { CONTENT_STATUS } from '../constants';
import { cacheWrap, CACHE_TTL } from '../lib/cache';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { isAllowedMediaHost } from '../utils/mediaUrl';

interface BrochureInfo {
  url: string;
  title: string;
}

/** Give up rather than hold a socket open indefinitely. */
const UPSTREAM_TIMEOUT_MS = 15_000;
/** Refuse to relay more than a brochure could plausibly be. */
const MAX_STREAM_BYTES = env.upload.docMaxBytes;
/** Cloudinary answers with a redirect in some delivery configurations. */
const MAX_REDIRECTS = 3;

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
 * Removes characters that are invalid or problematic in filenames — including
 * CR/LF, which would otherwise let a stored title inject response headers.
 */
function safeFilename(name: string): string {
  return (
    name
      .replace(/[^a-zA-Z0-9_\-. ]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 120) || 'brochure'
  );
}

/**
 * Decide whether we are willing to make a server-side request to `raw`.
 *
 * This endpoint is anonymous and it makes an outbound request on the caller's
 * behalf, so the stored URL is the pivot: whoever can write `brochure_url` can
 * otherwise aim the server at any address reachable from it — cloud metadata
 * endpoints, internal services, an attacker's collector — and read the reply
 * through the response body.
 *
 * Writes are constrained by `guardMediaUrls`, but this check is deliberately
 * repeated here rather than assumed: rows predating that guard, or written by
 * a future path that bypasses it, must still not become an SSRF primitive.
 */
function assertFetchable(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw ApiError.notFound('No brochure found for this course');
  }
  if (url.protocol !== 'https:' || !isAllowedMediaHost(url.hostname)) {
    logger.error('Brochure proxy refused a non-approved upstream URL', {
      host: url.hostname,
      protocol: url.protocol,
    });
    // Deliberately indistinguishable from "no brochure": the caller learns
    // nothing about what is stored or which hosts are approved.
    throw ApiError.notFound('No brochure found for this course');
  }
  return url;
}

/** GET the URL, following only redirects that stay on an approved host. */
function fetchUpstream(url: URL, depth = 0): Promise<IncomingMessage> {
  return new Promise<IncomingMessage>((resolve, reject) => {
    const request = https.get(
      url,
      { timeout: UPSTREAM_TIMEOUT_MS, headers: { Accept: 'application/pdf' } },
      (upstream) => {
        const status = upstream.statusCode ?? 0;

        if (status >= 300 && status < 400 && upstream.headers.location) {
          upstream.resume(); // drain
          if (depth >= MAX_REDIRECTS) {
            reject(ApiError.notFound('No brochure found for this course'));
            return;
          }
          let next: URL;
          try {
            next = new URL(upstream.headers.location, url);
          } catch {
            reject(ApiError.notFound('No brochure found for this course'));
            return;
          }
          // Re-validate every hop: an approved host redirecting elsewhere is
          // exactly the bypass this endpoint has to survive.
          if (next.protocol !== 'https:' || !isAllowedMediaHost(next.hostname)) {
            logger.error('Brochure proxy refused a redirect off the approved hosts', {
              host: next.hostname,
            });
            reject(ApiError.notFound('No brochure found for this course'));
            return;
          }
          fetchUpstream(next, depth + 1).then(resolve, reject);
          return;
        }

        if (status < 200 || status >= 300) {
          upstream.resume();
          logger.error('Brochure proxy: upstream returned an error status', { status });
          reject(ApiError.internal('Failed to fetch brochure file'));
          return;
        }

        resolve(upstream);
      },
    );

    request.on('timeout', () => {
      request.destroy();
      reject(ApiError.internal('Failed to fetch brochure file'));
    });
    request.on('error', (err) => {
      logger.error('Brochure proxy: connection error', { reason: err.message });
      reject(ApiError.internal('Could not connect to file storage'));
    });
  });
}

/**
 * Public controller that proxies/streams course brochure PDFs so that the
 * Cloudinary URL is never exposed to the end user's browser address bar.
 *
 * GET /api/v1/public/brochures/:courseSlug/download
 */
export const brochureProxyController = {
  stream: asyncHandler(async (req: Request, res: Response) => {
    const rawSlug = String(req.params.courseSlug ?? '').toLowerCase();
    // The slug becomes part of a Redis key on an anonymous, high-volume
    // endpoint; constrain it so a caller cannot mint unbounded cache entries
    // or smuggle separators into the key namespace.
    if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(rawSlug)) {
      throw ApiError.notFound('No brochure found for this course');
    }

    const info = await resolveBrochureUrl(rawSlug);
    if (!info) throw ApiError.notFound('No brochure found for this course');

    const url = assertFetchable(info.url);
    const filename = `${safeFilename(info.title)}-Brochure.pdf`;
    const disposition = req.query.dl === '1' ? 'attachment' : 'inline';

    const upstream = await fetchUpstream(url);

    // The upstream Content-Type is NOT forwarded. Whatever Cloudinary holds at
    // that path, this endpoint serves it from the API's own origin — the
    // origin that carries the admin refresh cookie and has CSP disabled. An
    // `image/svg+xml` or `text/html` reply relayed verbatim and rendered
    // inline would execute in that origin. This endpoint has exactly one
    // content type.
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Belt and braces: even a PDF viewer gets no ambient authority here.
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day

    const declaredLength = Number(upstream.headers['content-length']);
    if (Number.isFinite(declaredLength)) {
      if (declaredLength > MAX_STREAM_BYTES) {
        upstream.destroy();
        logger.error('Brochure proxy: upstream body exceeds the relay limit', {
          bytes: declaredLength,
        });
        throw ApiError.internal('Failed to fetch brochure file');
      }
      res.setHeader('Content-Length', String(declaredLength));
    }

    await new Promise<void>((resolve, reject) => {
      let relayed = 0;

      upstream.on('data', (chunk: Buffer) => {
        relayed += chunk.length;
        // A chunked reply declares no length, so enforce the cap as it flows.
        if (relayed > MAX_STREAM_BYTES) {
          upstream.destroy();
          res.destroy();
          reject(ApiError.internal('Failed to fetch brochure file'));
        }
      });
      upstream.on('error', (err) => {
        logger.error('Brochure proxy: stream error', { reason: err.message });
        reject(ApiError.internal('Error streaming brochure file'));
      });
      upstream.on('end', resolve);
      res.on('close', () => upstream.destroy());

      upstream.pipe(res);
    });
  }),
};
