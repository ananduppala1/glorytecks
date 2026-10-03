import { describe, expect, it } from 'vitest';

import {
  PRODUCTION_ORIGIN,
  SITE_ORIGIN,
  canonicalPath,
  canonicalUrl,
  canonicalUrlFor,
  isValidCanonical,
  normalizePath,
  normalizeQuery,
  resolveSiteOrigin,
} from '@/lib/seo/canonical';

describe('resolveSiteOrigin', () => {
  it('accepts the production origin', () => {
    expect(resolveSiteOrigin('https://glorytecks.com')).toEqual({
      origin: 'https://glorytecks.com',
      isProduction: true,
    });
  });

  it('strips a trailing slash and lower-cases the host', () => {
    expect(resolveSiteOrigin('https://GloryTecks.com/').origin).toBe('https://glorytecks.com');
  });

  it('accepts a non-production origin and flags it as such', () => {
    const preview = resolveSiteOrigin('https://glorytecks-preview.vercel.app');
    expect(preview.origin).toBe('https://glorytecks-preview.vercel.app');
    expect(preview.isProduction).toBe(false);
    expect(preview.warning).toBeUndefined();
  });

  it('falls back to production when unset', () => {
    expect(resolveSiteOrigin(undefined).origin).toBe(PRODUCTION_ORIGIN);
    expect(resolveSiteOrigin('').origin).toBe(PRODUCTION_ORIGIN);
    expect(resolveSiteOrigin('   ').origin).toBe(PRODUCTION_ORIGIN);
  });

  it.each([
    ['glorytecks.com', 'no scheme'],
    ['//glorytecks.com', 'protocol-relative'],
    ['javascript:alert(1)', 'dangerous scheme'],
    ['ftp://glorytecks.com', 'wrong scheme'],
    ['https://glorytecks.com/in', 'carries a path'],
    ['https://glorytecks.com/?a=1', 'carries a query'],
    ['https://glorytecks.com/#x', 'carries a fragment'],
    ['not a url at all', 'unparseable'],
  ])('rejects %s (%s) and warns', (value) => {
    const result = resolveSiteOrigin(value);
    expect(result.origin).toBe(PRODUCTION_ORIGIN);
    expect(result.warning).toBeTruthy();
  });
});

describe('normalizePath', () => {
  it.each([
    ['', '/'],
    [undefined, '/'],
    ['/', '/'],
    ['courses', '/courses'],
    ['/courses', '/courses'],
    ['/courses/', '/courses'],
    ['/courses///', '/courses'],
    ['//courses', '/courses'],
    ['/blog//category//python/', '/blog/category/python'],
    ['/courses?x=1', '/courses'],
    ['/courses#top', '/courses'],
    ['  /courses  ', '/courses'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePath(input)).toBe(expected);
  });

  it('keeps the homepage path as a bare slash', () => {
    expect(normalizePath('/')).toBe('/');
  });

  it('renders the homepage URL as the bare origin', () => {
    // Next normalises a metadataBase-resolved canonical to this form before it
    // renders the tag, so the sitemap and JSON-LD must use it too or they
    // disagree with the page.
    expect(canonicalUrl('/')).toBe(SITE_ORIGIN);
    expect(canonicalUrl('')).toBe(SITE_ORIGIN);
    expect(canonicalUrl('//')).toBe(SITE_ORIGIN);
  });

  it('never leaves a trailing slash on any other path', () => {
    for (const p of ['/a/', '/a/b/', '/a/b/c///']) {
      const out = normalizePath(p);
      expect(out.endsWith('/')).toBe(false);
    }
  });
});

describe('normalizeQuery', () => {
  it('keeps only allow-listed parameters, in the declared order', () => {
    expect(normalizeQuery({ page: 2, q: 'python', utm_source: 'x' }, ['page'])).toBe('?page=2');
    expect(normalizeQuery({ b: '2', a: '1' }, ['a', 'b'])).toBe('?a=1&b=2');
    // Declaration order wins over insertion order, so two orderings of the
    // same URL cannot produce two canonicals.
    expect(normalizeQuery({ a: '1', b: '2' }, ['b', 'a'])).toBe('?b=2&a=1');
  });

  it('drops empty, null and undefined values', () => {
    expect(normalizeQuery({ page: undefined }, ['page'])).toBe('');
    expect(normalizeQuery({ page: null }, ['page'])).toBe('');
    expect(normalizeQuery({ page: '' }, ['page'])).toBe('');
    expect(normalizeQuery({ page: '   ' }, ['page'])).toBe('');
  });

  it('percent-encodes values', () => {
    expect(normalizeQuery({ q: 'a b&c' }, ['q'])).toBe('?q=a+b%26c');
  });
});

