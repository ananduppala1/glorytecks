// ─────────────────────────────────────────────────────────────────────────────
// Search-intent ownership, cannibalisation detection and the internal-link graph.
//
// docs/SEO_KEYWORD_MAP.md is the intent contract: one page, one primary intent.
// This module turns that contract into something a machine can check across
// every indexable URL — including the ~600 CMS articles the registry cannot
// list by hand.
//
// It compares SEARCH INTENT, not keyword frequency. Two pages collide when
// they would answer the same query for the same reason: the same comparison,
// the same interview topic, the same commercial offer in the same place. Two
// "X interview questions for data engineers" articles about different X do
// not collide, however many words their titles share.
//
// Pure: page records and link edges in, findings out. Used by intent.test.ts
// (offline), linkgraph.live.test.ts (a crawl of a deployed site) and the
// Phase 3 reports.
// ─────────────────────────────────────────────────────────────────────────────

/* ── Page model ───────────────────────────────────────────────────────────── */

export type PageType =
  | 'home'
  | 'course-hub'
  | 'course'
  | 'location'
  | 'landing'
  | 'blog-hub'
  | 'category'
  | 'article'
  | 'compare-hub'
  | 'comparison'
  | 'resource-hub'
  | 'resource'
  | 'static';

export type SearchIntent =
  | 'commercial'
  | 'local'
  | 'commercial investigation'
  | 'informational'
  | 'tutorial'
  | 'career'
  | 'interview'
  | 'salary'
  | 'certification'
  | 'project'
  | 'comparison'
  | 'navigational'
  | 'brand';

export interface IntentPage {
  /** Canonical site path. */
  path: string;
  type: PageType;
  title: string;
  h1?: string;
  description?: string;
  /** CMS article kind: guide, interview, roadmap, salary, projects, certification, comparison, whatis. */
  kind?: string;
  /** CMS blog category slug, for articles and categories. */
  category?: string;
  /** The course a page is (course pages, landings) or supports (articles, categories). */
  courseSlug?: string;
  /** The two items a /compare page compares. */
  items?: [string, string];
  /** Search intent declared elsewhere (the route registry), which wins over inference. */
  declaredIntent?: SearchIntent;
}

/** Page type from the canonical path and the sitemap child that lists it. */
export function pageTypeOf(path: string, sitemapChild?: string | null): PageType {
  const p = path.split('?')[0];
  if (p === '/') return 'home';
  if (p === '/courses') return 'course-hub';
  if (p.startsWith('/courses/')) return 'course';
  if (p === '/training-in-hyderabad') return 'location';
  if (p === '/blog') return 'blog-hub';
  if (p.startsWith('/blog/category/')) return 'category';
  if (p.startsWith('/blog/')) return 'article';
  if (p === '/compare') return 'compare-hub';
  if (p.startsWith('/compare/')) return 'comparison';
  if (p === '/resources') return 'resource-hub';
  if (p.startsWith('/resources/')) return 'resource';
  if (sitemapChild === 'locations' || /-course-[a-z-]+$/.test(p)) return 'landing';
  return 'static';
}

/* ── Text normalisation ───────────────────────────────────────────────────── */

/** "Power BI Roadmap 2026 | GloryTecks Blog" → "power bi roadmap 2026". */
export function stripBrand(title: string): string {
  return title
    .replace(/^\s*GloryTecks\s*[—–-]\s*/i, '')
    .replace(/\s*[|—–]\s*GloryTecks.*$/i, '')
    .replace(/\s*\|.*$/, '')
    .toLowerCase()
    .trim();
}

/** Words that describe the SHAPE of a page, not its subject. */
const GENERIC = new Set(
  (
    'a an the and or of to for in on with your how what is are why when which do does you from into using use by at as ' +
    'it its this that vs versus guide complete practical beginners beginner step explained made easy overview everything ' +
    'need know learn full ultimate tips basics introduction intro tutorial hands-on hands detailed ' +
    'best top comparison compared when each which should first right'
    // NOT here: "learning" and "deep" — "deep learning" and "machine learning"
    // are subjects. The phrase "deep dive" is removed before tokenising.
  ).split(' '),
);

