import { PaginationMeta } from './ApiResponse';
import { SortSpec } from '../repositories/BaseRepository';
import { env } from '../config/env';

export interface ListParams {
  page: number;
  limit: number;
  sort: Record<string, 1 | -1>;
  search?: string;
  filters: Record<string, unknown>;
}

/**
 * Parse Express query params into a normalised ListParams object.
 *
 * This is the LAST line of defence, not the only one: `listQueryValidator`
 * rejects an out-of-range page or an oversized search term before a handler
 * runs, so a caller is told rather than silently given a different request.
 * The clamping here stays because this function is reachable from public
 * endpoints that predate that validator, and because a parser that can return
 * an unbounded offset is a hazard regardless of who calls it.
 *
 * Every value is bounded, and anything that is not a scalar is dropped rather
 * than coerced — `?featured[]=1&featured[]=2` arrives as an array, and
 * `String(['1','2'])` would silently become the filter `"1,2"`.
 */
export function parseListParams(
  query: Record<string, unknown>,
  allowedFilters: string[] = [],
): ListParams {
  const maxPage = env.payload.maxPage;
  const maxLimit = env.payload.maxLimit;

  const page = clampInt(query.page, 1, maxPage, 1);
  const limit = clampInt(query.limit, 1, maxLimit, 20);

  const sort = parseSort(query.sort);

  const filters: Record<string, unknown> = {};
  for (const key of allowedFilters) {
    const val = query[key];
    if (val === undefined || val === '' || val === 'all') continue;
    // Only scalars become filters. An array or object here is either a client
    // bug or an attempt to reach a query operator, and neither should be
    // guessed at.
    if (typeof val !== 'string' && typeof val !== 'number' && typeof val !== 'boolean') continue;
    if (typeof val === 'string' && val.length > MAX_FILTER_VALUE_LENGTH) continue;
    if (val === 'true' || val === 'false') filters[key] = val === 'true';
    else filters[key] = val;
  }

  const rawSearch = query.q ?? query.search;
  const search =
    typeof rawSearch === 'string' && rawSearch.trim()
      ? rawSearch.trim().slice(0, env.payload.maxSearchLength)
      : undefined;

  return { page, limit, sort, search, filters };
}

/** Longest value accepted for an exact-match filter. */
const MAX_FILTER_VALUE_LENGTH = 200;

/** A field name that could name a column. Anything else is not worth parsing. */
const SORT_TOKEN_RE = /^-?[A-Za-z][A-Za-z0-9_.]*$/;

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  if (typeof raw !== 'string' && typeof raw !== 'number') return fallback;
  const parsed = typeof raw === 'number' ? Math.trunc(raw) : parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Parse `?sort=-createdAt,title` into an ordered map.
 *
 * Bounded in two ways that matter. The token shape is checked here rather than
 * left to the repository's column lookup, so a hostile field name never
 * becomes part of a PostgREST request at all; and the number of keys is
 * capped, because each one becomes another `ORDER BY` clause and a caller
 * could otherwise send thousands in a single URL.
 */
function parseSort(raw: unknown): Record<string, 1 | -1> {
  const sort: Record<string, 1 | -1> = {};
  if (typeof raw !== 'string' || !raw.trim()) return { createdAt: -1 };

  const tokens = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, env.payload.maxSortKeys);

  for (const token of tokens) {
    if (!SORT_TOKEN_RE.test(token)) continue;
    if (token.startsWith('-')) sort[token.slice(1)] = -1;
    else sort[token] = 1;
  }

  if (Object.keys(sort).length === 0) sort.createdAt = -1;
  return sort;
}

/**
 * Convert the parsed `{ field: 1 | -1 }` sort map into the ordered list the
 * repository applies. Object key order is insertion order for string keys, so
 * a multi-key sort such as "?sort=order,-createdAt" keeps its precedence.
 *
 * Unknown field names are NOT filtered here — the repository resolves each
 * against its table definition and silently drops anything unrecognised, which
 * is both the injection guard and a match for Mongo's behaviour of ignoring
 * sort keys that do not exist on the schema.
 */
export function toSortSpecs(sort: Record<string, 1 | -1>): SortSpec[] {
  return Object.entries(sort).map(([field, direction]) => ({ field, direction }));
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: hasNext,
    hasPrevPage: hasPrev,
    // Aliases the frontend DataTable reads (meta.hasNext / meta.hasPrev).
    hasNext,
    hasPrev,
  };
}
