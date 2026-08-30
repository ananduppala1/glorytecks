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
  if (!src) return false;
  if (!/^https?:\/\//i.test(src)) return true;
  try {
    return ALLOWED_IMAGE_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}
