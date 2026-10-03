// ─────────────────────────────────────────────────────────────────────────────
// Production SEO smoke check — the parity gate between what this repository
// generates and what a deployed origin actually serves.
//
// Every other suite in lib/seo proves what the code WOULD emit. None of them
// can notice that the domain is serving something else entirely — which is
// exactly what docs/SEO_PRODUCTION_PARITY_REPORT.md found: glorytecks.com was
// still serving the legacy Vite SPA while all 289 unit tests passed, and the
// Next.js deployment was building every canonical on a dead *.vercel.app host.
//
// This module is pure — HTML and text in, failures out — so the checker itself
// is unit-tested offline in smoke.test.ts. The network half lives in
// production.smoke.test.ts and only runs when SEO_SMOKE_BASE_URL is set.
// ─────────────────────────────────────────────────────────────────────────────

import { canonicalUrlFor, isValidCanonical } from './canonical';
import { staticRoute } from './routes';
import { MERGED_ARTICLES } from '../blog/merged';
import { RESOURCE_SLUGS } from '../../config/resources';

/* ── What to check ────────────────────────────────────────────────────────── */

export interface SmokePage {
  path: string;
  /** Exact title for registry routes; the source template for CMS routes. */
  title: string | RegExp;
  /** Exact description for registry routes; CMS routes only need one. */
  description?: string;
  /** schema.org types this page must carry on top of the site-wide nodes. */
  schema: readonly string[];
}

/** Emitted by the root layout on every page. */
export const SITE_WIDE_SCHEMA = ['EducationalOrganization', 'WebSite', 'BreadcrumbList'] as const;

const registryPage = (path: string, schema: readonly string[]): SmokePage => {
  const route = staticRoute(path);
  return { path, title: route.title, description: route.description, schema };
};

/**
 * The money pages and hubs. Static routes are held to the route registry
 * word for word; CMS routes are held to the template their page file renders.
 */
export const SMOKE_PAGES: readonly SmokePage[] = [
  registryPage('/', ['WebPage', 'LocalBusiness', 'FAQPage']),
  registryPage('/courses', ['CollectionPage']),
  registryPage('/training-in-hyderabad', ['WebPage', 'LocalBusiness']),
  ...[
    'data-science',
    'python-programming',
    'power-bi',
    'data-analytics',
    'data-engineering',
    'gen-ai',
    'agentic-ai',
    'mlops',
    'sql-server',
  ].map((slug) => ({
    path: `/courses/${slug}`,
    // app/(site)/courses/[slug]/page.tsx → generateMetadata
    title: /^.+ Course in Hyderabad \| GloryTecks$/,
    schema: ['Course'],
  })),
  registryPage('/blog', ['Blog']),
  ...['data-science', 'generative-ai'].map((slug) => ({
    path: `/blog/category/${slug}`,
    // app/(site)/blog/category/[categorySlug]/page.tsx → generateMetadata
    title: /^.+ Blogs & Tutorials( \(\d+\+ Guides\))? \| GloryTecks Hyderabad$/,
    schema: ['CollectionPage'],
  })),
  registryPage('/placements', ['WebPage']),
  registryPage('/about', ['AboutPage']),
  registryPage('/contact', ['ContactPage']),
];

/* ── HTML extraction ──────────────────────────────────────────────────────── */

type SchemaNode = Record<string, unknown>;

export interface ExtractedSeo {
  titles: string[];
  /** Every <meta name|property=…> value, keyed by lower-cased name. */
  meta: Map<string, string[]>;
  canonicals: string[];
  h1: string[];
  nodes: SchemaNode[];
  jsonLdErrors: string[];
  internalLinks: string[];
  /**
   * False when <title> sits in <body>. Next streams metadata there on dynamic
   * routes for user agents it does not treat as HTML-limited — Googlebot
   * included. Google reads it after rendering, so this is a warning, not a
   * failure; see the parity report for the trade-off.
   */
  metadataInHead: boolean;
  /** Which build produced the page. */
  framework: 'next' | 'legacy-spa' | 'unknown';
}

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return m ? decode(m[1] ?? m[2]) : undefined;
}

