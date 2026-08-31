import './setup';
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { AddressInfo } from 'net';
import app from '../src/app';
import { supabaseAdmin } from '../src/config/supabase';
import { adminUserRepo } from '../src/repositories';
import { Role } from '../src/constants';

/**
 * End-to-end checks over the real Express app.
 *
 * The unit tests prove the inspector refuses hostile bytes; these prove the
 * inspector is actually in the request path, that it sits behind the role
 * check, and that every role gets the answer the authorization model says it
 * should. A vulnerability here would not be in the detector — it would be in
 * the wiring, which is exactly what a unit test cannot see.
 */

/** Stand in for Supabase Auth + the admin_users lookup requireAuth performs. */
function actingAs(role: Role | null) {
  mock.method(supabaseAdmin.auth, 'getUser', async () =>
    role
      ? { data: { user: { id: `user-${role}` } }, error: null }
      : { data: { user: null }, error: { message: 'bad token' } },
  );
  mock.method(adminUserRepo, 'findById', async () =>
    role
      ? { id: `user-${role}`, name: role, email: `${role}@test.local`, role, isActive: true }
      : null,
  );
}

let server: http.Server;
let base: string;

test.before(async () => {
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

test.after(() => {
  server.close();
});

/** Build a minimal multipart body by hand — no test-only dependency needed. */
function multipart(
  file: { name: string; type: string; data: Buffer },
  fields: Record<string, string> = {},
): { body: Buffer; contentType: string } {
  const boundary = '----glorytecksTestBoundary1234567890';
  const chunks: Buffer[] = [];

  for (const [key, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
        'latin1',
      ),
    );
  }
  chunks.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.name}"\r\n` +
        `Content-Type: ${file.type}\r\n\r\n`,
      'latin1',
    ),
    file.data,
    Buffer.from(`\r\n--${boundary}--\r\n`, 'latin1'),
  );

  return { body: Buffer.concat(chunks), contentType: `multipart/form-data; boundary=${boundary}` };
}

interface Reply {
  status: number;
  body: { message?: string; data?: unknown };
  raw: string;
}

function post(path: string, part: ReturnType<typeof multipart>, token = 'test-token'): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const url = new URL(base + path);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': part.contentType,
          'Content-Length': part.body.length,
          Authorization: `Bearer ${token}`,
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
            /* non-JSON bodies are reported through `raw` */
          }
          resolve({ status: res.statusCode ?? 0, body, raw });
        });
      },
    );
    req.on('error', reject);
    req.end(part.body);
  });
}

/* ── fixtures ───────────────────────────────────────────────────────────── */

