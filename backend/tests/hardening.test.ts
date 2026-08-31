import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { AddressInfo } from 'net';
import app from '../src/app';

/**
 * Cross-origin, CSRF and response-header posture.
 *
 * These are the controls a reader cannot verify by reading a route file: they
 * live in middleware ordering and in headers, and they are the ones most
 * easily undone by a well-meaning "make it work from localhost" change.
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
}

function call(
  path: string,
  opts: { method?: string; origin?: string; headers?: Record<string, string>; body?: string } = {},
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
          ...(opts.origin ? { Origin: opts.origin } : {}),
          ...(opts.body ? { 'Content-Length': Buffer.byteLength(opts.body) } : {}),
          ...(opts.headers ?? {}),
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (raw += c));
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers as Record<string, string | undefined>,
            raw,
          }),
        );
      },
    );
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// tests/setup.ts pins these to production-shaped values.
const ADMIN_ORIGIN = 'https://admin.glorytecks.test';
const PUBLIC_ORIGIN = 'https://glorytecks.test';
const EVIL = 'https://evil.test';

/* ── CORS: credentials and wildcards are never combined ─────────────────── */

test('the authenticated surface allows only configured origins, with credentials', async () => {
  const ok = await call('/api/v1/blogs', { origin: ADMIN_ORIGIN });
  assert.equal(ok.headers['access-control-allow-origin'], ADMIN_ORIGIN);
  assert.equal(ok.headers['access-control-allow-credentials'], 'true');
});

test('an unknown origin cannot reach the authenticated surface at all', async () => {
  const blocked = await call('/api/v1/blogs', { origin: EVIL });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers['access-control-allow-origin'], undefined);
  assert.equal(blocked.headers['access-control-allow-credentials'], undefined);
});

