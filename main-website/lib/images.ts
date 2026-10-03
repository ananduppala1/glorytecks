// ─────────────────────────────────────────────────────────────────────────────
// Image host policy.
//
// The backend hands the website absolute image URLs — today they are Cloudinary
// secure URLs, and this migration deliberately leaves that infrastructure
// untouched (no re-hosting, no URL rewriting).
//
// next/image refuses to render a remote host that is not declared in
// next.config.mjs, which would turn an editor pasting a URL from a new host
// into a hard 500. `canOptimise()` lets components degrade to a plain <img>
// instead: the image still renders, it just skips optimisation.
//
// Keep this list in sync with `imageHosts` in next.config.mjs.
// ─────────────────────────────────────────────────────────────────────────────

import { safeUrl } from '@/lib/safeUrl';

export const ALLOWED_IMAGE_HOSTS = [
  'res.cloudinary.com',
  ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean),
];

/**
 * True when `src` can safely go through next/image.
 *
 * Relative paths (`/logo.png`) and static imports are always safe — they are
 * served from this origin.
 */
export function canOptimise(src: string | undefined | null): boolean {
  // A URL that is not safe to render at all is certainly not safe to optimise.
  // The old check returned `true` for anything that did not start with http(s)
  // — which included `javascript:`, `data:` and protocol-relative URLs, all of
  // which then went straight into next/image as a "same-origin path".
  const safe = safeUrl(src);
  if (!safe) return false;
  if (!/^https?:\/\//i.test(safe)) return true;
  try {
    return ALLOWED_IMAGE_HOSTS.includes(new URL(safe).hostname);
  } catch {
    return false;
  }
}


/* ── Cloudinary delivery ──────────────────────────────────────────────────── */

/**
 * Serve Cloudinary images straight from Cloudinary, already optimised.
 *
 * Cloudinary IS an image CDN. Passing its URLs through `next/image` means the
 * bytes are fetched, re-encoded and re-served by Vercel's optimizer — paying
 * twice for one job, and on the Hobby plan that optimizer has a hard monthly
 * quota of source images. A CMS with a few hundred course banners and author
 * avatars can consume it for no benefit, and when the quota is exhausted the
 * images stop being optimised at all.
 *
 * Injecting Cloudinary's own transformation segment instead gives the same
 * result — modern format, quality selection, correct width — delivered from
 * Cloudinary's CDN, at zero Vercel image cost:
 *
 *   .../upload/v1699/course.jpg
 *   .../upload/f_auto,q_auto,c_limit,w_1200/v1699/course.jpg
 *
 *   f_auto   → AVIF/WebP by Accept header
 *   q_auto   → per-image quality, typically 30–60% smaller than the original
 *   c_limit  → never upscale past the source
 *   w_<n>    → the width `next/image` actually asked for
 *
 * Returns the URL unchanged when it is not a Cloudinary delivery URL, or when
 * a transformation is already present (an editor may have set one deliberately
 * — overriding it would be rude and could break a crop).
 */
export function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const marker = '/upload/';
  const at = src.indexOf(marker);
  if (at === -1 || !/^https:\/\/res\.cloudinary\.com\//.test(src)) return src;

  const head = src.slice(0, at + marker.length);
  const tail = src.slice(at + marker.length);

  // Already transformed — leave the editor's intent alone.
  if (/^[a-z]{1,3}_[^/]+\//.test(tail)) return src;

  const params = ['f_auto', `q_${quality ?? 'auto'}`, 'c_limit', `w_${width}`];
  return `${head}${params.join(',')}/${tail}`;
}

/** True when this URL should be delivered by Cloudinary rather than Vercel. */
export const isCloudinaryUrl = (src: string): boolean =>
  /^https:\/\/res\.cloudinary\.com\/.+\/upload\//.test(src);
