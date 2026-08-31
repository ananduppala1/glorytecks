import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { inspectBuffer } from '../src/utils/fileSignature';

/**
 * Regression guard against over-strict detection.
 *
 * The rest of the upload tests prove hostile files are refused. This one
 * proves the opposite half, which is the easier half to break: it runs the
 * inspector over the real assets this platform ships — PDFs produced by real
 * authoring tools, a real PNG, a real JPEG — and fails if any of them stop
 * being accepted.
 *
 * These live in the main website's package because the three applications are
 * one system; the test skips rather than fails if that package is absent.
 */

const OPTS = {
  zipMaxEntries: 512,
  zipMaxTotalUncompressedBytes: 128 * 1024 * 1024,
  zipMaxCompressionRatio: 200,
  rejectActivePdf: true,
};

const PUBLIC_DIR = path.resolve(__dirname, '../../main-website/public');

test('the assets this platform actually ships are still accepted', (t) => {
  if (!fs.existsSync(PUBLIC_DIR)) return t.skip('main-website package not present');

  const targets: Array<[string, string]> = [];
  for (const [file, format] of [
    ['logo.png', 'png'],
    ['og-image.jpg', 'jpeg'],
  ] as Array<[string, string]>) {
    if (fs.existsSync(path.join(PUBLIC_DIR, file))) targets.push([file, format]);
  }

  const brochures = path.join(PUBLIC_DIR, 'brochures');
  if (fs.existsSync(brochures)) {
    for (const f of fs.readdirSync(brochures).filter((n) => n.endsWith('.pdf'))) {
      targets.push([`brochures/${f}`, 'pdf']);
    }
  }

  assert.ok(targets.length > 0, 'expected at least one real asset to check');

  for (const [rel, expected] of targets) {
    const buf = fs.readFileSync(path.join(PUBLIC_DIR, rel));
    const result = inspectBuffer(buf, OPTS);
    assert.equal(
      result.ok,
      true,
      `${rel} is a real asset and must be accepted — got: ${result.ok ? '' : result.reason}`,
    );
    if (result.ok) assert.equal(result.format.id, expected, `${rel} detected as the wrong format`);
  }
});