function realPng(): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    return Buffer.concat([len, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', Buffer.alloc(64)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const pngPart = () => multipart({ name: 'logo.png', type: 'image/png', data: realPng() });

/* ── authorization ──────────────────────────────────────────────────────── */

test('an unauthenticated upload is refused', async () => {
  actingAs(null);
  const res = await post('/uploads/image', pngPart());
  assert.equal(res.status, 401);
});

test('only admin and content_writer may upload', async () => {
  const expected: Array<[Role, number]> = [
    ['admin', 201],
    ['content_writer', 201],
    ['editor', 403],
    ['viewer', 403],
    ['receptionist', 403],
  ];

  for (const [role, allowed] of expected) {
    actingAs(role);
    const res = await post('/uploads/image', pngPart());
    if (allowed === 403) {
      assert.equal(res.status, 403, `${role} must be refused, got ${res.status}`);
    } else {
      // Cloudinary is not configured under test, so an authorised caller gets
      // as far as the storage call and stops there with 503. Reaching 503 is
      // the proof that auth, role, rate limit, multer and content inspection
      // all passed — a 4xx here would mean a gate rejected a valid upload.
      assert.equal(res.status, 503, `${role} must be allowed through, got ${res.status}`);
    }
  }
});

test('the same role rules apply to the document endpoint', async () => {
  actingAs('viewer');
  const pdf = Buffer.from('%PDF-1.7\n/Root 1 0 R\nstartxref\n9\n%%EOF\n', 'latin1');
  const res = await post(
    '/uploads/document',
    multipart({ name: 'a.pdf', type: 'application/pdf', data: pdf }),
  );
  assert.equal(res.status, 403);
});

/* ── content inspection is genuinely in the path ────────────────────────── */

test('a renamed executable sent as image/png is refused by the server', async () => {
  actingAs('admin');
  const exe = Buffer.concat([Buffer.from('MZ\x90\0', 'latin1'), Buffer.alloc(1024, 0x41)]);
  const res = await post(
    '/uploads/image',
    multipart({ name: 'logo.png', type: 'image/png', data: exe }),
  );
  assert.equal(res.status, 400);
  assert.match(String(res.body.message), /executable/i);
});

test('an HTML page sent as image/jpeg is refused', async () => {
  actingAs('admin');
  const html = Buffer.from('<html><script>alert(1)</script></html>'.padEnd(512, ' '), 'latin1');
  const res = await post(
    '/uploads/image',
    multipart({ name: 'x.jpg', type: 'image/jpeg', data: html }),
  );
  assert.equal(res.status, 400);
});

test('an SVG is refused while UPLOAD_ALLOW_SVG is off', async () => {
  actingAs('admin');
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    'utf8',
  );
  const res = await post(
    '/uploads/image',
    multipart({ name: 'x.svg', type: 'image/svg+xml', data: svg }),
  );
  // Rejected at the header filter: svg+xml is not in the allowed MIME set.
  assert.equal(res.status, 400);
});

test('an image is refused by the document endpoint', async () => {
  actingAs('admin');
  const res = await post(
    '/uploads/document',
    multipart({ name: 'logo.png', type: 'image/png', data: realPng() }),
  );
  assert.equal(res.status, 400);
});

test('an extension that contradicts the declared type is refused', async () => {
  actingAs('admin');
  const res = await post(
    '/uploads/image',
    multipart({ name: 'payload.exe', type: 'image/png', data: realPng() }),
  );
  assert.equal(res.status, 400);
});

test('an empty file is refused', async () => {
  actingAs('admin');
  const res = await post(
    '/uploads/image',
    multipart({ name: 'x.png', type: 'image/png', data: Buffer.alloc(0) }),
  );
  assert.equal(res.status, 400);
});

/* ── destination control ────────────────────────────────────────────────── */

test('a folder outside the allowlist is refused', async () => {
  actingAs('admin');
  for (const folder of ['../../secrets', '/etc', 'anything', '..%2f..', 'images/../../x']) {
    const res = await post(
      '/uploads/image',
      multipart({ name: 'logo.png', type: 'image/png', data: realPng() }, { folder }),
    );
    assert.equal(res.status, 400, `folder "${folder}" must be refused, got ${res.status}`);
    assert.match(String(res.body.message), /destination/i);
  }
});

test('an allowlisted folder is accepted', async () => {
  actingAs('admin');
  const res = await post(
    '/uploads/image',
    multipart({ name: 'logo.png', type: 'image/png', data: realPng() }, { folder: 'courses' }),
  );
  // 503 = passed every gate, stopped only at the unconfigured storage provider.
  assert.equal(res.status, 503);
});

/* ── error surface ──────────────────────────────────────────────────────── */

test('a non-multipart body is refused without reaching the parser', async () => {
  actingAs('admin');
  const res = await post('/uploads/image', {
    body: Buffer.from('{"file":"x"}'),
    contentType: 'application/json',
  });
  assert.equal(res.status, 400);
  assert.match(String(res.body.message), /multipart/i);
});

test('failures never carry a stack trace or provider detail to the client', async () => {
  actingAs('admin');
  const res = await post(
    '/uploads/image',
    multipart({ name: 'x.png', type: 'image/png', data: Buffer.alloc(8) }),
  );
  assert.equal(res.status, 400);
  assert.ok(!/at \w+ \(/.test(res.raw), 'response must not contain a stack trace');
  assert.ok(!/cloudinary/i.test(res.raw), 'response must not name the storage provider');
});

/* ── the non-upload path into the same columns ──────────────────────────── */

test('a javascript: media URL is refused on an ordinary CRUD write', async () => {
  actingAs('admin');
  const res = await new Promise<Reply>((resolve, reject) => {
    const url = new URL(`${base}/courses/00000000-0000-0000-0000-000000000000`);
    const payload = JSON.stringify({ title: 'X', brochureUrl: 'javascript:alert(1)' });
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          Authorization: 'Bearer test-token',
        },
      },
      (r) => {
        let raw = '';
        r.setEncoding('utf8');
        r.on('data', (c) => (raw += c));
        r.on('end', () =>
          resolve({ status: r.statusCode ?? 0, body: JSON.parse(raw || '{}'), raw }),
        );
      },
    );
    req.on('error', reject);
    req.end(payload);
  });

  assert.equal(res.status, 422);
  assert.match(res.raw, /brochureUrl/);
});

/* ── size, rate and filename limits ─────────────────────────────────────── */

test('an oversized body is refused before it is buffered', async () => {
  actingAs('admin');
  // Larger than the 8MB image ceiling plus the multipart envelope allowance.
  const huge = Buffer.alloc(9 * 1024 * 1024, 0x41);
  const res = await post(
    '/uploads/image',
    multipart({ name: 'big.png', type: 'image/png', data: huge }),
  );
  assert.equal(res.status, 413);
  assert.match(String(res.body.message), /larger than/i);
});

test('an extremely long filename is refused rather than truncated into storage', async () => {
  actingAs('admin');
  const name = `${'a'.repeat(4000)}.png`;
  const res = await post('/uploads/image', multipart({ name, type: 'image/png', data: realPng() }));
  assert.equal(res.status, 400);
  assert.match(String(res.body.message), /filename/i);
});

test('a filename full of special characters is sanitised, not rejected', async () => {
  actingAs('admin');
  const res = await post(
    '/uploads/image',
    multipart({
      name: "../../.." + String.fromCharCode(92) + "x; rm -rf ~ <script>.png",
      type: 'image/png',
      data: realPng(),
    }),
  );
  // 503 = it passed every gate; the name never becomes the storage identifier.
  assert.equal(res.status, 503);
});

test('repeated uploads are rate limited per account', async () => {
  actingAs('content_writer');
  let sawLimit = false;
  // The limiter budget is 60/window; go past it deliberately.
  for (let i = 0; i < 70 && !sawLimit; i += 1) {
    const res = await post('/uploads/image', pngPart());
    if (res.status === 429) sawLimit = true;
  }
  assert.equal(sawLimit, true, 'upload endpoint must enforce its own rate limit');
});
