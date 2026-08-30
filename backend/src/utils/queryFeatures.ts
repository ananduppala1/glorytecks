import { PaginationMeta } from './ApiResponse';
import { SortSpec } from '../repositories/BaseRepository';

export interface ListParams {
  page: number;
  limit: number;
  sort: Record<string, 1 | -1>;
  search?: string;
  filters: Record<string, unknown>;
}

const MAX_LIMIT = 100;

/**
 * Parse Express query params into a normalised ListParams object.
 * Supports: page, limit, sort (e.g. "-createdAt,title"), q/search, and any
 * explicit field filters passed through `allowedFilters`.
 *
 * Unchanged from the pre-migration implementation — this is the request half
 * of the API contract the admin frontend's DataTable depends on.
 */
export function parseListParams(
  query: Record<string, unknown>,
  allowedFilters: string[] = [],
): ListParams {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));

  const sort: Record<string, 1 | -1> = {};
  const sortStr = String(query.sort ?? '-createdAt');
  for (const token of sortStr.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (token.startsWith('-')) sort[token.slice(1)] = -1;
    else sort[token] = 1;
  }
  if (Object.keys(sort).length === 0) sort.createdAt = -1;

  const filters: Record<string, unknown> = {};
  for (const key of allowedFilters) {
    const val = query[key];
    if (val !== undefined && val !== '' && val !== 'all') {
      if (val === 'true' || val === 'false') filters[key] = val === 'true';
      else filters[key] = val;
    }
  }

  const search = (query.q ?? query.search) ? String(query.q ?? query.search).trim() : undefined;

  return { page, limit, sort, search, filters };
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