/** Words that describe an article's intent type, removed to leave its subject. */
const INTENT_WORDS = new Set(
  (
    'interview question answer roadmap salary hyderabad certification project portfolio ideas become career path ' +
    'job jobs role roles scope freshers fresher senior no experience skill skills tool tools timeline job-ready'
  ).split(' '),
);

/** Role and field spellings that mean the same subject. */
const SYNONYMS: [RegExp, string][] = [
  [/\bscientists?\b/g, 'science'],
  [/\bengineers?\b|\bengineering\b/g, 'engineering'],
  [/\banalysts?\b|\banalysis\b/g, 'analytics'],
  [/\bdevelopers?\b|\bdevelopment\b/g, 'development'],
  [/\bquestions?\b/g, 'question'],
  [/\banswers?\b/g, 'answer'],
  [/\bprojects?\b/g, 'project'],
  [/\bsalaries\b/g, 'salary'],
  [/\broadmaps?\b/g, 'roadmap'],
  [/\bcertifications?\b|\bcertificates?\b/g, 'certification'],
  [/\bgen ai\b|\bgenai\b/g, 'generative ai'],
  [/\badf\b/g, 'azure data factory'],
  [/\bagents?\b/g, 'agent'],
  [/\bmodels?\b/g, 'model'],
  [/\bdashboards?\b/g, 'dashboard'],
  [/\bpipelines?\b/g, 'pipeline'],
];

/**
 * Normalised, de-duplicated subject-bearing tokens of a title. `keepShort`
 * keeps one-letter tokens, which matter inside a comparison ("Python vs R").
 */
