/**
 * Scheme checking for URLs that came out of the database.
 *
 * Media URLs are stored strings. The backend now refuses to write an unsafe
 * one, but the admin panel also renders rows written before that guard existed,
 * and it is the surface where a stored `javascript:` URI would do the most
 * damage: an admin clicking a content writer's "View file" link runs script in
 * the admin SPA, with the session it holds.
 *
 * So the admin never puts a raw stored string into `href` or `src`. This is a
 * defence in depth check, not the primary one — the primary one is server-side.
 */

const SAFE_SCHEME = /^(https?:\/\/|\/(?!\/))/i;

/**
 * Return `url` when it is safe to use as an `href`/`src`, otherwise undefined.
 *
 * Accepts absolute http(s) URLs and same-origin paths. Rejects `javascript:`,
 * `data:`, `blob:`, `vbscript:`, protocol-relative URLs, and anything hiding a
 * scheme behind whitespace or control characters.
 */
export function safeAssetUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const value = String(url).trim();
  if (!value) return undefined;

  // Control characters are stripped deliberately: a tab or newline spliced into
  // a scheme name is ignored by browsers but defeats a naive prefix test.
  // eslint-disable-next-line no-control-regex
  const probe = value.replace(/[\s\u0000-\u0020\u007f-\u009f\u200b-\u200f\u202a-\u202e\ufeff]/g, '');
  if (!SAFE_SCHEME.test(probe)) return undefined;
  return value;
}
