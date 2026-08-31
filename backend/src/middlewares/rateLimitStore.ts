import { createHash } from 'crypto';
import type { Store, ClientRateLimitInfo, Options } from 'express-rate-limit';
import { MemoryStore } from 'express-rate-limit';
import { getRedisClient, isRedisReady } from '../config/redis';
import { logger } from '../config/logger';
import { env } from '../config/env';

/**
 * Shared rate-limit state.
 *
 * express-rate-limit's default store keeps counters in the process heap. That
 * is fine for one long-running server and close to useless for this
 * deployment: the app is built to run on Vercel, where each concurrent
 * invocation is its own process, so a per-process counter means the effective
 * limit is `max × instances` — and on a cold start, `max` again from zero. An
 * attacker does not have to do anything clever to defeat it; they just have to
 * arrive while the platform is scaling.
 *
 * So counters live in Redis, which every instance already shares.
 *
 * WHEN REDIS IS DOWN
 * ------------------
 * The choice is not "fail open or fail closed" — both are wrong here. Failing
 * open would remove brute-force protection at exactly the moment the system is
 * least healthy; failing closed would turn a cache outage into a total
 * authentication outage, which is a self-inflicted denial of service.
 *
 * Instead this degrades to a per-process memory store and says so, loudly and
 * once per outage. Protection becomes weaker (per-instance rather than global)
 * but never absent, and the log line is the signal that the deployment is
 * running in a degraded posture rather than a safe one. `RATE_LIMIT_FAIL_MODE`
 * can force a stricter choice where an operator prefers it.
 */

/** Longest a single Redis call may take before we stop waiting for it. */
const REDIS_TIMEOUT_MS = 250;

/** Log at most one degradation warning per this interval, to avoid flooding. */
const DEGRADE_LOG_INTERVAL_MS = 60_000;

let lastDegradeLog = 0;

function noteDegraded(reason: string): void {
  const now = Date.now();
  if (now - lastDegradeLog < DEGRADE_LOG_INTERVAL_MS) return;
  lastDegradeLog = now;
  logger.error(
    'Rate limiting degraded to per-process counters — limits are no longer shared across instances',
    { reason, failMode: env.rateLimit.failMode },
  );
}

/**
 * Reduce a key's variable parts to a fixed-length digest.
 *
 * Two reasons, both load-bearing:
 *
 *  1. Nothing a caller supplies can shape the Redis key. An email, an IP or a
 *     user id goes in; 32 hex characters come out. There is no separator to
 *     smuggle, no length to abuse, and no way to collide with another
 *     limiter's namespace.
 *
 *  2. The identifier never appears in Redis in the clear. A rate-limit key
 *     built from a raw email would put every address that has attempted a
 *     login into the cache in plaintext, readable by anything with Redis
 *     access. Hashing keeps the counter useful and the identity out of it.
 */
export function hashKeyPart(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

/** Run a Redis call with a ceiling on how long it may block a request. */
async function withTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('redis timeout')), REDIS_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * INCR the counter and set its expiry on first use, in one round trip.
 *
 * A script rather than two commands because the alternative has a race: two
 * instances can both see `current === 1` and both set the TTL, or an instance
 * can crash between INCR and EXPIRE and leave a counter that never expires —
 * which locks the subject out permanently. That is exactly the outcome
 * requirement 6 rules out.
 */
