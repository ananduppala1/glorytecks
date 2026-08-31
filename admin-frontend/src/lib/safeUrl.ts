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

/**
 * Constrain a post-login redirect target to a path inside this app.
 *
 * `ProtectedRoute` remembers where an unauthenticated visitor was heading and
 * hands it back after sign-in. That value comes from the URL, so it is
 * attacker-supplied: a link to `https://admin.example.com//evil.test` gets
 * normalised by the browser to the path `//evil.test`, survives as
 * `location.state.from.pathname`, and is then handed to `navigate()` — which
 * treats a leading `//` as protocol-relative and sends the freshly
 * authenticated admin to another site. Backslashes behave the same way, which
 * is the bypass behind the react-router advisory this app cannot yet take the
 * fix for (it is a v7 major).
 *
 * So the target is validated here rather than trusted to the router: it must
 * be a single-slash absolute path, and anything else falls back to the app
 * root. That holds whatever version of the router is installed.
 */
export function safeRedirectPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || value === '') return fallback;

  // Backslashes are normalised to forward slashes by browsers and by some
  // routers, so `/\evil.test` is another spelling of `//evil.test`.
  const normalised = value.split(String.fromCharCode(92)).join('/');

  // Must be an absolute in-app path…
  if (!normalised.startsWith('/')) return fallback;
  // …and not protocol-relative, which is a different origin wearing a path's
  // clothes.
  if (normalised.startsWith('//')) return fallback;
  // A scheme cannot appear in a path; if one does, this is not a path.
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(normalised)) return fallback;
  // Control characters and whitespace are how a scheme gets smuggled past a
  // prefix check while browsers still honour it.
  // eslint-disable-next-line no-control-regex
  if (/[\s\u0000-\u0020\u007f-\u009f]/.test(normalised)) return fallback;
  if (normalised.length > 512) return fallback;

  return normalised;
}