export function topicTokens(text: string, { keepShort = false } = {}): string[] {
  let s = stripBrand(text).replace(/\b20\d\d\b/g, ' ').replace(/\bdeep[- ]dive\b/g, ' ').replace(/[^a-z0-9+#.\- ]/g, ' ');
  for (const [re, rep] of SYNONYMS) s = s.replace(re, rep);
  return [
    ...new Set(
      s
        .split(/\s+/)
        .map((w) => w.replace(/^[.-]+|[.-]+$/g, ''))
        .filter((w) => (keepShort ? w.length > 0 : w.length > 1) && !GENERIC.has(w) && !/^\d+$/.test(w)),
    ),
  ];
}

/** Topic tokens minus intent vocabulary and trailing audience ("for data engineers"). */
export function subjectTokens(title: string, opts: { keepShort?: boolean } = {}): string[] {
  const withoutAudience = stripBrand(title).replace(/\s+for\s+(?:data\s+\w+|beginners|freshers|analysts?|engineers?|scientists?)\s*$/, '');
  return topicTokens(withoutAudience, opts).filter((w) => !INTENT_WORDS.has(w));
}

export function jaccard(a: readonly string[], b: readonly string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter || 1);
}

/* ── Intent classification ────────────────────────────────────────────────── */

const LOCALITIES = ['ameerpet', 'kukatpally', 'kphb', 'madhapur', 'gachibowli', 'hitec city', 'hitech city', 'dilsukhnagar', 'secunderabad'];

/** The search intent a page serves. */
export function searchIntentOf(page: IntentPage): SearchIntent {
  if (page.declaredIntent) return page.declaredIntent;
  const t = stripBrand(page.title);
  switch (page.type) {
    case 'home':
    case 'course-hub':
    case 'course':
      return 'commercial';
    case 'location':
    case 'landing':
      return 'local';
    case 'comparison':
    case 'compare-hub':
      return 'comparison';
    case 'resource-hub':
    case 'resource':
      return 'navigational';
    case 'blog-hub':
    case 'category':
      return 'informational';
    case 'static':
      return 'brand';
    case 'article':
      break;
  }
  const k = page.kind;
  if (k === 'interview' || /\binterview\b/.test(t)) return 'interview';
  if (k === 'salary' || /\bsalar(y|ies)\b/.test(t)) return 'salary';
  if (k === 'roadmap' || /\broadmap\b|how to become|career (path|in)\b/.test(t)) return 'career';
  if (k === 'certification' || /\bcertif/.test(t)) return 'certification';
  if (k === 'projects' || /\bprojects?\b/.test(t)) return 'project';
  if (k === 'comparison' || /\bvs\.?\b|\bversus\b/.test(t)) return 'comparison';
  if (k === 'whatis' || /^what (is|are)\b/.test(t)) return 'informational';
  return 'tutorial';
}

/**
 * "A vs B" as a canonical, order-independent key — "power bi || tableau".
 * Three-way comparisons keep all three items, so they never equal a two-way one.
 */
export function comparisonKey(page: Pick<IntentPage, 'title' | 'items'>): string | null {
  const VS = /\s(?:vs\.?|versus)\s/;
  let parts: string[];
  if (page.items) {
    parts = [...page.items];
  } else {
    // The comparison may sit before the colon ("Excel vs Power BI: Which…")
    // or after it ("Orchestration: Airflow vs Dagster vs Prefect").
    const [head, ...rest] = stripBrand(page.title).replace(/\s*\?$/, '').split(':');
    const tail = rest.join(':');
    const segment = VS.test(` ${head} `) ? head : VS.test(` ${tail} `) ? tail : null;
    if (!segment) return null;
    parts = segment.replace(/\s+(?:for|in|which|when)\b.*$/, '').split(/\s+(?:vs\.?|versus)\s+/);
  }
  if (parts.length < 2) return null;
  const items = parts.map((p) => subjectTokens(p, { keepShort: true }).join(' ')).filter(Boolean);
  if (items.length < 2) return null;
  return [...new Set(items)].sort().join(' || ');
}

/**
 * The commercial offer a page makes, as "subject @ place":
 * "data science @ hyderabad" for a course page, "data science @ ameerpet" for
 * its Ameerpet landing, "it training @ ameerpet" for the centre page. Two
 * commercial pages with the same key compete for the same query.
 */
export function commercialKey(page: IntentPage): string | null {
  if (!['home', 'course-hub', 'course', 'location', 'landing'].includes(page.type)) return null;
  const t = stripBrand(page.title);
  const place = LOCALITIES.find((l) => t.includes(l))?.replace('kphb', 'kukatpally').replace('hitech', 'hitec') ?? 'hyderabad';
  const subject = t
    .split(/\s+in\s+/)[0]
    .replace(/\b(courses?|classes|coaching|institute|centre|center)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `${subject} @ ${place}`;
}

/** A blog title that reaches for a query the course pages own. */
export function targetsCourseIntent(title: string): boolean {
  const t = stripBrand(title);
  return (
    /\b(course|courses|institute|fees|admission)\b/.test(t) ||
    // "classes" alone is too common ("storage classes"); only as a place to learn.
    /\b(classes|coaching)\s+(in|near|at)\b|\b(online|offline|weekend|weekday)\s+(?:[a-z+#.]+\s+){0,2}(classes|coaching)\b/.test(t) ||
    /\btraining\s+(in|institute|centre|center|near)\b/.test(t) ||
    /\bbest\b.*\b(course|training|institute)\b/.test(t)
  );
}

/* ── Overlap detection ────────────────────────────────────────────────────── */

export type OverlapKind =
  | 'duplicate-title'
  | 'duplicate-h1'
  | 'duplicate-description'
  | 'same-comparison'
  | 'same-subject'
  | 'near-duplicate-topic'
  | 'blog-targets-course'
  | 'duplicate-commercial-intent';

export interface Overlap {
  kind: OverlapKind;
  a: string;
  b: string;
  intent: SearchIntent;
  reason: string;
  /** The page that should own the intent. */
  primary: string;
  /** The page that should support it. */
  secondary: string;
}

/** Generic buckets whose copy of a topic is the weaker home for it. */
const GENERIC_CATEGORIES = new Set(['interview-questions', 'career-guidance']);

/**
 * Which of two pages should own a shared intent.
 *
 *   1. a /compare page over a blog post (comparison intent has a dedicated home);
 *   2. an article in its topic category over one in a generic bucket
 *      (interview-questions, career-guidance);
 *   3. otherwise the page with more inbound links (`rank`), then the shorter path.
 */
export function choosePrimary(a: IntentPage, b: IntentPage, rank?: (path: string) => number): [IntentPage, IntentPage] {
  const score = (p: IntentPage) =>
    (p.type === 'comparison' ? 1_000_000 : 0) +
    (p.category && !GENERIC_CATEGORIES.has(p.category) ? 100_000 : 0) +
    (rank ? rank(p.path) : 0);
  const sa = score(a);
  const sb = score(b);
  if (sa !== sb) return sa > sb ? [a, b] : [b, a];
  return a.path.length <= b.path.length ? [a, b] : [b, a];
}

const INFORMATIONAL_KINDS = new Set<SearchIntent>(['interview', 'salary', 'career', 'certification', 'project', 'informational']);

/**
 * Every pair of indexable pages that would compete for the same search intent.
 *
 * Detects exact duplicates (title, H1, description), the same comparison on
 * two URLs, the same informational subject asked twice, near-identical
 * tutorial topics, blog posts reaching for a course query, and two commercial
 * pages making the same offer in the same place. Deliberately NOT a keyword
 * density check: shared words only matter when the subject and intent match.
 */
export function findOverlaps(pages: readonly IntentPage[], rank?: (path: string) => number): Overlap[] {
  const out: Overlap[] = [];
  /** `fixed` = x is the primary by rule, not by `choosePrimary`. */
  const add = (kind: OverlapKind, x: IntentPage, y: IntentPage, reason: string, fixed = false) => {
    const [primary, secondary] = fixed ? [x, y] : choosePrimary(x, y, rank);
    const [a, b] = [x.path, y.path].sort();
    out.push({ kind, a, b, intent: searchIntentOf(primary), reason, primary: primary.path, secondary: secondary.path });
  };

  const exact = (kind: OverlapKind, field: (p: IntentPage) => string | undefined, label: string) => {
    const seen = new Map<string, IntentPage>();
    for (const p of pages) {
      const v = field(p)?.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!v) continue;
      const prior = seen.get(v);
      if (prior) add(kind, prior, p, `identical ${label}: "${v}"`);
      else seen.set(v, p);
    }
  };
  exact('duplicate-title', (p) => p.title, 'title');
  exact('duplicate-h1', (p) => p.h1, 'H1');
  exact('duplicate-description', (p) => p.description, 'meta description');

  // Same comparison, anywhere.
  const byComparison = new Map<string, IntentPage[]>();
  for (const p of pages) {
    if (p.type !== 'comparison' && searchIntentOf(p) !== 'comparison') continue;
    const key = comparisonKey(p);
    if (key) byComparison.set(key, [...(byComparison.get(key) ?? []), p]);
  }
  for (const [key, group] of byComparison) {
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++) add('same-comparison', group[i], group[j], `both compare ${key.replace(' || ', ' and ')}`);
  }

  // Same informational subject, same intent type (interview, salary, roadmap…).
  const articles = pages.filter((p) => p.type === 'article');
  const bySubject = new Map<string, IntentPage[]>();
  for (const p of articles) {
    const intent = searchIntentOf(p);
    if (!INFORMATIONAL_KINDS.has(intent)) continue;
    const subject = subjectTokens(p.title).sort().join(' ');
    if (!subject) continue;
    const key = `${intent}::${subject}`;
    bySubject.set(key, [...(bySubject.get(key) ?? []), p]);
  }
  for (const [key, group] of bySubject) {
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++) {
        const intent = key.split('::')[0];
        add('same-subject', group[i], group[j], `both answer the ${intent} query for "${subjectTokens(group[i].title).join(' ')}"`);
      }
  }

  // Near-identical tutorial topics.
  const tutorials = articles.filter((p) => searchIntentOf(p) === 'tutorial').map((p) => ({ p, t: subjectTokens(p.title) }));
  for (let i = 0; i < tutorials.length; i++)
    for (let j = i + 1; j < tutorials.length; j++) {
      const { p: x, t: tx } = tutorials[i];
      const { p: y, t: ty } = tutorials[j];
      if (tx.length < 3 || ty.length < 3) continue;
      const s = jaccard(tx, ty);
      if (s >= 0.75) add('near-duplicate-topic', x, y, `${Math.round(s * 100)}% of subject terms shared: ${tx.filter((w) => ty.includes(w)).join(', ')}`);
    }

  // Blog posts reaching for the commercial course query.
  const courseByCategory = new Map(pages.filter((p) => p.type === 'course').map((p) => [p.path.split('/').pop()!, p]));
  for (const p of articles) {
    if (!targetsCourseIntent(p.title)) continue;
    const course = (p.courseSlug && courseByCategory.get(p.courseSlug)) || pages.find((q) => q.type === 'course-hub');
    if (course) add('blog-targets-course', course, p, `blog title "${stripBrand(p.title)}" uses commercial course wording`, true);
  }

  // Two commercial pages making the same offer in the same place. The more
  // place-specific page owns it (docs/SEO_KEYWORD_MAP.md §4): a landing over
  // the centre page, the centre page over a course page, and so on up to /.
  const SPECIFICITY: Partial<Record<PageType, number>> = { landing: 4, location: 3, course: 2, 'course-hub': 1, home: 0 };
  const byOffer = new Map<string, IntentPage[]>();
  for (const p of pages) {
    const key = commercialKey(p);
    if (key) byOffer.set(key, [...(byOffer.get(key) ?? []), p]);
  }
  for (const [key, group] of byOffer) {
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++) {
        const [x, y] = (SPECIFICITY[group[i].type] ?? 0) >= (SPECIFICITY[group[j].type] ?? 0) ? [group[i], group[j]] : [group[j], group[i]];
        add('duplicate-commercial-intent', x, y, `both offer "${key}"`, true);
      }
  }

  // One finding per pair and kind.
  const seen = new Set<string>();
  return out.filter((o) => {
    const k = `${o.kind}|${o.a}|${o.b}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export interface OverlapCluster {
  /** Every URL in the cluster, primary first. */
  members: string[];
  /** The one page that should own the intent. */
  primary: string;
  kinds: OverlapKind[];
  intent: SearchIntent;
  reasons: string[];
}

/**
 * Group pairwise overlaps into clusters (three posts on the same comparison
 * are one problem, not three) and pick one owner per cluster with the same
 * rules as `choosePrimary`. Commercial-intent and blog-targets-course pairs
 * keep their rule-based owner.
 */
export function overlapClusters(
  overlaps: readonly Overlap[],
  pages: readonly IntentPage[],
  rank?: (path: string) => number,
): OverlapCluster[] {
  const byPath = new Map(pages.map((p) => [p.path, p]));
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x) ?? x;
    if (p === x) return x;
    const r = find(p);
    parent.set(x, r);
    return r;
  };
  for (const o of overlaps) parent.set(find(o.a), find(o.b));

  const groups = new Map<string, Overlap[]>();
  for (const o of overlaps) groups.set(find(o.a), [...(groups.get(find(o.a)) ?? []), o]);

  return [...groups.values()].map((list) => {
    const members = [...new Set(list.flatMap((o) => [o.a, o.b]))];
    const fixed = list.find((o) => o.kind === 'duplicate-commercial-intent' || o.kind === 'blog-targets-course');
    const primary = fixed
      ? fixed.primary
      : members
          .map((m) => byPath.get(m)!)
          .reduce((best, p) => choosePrimary(best, p, rank)[0]).path;
    return {
      members: [primary, ...members.filter((m) => m !== primary).sort()],
      primary,
      kinds: [...new Set(list.map((o) => o.kind))],
      intent: searchIntentOf(byPath.get(primary)!),
      reasons: [...new Set(list.map((o) => o.reason))],
    };
  });
}

/* ── Internal-link graph ──────────────────────────────────────────────────── */

export type LinkZone = 'header' | 'main' | 'footer' | 'outside';

export interface LinkEdge {
  from: string;
  /** Site path (+ query), no fragment. */
  to: string;
  zone: LinkZone;
  /** Inside a <nav> (breadcrumbs, menus, pagination). */
  nav: boolean;
  anchor: string;
}

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
const textOf = (html: string) =>
  decodeEntities(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Every internal <a href> in a server response, with the page zone it sits in
 * and its anchor text. `hosts` are the hostnames that count as this site.
 */
export function extractLinks(html: string, from: string, hosts: readonly string[]): LinkEdge[] {
  const spans = (tag: string) => [...html.matchAll(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, 'gi'))].map((m) => [m.index!, m.index! + m[0].length]);
  const header = spans('header');
  const footer = spans('footer');
  const nav = spans('nav');
  const within = (s: number[][], i: number) => s.some(([a, b]) => i >= a && i < b);
  const mainStart = html.search(/<main\b/i);
  const mainEnd = html.search(/<\/main>/i);

  const out: LinkEdge[] = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = m[1].match(/\bhref="([^"]*)"/)?.[1];
    if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    let url: URL;
    try {
      url = new URL(decodeEntities(href), `https://${hosts[0]}${from}`);
    } catch {
      continue;
    }
    if (!hosts.includes(url.host)) continue;
    if (/^\/(_next|api)\//.test(url.pathname) || /\.(png|jpe?g|svg|webp|ico|pdf|xml|txt|css|js)$/i.test(url.pathname)) continue;
    const i = m.index!;
    const zone: LinkZone = within(header, i) ? 'header' : within(footer, i) ? 'footer' : i > mainStart && i < mainEnd ? 'main' : 'outside';
    const aria = m[1].match(/\baria-label="([^"]*)"/)?.[1];
    out.push({ from, to: url.pathname + url.search, zone, nav: within(nav, i), anchor: textOf(m[2]) || (aria ? decodeEntities(aria) : '') });
  }
  return out;
}

