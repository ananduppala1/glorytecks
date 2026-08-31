import './setup';
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { AddressInfo } from 'net';
import { Writable } from 'stream';
import app from '../src/app';
import { cloudinary } from '../src/config/cloudinary';
import { uploadVerifiedBuffer, resolveFolder } from '../src/services/upload.service';
import { FORMATS } from '../src/utils/fileSignature';
import { courseRepo, brochureRepo } from '../src/repositories';

/**
 * The storage provider's answer is input too.
 *
 * Everything upstream can be correct and the asset still end up stored as
 * something else — a different resource type, a different format — because the
 * decision was made on the far side of an API call. These tests cover that
 * boundary, and the one other place the platform makes an outbound request on
 * a stored URL's say-so: the public brochure proxy.
 */

/** Pretend Cloudinary accepted the upload and answered with `response`. */
function stubCloudinary(response: Record<string, unknown>) {
  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-key';
  process.env.CLOUDINARY_API_SECRET = 'test-secret';

  const destroyed: string[] = [];
  mock.method(cloudinary.uploader, 'upload_stream', ((
    _opts: unknown,
    cb: (err: unknown, result: unknown) => void,
  ) => {
    const sink = new Writable({ write: (_c, _e, done) => done() });
    sink.on('finish', () => cb(null, response));
    return sink;
  }) as never);
  mock.method(cloudinary.uploader, 'destroy', (async (publicId: string) => {
    destroyed.push(publicId);
    return { result: 'ok' };
  }) as never);

  return destroyed;
}

function clearCloudinary() {
  process.env.CLOUDINARY_CLOUD_NAME = '';
  process.env.CLOUDINARY_API_KEY = '';
  process.env.CLOUDINARY_API_SECRET = '';
  mock.restoreAll();
}

const goodResponse = {
  secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v1/glorytecks/images/a.png',
  public_id: 'glorytecks/images/a',
  format: 'png',
  bytes: 128,
  width: 1,
  height: 1,
  resource_type: 'image',
};

test('a well-formed provider response is accepted and trimmed to what the UI needs', async () => {
  stubCloudinary({ ...goodResponse, signature: 'SECRET-SIGNATURE', api_key: 'SECRET-KEY' });
  try {
    const result = await uploadVerifiedBuffer(Buffer.from('x'), {
      folder: 'images',
      format: FORMATS.png,
      safeName: 'a.png',
    });
    assert.deepEqual(Object.keys(result).sort(), [
      'bytes',
      'format',
      'height',
      'publicId',
      'resourceType',
      'url',
      'width',
    ]);
    // Nothing from the provider's envelope is passed through wholesale.
    assert.ok(!JSON.stringify(result).includes('SECRET'));
  } finally {
    clearCloudinary();
  }
});

test('a provider response with an unexpected resource type is rejected and the asset removed', async () => {
  const destroyed = stubCloudinary({ ...goodResponse, resource_type: 'raw' });
  try {
    await assert.rejects(
      uploadVerifiedBuffer(Buffer.from('x'), {
        folder: 'images',
        format: FORMATS.png,
        safeName: 'a.png',
      }),
      /supported format/i,
    );
    assert.deepEqual(destroyed, ['glorytecks/images/a']);
  } finally {
    clearCloudinary();
  }
});

test('a provider response with an unexpected format is rejected', async () => {
  stubCloudinary({ ...goodResponse, format: 'html' });
  try {
    await assert.rejects(
      uploadVerifiedBuffer(Buffer.from('x'), {
        folder: 'images',
        format: FORMATS.png,
        safeName: 'a.png',
      }),
      /supported format/i,
    );
  } finally {
    clearCloudinary();
  }
});

test('a non-HTTPS asset URL from the provider is rejected', async () => {
  stubCloudinary({ ...goodResponse, secure_url: 'http://res.cloudinary.com/x.png' });
  try {
    await assert.rejects(
      uploadVerifiedBuffer(Buffer.from('x'), {
        folder: 'images',
        format: FORMATS.png,
        safeName: 'a.png',
      }),
      /Upload failed/i,
    );
  } finally {
    clearCloudinary();
  }
});

