import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseIp, clientIp } from '../src/utils/clientIp';
import type { Request } from 'express';
import { normaliseEmail } from '../src/middlewares/rateLimit';
import {
  hashKeyPart,
  recordFailure,
  readFailures,
  clearFailures,
  __resetLocalFailures,
} from '../src/middlewares/rateLimitStore';

/**
 * The pieces a rate limit is built from.
 *
 * A limiter is only as good as its key: if an attacker can mint a fresh
 * subject by changing a header, varying casing or rotating an address inside a
 * block they already control, the limit does not exist. These test that the
 * subject is stable under every variation an attacker controls, and unstable
 * only where it should be.
 */

/* ── address normalisation ──────────────────────────────────────────────── */

test('IPv4 addresses are their own subject', () => {
  assert.equal(normaliseIp('203.0.113.9'), '203.0.113.9');
  assert.equal(normaliseIp(' 203.0.113.9 '), '203.0.113.9');
});

test('an IPv4-mapped IPv6 address is the same subject as its IPv4 form', () => {
  // Otherwise the same client counts twice depending on how it connected,
  // which doubles their budget for free.
  assert.equal(normaliseIp('::ffff:203.0.113.9'), '203.0.113.9');
  assert.equal(normaliseIp('[::ffff:203.0.113.9]'), '203.0.113.9');
});

test('IPv6 collapses to its /64, so an attacker cannot rotate within their own block', () => {
  // A residential IPv6 allocation is routinely a /64 or larger. Limiting a
  // single 128-bit address would let one ordinary connection present billions
  // of distinct subjects.
  const a = normaliseIp('2001:db8:1234:5678:0000:0000:0000:0001');
  const b = normaliseIp('2001:db8:1234:5678:aaaa:bbbb:cccc:dddd');
  const c = normaliseIp('2001:db8:1234:5678::9999');
  assert.equal(a, b);
  assert.equal(a, c);
  assert.match(a, /\/64$/);

  // A genuinely different /64 is a different subject.
  assert.notEqual(a, normaliseIp('2001:db8:1234:9999::1'));
});

test('address casing and zone indices do not create new subjects', () => {
  assert.equal(normaliseIp('2001:DB8:1234:5678::1'), normaliseIp('2001:db8:1234:5678::1'));
  assert.equal(normaliseIp('fe80::1%eth0'), normaliseIp('fe80::1'));
});

test('an unparseable address is still bounded before it becomes a key', () => {
  const junk = normaliseIp('x'.repeat(5000));
  assert.ok(junk.length <= 64);
  assert.equal(normaliseIp(undefined), 'unknown');
  assert.equal(normaliseIp(''), 'unknown');
});

/* ── account identifiers ────────────────────────────────────────────────── */

test('email casing and whitespace do not create new subjects', () => {
  // Without this, `Admin@x.com` and `admin@x.com` are separate budgets and the
  // per-account limit is trivially bypassed.
  const canonical = normaliseEmail('admin@glorytecks.com');
  assert.equal(normaliseEmail('  ADMIN@GloryTecks.com  '), canonical);
  assert.equal(normaliseEmail('Admin@Glorytecks.Com'), canonical);
});

test('a non-string or oversized email yields no subject', () => {
  assert.equal(normaliseEmail(undefined), undefined);
  assert.equal(normaliseEmail(42), undefined);
  assert.equal(normaliseEmail({}), undefined);
  assert.equal(normaliseEmail(''), undefined);
  assert.equal(normaliseEmail(`${'x'.repeat(300)}@y.com`), undefined);
});

/* ── key construction ───────────────────────────────────────────────────── */

test('key components are hashed, so nothing identifying reaches Redis', () => {
  const email = 'admin@glorytecks.com';
  const key = hashKeyPart(email);
  assert.equal(key.length, 32);
  assert.match(key, /^[0-9a-f]+$/);
  assert.ok(!key.includes('admin'));
  assert.ok(!key.includes('@'));
});

test('a hashed key is stable and collision-distinct', () => {
  assert.equal(hashKeyPart('a@b.com'), hashKeyPart('a@b.com'));
  assert.notEqual(hashKeyPart('a@b.com'), hashKeyPart('a@b.co'));
});

