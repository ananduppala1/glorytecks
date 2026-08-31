/**
 * Scheme checking for CMS-supplied URLs.
 *
 * Every image, banner and link on this site comes from the admin API as a
 * string. The backend now refuses to store an unsafe one, but the site also
 * renders rows written before that guard existed, and rendering is where the
 * consequence lands: a `javascript:` href in blog text is a click away from
 * running on the marketing domain, and a `url(...)` value interpolated into a
 * style attribute can escape the CSS context entirely.
 *
 * Both functions fail closed and return `undefined`, so a caller that forgets
 * to handle the empty case renders nothing rather than something hostile.
 */

const SAFE_SCHEME = /^(https?:\/\/|\/(?!\/))/i;

/** Strip what browsers ignore but a naive prefix check would not. */
function probe(value: string): string {
  return value.replace(/[\s\u0000-\u0020\u007f-\u009f\u200b-\u200f\u202a-\u202e\ufeff]/g, '');
}

/**
 * A URL safe to place in `src` or `href`: an absolute http(s) URL, or a
 * same-origin path. Rejects `javascript:`, `data:`, `blob:`, `vbscript:` and
 * protocol-relative URLs.
 */
export function safeUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const value = String(url).trim();
  if (!value) return undefined;
  return SAFE_SCHEME.test(probe(value)) ? value : undefined;
}

/**
 * A URL safe to interpolate into a CSS `url(...)`.
 *
 * Stricter than `safeUrl`: quotes, parentheses, backslashes and semicolons
 * would let the value close the `url()` and add declarations of its own, so a
 * URL containing any of them is refused rather than escaped.
 */
export function safeCssUrl(url: string | undefined | null): string | undefined {
  const value = safeUrl(url);
  if (!value) return undefined;
  if (/["'()\\;]/.test(value)) return undefined;
  return value;
}
