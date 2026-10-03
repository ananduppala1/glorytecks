# SEO Final Release Report

**Property:** https://glorytecks.com
**Date:** 2026-09-23
**Method:** production build served locally and crawled against the **live**
backend (real Supabase content) — not fixtures, not a staging copy.

No score is given. A number like "95/100" hides which specific thing is broken.
Every line below is a factual pass, fail, or blocked-on-input.

---

## 1. Release status

| Area | Status |
| --- | --- |
| Technical SEO | **PASS** |
| Indexation | **PASS** |
| Canonical | **PASS** |
| Sitemap | **PASS** |
| Robots | **PASS** |
| Schema | **PASS** |
| Performance | **PASS** |
| Internal links | **PASS** |
| Analytics | **PASS with one unresolved question** — §4 HIGH-1 |
| Content quality | **FAIL — known, documented, decision pending** — §3 CRITICAL-2 |

**The build is production-ready.** Content quality is the one area that does
not pass, it was identified and quantified rather than glossed over, and the
remedy needs a business decision plus one Search Console export — not more
code.

---

## 2. Verification performed

87 routes crawled; 10 redirects followed; 14 must-404 URLs probed; 7 sitemaps
parsed and 18 sampled URLs re-fetched; JSON-LD parsed on 10 page types.

| Check | Result |
| --- | --- |
| Routes crawled | **87** — 9 courses, 12 categories, 10 comparisons, 15 landings, 11 static, 25 sampled articles |
| HTTP status | **87/87 = 200** |
| Duplicate titles | **0** |
| Duplicate descriptions | **0** |
| Duplicate canonicals | **0** |
| Pages with ≠1 `<h1>` | **0** |
| Indexable without canonical | **0** |
| Canonical ≠ expected URL | **0** |
| Redirects | **10, every one exactly 1 hop** — no chains, no loops |
| Must-404 URLs | **14/14 return 404** — no soft 404s |
| Sitemap URLs | **653 unique** across 7 children; **0** appear twice |
| Sitemap: banned patterns (`?q=`, `?tag=`, `?page=`, `/thank-you`, `/brochures/`, redirect sources) | **0** |
| Sitemap: `<priority>` / `<changefreq>` | **0** |
| Sitemap: malformed `lastmod` | **0** |
| Sampled sitemap URLs → 200 + indexable + self-canonical | **18/18** |
| JSON-LD parse errors | **0** across 10 page types |
| Duplicate schema node definitions | **0** |
| Unsupported schema properties (`aggregateRating`, `foundingDate`, `priceCurrency`, …) | **0** |
| FAQPage questions not visible on the page | **0** |
| `localhost` / staging host in metadata | **0** |

### Query-parameter behaviour

| URL | Status | Robots | Canonical |
| --- | --- | --- | --- |
| `/blog?page=2` | 200 | index, follow | `…/blog?page=2` |
| `/blog?utm_source=news` | 200 | index, follow | `…/blog` (stripped) |
| `/blog?q=python` | 200 | **noindex, follow** | none |
| `/blog?tag=aws` | 200 | **noindex, follow** | none |
| `/blog?sort=popular` | 200 | **noindex, follow** | none |
| `/blog?page=999999`, `?page=0`, `?page=abc` | **404** | — | — |

### Validation commands

| Command | Result |
| --- | --- |
| `npm run lint` (frontend) | **0 errors**, 9 warnings (all pre-existing) |
| `npm run typecheck` (frontend) | **exit 0** |
| `npm run test` (frontend) | **289 passed / 289**, 9 files |
| `npm run build` (frontend) | **✓ Compiled · 97 pages generated** |
| `tsc --noEmit` (backend) | **exit 0** |
| `npm run build` (backend) | **exit 0** |
| `npm test` (backend) | 272 tests, **269 pass, 3 fail** — see §4 MEDIUM-1 |

---

## 3. CRITICAL

### CRITICAL-1 — Blog category cache collision · **FIXED**

`hashQuery()` passed an array as `JSON.stringify`'s second argument, which is a
property allow-list applied at *every* nesting level. `params.filters`
serialised as `{}`, so every filtered public blog query shared one Redis key.

Observed live: `?categorySlug=aws` returned **50 Python articles**. All twelve
category archives served identical content under twelve different titles, H1s
and canonicals.

Fixed with a recursive stable serialiser. 8 regression tests.
**Requires a backend deploy to take effect.**

### CRITICAL-2 — 417 near-duplicate blog articles · **OPEN, decision pending**

7-gram Jaccard similarity within category + kind: **92–97%**, one Power BI pair
at **100%** (5 of 8 paragraphs byte-identical; the three that differ only by
title substitution). The "Power BI Bookmarks" article contains nothing about
bookmarks.

This is the pattern Google's spam policy calls *scaled content abuse*. The risk
is a site-level quality assessment dragging down the 9 course pages that
convert.

**Not auto-remediated deliberately.** De-indexing 417 live pages without
knowing which earn impressions is destructive. The gate is one GSC export;
`lib/blog/merged.ts` already has the mechanism (`NOINDEX_ARTICLES`, empty by
design). See `BLOG_CONTENT_ACTION_PLAN.md` §3.

---

## 4. HIGH

### HIGH-1 — GA4 possibly loaded twice · **OPEN, needs owner check**

`app/layout.tsx` loads the GTM container **and** `gtag.js` directly. If the
container also holds a GA4 tag, pageviews may be double-counted and ~45 KB of
third-party JS is redundant.

Not changed unilaterally: the container's contents are not knowable from this
repository, and silently deleting analytics is not an optimisation. **Check GTM
before recording any analytics baseline** — every number inherits this error.

