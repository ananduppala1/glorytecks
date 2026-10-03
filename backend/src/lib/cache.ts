import crypto from 'crypto';
import { getRedisClient, isRedisReady } from '../config/redis';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { redactText } from '../utils/redact';

/* ── TTL Defaults (seconds) ──────────────────────────────────────────────── */
export const CACHE_TTL = {
  SETTINGS: 1800,      // 30 min — singleton, rarely changes
  COURSES: 900,        // 15 min — infrequently updated, high reads
  BLOGS: 600,          // 10 min — updated more often
  SIMPLE: 900,         // 15 min — generic collections
  DASHBOARD: 120,      // 2  min — contains lead counts
} as const;

/* ── Core Operations ─────────────────────────────────────────────────────── */

/**
 * Retrieve a cached value by key. Returns null on miss or Redis failure.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!env.redis.enabled || !isRedisReady()) return null;
  try {
    const client = getRedisClient();
    if (!client) return null;
    const raw = await client.get(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn(`Cache GET failed for key "${key}": ${redactText((err as Error).message)}`);
    return null;
  }
}

/**
 * Store a value in cache with the given TTL. Silently fails if Redis is down.
 */
export async function cacheSet(key: string, data: unknown, ttlSeconds: number): Promise<void> {
  if (!env.redis.enabled || !isRedisReady()) return;
  try {
    const client = getRedisClient();
    if (!client) return;
    await client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn(`Cache SET failed for key "${key}": ${redactText((err as Error).message)}`);
  }
}

/**
 * Delete a single cache key.
 */
export async function cacheDelete(key: string): Promise<void> {
  if (!env.redis.enabled || !isRedisReady()) return;
  try {
    const client = getRedisClient();
    if (!client) return;
    await client.del(key);
  } catch (err) {
    logger.warn(`Cache DEL failed for key "${key}": ${redactText((err as Error).message)}`);
  }
}

/**
 * Delete all cache keys matching a glob pattern using SCAN (non-blocking).
 * The pattern should NOT include the key prefix — it is added automatically.
 */
export async function cacheDeletePattern(pattern: string): Promise<void> {
  if (!env.redis.enabled || !isRedisReady()) return;
  try {
    const client = getRedisClient();
    if (!client) return;

    // ioredis applies keyPrefix transparently to GET/SET/DEL, but SCAN
    // operates on raw Redis keys. We must prepend the prefix ourselves.
    const fullPattern = `${env.redis.keyPrefix}${pattern}`;
    const prefixLen = env.redis.keyPrefix.length;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        // Strip the prefix because ioredis will re-add it on DEL.
        const unprefixed = keys.map((k) => k.slice(prefixLen));
        await client.del(...unprefixed);
      }
    } while (cursor !== '0');
  } catch (err) {
    logger.warn(`Cache pattern DEL failed for "${pattern}": ${redactText((err as Error).message)}`);
  }
}

/**
 * Cache-aside (read-through) wrapper.
 * 1. Try cache → return if hit.
 * 2. On miss → call `fetcher()` to get data from DB.
 * 3. Store result in cache with the given TTL.
 * 4. Return the data.
 *
 * If Redis is unavailable, `fetcher()` is always called directly.
 */
export async function cacheWrap<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  // Try cache first.
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  // Cache miss — fetch from source.
  const data = await fetcher();

  // Store in cache (fire-and-forget; don't delay response).
  void cacheSet(key, data, ttlSeconds);

  return data;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/**
 * Stable, order-independent serialisation of an arbitrary value.
 *
 * Object keys are sorted at EVERY level so `{a:1,b:2}` and `{b:2,a:1}` produce
 * the same string. Arrays keep their order, because order is meaningful in a
 * sort spec.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

/**
 * Build a deterministic hash from an object (e.g. query params) to use as
 * a cache key segment. Produces a short, URL-safe string.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BUG FIX — this function previously collided every filtered query onto one key.
 *
 * It was:
 *     JSON.stringify(params, Object.keys(params).sort())
 *
 * When `JSON.stringify` is given an ARRAY as its second argument, that array is
 * a property allow-list, and it is applied at EVERY level of nesting — not just
 * the top. `params` looks like:
 *
 *     { page, limit, sort, search, filters: { categorySlug, kind, status, … } }
 *
 * `Object.keys(params)` is the top-level names only, so none of the keys inside
 * `filters` survived the allow-list and `filters` serialised as `{}`. Every
 * public blog list query with the same page/limit/sort/search therefore hashed
 * to an identical cache key:
 *
 *     ?categorySlug=python  ─┐
 *     ?categorySlug=aws     ─┼─→  public:blogs:list:e9c5ec9ea405
 *     ?kind=salary          ─┘
 *
 * Observed live: /public/blogs?categorySlug=aws returned 50 PYTHON articles,
 * because a python request had populated the key first. Every blog category
 * archive served whatever was cached first, under its own title, H1 and
 * canonical — twelve pages of identical content claiming twelve topics.
 *
 * Sorting keys recursively instead keeps the intended behaviour (key order must
 * not change the hash) without the allow-list semantics.
 * ────────────────────────────────────────────────────────────────────────────
 */
export function hashQuery(params: Record<string, unknown>): string {
  return crypto.createHash('md5').update(stableStringify(params)).digest('hex').slice(0, 16);
}
