/**
 * Rate limits, exercised through the real app.
 *
 * `./rateLimitEnv` lowers every threshold so the limits trip inside a test
 * rather than after three hundred requests. It has to be a separate module
 * imported first — import declarations are hoisted, so assignments written
 * here would run after config/env had already read the defaults. node's test
 * runner gives each file its own process, so no other suite is affected.
 */
import './rateLimitEnv';
import './setup';
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { AddressInfo } from 'net';
import app from '../src/app';
import { supabaseAdmin, supabaseAuth } from '../src/config/supabase';
import { adminUserRepo } from '../src/repositories';

let server: http.Server;
let base: string;

test.before(async () => {
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

test.after(() => server.close());

interface Reply {
  status: number;
  headers: Record<string, string | undefined>;
  raw: string;
  body: Record<string, unknown>;
}

/**
 * `ip` becomes an `X-Forwarded-For` header. With TRUST_PROXY_HOPS=1 Express
 * resolves that to `req.ip`, which is how a real deployment behind one proxy
 * behaves — and what lets a single test process act as many distinct clients.
 */
function call(
  path: string,
  opts: {
    method?: string;
    body?: unknown;
    ip?: string;
    auth?: boolean;
    headers?: Record<string, string>;
  } = {},
): Promise<Reply> {
  const payload = opts.body === undefined ? undefined : JSON.stringify(opts.body);
  return new Promise((resolve, reject) => {
    const url = new URL(base + path);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: opts.method ?? 'GET',
        headers: {
          ...(payload
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            : {}),
          ...(opts.ip ? { 'X-Forwarded-For': opts.ip } : { 'X-Forwarded-For': '198.51.100.1' }),
          ...(opts.auth ? { Authorization: 'Bearer t' } : {}),
          ...(opts.headers ?? {}),
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let body = {};
          try {
            body = JSON.parse(raw);
          } catch {
            /* asserted via raw */
          }
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers as Record<string, string | undefined>,
            raw,
            body,
          });
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const login = (email: string, ip: string) =>
  call('/auth/login', {
    method: 'POST',
    ip,
    body: { email, password: 'wrongpassword123' },
  });

function asAdmin() {
  mock.method(supabaseAdmin.auth, 'getUser', async () => ({
    data: { user: { id: 'user-admin' } },
    error: null,
  }));
  mock.method(adminUserRepo, 'findById', async () => ({
    id: 'user-admin',
    name: 'Admin',
    email: 'admin@test.local',
    role: 'admin',
    isActive: true,
  }));
}

/** Send `n` requests one after another and return the statuses. */
async function repeat(n: number, fn: (i: number) => Promise<Reply>): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) out.push((await fn(i)).status);
  return out;
}

/* ── authentication ─────────────────────────────────────────────────────── */

test('repeated failed logins from one address are cut off', async () => {
  const ip = '203.0.113.10';
  const statuses = await repeat(6, (i) => login(`user${i}@test.local`, ip));
  // Distinct emails each time, so this can only be the per-IP limit.
  assert.ok(statuses.includes(429), `expected a 429, got ${statuses.join(',')}`);
  assert.equal(statuses[0], 401, 'the first attempt must be answered normally');
});

test('repeated failures for ONE account are cut off even from many addresses', async () => {
  // This is the control a distributed credential-stuffing run has to get past:
  // rotating the source address defeats a per-IP limit completely.
  const email = 'victim@test.local';
  const statuses = await repeat(5, (i) => login(email, `203.0.113.${100 + i}`));
  assert.ok(
    statuses.includes(429),
    `an account-wide limit must apply across addresses, got ${statuses.join(',')}`,
  );
});

test('a throttled unknown account is indistinguishable from a throttled real one', async () => {
  // If the two differed in status, message or code, the limiter would be an
  // account-existence oracle — you could learn which addresses are registered
  // just by watching how they get throttled.
  const known = await repeat(4, () => login('admin@test.local', '203.0.113.20'));
  const unknown = await repeat(4, () => login('nobody-at-all@test.local', '203.0.113.21'));

  const knownLimited = await login('admin@test.local', '203.0.113.20');
  const unknownLimited = await login('nobody-at-all@test.local', '203.0.113.21');

  assert.equal(knownLimited.status, unknownLimited.status);
  assert.equal(knownLimited.body.message, unknownLimited.body.message);
  assert.equal(knownLimited.body.code, unknownLimited.body.code);
  assert.ok(known.length === unknown.length);
});

test('successful logins do not consume the failed-attempt budget', async () => {
  // `skipSuccessfulRequests` on the per-IP limiter exists so a busy shared
  // office is not thrown out by its own correct passwords — the budget is for
  // detecting guessing, and a correct password is not a guess.
  const ip = '203.0.113.30';
  mock.method(supabaseAuth.auth, 'signInWithPassword', async () => ({
    data: {
      session: { access_token: 'a', refresh_token: 'r' },
      user: { id: 'user-ok' },
    },
    error: null,
  }));
  mock.method(adminUserRepo, 'findById', async () => ({
    id: 'user-ok',
    name: 'Ok',
    email: 'ok@test.local',
    role: 'admin',
    isActive: true,
    isActiveRow: true,
  }));
  mock.method(adminUserRepo, 'updateRawById', async () => null);

  // Five successes against a failed-attempt budget of three.
  const statuses = await repeat(5, () =>
    call('/auth/login', {
      method: 'POST',
      ip,
      body: { email: 'ok@test.local', password: 'correcthorsebattery' },
    }),
  );
  assert.ok(
    !statuses.includes(429),
    `successes must not spend the failure budget, got ${statuses.join(',')}`,
  );
  assert.equal(statuses[0], 200);
  mock.restoreAll();
});

test('successful logins are still bounded by the total-attempt ceiling', async () => {
  // Without this ceiling, `skipSuccessfulRequests` would leave an attacker who
  // holds one valid credential free to hammer the endpoint indefinitely.
  const ip = '203.0.113.31';
  mock.method(supabaseAuth.auth, 'signInWithPassword', async () => ({
    data: { session: { access_token: 'a', refresh_token: 'r' }, user: { id: 'user-ok' } },
    error: null,
  }));
  mock.method(adminUserRepo, 'findById', async () => ({
    id: 'user-ok',
    name: 'Ok',
    email: 'ok@test.local',
    role: 'admin',
    isActive: true,
  }));
  mock.method(adminUserRepo, 'updateRawById', async () => null);

  const statuses = await repeat(11, () =>
    call('/auth/login', {
      method: 'POST',
      ip,
      body: { email: 'ok@test.local', password: 'correcthorsebattery' },
    }),
  );
  assert.ok(statuses.includes(429), `the total ceiling must apply, got ${statuses.join(',')}`);
  mock.restoreAll();
});

test('the login limiters do not lock an address out permanently', async () => {
  // Every limit is window-based and every backoff streak expires. Nothing in
  // the auth path can put an account or an address into a state that needs an
  // operator to clear it.
  const res = await login('someone@test.local', '203.0.113.40');
  assert.ok([401, 429, 503].includes(res.status));
  assert.ok(!('lockedUntil' in res.body), 'no permanent lock state is exposed');
});

test('refresh-token exchange is rate limited', async () => {
  const statuses = await repeat(6, () =>
    call('/auth/refresh', { method: 'POST', ip: '203.0.113.50', body: {} }),
  );
  assert.ok(statuses.includes(429), `refresh must be limited, got ${statuses.join(',')}`);
});

test('password changes are rate limited per account', async () => {
  asAdmin();
  const statuses = await repeat(5, () =>
    call('/auth/change-password', {
      method: 'POST',
      auth: true,
      ip: '203.0.113.60',
      body: { currentPassword: 'oldpassword1', newPassword: 'newpassword12' },
    }),
  );
  assert.ok(statuses.includes(429), `password change must be limited, got ${statuses.join(',')}`);
  mock.restoreAll();
});

/* ── public endpoints ───────────────────────────────────────────────────── */

const enquiry = (i: number) => ({
  name: `Visitor ${i}`,
  email: `visitor${i}@example.com`,
  phone: '9876543210',
  message: 'I would like more information please',
});

test('public form submissions are limited per address', async () => {
  const statuses = await repeat(5, (i) =>
    call('/public/contact', { method: 'POST', ip: '203.0.113.70', body: enquiry(i) }),
  );
  assert.ok(statuses.includes(429), `contact must be limited, got ${statuses.join(',')}`);
});

test('a legitimate visitor is not blocked by the public form limit', async () => {
  // The limit has to be invisible to real use or it is a bug, not a control.
  const res = await call('/public/contact', {
    method: 'POST',
    ip: '203.0.113.71',
    body: enquiry(1),
  });
  assert.notEqual(res.status, 429, 'a first submission must always get through');
});

test('demo requests share the public-write budget', async () => {
  const statuses = await repeat(5, (i) =>
    call('/public/demo-requests', {
      method: 'POST',
      ip: '203.0.113.72',
      body: { name: `Visitor ${i}`, phone: '9876543210' },
    }),
  );
  assert.ok(statuses.includes(429), `demo requests must be limited, got ${statuses.join(',')}`);
});

test('a filled honeypot is absorbed without storing anything', async () => {
  const res = await call('/public/contact', {
    method: 'POST',
    ip: '203.0.113.73',
    body: { ...enquiry(1), hp: 'http://spam.example' },
  });
  // Answered as if accepted: telling the author which field betrayed them
  // would simply teach them to stop filling it.
  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data, null);
});

test('public reads have a flood ceiling but stay usable', async () => {
  const ip = '203.0.113.80';
  const first = await call('/public/settings', { ip });
  assert.notEqual(first.status, 429, 'an ordinary page load must never be limited');

  const statuses = await repeat(14, () => call('/public/settings', { ip }));
  assert.ok(statuses.includes(429), `a flood must eventually be cut off, got ${statuses.length}`);
});

test('a search costs more budget than a plain read', async () => {
  // A plain collection read is one cache key shared by every visitor; `?q=` is
  // a key per term that also runs an ILIKE across several columns.
  const ip = '203.0.113.81';
  const statuses = await repeat(4, (i) => call(`/public/blogs?q=term${i}`, { ip }));
  assert.ok(statuses.includes(429), `search must be limited sooner, got ${statuses.join(',')}`);
});

/* ── authenticated writes ───────────────────────────────────────────────── */

test('admin writes are limited per account', async () => {
  asAdmin();
  const statuses = await repeat(6, (i) =>
    call('/trainers', {
      method: 'POST',
      auth: true,
      ip: '203.0.113.90',
      body: { name: `Trainer ${i}` },
    }),
  );
  assert.ok(statuses.includes(429), `admin writes must be limited, got ${statuses.join(',')}`);
  mock.restoreAll();
});

test('an admin write limit follows the account, not the address', async () => {
  asAdmin();
  // Same token, different addresses: a compromised session must not get a
  // fresh budget simply by moving.
  const statuses = await repeat(6, (i) =>
    call('/trainers', {
      method: 'POST',
      auth: true,
      ip: `198.51.100.${10 + i}`,
      body: { name: `Trainer ${i}` },
    }),
  );
  assert.ok(statuses.includes(429), `the account budget must travel, got ${statuses.join(',')}`);
  mock.restoreAll();
});

test('expensive operations have their own tighter budget', async () => {
  asAdmin();
  const statuses = await repeat(4, () =>
    call('/blogs/11111111-2222-4333-8444-555555555555/duplicate', {
      method: 'POST',
      auth: true,
      ip: '203.0.113.91',
    }),
  );
  assert.ok(statuses.includes(429), `duplication must be limited, got ${statuses.join(',')}`);
  mock.restoreAll();
});

/* ── the 429 itself ─────────────────────────────────────────────────────── */

test('a 429 carries standard headers, Retry-After, and nothing internal', async () => {
  const ip = '203.0.113.99';
  let limited: Reply | undefined;
  for (let i = 0; i < 8 && !limited; i += 1) {
    const res = await login(`probe${i}@test.local`, ip);
    if (res.status === 429) limited = res;
  }
  assert.ok(limited, 'expected to reach the limit');

  // Standards-compliant pacing information…
  assert.ok(limited.headers['ratelimit'], 'a draft-8 RateLimit header is expected');
  const retryAfter = Number(limited.headers['retry-after']);
  assert.ok(Number.isFinite(retryAfter) && retryAfter > 0, 'Retry-After must be a positive number');
  assert.equal(limited.body.code, 'RATE_LIMITED');
  assert.equal(limited.body.retryAfter, retryAfter);

  // …and nothing else. The message must not say which limit was hit: that
  // would map out the policy and, on this route, distinguish an IP limit from
  // an account limit.
  const raw = limited.raw.toLowerCase();
  for (const leak of ['redis', 'ip:', 'user:', 'email:', 'store', 'window', '203.0.113']) {
    assert.ok(!raw.includes(leak), `the 429 body must not contain "${leak}"`);
  }
});

test('a rate-limited response is not itself expensive to produce', async () => {
  // The limiter runs before the body parsers, so an over-quota request is
  // rejected without a 2 MB body ever being parsed.
  const ip = '203.0.113.98';
  await repeat(12, () => call('/public/settings', { ip }));
  const res = await call('/public/settings', { ip, method: 'GET' });
  assert.equal(res.status, 429);
});
