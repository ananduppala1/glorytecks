import { describe, expect, it } from 'vitest';

import { PRODUCTION_ORIGIN } from '@/lib/seo/canonical';
import { STATIC_ROUTES } from '@/lib/seo/routes';
import {
  POLICY_PROBES,
  SMOKE_PAGES,
  checkPage,
  checkProbe,
  checkRobotsTxt,
  checkSitemapHygiene,
  checkSitemapIndex,
  checkSitemapUrl,
  checkUrlset,
  extractSeo,
  fillProbe,
  isVercelAppHost,
  type SmokePage,
} from '@/lib/seo/smoke';

/**
 * The smoke checker, tested offline against fixtures shaped like the two
 * builds the parity audit actually found: the Next.js page this repository
 * renders, and the legacy Vite SPA glorytecks.com was still serving.
 */

const ORIGIN = PRODUCTION_ORIGIN;
const page = (path: string) => SMOKE_PAGES.find((p) => p.path === path) as SmokePage;

const links = Array.from({ length: 12 }, (_, i) => `<a href="/courses/c${i}">c${i}</a>`).join('');

/** A page shaped like the Next.js output for `/about`. */
function nextAbout({
  origin = ORIGIN,
  title = 'About GloryTecks',
  streamed = false,
}: { origin?: string; title?: string; streamed?: boolean } = {}) {
  const route = STATIC_ROUTES.find((r) => r.path === '/about')!;
  const url = `${origin}/about`;
  const metadata = `
    <title>${title}</title>
    <meta name="description" content="${route.description}"/>
    <meta name="robots" content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"/>
    <link rel="canonical" href="${url}"/>
    <meta property="og:title" content="${title}"/>
    <meta property="og:description" content="${route.description}"/>
    <meta property="og:url" content="${url}"/>
    <meta property="og:image" content="${origin}/og-image.jpg"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:title" content="${title}"/>
    <meta name="twitter:description" content="${route.description}"/>
    <meta name="twitter:image" content="${origin}/og-image.jpg"/>`;
  const ld = [
    { '@type': 'EducationalOrganization', '@id': `${origin}/#organization` },
    { '@type': 'WebSite', '@id': `${origin}/#website` },
    { '@type': 'AboutPage', '@id': `${url}#webpage` },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { position: 1, name: 'Home', item: origin },
        { position: 2, name: 'About', item: url },
      ],
    },
  ]
    .map((s) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...s })}</script>`)
    .join('');

  return `<!DOCTYPE html><html><head>
    <script src="/_next/static/chunks/main.js" async=""></script>
    ${streamed ? '' : metadata}${ld}
  </head><body><h1>Shaping Careers. Building Futures.</h1>${links}${streamed ? metadata : ''}</body></html>`;
}

const ok = (html: string, path = '/about') => ({ status: 200, finalPath: path, html });

describe('checkPage — the Next.js build', () => {
  it('passes a page that matches the route registry on the production origin', () => {
    expect(checkPage(page('/about'), ok(nextAbout()), ORIGIN)).toEqual({ failures: [], warnings: [] });
  });

  it('fails a build whose NEXT_PUBLIC_SITE_URL was a *.vercel.app host', () => {
    const { failures } = checkPage(page('/about'), ok(nextAbout({ origin: 'https://glorytecks-one.vercel.app' })), ORIGIN);
    expect(failures).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^canonical https:\/\/glorytecks-one\.vercel\.app\/about/),
        expect.stringMatching(/^og:url /),
        expect.stringMatching(/^JSON-LD @id https:\/\/glorytecks-one/),
        expect.stringMatching(/^breadcrumb ends at/),
      ]),
    );
  });

  it('fails a title that has drifted from the route registry', () => {
    const { failures } = checkPage(page('/about'), ok(nextAbout({ title: 'About Us' })), ORIGIN);
    expect(failures.some((f) => f.startsWith('title "About Us"'))).toBe(true);
  });

  it('finds streamed metadata in <body> and warns rather than fails', () => {
    const result = checkPage(page('/about'), ok(nextAbout({ streamed: true })), ORIGIN);
    expect(result.failures).toEqual([]);
    expect(result.warnings).toEqual(['<title> streamed into <body>, not <head>']);
  });

  it('fails a redirect or a non-200', () => {
    const { failures } = checkPage(page('/about'), { status: 404, finalPath: '/', html: nextAbout() }, ORIGIN);
    expect(failures).toEqual(expect.arrayContaining(['HTTP 404, expected 200', 'redirected to /']));
  });

  it('fails duplicate titles', () => {
    const html = nextAbout().replace('</head>', '<title>Second</title></head>');
    expect(checkPage(page('/about'), ok(html), ORIGIN).failures).toContain('expected exactly one <title>, found 2');
  });
});

describe('checkPage — the legacy Vite SPA', () => {
  // Trimmed from the glorytecks.com homepage as served on 2026-09-24.
  const legacyHome = `<!doctype html><html lang="en"><head>
    <title>Best IT Training Institute in Hyderabad | GloryTecks</title>
    <meta name="description" content="GloryTecks is an IT training institute in Ameerpet, Hyderabad offering career-focused Data Science, AI, Python, Power BI and SQL courses with real-time projects." />
    <meta name="keywords" content="best IT training institute in Hyderabad" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="https://glorytecks.com/" />
    <meta property="og:url" content="https://glorytecks.com/" />
    <script type="module" crossorigin src="/assets/index-D-cfcD01.js"></script>
  </head><body><div id="root"><h1>Best IT Training Institute in Hyderabad</h1></div></body></html>`;

  it('is identified as the legacy build', () => {
    expect(extractSeo(legacyHome).framework).toBe('legacy-spa');
  });

  it('fails on framework, title, description, keywords and the trailing-slash canonical', () => {
    const { failures } = checkPage(page('/'), { status: 200, finalPath: '/', html: legacyHome }, ORIGIN);
    expect(failures).toEqual(
      expect.arrayContaining([
        'served by the legacy Vite SPA (/assets/index-*.js), not the Next.js build',
        expect.stringMatching(/^title "Best IT Training Institute in Hyderabad \| GloryTecks" does not match/),
        expect.stringMatching(/^description differs from the route registry/),
        'meta keywords present — removed from the source on purpose',
        'canonical https://glorytecks.com/, expected https://glorytecks.com',
      ]),
    );
  });
});

describe('extractSeo', () => {
  it('decodes entities in titles and attributes', () => {
    const seo = extractSeo(
      '<head><title>Data Science Blogs &amp; Tutorials | GloryTecks</title><meta name="description" content="A &#x27;quoted&#x27; &quot;value&quot;"/></head>',
    );
    expect(seo.titles).toEqual(['Data Science Blogs & Tutorials | GloryTecks']);
    expect(seo.meta.get('description')).toEqual([`A 'quoted' "value"`]);
  });

  it('reports unparseable JSON-LD instead of throwing', () => {
    expect(extractSeo('<script type="application/ld+json">{nope</script>').jsonLdErrors).toHaveLength(1);
  });
});

describe('SMOKE_PAGES', () => {
  it('holds every static page to its registry title and description', () => {
    for (const p of SMOKE_PAGES.filter((s) => typeof s.title === 'string')) {
      const route = STATIC_ROUTES.find((r) => r.path === p.path)!;
      expect(p.title).toBe(route.title);
      expect(p.description).toBe(route.description);
      expect(route.index, `${p.path} is in the smoke set but not indexable`).toBe(true);
    }
  });

  it('covers the 18 URLs from the production parity audit', () => {
    expect(SMOKE_PAGES).toHaveLength(18);
  });

  it('accepts the CMS titles the Next.js build currently renders', () => {
    const course = page('/courses/data-science').title as RegExp;
    const category = page('/blog/category/data-science').title as RegExp;
    expect(course.test('Data Science Course in Hyderabad | GloryTecks')).toBe(true);
    expect(category.test('Data Science Blogs & Tutorials (50+ Guides) | GloryTecks Hyderabad')).toBe(true);
    expect(category.test('Generative AI Blogs & Tutorials | GloryTecks Hyderabad')).toBe(true);
    // …and rejects the legacy ones.
    expect(course.test('Data Science Training in Hyderabad | GloryTecks')).toBe(false);
  });
});

describe('robots.txt and sitemaps', () => {
  it('fails the disallow-everything robots.txt a non-production origin produces', () => {
    expect(checkRobotsTxt('User-Agent: *\nDisallow: /\n', ORIGIN)).toHaveLength(2);
  });

  it('passes the production robots.txt', () => {
    const body = `User-Agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${ORIGIN}/sitemap.xml\n`;
    expect(checkRobotsTxt(body, ORIGIN)).toEqual([]);
  });

  it('fails a sitemap index on the wrong host or in the legacy shape', () => {
    const wrongHost = '<sitemapindex><sitemap><loc>https://glorytecks-one.vercel.app/sitemaps/pages.xml</loc></sitemap></sitemapindex>';
    expect(checkSitemapIndex(wrongHost, ORIGIN)).toHaveLength(1);
    expect(checkSitemapIndex('<urlset><url><loc>https://glorytecks.com/</loc></url></urlset>', ORIGIN)).toEqual([
      '/sitemap.xml is not a <sitemapindex>',
    ]);
    const good = `<sitemapindex><sitemap><loc>${ORIGIN}/sitemaps/pages.xml</loc></sitemap></sitemapindex>`;
    expect(checkSitemapIndex(good, ORIGIN)).toEqual([]);
  });

  it('fails a child sitemap entry that is not a valid canonical', () => {
    const xml = `<urlset><url><loc>${ORIGIN}</loc></url><url><loc>${ORIGIN}/</loc></url><url><loc>https://glorytecks-one.vercel.app/about</loc></url></urlset>`;
    expect(checkUrlset(xml, ORIGIN)).toHaveLength(2);
  });
});