const text = (html: string) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function flattenGraph(value: unknown, out: SchemaNode[]) {
  if (Array.isArray(value)) {
    for (const v of value) flattenGraph(v, out);
  } else if (value && typeof value === 'object') {
    const node = value as SchemaNode;
    if (node['@graph']) flattenGraph(node['@graph'], out);
    if (node['@type']) out.push(node);
  }
}

/**
 * Read the SEO surface of a server response the way a non-rendering crawler
 * does: from the raw HTML, without executing JavaScript. The whole document is
 * searched, so streamed metadata is still found — `metadataInHead` records
 * where it was.
 */
export function extractSeo(html: string): ExtractedSeo {
  const meta = new Map<string, string[]>();
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = (attr(tag, 'name') ?? attr(tag, 'property'))?.toLowerCase();
    const content = attr(tag, 'content');
    if (!key || content === undefined) continue;
    meta.set(key, [...(meta.get(key) ?? []), content]);
  }

  const titles = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => text(m[1]));
  const canonicals = [...html.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi)]
    .map(([tag]) => attr(tag, 'href'))
    .filter((href): href is string => href !== undefined);
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => text(m[1]));

  const nodes: SchemaNode[] = [];
  const jsonLdErrors: string[] = [];
  for (const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      flattenGraph(JSON.parse(m[1]), nodes);
    } catch (e) {
      jsonLdErrors.push(String(e));
    }
  }

  const internalLinks = [
    ...new Set(
      [...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)]
        .map((m) => decode(m[1]))
        .filter((href) => href.startsWith('/') && !href.startsWith('//')),
    ),
  ];

  const titleAt = html.search(/<title\b/i);
  const headEnd = html.search(/<\/head>/i);

  return {
    titles,
    meta,
    canonicals,
    h1,
    nodes,
    jsonLdErrors,
    internalLinks,
    metadataInHead: titleAt !== -1 && (headEnd === -1 || titleAt < headEnd),
    framework: /\/_next\/static\//.test(html)
      ? 'next'
      : /<script\b[^>]*type=["']module["'][^>]*src=["']\/assets\/index-/i.test(html)
        ? 'legacy-spa'
        : 'unknown',
  };
}

/* ── Checks ───────────────────────────────────────────────────────────────── */

export interface SmokeResult {
  failures: string[];
  warnings: string[];
}

export interface FetchedPage {
  status: number;
  /** Site-relative path of the final response, after any redirects. */
  finalPath: string;
  html: string;
  /** The X-Robots-Tag response header, when there is one. */
  xRobotsTag?: string | null;
}

export interface CheckOptions {
  /**
   * True when the page was fetched from a *.vercel.app host. Those must carry
   * `X-Robots-Tag: noindex` (next.config.mjs); every other host must not.
   */
  hostNoindex?: boolean;
}

/** True for a Vercel deployment or alias hostname. */
export const isVercelAppHost = (base: string) => /\.vercel\.app$/i.test(new URL(base).hostname);

function checkRobotsHeader(xRobotsTag: string | null | undefined, hostNoindex: boolean, failures: string[]) {
  const noindex = /noindex/i.test(xRobotsTag ?? '');
  if (hostNoindex && !noindex) failures.push('*.vercel.app response without X-Robots-Tag: noindex');
  if (!hostNoindex && noindex) failures.push(`X-Robots-Tag "${xRobotsTag}" on the production host`);
}

const types = (n: SchemaNode) => ([] as unknown[]).concat(n['@type']).map(String);

function one(label: string, values: readonly string[] | undefined, failures: string[]): string | undefined {
  const list = values ?? [];
  if (list.length !== 1) failures.push(`expected exactly one ${label}, found ${list.length}`);
  return list[0];
}

/**
 * Hold one served page to what the repository generates for it.
 *
 * `origin` is the origin canonicals must be built on — normally
 * https://glorytecks.com even when `page` was fetched from a *.vercel.app
 * deployment, which is how a build is vetted before the domain points at it.
 */