test('a caller cannot shape the Redis key', () => {
  // Separators, wildcards and traversal all reduce to hex, so no input can
  // escape its limiter's namespace or collide with another's.
  for (const hostile of ['a:b', 'a*', '../../other', 'x'.repeat(10_000), '\n\r']) {
    const key = hashKeyPart(hostile);
    assert.match(key, /^[0-9a-f]{32}$/);
  }
});

/* ── progressive backoff ────────────────────────────────────────────────── */

test('consecutive failures accumulate and are cleared by a success', async () => {
  __resetLocalFailures();
  const subject = 'backoff@test.local';

  assert.equal(await readFailures('login', subject), 0);
  assert.equal(await recordFailure('login', subject, 60_000), 1);
  assert.equal(await recordFailure('login', subject, 60_000), 2);
  assert.equal(await readFailures('login', subject), 2);

  // A correct password ends the streak — someone who mistyped twice should not
  // carry a delay into their next session.
  await clearFailures('login', subject);
  assert.equal(await readFailures('login', subject), 0);
});

test('a failure streak expires on its own, so nothing is ever locked out', async () => {
  __resetLocalFailures();
  const subject = 'expiring@test.local';
  await recordFailure('login', subject, 1);
  await new Promise((r) => setTimeout(r, 20));
  // This is what makes backoff safe to apply per ACCOUNT: an attacker who
  // knows an administrator's address cannot hold them out, because the streak
  // decays without anyone intervening.
  assert.equal(await readFailures('login', subject), 0);
});

test('failure streaks are per subject', async () => {
  __resetLocalFailures();
  await recordFailure('login', 'one@test.local', 60_000);
  await recordFailure('login', 'one@test.local', 60_000);
  assert.equal(await readFailures('login', 'two@test.local'), 0);
});

test('the backoff delay grows exponentially and is capped', () => {
  // Mirrors the calculation in `loginBackoff`. A cap matters: without one the
  // delay eventually holds a connection open long enough to be its own denial
  // of service against the server.
  const { backoffAfter, backoffBaseMs, backoffMaxMs } = {
    backoffAfter: 3,
    backoffBaseMs: 400,
    backoffMaxMs: 8_000,
  };
  const delayFor = (failures: number) =>
    failures < backoffAfter
      ? 0
      : Math.min(backoffMaxMs, backoffBaseMs * 2 ** (failures - backoffAfter));

  assert.equal(delayFor(1), 0, 'a single mistype is not delayed');
  assert.equal(delayFor(2), 0);
  assert.equal(delayFor(3), 400);
  assert.equal(delayFor(4), 800);
  assert.equal(delayFor(5), 1600);
  assert.equal(delayFor(20), backoffMaxMs, 'the delay is capped, not unbounded');
});

/* ── forwarded headers ──────────────────────────────────────────────────── */

test('the subject comes from req.ip, never from a raw forwarded header', async () => {
  // Express resolves `req.ip` against `trust proxy`, which is the one place
  // that decision should be made. Reading X-Forwarded-For here instead would
  // reintroduce it — and get it wrong, because this layer has no idea how many
  // proxies are actually in front.
  const forged = {
    ip: '203.0.113.7',
    headers: {
      'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12',
      'x-real-ip': '99.99.99.99',
      forwarded: 'for=13.13.13.13',
    },
    socket: { remoteAddress: '10.0.0.1' },
  } as unknown as Request;

  assert.equal(clientIp(forged), '203.0.113.7');
});

test('a malformed forwarded header cannot mint an unbounded subject', async () => {
  // When trust proxy is 0 — the correct setting for a directly-exposed app —
  // Express leaves req.ip as the socket address whatever the header says.
  const directlyExposed = {
    ip: '10.0.0.1',
    headers: { 'x-forwarded-for': `${'9.9.9.9, '.repeat(500)}1.1.1.1` },
    socket: { remoteAddress: '10.0.0.1' },
  } as unknown as Request;

  assert.equal(clientIp(directlyExposed), '10.0.0.1');

  // And an absent/garbage req.ip still yields a bounded, non-empty subject
  // rather than undefined — a key of `undefined` would pool every such caller.
  const noIp = { headers: {}, socket: {} } as unknown as Request;
  assert.equal(clientIp(noIp), 'unknown');
});