describe('host-aware X-Robots-Tag checks', () => {
  it('recognises Vercel hosts', () => {
    expect(isVercelAppHost('https://glorytecks-psi.vercel.app')).toBe(true);
    expect(isVercelAppHost('https://glorytecks.com')).toBe(false);
    expect(isVercelAppHost('http://localhost:3107')).toBe(false);
  });

  it('requires noindex on a vercel.app page and forbids it on production', () => {
    const noindexHeader = ok(nextAbout());
    const onVercel = checkPage(page('/about'), { ...noindexHeader, xRobotsTag: 'noindex' }, ORIGIN, { hostNoindex: true });
    expect(onVercel.failures).toEqual([]);

    const missing = checkPage(page('/about'), ok(nextAbout()), ORIGIN, { hostNoindex: true });
    expect(missing.failures).toContain('*.vercel.app response without X-Robots-Tag: noindex');

    const leaked = checkPage(page('/about'), { ...noindexHeader, xRobotsTag: 'noindex' }, ORIGIN);
    expect(leaked.failures).toContain('X-Robots-Tag "noindex" on the production host');
  });
});

describe('checkSitemapHygiene', () => {
  const today = '2026-09-24';
  const urlset = (...rows: string[]) => `<urlset>${rows.join('')}</urlset>`;

  it('passes a clean set', () => {
    const children = [
      { path: '/sitemaps/pages.xml', xml: urlset(`<url><loc>${ORIGIN}</loc><lastmod>2026-09-22</lastmod></url>`) },
      { path: '/sitemaps/courses.xml', xml: urlset(`<url><loc>${ORIGIN}/courses/x</loc></url>`) },
    ];
    expect(checkSitemapHygiene(children, today)).toEqual([]);
  });

  it('fails priority, changefreq, future and malformed lastmod, and duplicates across files', () => {
    const children = [
      { path: '/a.xml', xml: urlset(`<url><loc>${ORIGIN}/x</loc><priority>0.8</priority><lastmod>2026-12-01</lastmod></url>`) },
      { path: '/b.xml', xml: urlset(`<url><loc>${ORIGIN}/x</loc><changefreq>daily</changefreq><lastmod>24/09/2026</lastmod></url>`) },
    ];
    const failures = checkSitemapHygiene(children, today);
    expect(failures).toEqual(
      expect.arrayContaining([
        '/a.xml carries <priority> or <changefreq>',
        '/b.xml carries <priority> or <changefreq>',
        '/a.xml: <lastmod> 2026-12-01 is in the future',
        '/b.xml: malformed <lastmod> 24/09/2026',
        `${ORIGIN}/x is listed in /a.xml and /b.xml`,
      ]),
    );
  });
});