### HIGH-2 — Street address unconfirmed · **OPEN, blocker for local SEO**

Repository says `603, Annapurna Block`; the live site says `611`. Centralised
in `config/business.ts` with `VERIFICATION.streetAddress: false` and a
resolution procedure. Deliberately **not** decided unilaterally.

A GBP/on-site NAP mismatch is the largest single suppressor of local pack
ranking — this outranks everything else in `LOCAL_SEO_LAUNCH.md`.

### HIGH-3 — Deployment order · **ACTION REQUIRED AT DEPLOY**

`GET /public/blogs/sitemap` is new backend code. **Deploy backend first.** If
the frontend ships ahead, the sitemap still works via fallback but costs ~50
backend requests/hour instead of 1. Verified working via fallback during this
audit, because the running backend predates the endpoint.

### HIGH-4 — Zero images across 597 articles · **OPEN**

No article has a `featuredImage` or an inline image. This is why `og:image`
falls back to the site default on every article. Content task, not code.

---

## 5. MEDIUM

### MEDIUM-1 — 3 backend rate-limit tests fail · **PRE-EXISTING, not a regression**

`269/272` pass. The three failures assert `429` but receive `503` — Redis
unreachable in this environment. **Verified pre-existing**: the identical three
fail against the original `tsconfig.json`, before any change in these phases.
Re-check in an environment with Redis before treating as real.

### MEDIUM-2 — Salary figures lack year and source · **PARTIALLY ADDRESSED**

Figures are hedged ("indicative", geography stated, bands explained) and a
render-time provenance note now states they are GloryTecks estimates, not a
published survey. The underlying numbers still come from unattributed seed
constants. Real sourcing is `BLOG_CONTENT_ACTION_PLAN.md` §4 item 2.

### MEDIUM-3 — 42% of articles authored by "GloryTecks Team" · **OPEN**

250 of 597. Attribution for the other 347 is topically credible. A non-person
byline carries no author E-E-A-T. No author profile pages exist, so `Person`
cannot be referenced by URL.

### MEDIUM-4 — Nine non-Ameerpet location landings are thin · **MONITORED**

Ameerpet is the only locality with a physical centre; the other five are served
online. Each page has distinct human-written locality copy and targets a
distinct query, so they are kept indexed. Schema no longer implies a campus per
locality. Gated on GSC data — `SEO_PHASE_2_AUDIT.md` §6.

### MEDIUM-5 — Not-found lookups are never cached · **OPEN**

`cacheWrap` treats `null` as a miss, so every bot probe of an unknown course or
blog slug reaches Postgres. Bounded by slug validation. A short negative-cache
TTL would close it — backend behaviour change, not done here.

---

## 6. LOW

| # | Item | Status |
| --- | --- | --- |
| LOW-1 | 9 ESLint warnings (4 dead identifiers in `BlogArchive.tsx`, 5 relaxed React-hooks rules) | Pre-existing; 0 errors |
| LOW-2 | 3 views still client-side for `useContactInfo()` context | Framer removed; prop-passing would finish it |
| LOW-3 | `legalName` and Google Business Profile URL absent from schema | Omitted rather than invented — correct until known |
| LOW-4 | `DemoModal` mounted eagerly | `next/dynamic` candidate |
| LOW-5 | Layout floor of 6 upstream requests per render | `/public/site-bootstrap` would make it 1 |
| LOW-6 | JS bundle ceiling not enforced in CI | `PERFORMANCE_BUDGET.md` §7 |
| LOW-7 | CMS tagline reads "Hyderabad's #1 IT Training Institute" | Owner's copy; code fallbacks de-superlatived |

---

## 7. What changed across the programme

| Phase | Outcome |
| --- | --- |
| 1 — Technical | Canonical system, sitemap index + 7 children with real `lastmod`, robots simplified, soft-404s eliminated, bot URLs made free |
| 2 — On-page & entity | Titles/descriptions rewritten, meta keywords removed, one `@id` graph, self-serving `AggregateRating` removed, NAP centralised |
| 3 — Content | Cache collision found and fixed, 5 duplicates merged, hub-and-spoke internal linking built from zero, salary provenance added |
| 4 — Performance | Framer Motion removed (62 KB gz), 8 views → Server Components, sitemap ~50 → 1 request/hour, ISR 1m → 10m/1h, Cloudinary bypasses Vercel's optimizer |
| 5 — Release | This audit, 44 release-gate tests, four launch documents |

**Regression protection:** 289 frontend tests (9 files) + 8 backend cache tests.
The build fails on a localhost or staging canonical, a missing title or
description, a noindex page in a sitemap, an invalid sitemap URL, a duplicate
business entity, an indexable filter URL, a clock-derived `lastmod`, or a
redirect source that is also a live route.

---

## 8. Go / no-go

**GO for technical release.**

Ordered actions at deploy:

1. **Deploy the backend first** (HIGH-3) — cache fix + sitemap endpoint.
2. Deploy the frontend.
3. Verify `/api/v1/public/blogs/sitemap` returns 200.
4. Spot-check `/blog/category/aws` shows AWS articles (confirms CRITICAL-1).
5. Follow `GOOGLE_SEARCH_CONSOLE_LAUNCH.md`.
6. Resolve the address (HIGH-2), then `LOCAL_SEO_LAUNCH.md`.
7. Resolve the GA4 duplication (HIGH-1) **before** recording baselines.
8. Pull the GSC export that unblocks CRITICAL-2.

**Set `REVALIDATE_SECRET`** in the frontend environment, or `/api/revalidate`
refuses every request — it fails closed by design.

Items 6–8 are business inputs. None blocks the deploy; all block the *results*.
