import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

/**
 * Redis client singleton. Used exclusively as a caching layer.
 * If Redis is unavailable the application continues to serve requests
 * directly from MongoDB — cache operations silently degrade to no-ops.
 */

let redisClient: Redis | null = null;
let isReady = false;

export function getRedisClient(): Redis | null {
  return redisClient;
}

export function isRedisReady(): boolean {
  return isReady;
}

/**
 * Connect to Redis. Safe to call multiple times — returns the existing client
 * if already connected. Failures are logged but never throw.
 */
export async function connectRedis(): Promise<void> {
  if (!env.redis.enabled) {
    logger.info('Redis caching is disabled (CACHE_ENABLED=false)');
    return;
  }

  try {
    redisClient = new Redis(env.redis.url, {
      keyPrefix: env.redis.keyPrefix,
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        // Exponential backoff capped at 10 s.
        const delay = Math.min(times * 500, 10_000);
        logger.warn(`Redis reconnect attempt ${times} in ${delay}ms`);
        return delay;
      },
      // Don't throw on initial connect failure — the app works without cache.
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    redisClient.on('ready', () => {
      isReady = true;
      logger.info('Redis ready');
    });

    redisClient.on('error', (err) => {
      logger.error(`Redis error: ${err.message}`);
    });

    redisClient.on('close', () => {
      isReady = false;
      logger.warn('Redis connection closed');
    });

    await redisClient.connect();
  } catch (err) {
    isReady = false;
    logger.error(`Redis connection failed: ${(err as Error).message} — running without cache`);
  }
}

/**
 * Gracefully disconnect Redis during shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      // Ignore errors during shutdown.
    }
    isReady = false;
    redisClient = null;
    logger.info('Redis disconnected');
  }
}