export interface CrawledPage {
  path: string;
  status: number;
  canonical?: string | null;
  links: LinkEdge[];
}

/** /blog, /blog?page=N, /blog/category/x and its pages — listing pages, not editorial. */
export const isArchivePath = (path: string) => /^\/blog(\/category\/[^/?]+)?(\?page=\d+)?$/.test(path);

const isPrevNext = (anchor: string) => /^(previous|next)\b/i.test(anchor.trim());

export interface InboundStats {
  /** Distinct pages linking here from anywhere (menus included). */
  total: number;
  /** Distinct pages linking here from their main content, outside any <nav>. */
  contextual: number;
  /**
   * Contextual links from non-listing pages, excluding prev/next — the links an
   * editor or a relatedness rule chose. The measure of real internal support.
   */
  editorial: number;
}

export function inboundStats(pages: readonly CrawledPage[]): Map<string, InboundStats> {
  const sets = new Map<string, { total: Set<string>; contextual: Set<string>; editorial: Set<string> }>();
  for (const page of pages) {
    for (const l of page.links) {
      if (l.to === page.path) continue;
      const s = sets.get(l.to) ?? { total: new Set(), contextual: new Set(), editorial: new Set() };
      sets.set(l.to, s);
      s.total.add(page.path);
      if (l.zone === 'main' && !l.nav) {
        s.contextual.add(page.path);
        if (!isArchivePath(page.path) && !isPrevNext(l.anchor)) s.editorial.add(page.path);
      }
    }
  }
  return new Map([...sets].map(([k, v]) => [k, { total: v.total.size, contextual: v.contextual.size, editorial: v.editorial.size }]));
}

