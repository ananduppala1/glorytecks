// ─────────────────────────────────────────────────────────────────────────────
// Low-level HTTP client for the GloryTecks backend API.
//
// Every request goes through here so that base URL, the `{ success, data, meta }`
// envelope, query-string building, caching policy and error handling live in
// exactly one place.
//
// Migration note (React/Vite → Next.js):
//   • `import.meta.env.VITE_API_BASE_URL` became `NEXT_PUBLIC_API_BASE_URL`,
//     plus an optional server-only `API_BASE_URL` for private networking.
//   • The same module now runs in two places — Server Components (Node) and the
//     browser — so it also carries Next's `next: { revalidate, tags }` cache
//     options. The request/response contract is byte-for-byte unchanged.
// ─────────────────────────────────────────────────────────────────────────────

const normalise = (url: string) => url.trim().replace(/\/+$/, '');

/**
 * Server-side calls prefer API_BASE_URL (may be a private address); the browser
 * always uses NEXT_PUBLIC_API_BASE_URL. Both fall back to the local backend so
 * `npm run dev` works with no configuration, exactly as the React app did.
 */
export const API_BASE_URL = normalise(
  (typeof window === 'undefined'
    ? process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL
    : process.env.NEXT_PUBLIC_API_BASE_URL) || 'http://localhost:5000/api/v1',
);

/** Browser-safe base URL — used for links the user's browser must resolve. */
export const PUBLIC_API_BASE_URL = normalise(
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1',
);

/**
 * Revalidation windows, derived from the backend's own cache tiers
 * (see backend `src/routes/public.routes.ts` and `src/lib/cache.ts`):
 *
 *   FAST    — endpoints the backend marks `must-revalidate` because editors
 *             expect their saves to appear immediately (settings, about,
 *             batches, testimonials, placements, faqs, localities, trainers,
 *             companies, legal, roadmaps, comparisons, gallery).
 *   CONTENT — endpoints the backend edge-caches (blogs, courses). Redis holds
 *             them for 10–15 minutes and is purged on every admin mutation.
 *
 * Both are overridable per deployment without touching code.
 */
const toSeconds = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const REVALIDATE = {
  FAST: toSeconds(process.env.REVALIDATE_FAST, 60),
  CONTENT: toSeconds(process.env.REVALIDATE_CONTENT, 300),
} as const;

/** Shape of the backend's uniform success envelope. */
interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

/**
 * Pagination metadata returned by the backend's `buildPaginationMeta()`.
 * `hasNext`/`hasPrev` are aliases the backend emits alongside the long forms.
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  hasNext?: boolean;
  hasPrev?: boolean;
}

/** A failed API call — carries the HTTP status (0 for network errors). */
export class ApiError extends Error {
  status: number;
  isNetworkError: boolean;

  constructor(message: string, status: number, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }

  get isNotFound() {
    return this.status === 404;
  }
}

export type QueryValue = string | number | boolean | undefined | null;
export type QueryParams = Record<string, QueryValue>;

function buildQuery(params?: QueryParams): string {
  if (!params) return '';
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    usp.append(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
  /** Seconds before Next.js revalidates this response. Defaults to CONTENT. */
  revalidate?: number;
  /** Cache tags, for future on-demand revalidation from an admin webhook. */
  tags?: string[];
  /** Opt out of caching entirely (used for mutations). */
  noStore?: boolean;
}

/**
 * Perform an API request and return the unwrapped `data` payload.
 * Pagination `meta` is available via {@link requestWithMeta}.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data } = await requestWithMeta<T>(path, options);
  return data;
}

export async function requestWithMeta<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta?: PaginationMeta }> {
  const { method = 'GET', params, body, signal, revalidate, tags, noStore } = options;
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}${buildQuery(params)}`;

  const isMutation = method !== 'GET';

  // Next.js only honours `next.revalidate` on GETs; mutations are never cached.
  const cacheOptions =
    isMutation || noStore
      ? ({ cache: 'no-store' } as const)
      : ({ next: { revalidate: revalidate ?? REVALIDATE.CONTENT, ...(tags ? { tags } : {}) } } as const);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...cacheOptions,
    });
  } catch {
    // Network failure / CORS / server unreachable. The underlying message is
    // deliberately dropped: fetch reports the failing host and port through the
    // error's `cause`, and nothing on this site needs that text — while any
    // future component that decided to render the message would publish it.
    throw new ApiError('Network request failed', 0, true);
  }

  let payload: ApiEnvelope<T> | undefined;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = undefined;
  }

  if (!response.ok || !payload?.success) {
    const message = payload?.message || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return { data: payload.data, meta: payload.meta };
}

export const apiClient = { request, requestWithMeta, API_BASE_URL };
