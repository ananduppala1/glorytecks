/**
 * Re-enable the cache for the one suite that needs a live Redis client.
 *
 * `setup.ts` sets CACHE_ENABLED=false so no test accidentally depends on a
 * cache. That is the right default and the wrong one for `rateLimitRedis`,
 * whose whole purpose is to drive the Redis branch. Import declarations are
 * hoisted and execute in order, so importing this AFTER './setup' is what makes
 * the override stick — the same ordering trick `rateLimitEnv.ts` relies on.
 */
process.env.CACHE_ENABLED = 'true';
process.env.RATE_LIMIT_FAIL_MODE = 'degrade';
process.env.REDIS_KEY_PREFIX = 'gt:';