/** Click depth from `root` over every crawled link. */
export function clickDepth(pages: readonly CrawledPage[], root = '/'): Map<string, number> {
  const byPath = new Map(pages.map((p) => [p.path, p]));
  const depth = new Map([[root, 0]]);
  const queue = [root];
  while (queue.length) {
    const at = queue.shift()!;
    for (const l of byPath.get(at)?.links ?? []) {
      if (!depth.has(l.to) && byPath.has(l.to)) {
        depth.set(l.to, depth.get(at)! + 1);
        queue.push(l.to);
      }
    }
  }
  return depth;
}

const GENERIC_ANCHOR = /^(read more|learn more|click here|here|more|view|view details|details|know more|explore|explore course|see more|view all|read|go|open|continue)$/i;

export interface LinkAudit {
  orphans: string[];
  /** Indexable pages with no editorial inbound link at all. */
  weak: string[];
  broken: { from: string; to: string; status: number }[];
  redirected: { from: string; to: string; status: number }[];
  /** Links to a 200 page whose canonical is a different URL. */
  nonCanonical: { from: string; to: string; canonical: string }[];
  genericAnchors: { anchor: string; to: string; links: number }[];
}

/**
 * Audit the graph.
 *
 * `statusOf` answers for targets that were not crawled (filters, utilities).
 * `origin` turns a path into the canonical URL it should declare.
 */