describe('canonicalPath / canonicalUrl', () => {
  it('produces absolute URLs on the configured origin', () => {
    expect(canonicalUrl('/courses')).toBe(`${SITE_ORIGIN}/courses`);
    expect(canonicalUrl('courses/')).toBe(`${SITE_ORIGIN}/courses`);
  });

  it('is the production origin in this repository', () => {
    // .env and .env.example both set NEXT_PUBLIC_SITE_URL to production, and
    // the fallback is production too — so a build that somehow loses the env
    // var still cannot publish canonicals on another host.
    expect(SITE_ORIGIN).toBe(PRODUCTION_ORIGIN);
  });

  it('appends only allow-listed query parameters', () => {
    expect(canonicalPath('/blog', { page: 3, q: 'x' }, ['page'])).toBe('/blog?page=3');
    expect(canonicalPath('/blog', { page: 1 }, ['page'])).toBe('/blog?page=1');
    expect(canonicalPath('/blog', {}, ['page'])).toBe('/blog');
  });

  it('preserves a query already on the path, filtered through the allow-list', () => {
    expect(canonicalPath('/blog?page=2')).toBe('/blog?page=2');
    expect(canonicalUrl('/blog?page=2')).toBe(`${SITE_ORIGIN}/blog?page=2`);
    // …and strips everything that is not allow-listed.
    expect(canonicalPath('/blog?q=python&page=2&sort=popular')).toBe('/blog?page=2');
    expect(canonicalPath('/blog?utm_source=news')).toBe('/blog');
    expect(canonicalPath('/courses?fbclid=abc')).toBe('/courses');
  });

  it('collapses a repeated parameter to its first value', () => {
    expect(canonicalPath('/blog?page=2&page=9')).toBe('/blog?page=2');
  });

  it('lets explicit params replace anything on the path', () => {
    expect(canonicalPath('/blog?page=2', { page: 5 }, ['page'])).toBe('/blog?page=5');
    expect(canonicalPath('/blog?page=2', {}, ['page'])).toBe('/blog');
  });

  it('is idempotent', () => {
    for (const input of ['/courses/', '/blog?page=2', '/', '/blog?q=x']) {
      const once = canonicalPath(input);
      expect(canonicalPath(once), input).toBe(once);
      const url = canonicalUrl(input);
      expect(canonicalUrl(url.replace(SITE_ORIGIN, '') || '/'), input).toBe(url);
    }
  });

  it('builds against an explicit origin for cross-environment assertions', () => {
    expect(canonicalUrlFor('https://staging.example.com', '/blog/')).toBe(
      'https://staging.example.com/blog',
    );
    // An invalid origin falls back to production rather than emitting garbage.
    expect(canonicalUrlFor('nonsense', '/blog')).toBe(`${PRODUCTION_ORIGIN}/blog`);
  });
});

describe('isValidCanonical', () => {
  it('accepts well-formed canonicals', () => {
    expect(isValidCanonical(SITE_ORIGIN)).toBe(true);
    expect(isValidCanonical(`${SITE_ORIGIN}/courses`)).toBe(true);
    expect(isValidCanonical(`${SITE_ORIGIN}/blog/category/python`)).toBe(true);
  });

  it('rejects the trailing-slash form of the homepage', () => {
    // Accepting both would let a sitemap list one form while the page renders
    // the other — the mismatch this rule exists to prevent.
    expect(isValidCanonical(`${SITE_ORIGIN}/`)).toBe(false);
  });

  it.each([
    ['/courses', 'relative'],
    ['http://glorytecks.com/courses', 'wrong scheme'],
    ['https://staging.glorytecks.com/courses', 'wrong host — staging leak'],
    ['https://glorytecks-preview.vercel.app/courses', 'preview host leak'],
    [`${PRODUCTION_ORIGIN}/`, 'homepage with a trailing slash'],
    [`${PRODUCTION_ORIGIN}/courses/`, 'trailing slash'],
    [`${PRODUCTION_ORIGIN}//courses`, 'double slash'],
    [`${PRODUCTION_ORIGIN}/courses#top`, 'fragment'],
    ['https://glorytecks.com.evil.test/courses', 'lookalike host'],
    ['not-a-url', 'unparseable'],
  ])('rejects %s (%s)', (url) => {
    expect(isValidCanonical(url, PRODUCTION_ORIGIN)).toBe(false);
  });
});