/**
 * Every destination the admin UI sends today. Sourced by grepping the admin
 * app for `folder=` props and `uploadFolder:` config values — if a new upload
 * site is added with a folder that is not on the server's allowlist, that
 * upload fails at runtime, and this test is what catches it first.
 */
const FOLDERS_THE_ADMIN_SENDS = [
  'about',
  'authors',
  'avatars',
  'blog',
  'brand',
  'brochures',
  'companies',
  'courses',
  'gallery',
  'hero',
  'placements',
  'testimonials',
  'trainers',
];

test('every folder the admin UI sends is on the server allowlist', () => {
  for (const folder of FOLDERS_THE_ADMIN_SENDS) {
    assert.equal(
      resolveFolder(folder, 'images'),
      folder,
      `the admin uploads to "${folder}" — it must be allowed`,
    );
  }
});

test('folder resolution accepts only the allowlist', () => {
  assert.equal(resolveFolder(undefined, 'images'), 'images');
  assert.equal(resolveFolder('courses', 'images'), 'courses');
  assert.equal(resolveFolder('COURSES', 'images'), 'courses');
  for (const bad of ['../secrets', '/etc', 'images/../x', ['images'], { a: 1 }, 'unknown']) {
    assert.throws(() => resolveFolder(bad, 'images'), /destination/i);
  }
});

/* ── brochure proxy ─────────────────────────────────────────────────────── */

let server: http.Server;
let base: string;

test.before(async () => {
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

test.after(() => server.close());

function get(path: string): Promise<{ status: number; raw: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(base + path);
    http
      .get(
        { hostname: url.hostname, port: url.port, path: url.pathname + url.search },
        (res) => {
          let raw = '';
          res.setEncoding('utf8');
          res.on('data', (c) => (raw += c));
          res.on('end', () => resolve({ status: res.statusCode ?? 0, raw }));
        },
      )
      .on('error', reject);
  });
}

/** Make the brochure lookup return `url` for any slug. */
function storedBrochure(url: string) {
  mock.method(courseRepo, 'findOne', async () => ({ brochureUrl: url, title: 'Course' }));
  mock.method(brochureRepo, 'findOne', async () => null);
}

test('the brochure proxy refuses to fetch a URL off the approved media hosts', async () => {
  const targets = [
    'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
    'https://169.254.169.254/latest/meta-data/',
    'http://127.0.0.1:5000/api/v1/admins',
    'https://attacker.test/collect',
    'file:///etc/passwd',
    'https://res.cloudinary.com.attacker.test/x.pdf',
  ];
  for (const target of targets) {
    storedBrochure(target);
    const res = await get('/public/brochures/some-course/download');
    assert.equal(res.status, 404, `must refuse ${target}, got ${res.status}`);
    // The refusal must not disclose what was stored or which hosts are allowed.
    assert.ok(!res.raw.includes('169.254'), 'response must not echo the target');
    assert.ok(!res.raw.includes('attacker.test'), 'response must not echo the target');
  }
  mock.restoreAll();
});

test('the brochure proxy rejects a malformed course slug outright', async () => {
  storedBrochure('https://res.cloudinary.com/a.pdf');
  for (const slug of ['..%2f..%2fetc', 'a'.repeat(300), '-leading']) {
    const res = await get(`/public/brochures/${slug}/download`);
    // 422 from the route's slug validator, or 404 from the controller's own
    // check. Both refuse before the slug reaches a cache key or an outbound
    // request; the controller keeps its copy so the guarantee does not depend
    // on the route wiring staying as it is.
    assert.ok(
      res.status === 404 || res.status === 422,
      `a malformed slug must be refused, got ${res.status}`,
    );
  }
  mock.restoreAll();
});

test('an approved host gets past the guard and fails only at the network', async () => {
  // Positive control for the test above: without this, a bug that made every
  // brochure request 404 would look like the SSRF guard working.
  storedBrochure('https://res.cloudinary.com/test-cloud/raw/upload/nope.pdf');
  const res = await get('/public/brochures/some-course/download');
  assert.notEqual(res.status, 404, 'an approved host must not be refused by the guard');
  mock.restoreAll();
});
