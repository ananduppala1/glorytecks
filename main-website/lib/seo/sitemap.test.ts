import { afterEach, describe, expect, it, vi } from 'vitest';

import { canonicalUrl } from '@/lib/seo/canonical';
import {
  buildSitemapIndex,
  buildUrlset,
  contentLastModified,
  isoDate,
  newestDate,
  sanitizeEntries,
  validateEntries,
  xmlEscape,
} from '@/lib/seo/sitemap';
import { STATIC_ROUTES } from '@/lib/seo/routes';

afterEach(() => {
  vi.useRealTimers();
});

describe('isoDate — never invents a date', () => {
  it('passes a plain ISO date through untouched', () => {
    expect(isoDate('2026-03-14')).toBe('2026-03-14');
  });

  it('truncates a timestamp to its UTC date', () => {
    expect(isoDate('2026-03-14T18:22:05.123Z')).toBe('2026-03-14');
  });

  it.each([undefined, null, '', '   ', 'not a date', '2026-13-45', '2026-02-30'])(
    'returns null for %s rather than falling back to today',
    (value) => {
      expect(isoDate(value as string | null | undefined)).toBeNull();
    },
  );

  it('does not read the clock', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    expect(isoDate(undefined)).toBeNull();
    expect(isoDate('2026-03-14')).toBe('2026-03-14');
  });
});

describe('contentLastModified', () => {
  it('prefers a genuine update over the published date', () => {
    expect(contentLastModified('2026-05-02', '2026-01-10')).toBe('2026-05-02');
  });

  it('falls back to the published date when there is no update', () => {
    expect(contentLastModified(undefined, '2026-01-10')).toBe('2026-01-10');
    expect(contentLastModified('', '2026-01-10')).toBe('2026-01-10');
  });

  it('ignores an "update" that predates publication', () => {
    expect(contentLastModified('2025-01-01', '2026-01-10')).toBe('2026-01-10');
  });

  it('returns null when neither date is usable', () => {
    expect(contentLastModified(undefined, undefined)).toBeNull();
    expect(contentLastModified('junk', 'junk')).toBeNull();
  });
});

describe('newestDate', () => {
  it('picks the latest real date and ignores the rest', () => {
    expect(newestDate(['2026-01-01', null, 'junk', '2026-06-30', '2025-12-31'])).toBe('2026-06-30');
  });

  it('is null for an empty or entirely unusable set', () => {
    expect(newestDate([])).toBeNull();
    expect(newestDate([null, undefined, 'junk'])).toBeNull();
  });
});

describe('validateEntries', () => {
  const ok = { url: canonicalUrl('/courses'), lastModified: '2026-03-14' };

  it('accepts a clean entry', () => {
    expect(validateEntries([ok])).toEqual([]);
  });

  it('rejects a relative URL', () => {
    expect(validateEntries([{ url: '/courses' }])[0].problem).toMatch(/canonical/);
  });

  it('rejects a foreign or staging hostname', () => {
    expect(validateEntries([{ url: 'https://staging.glorytecks.com/courses' }])).toHaveLength(1);
    expect(validateEntries([{ url: 'https://preview.vercel.app/courses' }])).toHaveLength(1);
  });

  it('rejects a trailing slash and a double slash', () => {
    expect(validateEntries([{ url: canonicalUrl('/courses') + '/' }])).toHaveLength(1);
    expect(validateEntries([{ url: 'https://glorytecks.com//courses' }])).toHaveLength(1);
  });

  it('rejects a URL carrying a query string — no filter URLs in sitemaps', () => {
    const issues = validateEntries([{ url: 'https://glorytecks.com/blog?q=python' }]);
    expect(issues).toHaveLength(1);
  });

  it('rejects duplicates', () => {
    const issues = validateEntries([ok, { ...ok }]);
    expect(issues).toHaveLength(1);
    expect(issues[0].problem).toBe('duplicate entry');
  });

  it('rejects a malformed lastmod', () => {
    const issues = validateEntries([{ url: ok.url, lastModified: '14/03/2026' }]);
    expect(issues[0].problem).toMatch(/malformed lastmod/);
  });

  it('accepts a missing lastmod', () => {
    expect(validateEntries([{ url: ok.url, lastModified: null }])).toEqual([]);
    expect(validateEntries([{ url: ok.url }])).toEqual([]);
  });
});

describe('sanitizeEntries', () => {
  it('drops everything validateEntries rejects and keeps the rest in order', () => {
    const entries = [
      { url: canonicalUrl('/a') },
      { url: '/relative' },
      { url: canonicalUrl('/b') },
      { url: canonicalUrl('/a') },
      { url: 'https://glorytecks.com/c?x=1' },
    ];
    expect(sanitizeEntries(entries).map((e) => e.url)).toEqual([
      canonicalUrl('/a'),
      canonicalUrl('/b'),
    ]);
  });
});

describe('buildUrlset', () => {
  const xml = buildUrlset([
    { url: canonicalUrl('/'), lastModified: '2026-09-22' },
    { url: canonicalUrl('/courses'), lastModified: null },
  ]);

  it('emits a valid urlset', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
  });

  it('emits <lastmod> only when there is a real date', () => {
    expect(xml).toContain('<loc>https://glorytecks.com</loc>\n    <lastmod>2026-09-22</lastmod>');
    expect(xml).toContain('<loc>https://glorytecks.com/courses</loc>\n  </url>');
  });

  it('never emits the obsolete <priority> or <changefreq> elements', () => {
    expect(xml).not.toContain('<priority>');
    expect(xml).not.toContain('<changefreq>');
  });

  it('escapes XML entities in a URL', () => {
    expect(buildUrlset([{ url: 'https://glorytecks.com/a&b' }])).toContain('/a&amp;b');
  });

  it('produces identical output whatever the system clock says', () => {
    const entries = [{ url: canonicalUrl('/courses'), lastModified: '2026-03-14' }];
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const a = buildUrlset(entries);
    vi.setSystemTime(new Date('2031-07-04T00:00:00Z'));
    const b = buildUrlset(entries);
    expect(a).toBe(b);
  });
});

describe('buildSitemapIndex', () => {
  const xml = buildSitemapIndex([
    { url: canonicalUrl('/sitemaps/pages.xml') },
    { url: canonicalUrl('/sitemaps/blog.xml') },
  ]);

  it('emits a sitemapindex, not a urlset', () => {
    expect(xml).toContain('<sitemapindex');
    expect(xml).not.toContain('<urlset');
    expect(xml).toContain('<sitemap>');
  });

  it('carries no fabricated lastmod', () => {
    expect(xml).not.toContain('<lastmod>');
  });
});

describe('xmlEscape', () => {
  it('escapes all five XML entities', () => {
    expect(xmlEscape(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&apos;');
  });
});

describe('static route lastmod values are source-controlled constants', () => {
  it('are plain ISO dates or deliberately absent', () => {
    for (const route of STATIC_ROUTES) {
      if (route.lastModified === null) continue;
      expect(route.lastModified, route.path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(isoDate(route.lastModified), route.path).toBe(route.lastModified);
    }
  });

  it('do not move when the clock does', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2031-07-04T00:00:00Z'));
    const snapshot = STATIC_ROUTES.map((r) => r.lastModified);
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    expect(STATIC_ROUTES.map((r) => r.lastModified)).toEqual(snapshot);
    // And none of them is simply "today", which is what the old sitemaps did.
    expect(snapshot).not.toContain(new Date().toISOString().slice(0, 10));
  });
});
