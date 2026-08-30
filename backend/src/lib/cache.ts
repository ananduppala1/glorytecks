import crypto from 'crypto';
import { getRedisClient, isRedisReady } from '../config/redis';
import { logger } from '../config/logger';
import { env } from '../config/env';

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
    logger.warn(`Cache GET failed for key "${key}": ${(err as Error).message}`);
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
    logger.warn(`Cache SET failed for key "${key}": ${(err as Error).message}`);
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
    logger.warn(`Cache DEL failed for key "${key}": ${(err as Error).message}`);
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
    logger.warn(`Cache pattern DEL failed for "${pattern}": ${(err as Error).message}`);
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
 * Build a deterministic hash from an object (e.g. query params) to use as
 * a cache key segment. Produces a short, URL-safe string.
 */
export function hashQuery(params: Record<string, unknown>): string {
  const sorted = JSON.stringify(params, Object.keys(params).sort());
  return crypto.createHash('md5').update(sorted).digest('hex').slice(0, 12);
}
