// ─────────────────────────────────────────────────────────────────────────────
// Slug policy for slug-keyed routes.
//
// Pure, so the rules are unit-tested without a backend (crawl.test.ts).
//
// NOTE — case variants of CMS slugs (`/courses/Data-Science`) are deliberately
// NOT redirected from the page. The backend resolves slugs case-insensitively,
// so a variant renders the real page with its lowercase canonical. A
// page-level permanentRedirect() was tried in Phase 1 and removed: the ISR
// render of the variant is cached as a 308, and wherever the cache key folds
// case (the file-system cache on a case-insensitive disk did, verified
// locally) the canonical URL itself starts answering with a 308 to itself.
// The canonical already consolidates the variant; a redirect loop on a money
// page is not a risk worth that. See docs/SEO_PHASE_1_FINAL_VERIFICATION.md.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Whether a slug-keyed route should render or 404, given the slugs that exist.
 *
 * An empty `known` list means the lookup failed or returned nothing: the
 * route renders rather than 404ing, because an outage must not turn every
 * valid URL into a 404 — the same rule the blog archive follows.
 */
export function knownSlugStatus(slug: string, known: readonly string[]): 200 | 404 {
  if (known.length === 0) return 200;
  return known.includes(slug) ? 200 : 404;
}