export function checkPage(
  page: SmokePage,
  fetched: FetchedPage,
  origin: string,
  { hostNoindex = false }: CheckOptions = {},
): SmokeResult {
  const failures: string[] = [];
  const warnings: string[] = [];

  checkRobotsHeader(fetched.xRobotsTag, hostNoindex, failures);

  if (fetched.status !== 200) failures.push(`HTTP ${fetched.status}, expected 200`);
  if (fetched.finalPath !== page.path) failures.push(`redirected to ${fetched.finalPath}`);

  const seo = extractSeo(fetched.html);

  if (seo.framework !== 'next') {
    failures.push(
      seo.framework === 'legacy-spa'
        ? 'served by the legacy Vite SPA (/assets/index-*.js), not the Next.js build'
        : 'no /_next/static/ assets — not the Next.js build',
    );
  }
  if (!seo.metadataInHead && seo.titles.length) warnings.push('<title> streamed into <body>, not <head>');

  const expectedCanonical = canonicalUrlFor(origin, page.path);

  const title = one('<title>', seo.titles, failures);
  if (title !== undefined) {
    const ok = typeof page.title === 'string' ? title === page.title : page.title.test(title);
    if (!ok) failures.push(`title ${JSON.stringify(title)} does not match ${String(page.title)}`);
  }

  const description = one('meta description', seo.meta.get('description'), failures);
  if (description !== undefined && page.description !== undefined && description !== page.description) {
    failures.push(`description differs from the route registry: ${JSON.stringify(description)}`);
  }
  if (description === '') failures.push('meta description is empty');

  const canonical = one('rel=canonical', seo.canonicals, failures);
  if (canonical !== undefined && canonical !== expectedCanonical) {
    failures.push(`canonical ${canonical}, expected ${expectedCanonical}`);
  }

  const robots = one('meta robots', seo.meta.get('robots'), failures);
  if (robots !== undefined && (!/\bindex\b/.test(robots) || /noindex|nofollow|none/.test(robots))) {
    failures.push(`robots "${robots}" is not index,follow`);
  }
  if (seo.meta.has('keywords')) failures.push('meta keywords present — removed from the source on purpose');

  const ogUrl = one('og:url', seo.meta.get('og:url'), failures);
  if (ogUrl !== undefined && ogUrl !== expectedCanonical) failures.push(`og:url ${ogUrl}, expected ${expectedCanonical}`);
  for (const key of ['og:title', 'og:description', 'twitter:title', 'twitter:description']) {
    if (!seo.meta.get(key)?.[0]) failures.push(`${key} missing`);
  }
  for (const key of ['og:image', 'twitter:image']) {
    const url = seo.meta.get(key)?.[0];
    if (!url || !/^https:\/\//.test(url)) failures.push(`${key} missing or not an absolute https URL`);
  }
  if (seo.meta.get('twitter:card')?.[0] !== 'summary_large_image') failures.push('twitter:card is not summary_large_image');

  if (seo.h1.length !== 1 || !seo.h1[0]) failures.push(`expected exactly one non-empty <h1>, found ${seo.h1.length}`);

  for (const error of seo.jsonLdErrors) failures.push(`unparseable JSON-LD: ${error}`);
  const present = new Set(seo.nodes.flatMap(types));
  for (const type of [...SITE_WIDE_SCHEMA, ...page.schema]) {
    if (!present.has(type)) failures.push(`JSON-LD has no ${type} node`);
  }
  // Every node id is built from the site origin. One on another host is the
  // signature of a wrong NEXT_PUBLIC_SITE_URL at build time.
  for (const node of seo.nodes) {
    const id = node['@id'];
    if (typeof id === 'string' && /^https?:\/\//.test(id) && !id.startsWith(origin)) {
      failures.push(`JSON-LD @id ${id} is not on ${origin}`);
    }
  }
  const breadcrumb = seo.nodes.find((n) => types(n).includes('BreadcrumbList'));
  const items = (breadcrumb?.itemListElement ?? []) as { item?: unknown }[];
  const last = items.at(-1)?.item;
  const lastUrl = typeof last === 'string' ? last : (last as { '@id'?: string } | undefined)?.['@id'];
  if (breadcrumb && lastUrl !== expectedCanonical) {
    failures.push(`breadcrumb ends at ${lastUrl}, expected ${expectedCanonical}`);
  }

  // The server-rendered page must carry its own navigation; a client-only
  // shell would ship almost none.
  if (seo.internalLinks.length < 10) {
    failures.push(`only ${seo.internalLinks.length} internal links in the server HTML`);
  }

  return { failures, warnings };
}

/** robots.txt must invite crawling and point at this origin's sitemap. */
export function checkRobotsTxt(body: string, origin: string): string[] {
  const failures: string[] = [];
  if (/^\s*disallow:\s*\/\s*$/im.test(body)) {
    failures.push('robots.txt disallows the whole site — NEXT_PUBLIC_SITE_URL is not the production origin');
  }
  const sitemaps = [...body.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  if (!sitemaps.includes(`${origin}/sitemap.xml`)) {
    failures.push(`robots.txt does not list ${origin}/sitemap.xml (found: ${sitemaps.join(', ') || 'none'})`);
  }
  return failures;
}

export const sitemapLocs = (xml: string) =>
  [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => decode(m[1]));

/** /sitemap.xml must be the index of per-type child sitemaps on this origin. */
export function checkSitemapIndex(xml: string, origin: string): string[] {
  if (!/<sitemapindex\b/.test(xml)) return ['/sitemap.xml is not a <sitemapindex>'];
  const locs = sitemapLocs(xml);
  if (locs.length === 0) return ['/sitemap.xml lists no child sitemaps'];
  return locs
    .filter((loc) => !loc.startsWith(`${origin}/sitemaps/`))
    .map((loc) => `sitemap index entry ${loc} is not under ${origin}/sitemaps/`);
}

/** Every <loc> in a child sitemap must be a valid canonical on this origin. */
export function checkUrlset(xml: string, origin: string): string[] {
  if (!/<urlset\b/.test(xml)) return ['not a <urlset>'];
  return sitemapLocs(xml)
    .filter((loc) => !isValidCanonical(loc, origin))
    .map((loc) => `${loc} is not a valid canonical on ${origin}`);
}

/**
 * Sitemap-set hygiene: no <priority>/<changefreq>, no malformed or future
 * <lastmod>, and no URL listed twice anywhere in the set.
 *
 * `today` is passed in (YYYY-MM-DD) so this stays pure.
 */
export function checkSitemapHygiene(children: readonly { path: string; xml: string }[], today: string): string[] {
  const failures: string[] = [];
  const seen = new Map<string, string>();
  for (const { path, xml } of children) {
    if (/<priority>|<changefreq>/.test(xml)) failures.push(`${path} carries <priority> or <changefreq>`);
    for (const [, lastmod] of xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) failures.push(`${path}: malformed <lastmod> ${lastmod}`);
      else if (lastmod > today) failures.push(`${path}: <lastmod> ${lastmod} is in the future`);
    }
    for (const loc of sitemapLocs(xml)) {
      const first = seen.get(loc);
      if (first) failures.push(`${loc} is listed in ${first} and ${path}`);
      else seen.set(loc, path);
    }
  }
  return failures;
}

/**
 * One sitemap URL as served: 200 with no redirect, exactly one canonical equal
 * to its own <loc>, and indexable.
 */
export function checkSitemapUrl(
  loc: string,
  fetched: Omit<FetchedPage, 'finalPath'>,
  { hostNoindex = false }: CheckOptions = {},
): string[] {
  const failures: string[] = [];
  if (fetched.status !== 200) return [`HTTP ${fetched.status}`];
  const seo = extractSeo(fetched.html);
  if (seo.canonicals.length !== 1) failures.push(`${seo.canonicals.length} canonicals`);
  else if (seo.canonicals[0] !== loc) failures.push(`canonical ${seo.canonicals[0]}`);
  const robots = seo.meta.get('robots')?.[0] ?? '';
  if (!/\bindex\b/.test(robots) || /noindex/.test(robots)) failures.push(`robots "${robots}"`);
  checkRobotsHeader(fetched.xRobotsTag, hostNoindex, failures);
  return failures;
}

/* ── URL policy matrix ────────────────────────────────────────────────────── */

export interface PolicyProbe {
  /**
   * Request path. `{blog}`, `{compare}` and `{landing}` are filled from the
   * live sitemaps so the probes survive CMS changes; `{BLOG}` is `{blog}`
   * upper-cased.
   */
  path: string;
  status: 200 | 308 | 404 | 405;
  /** 200 only: may the page be indexed? */
  indexable?: boolean;
  /** 200 only: the canonical path it must declare, or null for none at all. */
  canonical?: string | null;
  /** 308 only: the path it must redirect to. */
  location?: string;
  /** The rule this probe exercises, for the report. */
  rule: string;
}

const merged = MERGED_ARTICLES[0];
const resource = RESOURCE_SLUGS[0];

const indexable = (path: string, rule: string, canonical = path.split('?')[0]): PolicyProbe => ({
  path,
  status: 200,
  indexable: true,
  canonical,
  rule,
});
const noindex = (path: string, rule: string, canonical: string | null = null): PolicyProbe => ({
  path,
  status: 200,
  indexable: false,
  canonical,
  rule,
});
const moved = (path: string, location: string, rule: string): PolicyProbe => ({ path, status: 308, location, rule });
const gone = (path: string, rule: string): PolicyProbe => ({ path, status: 404, rule });

/**
 * The whole crawl and indexation policy as concrete requests. Each one is a
 * row of the URL-policy table in docs/SEO_PHASE_1_FINAL_VERIFICATION.md.
 */
export const POLICY_PROBES: readonly PolicyProbe[] = [
  // Indexable pages: 200, index, exactly one self-canonical.
  indexable('/', 'static page'),
  indexable('/courses', 'static page'),
  indexable('/compare', 'static page'),
  indexable('/resources', 'static page'),
  indexable('/entities', 'static page'),
  indexable('/blog', 'blog archive'),
  indexable('/blog?page=2', 'pagination: page 2+ self-canonicalises', '/blog?page=2'),
  indexable('/blog/category/data-science', 'category archive'),
  indexable('/blog/category/data-science?page=2', 'category pagination', '/blog/category/data-science?page=2'),
  indexable('/courses/data-science', 'dynamic course slug'),
  indexable('/blog/{blog}', 'dynamic blog slug'),
  indexable('/compare/{compare}', 'comparison slug'),
  indexable(`/resources/${resource}`, 'resource slug'),
  indexable('/{landing}', 'location slug'),

  // Parameter variants: still 200, but canonicalised onto the clean URL.
  indexable('/blog?page=1', 'page 1 canonicalises to the bare archive', '/blog'),
  indexable('/blog?sort=latest', 'default sort is not a filter', '/blog'),
  indexable('/blog?utm_source=x&utm_medium=y', 'UTM stripped from canonical', '/blog'),
  indexable('/blog?page=2&utm_campaign=z', 'UTM stripped, page kept', '/blog?page=2'),
  indexable('/courses/data-science?utm_source=x&gclid=1', 'click IDs stripped', '/courses/data-science'),
  indexable('/?fbclid=x', 'click IDs stripped', '/'),
  // Case variants resolve on the backend and are held by the canonical, not a
  // redirect — see lib/seo/slugs.ts for why a page-level 308 was rejected.
  indexable('/courses/Data-Science', 'slug case variant: canonicalised', '/courses/data-science'),
  indexable('/blog/{BLOG}', 'slug case variant: canonicalised', '/blog/{blog}'),

  // Filters: crawlable, noindex + follow, no canonical.
  noindex('/blog?q=python', 'search: noindex, follow'),
  noindex('/blog?tag=python', 'tag: noindex, follow'),
  noindex('/blog?sort=popular', 'sort: noindex, follow'),
  noindex('/blog?page=2&sort=popular', 'filtered pagination: noindex, follow'),
  noindex('/blog/category/data-science?tag=python', 'category tag: noindex, follow'),
  noindex('/blog/category/data-science?q=roadmap', 'category search: noindex, follow'),

  // Utility routes: noindex + follow, never in a sitemap.
  noindex('/thank-you', 'thank-you: noindex, follow', '/thank-you'),
  noindex('/brochures/data-science/download', 'brochure hand-off: noindex, follow'),

  // Malformed or out-of-range pagination: 404, never an empty 200.
  gone('/blog?page=0', 'malformed page'),
  gone('/blog?page=-1', 'malformed page'),
  gone('/blog?page=abc', 'malformed page'),
  gone('/blog?page=01', 'malformed page (leading zero)'),
  gone('/blog?page=1.5', 'malformed page'),
  gone('/blog?page=2&page=3', 'repeated page parameter'),
  gone('/blog?page=99999', 'page beyond the last'),
  gone('/blog/category/data-science?page=9999', 'category page beyond the last'),
  gone('/blog?q=python&page=9999', 'filtered page beyond the last'),

  // Unknown slugs: real 404s, never soft 404s.
  gone('/courses/does-not-exist-xyz', 'unknown course slug'),
  gone('/blog/does-not-exist-xyz', 'unknown blog slug'),
  gone('/blog/category/does-not-exist-xyz', 'unknown category slug'),
  gone('/compare/does-not-exist-xyz', 'unknown comparison slug'),
  gone('/resources/does-not-exist-xyz', 'unknown resource slug'),
  gone('/does-not-exist-xyz', 'unknown location slug'),
  gone('/brochures/does-not-exist-xyz/download', 'unknown brochure slug'),
  gone('/index.html', 'legacy SPA shell'),

  // Redirects: one 308 hop to the canonical URL.
  moved('/courses/', '/courses', 'trailing slash'),
  moved('/blog/category/data-science/', '/blog/category/data-science', 'trailing slash'),
  moved('//courses', '/courses', 'double slash'),
  moved('/data-science-course', '/courses/data-science', 'legacy URL'),
  moved(`/blog/${merged.from}`, `/blog/${merged.to}`, 'merged article'),
  moved('/sitemap-index.xml', '/sitemap.xml', 'legacy sitemap'),
  moved('/blog-sitemap.xml', '/sitemaps/blog.xml', 'legacy sitemap'),
  moved('/category-sitemap.xml', '/sitemaps/categories.xml', 'legacy sitemap'),
  moved('/image-sitemap.xml', '/sitemaps/blog.xml', 'legacy sitemap'),

  { path: '/api/revalidate', status: 405, rule: 'POST-only endpoint' },
];

/** Fill `{blog}`, `{BLOG}`, `{compare}` and `{landing}` in a probe path. */
export function fillProbe(path: string, vars: Readonly<Record<string, string>>): string {
  return path.replace(/\{(\w+)\}/g, (m, key: string) => {
    if (key in vars) return vars[key];
    const lower = key.toLowerCase();
    if (key === key.toUpperCase() && lower in vars) return vars[lower].toUpperCase();
    return m;
  });
}

export interface ProbeResponse {
  status: number;
  /** Site-relative path + query of the Location header, for a redirect. */
  location: string | null;
  html: string;
  xRobotsTag?: string | null;
}

/** Hold one response to its probe. Paths must already be filled. */
export function checkProbe(
  probe: PolicyProbe,
  res: ProbeResponse,
  origin: string,
  { hostNoindex = false }: CheckOptions = {},
): string[] {
  if (res.status !== probe.status) {
    return [`HTTP ${res.status}${res.location ? ` → ${res.location}` : ''}, expected ${probe.status}`];
  }
  const failures: string[] = [];

  if (probe.status === 308 && res.location !== probe.location) {
    failures.push(`redirects to ${res.location}, expected ${probe.location}`);
  }

  if (probe.status === 200) {
    const seo = extractSeo(res.html);
    if (probe.canonical === null) {
      if (seo.canonicals.length) failures.push(`declares canonical ${seo.canonicals[0]}, expected none`);
    } else if (probe.canonical !== undefined) {
      const expected = canonicalUrlFor(origin, probe.canonical);
      if (seo.canonicals.length !== 1 || seo.canonicals[0] !== expected) {
        failures.push(`canonical ${seo.canonicals.join(', ') || 'none'}, expected ${expected}`);
      }
    }

    const robots = seo.meta.get('robots')?.[0] ?? '';
    if (probe.indexable) {
      if (!/\bindex\b/.test(robots) || /noindex/.test(robots)) failures.push(`robots "${robots}", expected index`);
      checkRobotsHeader(res.xRobotsTag, hostNoindex, failures);
    } else {
      if (!/noindex/.test(robots)) failures.push(`robots "${robots}", expected noindex`);
      if (/nofollow/.test(robots)) failures.push(`robots "${robots}" drops follow`);
      if (hostNoindex) checkRobotsHeader(res.xRobotsTag, true, failures);
    }
  }

  return failures;
}
