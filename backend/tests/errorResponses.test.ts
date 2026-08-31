import './setup';
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { AddressInfo } from 'net';
import app from '../src/app';
import { logger } from '../src/config/logger';
import { supabaseAdmin } from '../src/config/supabase';
import { adminUserRepo } from '../src/repositories';

/**
 * What actually leaves the process.
 *
 * Every case here is one of the failure modes the review had to cover, driven
 * through the real Express app. Each asserts both halves at once: the body the
 * client receives carries nothing internal, and the log line the server writes
 * carries enough to debug it — without a secret in it.
 *
 * These run against the app as built, so a future change that reintroduces a
 * raw `err.message` anywhere in the chain fails here rather than in production.
 */

let server: http.Server;
let base: string;

test.before(async () => {
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

test.after(() => server.close());

interface Reply {
  status: number;
  headers: Record<string, string | undefined>;
  raw: string;
  body: Record<string, unknown>;
}

function call(
  path: string,
  opts: { method?: string; body?: string; headers?: Record<string, string> } = {},
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const url = new URL(base + path);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: opts.method ?? 'GET',
        headers: {
          ...(opts.body ? { 'Content-Length': Buffer.byteLength(opts.body) } : {}),
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
            /* non-JSON is asserted through `raw` */
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
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

/** Capture everything written to the logger while `fn` runs. */
async function capturingLogs<T>(fn: () => Promise<T>): Promise<{ result: T; logged: string }> {
  const lines: string[] = [];
  const record =
    (level: string) =>
    (message: unknown, meta?: unknown): unknown => {
      lines.push(`${level} ${String(message)} ${meta ? JSON.stringify(meta) : ''}`);
      return logger;
    };
  // `http` is included deliberately. It is the level morgan's access log writes
  // through, and leaving it out meant the assertions below only ever saw the
  // error handler's own (already redacted) line — so morgan writing the raw URL
  // for every request, query values and all, was invisible to this suite.
  for (const level of ['error', 'warn', 'info', 'debug', 'http'] as const) {
    mock.method(logger, level, record(level) as never);
  }
  try {
    const result = await fn();
    return { result, logged: lines.join('\n') };
  } finally {
    mock.restoreAll();
  }
}

const asAdmin = () => {
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
};

/** Substrings that must never appear in any error body. */
const FORBIDDEN_IN_BODY = [
  'SCT-DATASOLUTIONS', // a filesystem path
  '.ts:', // a source location
  'node_modules',
  'at Object.', // a stack frame
  'ECONNREFUSED',
  '127.0.0.1',
  'supabase',
  'cloudinary',
  'redis',
  'postgres',
  'PostgrestError',
  'service_role',
  'Bearer ',
  'select ',
  'INSERT INTO',
];

function assertBodyIsClean(res: Reply, label: string) {
  const lower = res.raw.toLowerCase();
  for (const needle of FORBIDDEN_IN_BODY) {
    assert.ok(
      !lower.includes(needle.toLowerCase()),
      `${label}: response must not contain "${needle}" — got ${res.raw.slice(0, 300)}`,
    );
  }
  assert.ok(!('stack' in res.body), `${label}: response must not carry a stack`);
}

/* ── envelope consistency ───────────────────────────────────────────────── */

test('every error response uses the same envelope', async () => {
  const responses = await Promise.all([
    call('/api/v1/nope'),
    call('/api/v1/blogs'),
    call('/api/v1/blogs', { method: 'POST', body: '{bad', headers: { 'Content-Type': 'application/json' } }),
  ]);
  for (const res of responses) {
    assert.equal(res.body.success, false);
    assert.equal(typeof res.body.message, 'string');
    assert.equal(typeof res.body.code, 'string', 'every error carries a machine-readable code');
    assertBodyIsClean(res, `status ${res.status}`);
  }
});

test('every response carries a correlation id header', async () => {
  const res = await call('/api/v1/health');
  assert.match(String(res.headers['x-request-id']), /^[0-9a-f-]{36}$/);
});

/* ── the cases the review had to cover ──────────────────────────────────── */

test('an unexpected route does not echo the URL or its query string', async () => {
  const res = await call('/api/v1/internal/secret-admin-tool?token=SUPERSECRET123');
  assert.equal(res.status, 404);
  assert.equal(res.body.message, 'The requested resource was not found');
  assert.ok(!res.raw.includes('SUPERSECRET123'), 'a query value must not be reflected');
  assert.ok(!res.raw.includes('secret-admin-tool'), 'the path must not be reflected');
  assertBodyIsClean(res, '404');
});

test('an unexpected route logs the path but not the query values', async () => {
  const { logged } = await capturingLogs(() =>
    call('/api/v1/nope?token=SUPERSECRET123&email=alice@example.com'),
  );
  assert.match(logged, /\/api\/v1\/nope/, 'the path is needed to debug');
  assert.ok(!logged.includes('SUPERSECRET123'), 'a token in the URL must not be logged');
  assert.ok(!logged.includes('alice@example.com'), 'an email in the URL must not be logged');
});

/**
 * The access log runs on EVERY request, including the ones that succeed, and
 * it never passes through the error handler — so it is the one place a query
 * value can reach the log sink without `safePath` having seen it.
 */
test('the access log records the path but not the query values', async () => {
  const { logged } = await capturingLogs(() =>
    call('/api/v1/health?token=SUPERSECRET123&email=alice@example.com'),
  );
  const accessLines = logged.split('\n').filter((l) => l.startsWith('http '));
  assert.ok(accessLines.length > 0, 'the access log must still be written');
  const access = accessLines.join('\n');
  assert.match(access, /\/api\/v1\/health/, 'the path is needed to debug');
  assert.match(access, /GET/, 'the method is needed to debug');
  assert.ok(!access.includes('SUPERSECRET123'), 'a token in the URL must not be logged');
  assert.ok(!access.includes('alice@example.com'), 'an email in the URL must not be logged');
});

test('malformed JSON is a 400 that does not quote the parser', async () => {
  asAdmin();
  const res = await call('/api/v1/blogs', {
    method: 'POST',
    body: '{"title": ',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer t' },
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'Request body is not valid JSON');
  assert.ok(!res.raw.includes('JSON at position'));
  assert.ok(!res.raw.includes('Unexpected'));
  assertBodyIsClean(res, 'malformed JSON');
});

test('an oversized body is a 413, not a 500', async () => {
  asAdmin();
  const res = await call('/api/v1/blogs', {
    method: 'POST',
    body: `{"a":"${'x'.repeat(3 * 1024 * 1024)}"}`,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer t' },
  });
  assert.equal(res.status, 413);
  assert.ok(!res.raw.includes('entity'), 'the parser wording must not be forwarded');
  assertBodyIsClean(res, 'payload too large');
});

test('a rejected CORS origin gets a plain 403 that does not name the policy', async () => {
  const res = await call('/api/v1/health', { headers: { Origin: 'https://evil.test' } });
  assert.equal(res.status, 403);
  assert.ok(!res.raw.includes('evil.test'), 'the origin must not be reflected');
  assert.ok(!res.raw.toLowerCase().includes('cors'), 'the policy must not be named');
  assertBodyIsClean(res, 'CORS');
});

test('a dependency outage is a 503 with a correlation id and no topology', async () => {
  // Supabase is unreachable under test, so any read exercises the real path.
  asAdmin();
  const { result: res, logged } = await capturingLogs(() =>
    call('/api/v1/trainers', { headers: { Authorization: 'Bearer t' } }),
  );
  assert.equal(res.status, 503);
  assert.match(String(res.body.requestId), /^[0-9a-f-]{36}$/, 'a 5xx carries a support reference');
  assertBodyIsClean(res, 'outage');

  // The log is where the detail belongs, and it must actually be there.
  assert.match(logged, /ECONNREFUSED|fetch failed/, 'the log must explain the outage');
  assert.match(logged, /requestId/, 'the log must be correlatable to the response');
});

test('authentication failures are answered and logged without the credential', async () => {
  // The provider is made reachable-but-rejecting, so this exercises the real
  // 401 path rather than the outage path.
  mock.method(supabaseAdmin.auth, 'getUser', async () => ({
    data: { user: null },
    error: { message: 'invalid JWT: unable to parse or verify signature' },
  }));
  const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhdHRhY2tlciJ9.SIGNATUREVALUE';
  const { result: res, logged } = await capturingLogs(() =>
    call('/api/v1/blogs', { headers: { Authorization: `Bearer ${token}` } }),
  );
  assert.equal(res.status, 401);
  assertBodyIsClean(res, '401');
  assert.ok(!res.raw.includes('JWT'), "the provider's verification detail must not be returned");
  assert.ok(!logged.includes(token), 'the presented token must never be logged');
  assert.ok(!logged.includes('SIGNATUREVALUE'), 'no part of the token may be logged');
  mock.restoreAll();
});

test('an unreachable auth provider fails closed with 503, not a false 401', async () => {
  // Distinguishing these matters: answering 401 when the provider is simply
  // unreachable would tell a legitimate admin their credentials were wrong and
  // hide a live outage behind a plausible-looking rejection.
  mock.method(supabaseAdmin.auth, 'getUser', async () => {
    throw Object.assign(new TypeError('fetch failed'), {
      cause: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:54321'), {
        code: 'ECONNREFUSED',
      }),
    });
  });
  const res = await call('/api/v1/blogs', { headers: { Authorization: 'Bearer whatever' } });
  assert.equal(res.status, 503);
  assertBodyIsClean(res, 'auth outage');
  mock.restoreAll();
});

test('a login attempt does not log the password and does not reveal which field was wrong', async () => {
  const { result: res, logged } = await capturingLogs(() =>
    call('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'nobody@example.com', password: 'SuperSecret123!' }),
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  assert.ok(res.status === 401 || res.status === 503);
  assert.ok(!res.raw.toLowerCase().includes('password is'), 'must not say which field failed');
  assert.ok(!logged.includes('SuperSecret123!'), 'the password must never reach the log');
  assertBodyIsClean(res, 'login');
});

test('an unknown user and a wrong password are indistinguishable', async () => {
  const bodies = await Promise.all(
    [
      { email: 'definitely-not-a-user@example.com', password: 'whatever123' },
      { email: 'admin@test.local', password: 'wrongpassword123' },
    ].map((payload) =>
      call('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
  assert.equal(bodies[0].status, bodies[1].status);
  assert.equal(bodies[0].body.message, bodies[1].body.message);
  assert.equal(bodies[0].body.code, bodies[1].body.code);
});

test('an invalid refresh token is not distinguished from a missing one by its code', async () => {
  const missing = await call('/api/v1/auth/refresh', {
    method: 'POST',
    body: '{}',
    headers: { 'Content-Type': 'application/json' },
  });
  const invalid = await call('/api/v1/auth/refresh', {
    method: 'POST',
    body: '{}',
    headers: { 'Content-Type': 'application/json', Cookie: 'gt_refresh_token=garbage' },
  });
  assert.equal(missing.status, 401);
  assert.equal(invalid.status, 401);
  assert.equal(missing.body.code, invalid.body.code);
  assertBodyIsClean(invalid, 'refresh');
});

test('a forbidden role is refused without describing the rule', async () => {
  mock.method(supabaseAdmin.auth, 'getUser', async () => ({
    data: { user: { id: 'user-viewer' } },
    error: null,
  }));
  mock.method(adminUserRepo, 'findById', async () => ({
    id: 'user-viewer',
    name: 'V',
    email: 'v@test.local',
    role: 'viewer',
    isActive: true,
  }));
  const res = await call('/api/v1/admins', { headers: { Authorization: 'Bearer t' } });
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'AUTHORIZATION_ERROR');
  assert.ok(!res.raw.includes('admin'), 'the required role must not be disclosed');
  assertBodyIsClean(res, '403');
  mock.restoreAll();
});

test('an invalid file upload reports the reason without provider or library detail', async () => {
  asAdmin();
  const boundary = '----errtestboundary';
  const body =
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="x.png"\r\n` +
    `Content-Type: image/png\r\n\r\n` +
    'MZ\x90\0not-an-image'.padEnd(600, 'A') +
    `\r\n--${boundary}--\r\n`;
  const res = await call('/api/v1/uploads/image', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Authorization: 'Bearer t',
    },
  });
  assert.equal(res.status, 400);
  // The verdict IS shown — it is written for an admin and is the actionable part.
  assert.match(String(res.body.message), /executable/i);
  assertBodyIsClean(res, 'upload');
});

test('the health endpoint discloses no infrastructure', async () => {
  const res = await call('/api/v1/health');
  assert.equal(res.status, 200);
  const keys = Object.keys(res.body).sort();
  assert.deepEqual(keys, ['message', 'success', 'timestamp']);
  assertBodyIsClean(res, 'health');
});

test('no response advertises the server implementation', async () => {
  const res = await call('/api/v1/health');
  assert.equal(res.headers['x-powered-by'], undefined);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
});