test('the refresh endpoint is not reachable cross-origin from an arbitrary site', async () => {
  // This is the one that matters most: /auth/refresh authenticates with an
  // httpOnly cookie and returns a fresh access token in its body. Reflecting an
  // arbitrary origin with credentials here is account takeover.
  const res = await call('/api/v1/auth/refresh', {
    method: 'POST',
    origin: EVIL,
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(res.status, 403);
  assert.equal(res.headers['access-control-allow-origin'], undefined);
});

test('the public surface never carries credentials, whichever origin it allows', async () => {
  // The public policy may be configured wide open (PUBLIC_CORS_ORIGINS='*') or,
  // as here, to an explicit list. Either is fine — what makes a permissive list
  // SAFE is that credentials are off, so the browser attaches no cookies and
  // there is no session to ride. That property must hold in both configurations.
  const allowed = await call('/api/v1/public/settings', { origin: PUBLIC_ORIGIN });
  assert.notEqual(allowed.status, 403, 'a configured public origin must be allowed');
  assert.equal(allowed.headers['access-control-allow-origin'], PUBLIC_ORIGIN);
  assert.equal(
    allowed.headers['access-control-allow-credentials'],
    undefined,
    'the public API must never allow credentials',
  );

  // With an explicit list configured, an unlisted origin is refused outright —
  // stricter than the '*' default, and the posture a production deployment
  // should run.
  const refused = await call('/api/v1/public/settings', { origin: EVIL });
  assert.equal(refused.status, 403);
  assert.equal(refused.headers['access-control-allow-credentials'], undefined);
});

test('no response ever combines a wildcard origin with credentials', async () => {
  for (const path of ['/api/v1/health', '/api/v1/public/settings', '/api/v1/blogs']) {
    for (const origin of [ADMIN_ORIGIN, PUBLIC_ORIGIN, EVIL]) {
      const res = await call(path, { origin });
      const acao = res.headers['access-control-allow-origin'];
      const acac = res.headers['access-control-allow-credentials'];
      assert.ok(
        !(acao === '*' && acac === 'true'),
        `${path} from ${origin} returned a wildcard with credentials`,
      );
    }
  }
});

/* ── CSRF on the cookie-authenticated endpoint ──────────────────────────── */

test('a cross-site form post cannot reach the refresh endpoint', async () => {
  // A form can only send these three content types, none of which triggers a
  // CORS preflight — so without this check the request arrives (with the
  // cookie) even though the response is unreadable, and rotation logs the
  // victim out.
  for (const contentType of [
    'application/x-www-form-urlencoded',
    'multipart/form-data; boundary=x',
    'text/plain',
  ]) {
    const res = await call('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: 'refreshToken=stolen',
    });
    assert.equal(res.status, 400, `${contentType} must be refused`);
    assert.match(res.raw, /application\/json/);
  }
});

test('the legitimate JSON refresh request still reaches the handler', async () => {
  const res = await call('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  // 401 (no cookie) rather than 400 — it got past the content-type guard.
  assert.equal(res.status, 401);
});

/* ── response headers ───────────────────────────────────────────────────── */

test('every response carries the expected security headers', async () => {
  const res = await call('/api/v1/health');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['x-frame-options'], 'DENY');
  assert.match(String(res.headers['strict-transport-security']), /max-age=\d+/);
  assert.match(String(res.headers['content-security-policy']), /default-src 'none'/);
  assert.match(String(res.headers['referrer-policy']), /no-referrer/);
  assert.ok(res.headers['permissions-policy']);
  assert.equal(res.headers['x-powered-by'], undefined, 'the stack must not be advertised');
});

/**
 * "No Cache-Control" does not mean "not cached": a 200 GET without explicit
 * freshness is heuristically cacheable by a shared cache, and the authenticated
 * responses are per-user — `/auth/me` carries a name, email and role. There is
 * no `Vary: Authorization` either, so a proxy keying on URL alone could hand
 * one administrator's response to another.
 */
test('authenticated responses are never stored by a shared cache', async () => {
  for (const path of [
    '/api/v1/auth/me',
    '/api/v1/admins',
    '/api/v1/blogs',
    '/api/v1/settings',
    '/api/v1/dashboard/stats',
    '/api/v1/uploads/config',
    '/api/v1/health',
    '/api/v1/nope',
  ]) {
    const res = await call(path, { headers: { Authorization: 'Bearer t' } });
    assert.match(
      String(res.headers['cache-control']),
      /no-store/,
      `${path} must not be storable (got "${res.headers['cache-control']}")`,
    );
  }
});

test('the public read cache policy is left intact', async () => {
  // The default must be a DEFAULT: the public router sets its own deliberate
  // policy and has to keep winning.
  for (const path of ['/api/v1/public/courses', '/api/v1/public/blogs', '/api/v1/public/settings']) {
    const res = await call(path);
    const cc = String(res.headers['cache-control']);
    assert.match(cc, /^public,/, `${path} must keep its own policy (got "${cc}")`);
    assert.ok(!/no-store/.test(cc), `${path} must not have been overwritten with no-store`);
  }
});

/* ── public API exposure ────────────────────────────────────────────────── */

test('the public API exposes no lead, admin or credential route', async () => {
  // The lead tables and admin_users hold personal data and must have no public
  // read path at all — not a filtered one, none.
  for (const path of [
    '/api/v1/public/enquiries',
    '/api/v1/public/demo-requests',
    '/api/v1/public/admins',
    '/api/v1/public/admin_users',
    '/api/v1/public/leads',
  ]) {
    const res = await call(path);
    assert.equal(res.status, 404, `${path} must not exist`);
  }
});

test('the health endpoint discloses no infrastructure', async () => {
  const res = await call('/api/v1/health');
  assert.equal(res.status, 200);
  const body = JSON.parse(res.raw) as Record<string, unknown>;
  assert.deepEqual(Object.keys(body).sort(), ['message', 'success', 'timestamp']);
  const lower = res.raw.toLowerCase();
  for (const leak of ['supabase', 'redis', 'cloudinary', 'postgres', 'version', 'uptime', 'env']) {
    assert.ok(!lower.includes(leak), `health must not mention "${leak}"`);
  }
});