export function auditLinks(
  pages: readonly CrawledPage[],
  indexable: readonly string[],
  origin: string,
  statusOf: (path: string) => number | undefined = () => undefined,
): LinkAudit {
  const byPath = new Map(pages.map((p) => [p.path, p]));
  const stats = inboundStats(pages);
  const selfUrl = (p: string) => (p === '/' ? origin : `${origin}${p}`);

  const broken: LinkAudit['broken'] = [];
  const redirected: LinkAudit['redirected'] = [];
  const nonCanonical: LinkAudit['nonCanonical'] = [];
  const anchors = new Map<string, number>();
  const seen = new Set<string>();

  for (const page of pages) {
    for (const l of page.links) {
      const target = byPath.get(l.to);
      const status = target?.status ?? statusOf(l.to);
      const key = `${page.path}→${l.to}`;
      if (status !== undefined && !seen.has(key)) {
        seen.add(key);
        if (status >= 400) broken.push({ from: page.path, to: l.to, status });
        else if (status >= 300) redirected.push({ from: page.path, to: l.to, status });
        else if (target?.canonical && target.canonical !== selfUrl(l.to)) {
          nonCanonical.push({ from: page.path, to: l.to, canonical: target.canonical });
        }
      }
      if (GENERIC_ANCHOR.test(l.anchor.trim())) {
        const k = `${l.anchor.trim().toLowerCase()}\u0000${l.to}`;
        anchors.set(k, (anchors.get(k) ?? 0) + 1);
      }
    }
  }

  return {
    orphans: indexable.filter((p) => p !== '/' && (stats.get(p)?.total ?? 0) === 0),
    weak: indexable.filter((p) => p !== '/' && (stats.get(p)?.editorial ?? 0) === 0),
    broken,
    redirected,
    nonCanonical,
    genericAnchors: [...anchors].map(([k, links]) => {
      const [anchor, to] = k.split('\u0000');
      return { anchor, to, links };
    }),
  };
}