const INCREMENT_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { current, ttl }
`;

/**
 * A store backed by Redis, falling back to a local memory store.
 *
 * One instance per limiter: `prefix` keeps each limiter's counters in their own
 * namespace so a login attempt cannot consume an upload's budget.
 */
export class SharedStore implements Store {
  /**
   * express-rate-limit asks whether keys are local to this instance. They are
   * not — that is the entire point — so it must not assume it can reason about
   * them locally.
   */
  localKeys = false;

  private windowMs = 60_000;
  private readonly fallback = new MemoryStore();
  private readonly namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
    this.fallback.init(options);
  }

  /** Full Redis key. ioredis does not apply `keyPrefix` to EVAL keys, so it is applied here. */
  private redisKey(key: string): string {
    return `${env.redis.keyPrefix}rl:${this.namespace}:${hashKeyPart(key)}`;
  }

  private usable(): boolean {
    if (env.rateLimit.failMode === 'local') return false;
    return env.redis.enabled && isRedisReady() && getRedisClient() !== null;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    if (!this.usable()) {
      if (env.redis.enabled) noteDegraded('redis not ready');
      return this.fallback.increment(key);
    }

    try {
      const client = getRedisClient();
      const result = (await withTimeout(
        client!.eval(INCREMENT_SCRIPT, 1, this.redisKey(key), String(this.windowMs)),
      )) as [number, number];

      const [totalHits, ttlMs] = result;
      return {
        totalHits: Number(totalHits),
        resetTime: new Date(Date.now() + Math.max(0, Number(ttlMs))),
      };
    } catch (err) {
      noteDegraded(err instanceof Error ? err.message : 'unknown redis error');
      return this.fallback.increment(key);
    }
  }

  /**
   * Give a hit back — used by `skipSuccessfulRequests`, so a successful login
   * does not spend the budget reserved for detecting failed ones.
   */
  async decrement(key: string): Promise<void> {
    if (!this.usable()) return this.fallback.decrement(key);
    try {
      const client = getRedisClient();
      await withTimeout(client!.decr(this.redisKey(key)));
    } catch {
      // A lost decrement makes the limit slightly stricter for one subject in
      // one window. Not worth failing a request that already succeeded.
      await this.fallback.decrement(key);
    }
  }

  async resetKey(key: string): Promise<void> {
    if (!this.usable()) return this.fallback.resetKey(key);
    try {
      const client = getRedisClient();
      await withTimeout(client!.del(this.redisKey(key)));
    } catch {
      await this.fallback.resetKey(key);
    }
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    if (!this.usable()) return this.fallback.get?.(key);
    try {
      const client = getRedisClient();
      const [hits, ttl] = (await withTimeout(
        client!.multi().get(this.redisKey(key)).pttl(this.redisKey(key)).exec(),
      )) as unknown as [[Error | null, string | null], [Error | null, number]];
      const total = Number(hits?.[1] ?? 0);
      if (!total) return undefined;
      return {
        totalHits: total,
        resetTime: new Date(Date.now() + Math.max(0, Number(ttl?.[1] ?? 0))),
      };
    } catch {
      return this.fallback.get?.(key);
    }
  }
}

/**
 * Counter used for progressive backoff.
 *
 * Kept separate from the limiter stores because it answers a different
 * question: not "how many requests in this window" but "how many CONSECUTIVE
 * failures has this subject had", which resets to zero on success rather than
 * on a clock. Same Redis-or-local degradation, same hashed keys.
 */
const localFailures = new Map<string, { count: number; expires: number }>();

function pruneLocalFailures(): void {
  if (localFailures.size < 5_000) return;
  const now = Date.now();
  for (const [key, entry] of localFailures) {
    if (entry.expires <= now) localFailures.delete(key);
  }
}

function failureKey(namespace: string, subject: string): string {
  return `${env.redis.keyPrefix}rlfail:${namespace}:${hashKeyPart(subject)}`;
}

/** Record a failure and return the new consecutive count. */
export async function recordFailure(
  namespace: string,
  subject: string,
  ttlMs: number,
): Promise<number> {
  const key = failureKey(namespace, subject);

  if (env.redis.enabled && isRedisReady() && env.rateLimit.failMode !== 'local') {
    try {
      const client = getRedisClient();
      const result = (await withTimeout(
        client!.eval(INCREMENT_SCRIPT, 1, key, String(ttlMs)),
      )) as [number, number];
      return Number(result[0]);
    } catch (err) {
      noteDegraded(err instanceof Error ? err.message : 'unknown redis error');
    }
  }

  pruneLocalFailures();
  const now = Date.now();
  const existing = localFailures.get(key);
  const count = existing && existing.expires > now ? existing.count + 1 : 1;
  localFailures.set(key, { count, expires: now + ttlMs });
  return count;
}

/** Read the current consecutive-failure count without incrementing it. */
export async function readFailures(namespace: string, subject: string): Promise<number> {
  const key = failureKey(namespace, subject);

  if (env.redis.enabled && isRedisReady() && env.rateLimit.failMode !== 'local') {
    try {
      const client = getRedisClient();
      const value = await withTimeout(client!.get(key));
      return Number(value ?? 0);
    } catch {
      /* fall through to the local map */
    }
  }

  const entry = localFailures.get(key);
  return entry && entry.expires > Date.now() ? entry.count : 0;
}

/** Clear the failure streak — called on a successful authentication. */
export async function clearFailures(namespace: string, subject: string): Promise<void> {
  const key = failureKey(namespace, subject);
  localFailures.delete(key);

  if (env.redis.enabled && isRedisReady() && env.rateLimit.failMode !== 'local') {
    try {
      const client = getRedisClient();
      await withTimeout(client!.del(key));
    } catch {
      /* best effort: the streak expires on its own */
    }
  }
}

/** Test seam — resets the process-local fallback state. */
export function __resetLocalFailures(): void {
  localFailures.clear();
}