describe('checkSitemapUrl', () => {
  it('passes a self-canonical indexable page', () => {
    expect(checkSitemapUrl(`${ORIGIN}/about`, { status: 200, html: nextAbout() })).toEqual([]);
  });

  it('fails a redirect, a foreign canonical and a noindex page', () => {
    expect(checkSitemapUrl(`${ORIGIN}/about`, { status: 308, html: '' })).toEqual(['HTTP 308']);
    expect(checkSitemapUrl(`${ORIGIN}/contact`, { status: 200, html: nextAbout() })).toEqual([
      `canonical ${ORIGIN}/about`,
    ]);
    const noindexed = nextAbout().replace('content="index, follow', 'content="noindex, follow');
    expect(checkSitemapUrl(`${ORIGIN}/about`, { status: 200, html: noindexed })).toHaveLength(1);
  });
});

describe('URL policy probes', () => {
  it('fills CMS placeholders, upper-casing {BLOG}', () => {
    expect(fillProbe('/blog/{BLOG}', { blog: 'sql-joins' })).toBe('/blog/SQL-JOINS');
    expect(fillProbe('/{landing}', { landing: 'python-course-ameerpet' })).toBe('/python-course-ameerpet');
    expect(fillProbe('/compare/{compare}', {})).toBe('/compare/{compare}');
  });

  it('declares a consistent expectation for every probe', () => {
    for (const p of POLICY_PROBES) {
      if (p.status === 200) expect(p.indexable, p.path).toBeTypeOf('boolean');
      if (p.status === 308) expect(p.location, p.path).toMatch(/^\//);
      if (p.indexable) expect(p.canonical, p.path).toBeTypeOf('string');
      expect(p.rule, p.path).not.toBe('');
    }
  });

  it('never probes the same request twice', () => {
    const paths = POLICY_PROBES.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  const probe = (path: string) => POLICY_PROBES.find((p) => p.path === path)!;

  it('checks a canonicalised variant against the clean canonical', () => {
    const html = nextAbout().replace(`${ORIGIN}/about`, `${ORIGIN}/blog`);
    expect(checkProbe(probe('/blog?utm_source=x&utm_medium=y'), { status: 200, location: null, html }, ORIGIN)).toEqual([]);
    expect(checkProbe(probe('/blog?utm_source=x&utm_medium=y'), { status: 200, location: null, html: nextAbout() }, ORIGIN)).toEqual([
      `canonical ${ORIGIN}/about, expected ${ORIGIN}/blog`,
    ]);
  });

  it('requires a filtered view to be noindex, follow with no canonical', () => {
    const indexed = checkProbe(probe('/blog?q=python'), { status: 200, location: null, html: nextAbout() }, ORIGIN);
    expect(indexed).toEqual(
      expect.arrayContaining([expect.stringMatching(/^declares canonical/), expect.stringMatching(/expected noindex$/)]),
    );
  });

  it('checks status and redirect target', () => {
    expect(checkProbe(probe('/blog?page=0'), { status: 200, location: null, html: '' }, ORIGIN)).toEqual([
      'HTTP 200, expected 404',
    ]);
    expect(checkProbe(probe('/courses/'), { status: 308, location: '/courses', html: '' }, ORIGIN)).toEqual([]);
    expect(checkProbe(probe('/courses/'), { status: 308, location: '/courses/', html: '' }, ORIGIN)).toEqual([
      'redirects to /courses/, expected /courses',
    ]);
  });
});
