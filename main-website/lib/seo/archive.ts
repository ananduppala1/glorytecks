// ─────────────────────────────────────────────────────────────────────────────
// Blog archive URL policy.
//
// Pure decision logic for `/blog` and `/blog/category/{slug}`: how a `?page=`
// value is parsed, when a request is a 404 rather than an empty 200, and
// whether a given combination of query parameters may be indexed.
//
// Kept free of React, fetch and Next so the rules are unit-testable — see
// archive.test.ts. The page files apply the decision; they do not make it.
// ─────────────────────────────────────────────────────────────────────────────
import { canonicalPath } from './canonical';
import { CANONICAL_QUERY_ORDER } from './routes';

export type SortKey = 'latest' | 'popular';

/** Upper bound on a page number we will even ask the backend about. */
export const MAX_PAGE = 10_000;

export type PageParam =
  | { ok: true; page: number; explicit: boolean }
  | { ok: false; reason: 'malformed' };

/**
 * Parse `?page=`.
 *
 * Accepts only a canonical positive integer with no leading zeros. `0`, `-1`,
 * `1.5`, `abc`, `01`, ` 2` and anything above {@link MAX_PAGE} are malformed —
 * they are not "page 1", they are URLs that should never have existed, and
 * silently serving page 1 at each of them creates unlimited duplicates.
 *
 * An array value (`?page=1&page=2`) is malformed for the same reason.
 */
export function parsePageParam(raw: string | string[] | undefined | null): PageParam {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: true, page: 1, explicit: false };
  }
  if (Array.isArray(raw)) return { ok: false, reason: 'malformed' };

  if (!/^[1-9][0-9]*$/.test(raw)) return { ok: false, reason: 'malformed' };

  const page = Number(raw);
  if (!Number.isSafeInteger(page) || page > MAX_PAGE) return { ok: false, reason: 'malformed' };

  return { ok: true, page, explicit: true };
}

export interface ArchiveFilters {
  q: string;
  tag: string;
  sort: SortKey;
}

/** True when any parameter turns the archive into a filtered / re-ordered view. */
export function isFiltered({ q, tag, sort }: ArchiveFilters): boolean {
  return Boolean(q || tag || sort === 'popular');
}

export interface ArchiveDecisionInput {
  basePath: string;
  page: PageParam;
  filters: ArchiveFilters;
  /** Total pages reported by the backend (>= 1), or null when the read failed. */
  totalPages: number | null;
  /**
   * Posts in the archive as the backend reports them, or null/undefined when
   * unknown. Only an explicit 0 counts as empty — an unknown total never
   * de-indexes anything.
   */
  totalItems?: number | null;
}

export interface ArchiveDecision {
  /** 404 means call notFound(); 200 means render. */
  status: 200 | 404;
  index: boolean;
  follow: boolean;
  /**
   * Canonical path, or null when the page must not advertise one.
   *
   * Filtered views get null rather than a canonical pointing at the clean
   * archive: they are already `noindex`, and Google's guidance is not to
   * combine `noindex` with a canonical to a different URL — the directive can
   * be attributed to the canonical target. `noindex, follow` plus no canonical
   * removes the duplicate from the index while still consolidating nothing
   * onto the wrong URL.
   */
  canonical: string | null;
  /** Page number to render; only meaningful when status is 200. */
  page: number;
}

/**
 * The whole policy for one archive request.
 *
 *   • malformed `?page=`                        → 404
 *   • `?page=` beyond the real last page        → 404 (no empty 200 pages)
 *   • `?q=` / `?tag=` / `?sort=popular` present → 200, noindex + follow, no canonical
 *   • the archive has no posts at all           → 200, noindex + follow, no canonical
 *   • otherwise                                 → 200, index + follow, self-canonical
 *
 * When `totalPages` is null the backend read failed. An outage must not
 * de-index the archive, so the request still renders (the page shows its error
 * state) and only page 1 is treated as valid.
 */
export function archiveDecision({
  basePath,
  page,
  filters,
  totalPages,
  totalItems,
}: ArchiveDecisionInput): ArchiveDecision {
  const filtered = isFiltered(filters);

  if (!page.ok) {
    return { status: 404, index: false, follow: true, canonical: null, page: 1 };
  }

  if (totalPages !== null && page.page > Math.max(1, totalPages)) {
    return { status: 404, index: false, follow: true, canonical: null, page: page.page };
  }

  // Backend unavailable: serve page 1's shell, refuse to invent deeper pages.
  if (totalPages === null && page.page > 1) {
    return { status: 404, index: false, follow: true, canonical: null, page: page.page };
  }

  if (filtered) {
    return { status: 200, index: false, follow: true, canonical: null, page: page.page };
  }

  // A real category with nothing in it yet. Indexing it would publish an empty
  // template — a soft 404 — so it stays a 200 (the category exists and will
  // fill up) but asks not to be indexed. The categories sitemap drops it too.
  if (totalItems === 0) {
    return { status: 200, index: false, follow: true, canonical: null, page: page.page };
  }

  return {
    status: 200,
    index: true,
    follow: true,
    canonical: canonicalPath(
      basePath,
      { page: page.page > 1 ? page.page : undefined },
      CANONICAL_QUERY_ORDER,
    ),
    page: page.page,
  };
}

/**
 * `rel=prev` / `rel=next` targets for a clean (unfiltered) archive page.
 * Filtered views get neither — they are noindex and their sequence is noise.
 */
export function paginationNeighbours(
  basePath: string,
  currentPage: number,
  totalPages: number,
  filtered: boolean,
): { prev?: string; next?: string } {
  if (filtered) return {};
  const at = (p: number) =>
    canonicalPath(basePath, { page: p > 1 ? p : undefined }, CANONICAL_QUERY_ORDER);
  return {
    prev: currentPage > 1 ? at(currentPage - 1) : undefined,
    next: currentPage < totalPages ? at(currentPage + 1) : undefined,
  };
}
