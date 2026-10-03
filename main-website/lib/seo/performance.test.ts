import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards for the Phase 8 measurements (docs/PERFORMANCE_SEO_VERIFICATION.md).
 * Both protect a behaviour that looks like it could be "cleaned up" but was
 * measured to matter.
 */

const WEB = process.cwd();
const read = (rel: string) => readFileSync(path.join(WEB, rel), 'utf8');
const stripCssComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('scroll reveal and Largest Contentful Paint', () => {
  const css = stripCssComments(read('app/globals.css'));

  it('never hides a reveal element at opacity 0', () => {
    // Chrome skips opacity-0 paints when recording LCP, so a hero held at 0 was
    // counted only after its fade: 1.0–1.3 s later on a throttled mobile load.
    const hidden = css.match(/html\.reveal-ready \.reveal:not\(\[data-inview\]\)\s*\{([^}]*)\}/);
    expect(hidden, 'hidden-state rule').not.toBeNull();
    const opacity = Number(hidden![1].match(/opacity:\s*([\d.]+)/)?.[1]);
    expect(opacity).toBeGreaterThan(0);
  });

  it('starts the fade above opacity 0 even when a call site asks for 0', () => {
    const keyframes = css.match(/@keyframes gt-reveal\s*\{[\s\S]*?from\s*\{([^}]*)\}/);
    expect(keyframes, 'gt-reveal keyframes').not.toBeNull();
    expect(keyframes![1]).toMatch(/opacity:\s*max\(var\(--reveal-opacity,\s*0\),\s*0\.01\)/);
  });
});

describe('analytics loaders', () => {
  const layout = read('app/layout.tsx');

  it('loads GA4 exactly once, directly — GTM-TD5HFZ79 carries no GA4 tag', () => {
    // Verified against the live container (version 3): its only tag is
    // Microsoft Clarity. Removing the direct gtag.js as a "duplicate" would
    // remove GA4 entirely, including the generate_lead events from lib/analytics.
    expect(layout.match(/googletagmanager\.com\/gtag\/js/g)).toHaveLength(1);
    expect(layout.match(/gtag\('config'/g)).toHaveLength(1);
    expect(layout).toMatch(/googletagmanager\.com\/gtm\.js/);
  });
});
