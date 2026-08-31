/**
 * The SharedStore's REDIS path.
 *
 * Every other rate-limit test runs with RATE_LIMIT_FAIL_MODE=local, which
 * exercises the in-process fallback. That is the WRONG half for this
 * deployment: the app ships to Vercel, where each concurrent invocation is its
 * own process, so a per-process counter means the effective limit is
 * `max × instances` and `max` again after every cold start. The Redis branch is
 * the one that actually protects production, and without this file it had no
 * coverage at all.
 *
 * A real ioredis client is pointed at a local RESP server rather than mocked:
 * the module's exports are esbuild getters and cannot be reassigned, so the
 * only way to reach the branch is to give the client something that genuinely
 * speaks the protocol.
 */
import './setup';
// AFTER './setup', which disables the cache for every other suite.
import './redisTestEnv';
import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeRedisServer } from './fakeRedisServer';

let redis: FakeRedisServer;
let store: typeof import('../src/middlewares/rateLimitStore');
let ready = false;

const WINDOW = { windowMs: 60_000 } as never;

test.before(async () => {
  redis = new FakeRedisServer();
  const port = await redis.listen();
  process.env.REDIS_URL = `redis://127.0.0.1:${port}`;

  const { connectRedis, isRedisReady } = await import('../src/config/redis');
  store = await import('../src/middlewares/rateLimitStore');

  await connectRedis();
  for (let i = 0; i < 100 && !isRedisReady(); i += 1) {
    await new Promise((r) => setTimeout(r, 20));
  }
  ready = isRedisReady();
});

test.after(async () => {
  const { disconnectRedis } = await import('../src/config/redis');
  await disconnectRedis().catch(() => undefined);
  redis?.close();
});

test('the Redis branch is actually reachable', () => {
  assert.equal(ready, true, 'the client must be connected, or the rest of this file proves nothing');
});

/**
 * The one that matters on a serverless host: two instances, one counter. If
 * this regressed to per-process state, an attacker would get a fresh budget
 * from every concurrent invocation.
 */
test('two instances share one counter', async () => {
  const a = new store.SharedStore('shared-test');
  const b = new store.SharedStore('shared-test');
  a.init(WINDOW);
  b.init(WINDOW);

  assert.equal((await a.increment('subject-1')).totalHits, 1);
  assert.equal((await b.increment('subject-1')).totalHits, 2, 'the second instance must see the first');
  assert.equal((await a.increment('subject-1')).totalHits, 3);
  assert.ok(redis.commandLog.includes('EVAL'), 'the counter must be incremented in Redis, not locally');
});

test('each limiter has its own namespace', async () => {
  const login = new store.SharedStore('ns-login');
  const upload = new store.SharedStore('ns-upload');
  login.init(WINDOW);
  upload.init(WINDOW);

  await login.increment('same-subject');
  await login.increment('same-subject');
  const uploadFirst = await upload.increment('same-subject');

  assert.equal(uploadFirst.totalHits, 1, 'a login attempt must not spend an upload budget');
});

test('nothing identifying is written to Redis', async () => {
  const s = new store.SharedStore('privacy');
  s.init(WINDOW);
  await s.increment('user:alice@example.com');
  await s.increment('ip:198.51.100.4');

  const keys = redis.keys();
  assert.ok(keys.length > 0);
  assert.ok(!keys.some((k) => k.includes('alice')), 'an email must never appear in a key');
  assert.ok(!keys.some((k) => k.includes('198.51.100.4')), 'an address must never appear in a key');
});

/**
 * A counter that outlives its window is a permanent lockout. The Lua script
 * sets the TTL on first use and repairs a missing one, so this is the guard
 * against an instance dying between INCR and EXPIRE.
 */
test('the window expires, so nothing is ever locked out permanently', async () => {
  const s = new store.SharedStore('expiry');
  s.init({ windowMs: 150 } as never);

  await s.increment('k');
  assert.equal((await s.increment('k')).totalHits, 2);

  await new Promise((r) => setTimeout(r, 250));
  assert.equal((await s.increment('k')).totalHits, 1, 'the counter must restart after the window');
});

test('resetTime is in the future, so Retry-After can be derived', async () => {
  const s = new store.SharedStore('reset-time');
  s.init(WINDOW);
  const info = await s.increment('k');
  assert.ok(info.resetTime instanceof Date);
  assert.ok((info.resetTime as Date).getTime() > Date.now());
});

/**
 * The documented failure posture: degrade to per-process counters and say so,
 * rather than failing open (no protection) or closed (an auth outage).
 */
test('a Redis outage degrades to local counting instead of throwing', async () => {
  const s = new store.SharedStore('outage');
  s.init(WINDOW);

  redis.failing = true;
  try {
    const first = await s.increment('victim');
    assert.equal(first.totalHits, 1, 'counting must continue locally');
    const second = await s.increment('victim');
    assert.equal(second.totalHits, 2, 'the local fallback must still accumulate');
  } finally {
    redis.failing = false;
  }
});

test('Redis is used again once it recovers', async () => {
  const s = new store.SharedStore('recovery');
  s.init(WINDOW);

  redis.failing = true;
  await s.increment('subject');
  redis.failing = false;

  const before = redis.commandLog.filter((c) => c === 'EVAL').length;
  await s.increment('another-subject');
  const after = redis.commandLog.filter((c) => c === 'EVAL').length;

  assert.ok(after > before, 'the store must return to Redis rather than staying local');
});

/**
 * The progressive-backoff counter is written with EVAL and read with GET. If
 * ioredis ever applied its `keyPrefix` to one and not the other, the two would
 * address different keys and backoff would silently never engage.
 */
test('the failure streak is written and read through the same Redis key', async () => {
  assert.equal(await store.recordFailure('streak', 'a@b.test', 60_000), 1);
  assert.equal(await store.recordFailure('streak', 'a@b.test', 60_000), 2);
  assert.equal(
    await store.readFailures('streak', 'a@b.test'),
    2,
    'a streak written by EVAL must be readable by GET',
  );

  await store.clearFailures('streak', 'a@b.test');
  assert.equal(await store.readFailures('streak', 'a@b.test'), 0, 'a success must clear the streak');
  assert.equal(await store.readFailures('streak', 'other@b.test'), 0, 'streaks are per subject');
});

test('a failure streak key does not contain the email', async () => {
  await store.recordFailure('streak', 'secret-person@example.com', 60_000);
  const failKeys = redis.keys().filter((k) => k.includes('rlfail'));
  assert.ok(failKeys.length > 0);
  assert.ok(!failKeys.some((k) => k.includes('secret-person')));
});
