# SEO Phase 1 — Final Verification (Crawl and Indexation)

**Scope.** robots.txt, the sitemap index and its children, canonicals, redirects, 404s and soft 404s, pagination, query parameters (search, tag, sort, UTM), dynamic slugs (course, blog, location, comparison), noindex utility routes, lastmod honesty, preview/staging exposure, and trailing-slash / scheme / host consistency.

**Outcome.** The existing architecture already held nearly all of the policy. Phase 1 verified it URL by URL against a real server, found four gaps, and fixed three. The fourth fix was tried, caused a redirect loop, and was reverted (§3). No route was removed. Page appearance, copy and CMS content are unchanged. No sitemap type, `priority`, `changefreq` or other artificial field was added.

| | |
| --- | --- |
| Date | 2026-09-24 |
| Code | `main-website/` on `fix/scroll-reveal-animations`, uncommitted Phase 1 changes (§2) |
| Audited live | `https://glorytecks-psi.vercel.app`, the current Next.js production deployment, *before* these changes |
| Verified | A local `next build && next start` of the final code, using the **live backend** (`glorytecks-backend-one.vercel.app`) and `NEXT_PUBLIC_SITE_URL=https://glorytecks.com`, so every URL below is real CMS content under production canonicals |
| Domain | glorytecks.com still serves the legacy static site. Per the owner, the domain moves only after every phase is complete and tested. |

---

## 1. Verification criteria

| Requirement | Result | Evidence |
| --- | --- | --- |
| Every intended indexable page has one self-canonical | ✅ | All 656 sitemap URLs: exactly one canonical equal to the URL (live crawl, §4). All 30 status-200 policy probes checked (§5). |
| Every sitemap URL is indexable and canonical | ✅ | 656/656 return 200, `index, follow`, self-canonical, no `X-Robots-Tag` on the production host |
| Redirect sources never appear in a sitemap | ✅ | 0 of 656 redirect. `crawl.test.ts` reads `next.config.mjs` and checks no redirect source is a live URL. |
| Noindex pages never appear in a sitemap | ✅ | 0 of 656 are noindex. `/thank-you`, brochures, filters and empty categories are excluded by construction. |
| Malformed pagination returns 404 | ✅ | `?page=0`, `-1`, `abc`, `01`, `1.5`, repeated, beyond-last, and filtered beyond-last all return 404 (§5) |
| Unknown dynamic slugs return 404 | ✅ | Course, blog, category, comparison, resource, location and **brochure** (fixed) all return 404 (§5) |
| Filters crawlable but noindex | ✅ | `?q`, `?tag`, `?sort=popular` (archive and category): 200, `noindex, follow`, no canonical. robots.txt blocks none of them (`crawl.test.ts`). |
| Query parameters cannot create indexable duplicates | ✅ | UTM, `gclid`, `fbclid`, `?page=1`, `?sort=latest` and unknown parameters all canonicalise to the clean URL, and only `?page=N` survives on a canonical. Filtered views are noindex. |
| Preview/staging URLs cannot become indexable | ✅ | Three independent layers (§6), one of them new in this phase |

---

## 2. Changes

| File | Change | Why |
| --- | --- | --- |
| `next.config.mjs` | `X-Robots-Tag: noindex` on every path of any `*.vercel.app` host | Once `NEXT_PUBLIC_SITE_URL` is corrected for cutover, the production deployment's alias (`glorytecks-psi.vercel.app`) would become a public, crawlable mirror held back only by canonicals. The rule is host-conditional and compiles to `^.*\.vercel\.app$`, so it cannot match `glorytecks.com` or `www.glorytecks.com`. |
| `app/brochures/[slug]/download/page.tsx` | A slug that is not a published course returns **404** | It returned 200 (a spinner, then a client redirect to `/courses`) for any slug: a soft 404. It uses the cached, tagged course list the course pages already read. If that list cannot be read, the page renders as before. |
| `lib/blog/merged.ts` + `blogPath()` in `BlogCard`, `BlogArchive`, `Footer`, `HomeView`, `lib/blog/clusters.ts`, `blog/[slug]` (prev/next, sidebars) | Internal links to a merged article point straight at the kept article | The backend's related, prev/next and archive lists still return both rows of a merged pair, so 5 posts linked through a 308. The two articles share a title, so nothing visible changes. |
| `lib/seo/archive.ts`, `app/(site)/blog/page.tsx`, `app/(site)/blog/category/[categorySlug]/page.tsx`, `app/sitemaps/categories.xml/route.ts` | An archive whose backend total is **0** is `noindex, follow` with no canonical, and is left out of `categories.xml` | Defensive soft-404 protection: an empty category would publish an indexable empty template. No category is empty today. It triggers only on an explicit 0, never on an unknown count or an outage. |
| `lib/seo/slugs.ts` | `knownSlugStatus()` | Pure brochure 404 rule, unit-tested |
| `lib/seo/routes.ts` | Brochure registry entry documents the 404 | Registry accuracy |
| `lib/seo/crawl.test.ts` (new, 22 tests) | Real `next.config.mjs` headers, checked with **Next's own host matcher**; both robots.txt branches; redirect table (all 308, no chains, no live source, merged targets indexable); `blogPath` plus a source scan that forbids hand-built post hrefs; brochure rule; empty-archive rule; lastmod never in the future; no `redirect()` inside ISR content pages | Offline gate for this phase |
| `lib/seo/smoke.ts`, `smoke.test.ts` (+12 tests), `production.smoke.test.ts` | Live suite gains the **57-probe URL-policy matrix**, set-wide sitemap hygiene (no priority/changefreq, no future or malformed lastmod, no cross-file duplicates), an opt-in crawl of every sitemap URL (`SEO_SMOKE_CRAWL=1`), host-aware `X-Robots-Tag` checks, and http→https / www→apex checks that run only against the production domain | The same rules can be re-proved against any deployment, and against glorytecks.com after cutover |
| `docs/SEO_INDEXABILITY_MATRIX.md` | Rows for the new behaviour. Corrects the claim that the legal pages were never live. | Doc accuracy |

---

## 3. A fix that was tried and rejected

Case variants of CMS slugs render with a 200: `/courses/Data-Science`, `/blog/SQL-JOINS`, `/compare/Power-BI-vs-Tableau`. The backend resolves slugs case-insensitively. Each variant carries the correct lowercase canonical, so it is consolidated rather than duplicated. Even so, a 308 to the lowercase slug looked like the cleaner answer, so `permanentRedirect()` was added to the course, blog and comparison pages.

**It caused a redirect loop.** On the verification server, one request to `/blog/MOCK-INTERVIEW-GUIDE-…` rendered and cached the 308. After that, the canonical `/blog/mock-interview-guide-…` answered **308 to itself**, with a doubled `Location` header. `next start` stores ISR entries as files, and on a case-insensitive disk the two paths are the same file. Vercel's cache is very likely case-sensitive, but that cannot be proven without deploying. The failure mode is a money page that loops, while the benefit is marginal because the canonical already consolidates the variant.

The change was reverted, and `crawl.test.ts` now forbids `redirect()` inside those three ISR pages, with the reason recorded in `lib/seo/slugs.ts`. After the revert, interleaved upper- and lowercase requests all return 200 with the single lowercase canonical. This was re-verified on a clean build.

---

## 4. Sitemap verification

Crawled on the final build: every `<loc>` in every child, requested by path with no redirects followed.

| Child | URLs | 200 + self-canonical + indexable | `<lastmod>` present | `<lastmod>` range | Note |
| --- | ---: | :---: | ---: | --- | --- |
| `/sitemaps/pages.xml` | 9 | 9/9 | 9 | 2026-09-22 | `STATIC_PAGE_REVIEWED`, a source-controlled review date |
| `/sitemaps/courses.xml` | 9 | 9/9 | 9 | 2026-09-18 – 2026-09-21 | CMS row `updated_at` |
| `/sitemaps/blog.xml` | 595 | 595/595 | 595 | 2025-08-19 – 2026-06-15 | Post `updated` if genuinely later, else `date` |
| `/sitemaps/categories.xml` | 13 | 13/13 | 13 | 2026-06-09 – 2026-06-15 | Newest post in scope |
| `/sitemaps/locations.xml` | 15 | 15/15 | 15 | 2026-09-18 | Locality row `updated_at` |
| `/sitemaps/resources.xml` | 5 | 5/5 | 5 | 2026-09-22 | `STATIC_PAGE_REVIEWED` |
| `/sitemaps/compare.xml` | 10 | 10/10 | 10 | 2026-09-18 | Comparison row `updated_at` |
| **Total** | **656** | **656/656** | | | |

- **Duplicates** (within or across files): 0. **Redirecting URLs:** 0. **Non-200:** 0. **Noindex:** 0.
- **`<priority>` / `<changefreq>`:** none, in any file.
- **Fabricated lastmod:** none. No date is later than today, none is malformed, and none comes from the clock. The courses, location and comparison dates cluster on **2026-09-18**, which is when the CMS rows were created (the import). They are real database timestamps, not invented. They will start to mean something as editors update rows.
- **Sitemap index:** lists exactly the 7 children, all on `https://glorytecks.com/sitemaps/`, with no `<lastmod>` (deliberately, see `app/sitemap.xml/route.ts`).
- **Legacy sitemap URLs** (`/sitemap-index.xml`, `/blog-sitemap.xml`, `/category-sitemap.xml`, `/image-sitemap.xml`) each 308 in one hop to their equivalent. They are what Search Console currently has registered from the legacy site.

## 4a. Internal links

All 656 sitemap pages were scanned. That covers 1,565 unique internal hrefs, including links inside CMS blog bodies.

| Check | Before Phase 1 (live deployment) | After (final build) |
| --- | ---: | ---: |
| `http://`, `www.` or absolute own-host links | 0 | 0 |
| Trailing-slash links | 0 | 0 |
| Upper-case paths | 0 | 0 |
| Links answering 3xx | **5** (to merged `-2` articles) | **0** |
| Links answering 4xx/5xx | 0 | 0 |

The deeper `interview-questions` archive pages (not in the sitemap, where the merged duplicates are listed) also now link 0 times to a `-2` URL.

---

## 5. URL-policy table

The legend:

- **Canonical:** *self* means exactly one `<link rel="canonical">` equal to `https://glorytecks.com` + the URL. A path means the canonical points there. *none* means no canonical tag.
- **Sitemap:** the child that lists *this exact URL*.
- **Result:**
  - ✅ verified on the final build
  - 🔧 fixed in Phase 1, then verified
  - ⚠️ accepted by design (see §7)
  - ⏳ pending a decision or the domain move

Every row marked ✅ or 🔧 was produced by an actual request in the live smoke suite (70 rows, 0 failures).

### Indexable pages

| URL | Status | Canonical | Indexability | Sitemap | Redirect | Issue | Result |
| --- | :---: | --- | --- | --- | --- | --- | :---: |
| `/` | 200 | self | index, follow | pages | — | — | ✅ |
| `/courses` | 200 | self | index, follow | pages | — | — | ✅ |
| `/training-in-hyderabad` | 200 | self | index, follow | pages | — | — | ✅ |
| `/placements` | 200 | self | index, follow | pages | — | — | ✅ |
| `/about` | 200 | self | index, follow | pages | — | — | ✅ |
| `/contact` | 200 | self | index, follow | pages | — | — | ✅ |
| `/compare` | 200 | self | index, follow | pages | — | — | ✅ |
| `/resources` | 200 | self | index, follow | pages | — | — | ✅ |
| `/entities` | 200 | self | index, follow | pages | — | — | ✅ |
| `/courses/data-science` | 200 | self | index, follow | courses | — | — | ✅ |
| `/courses/python-programming` | 200 | self | index, follow | courses | — | — | ✅ |
| `/courses/power-bi` | 200 | self | index, follow | courses | — | — | ✅ |
| `/courses/data-analytics` | 200 | self | index, follow | courses | — | — | ✅ |
| `/courses/data-engineering` | 200 | self | index, follow | courses | — | — | ✅ |
| `/courses/gen-ai` | 200 | self | index, follow | courses | — | — | ✅ |
| `/courses/agentic-ai` | 200 | self | index, follow | courses | — | — | ✅ |
| `/courses/mlops` | 200 | self | index, follow | courses | — | — | ✅ |
| `/courses/sql-server` | 200 | self | index, follow | courses | — | — | ✅ |
| `/blog` | 200 | self | index, follow | categories | — | — | ✅ |
| `/blog/category/data-science` | 200 | self | index, follow | categories | — | — | ✅ |
| `/blog/category/generative-ai` | 200 | self | index, follow | categories | — | — | ✅ |
| `/blog/data-science-roadmap-2026-a-complete-step-by-step-guide` (blog slug) | 200 | self | index, follow | blog | — | — | ✅ |
| `/compare/power-bi-vs-tableau` (comparison slug) | 200 | self | index, follow | compare | — | — | ✅ |
| `/resources/lms` (resource slug) | 200 | self | index, follow | resources | — | — | ✅ |
| `/data-science-course-ameerpet` (location slug) | 200 | self | index, follow | locations | — | — | ✅ |
| *all 656 sitemap URLs* | 200 | self | index, follow | one child each | — | — | ✅ |

### Pagination

| URL | Status | Canonical | Indexability | Sitemap | Redirect | Issue | Result |
| --- | :---: | --- | --- | --- | --- | --- | :---: |
| `/blog?page=2` | 200 | self | index, follow | no (only page 1 is listed) | — | — | ✅ |
| `/blog/category/data-science?page=2` | 200 | self | index, follow | no | — | — | ✅ |
| `/blog?page=1` | 200 | `/blog` | index, follow | no (`/blog` is) | — | — | ⚠️ |
| `/blog?page=0` | 404 | none | noindex | no | — | — | ✅ |
| `/blog?page=-1` | 404 | none | noindex | no | — | — | ✅ |
| `/blog?page=abc` | 404 | none | noindex | no | — | — | ✅ |
| `/blog?page=01` | 404 | none | noindex | no | — | — | ✅ |
| `/blog?page=1.5` | 404 | none | noindex | no | — | — | ✅ |
| `/blog?page=2&page=3` | 404 | none | noindex | no | — | — | ✅ |
| `/blog?page=99999` | 404 | none | noindex | no | — | — | ✅ |
| `/blog/category/data-science?page=9999` | 404 | none | noindex | no | — | — | ✅ |

### Query parameters: search, tag, sort, UTM

| URL | Status | Canonical | Indexability | Sitemap | Redirect | Issue | Result |
| --- | :---: | --- | --- | --- | --- | --- | :---: |
| `/blog?q=python` (search) | 200 | none | noindex, follow | no | — | — | ✅ |
| `/blog?tag=python` (tag) | 200 | none | noindex, follow | no | — | — | ✅ |
| `/blog?sort=popular` (sort) | 200 | none | noindex, follow | no | — | — | ✅ |
| `/blog?page=2&sort=popular` | 200 | none | noindex, follow | no | — | — | ✅ |
| `/blog?q=python&page=9999` | 404 | none | noindex | no | — | — | ✅ |
| `/blog/category/data-science?tag=python` | 200 | none | noindex, follow | no | — | — | ✅ |
| `/blog/category/data-science?q=roadmap` | 200 | none | noindex, follow | no | — | — | ✅ |
| `/blog?sort=latest` | 200 | `/blog` | index, follow | no (`/blog` is) | — | Default sort is not a filter | ✅ |
| `/blog?utm_source=x&utm_medium=y` | 200 | `/blog` | index, follow | no (`/blog` is) | — | — | ✅ |
| `/blog?page=2&utm_campaign=z` | 200 | `/blog?page=2` | index, follow | no | — | — | ✅ |
| `/courses/data-science?utm_source=x&gclid=1` | 200 | `/courses/data-science` | index, follow | no (clean URL is) | — | — | ✅ |
| `/?fbclid=x` | 200 | `/` | index, follow | no (`/` is) | — | — | ✅ |

### Noindex utility routes

| URL | Status | Canonical | Indexability | Sitemap | Redirect | Issue | Result |
| --- | :---: | --- | --- | --- | --- | --- | :---: |
| `/thank-you` | 200 | self | noindex, follow | no | — | — | ✅ |
| `/brochures/data-science/download` | 200 | none | noindex, follow | no | — | — | ✅ |
| `/brochures/does-not-exist-xyz/download` | **404** | none | noindex | no | — | **Was a 200 spinner (soft 404)** | 🔧 |
| `/brochures/Data-Science/download` | 404 | none | noindex | no | — | Mis-cased slug; the site only links lowercase | 🔧 |
| `/blog/category/{slug}` with 0 posts | 200 | none | noindex, follow | no | — | Would have been an indexable empty template. None exist today. | 🔧 |
| `/api/revalidate` (GET) | 405 | — | — | no | — | POST-only; `/api/` disallowed in robots.txt | ✅ |
| `/_not-found` | 200 | none | noindex, follow | no | — | Next.js-internal route answers 200 | ⚠️ |

### Unknown slugs and 404s

| URL | Status | Canonical | Indexability | Sitemap | Redirect | Issue | Result |
| --- | :---: | --- | --- | --- | --- | --- | :---: |
| `/courses/does-not-exist-xyz` | 404 | none | noindex | no | — | — | ✅ |
| `/blog/does-not-exist-xyz` | 404 | none | noindex | no | — | — | ✅ |
| `/blog/category/does-not-exist-xyz` | 404 | none | noindex | no | — | — | ✅ |
| `/compare/does-not-exist-xyz` | 404 | none | noindex | no | — | — | ✅ |
| `/resources/does-not-exist-xyz` | 404 | none | noindex | no | — | — | ✅ |
| `/does-not-exist-xyz` (location slug) | 404 | none | noindex | no | — | Static 404, no function invoked | ✅ |
| `/index.html` | 404 | none | noindex | no | — | — | ✅ |

### Redirects, trailing slash and case

| URL | Status | Canonical | Indexability | Sitemap | Redirect | Issue | Result |
| --- | :---: | --- | --- | --- | --- | --- | :---: |
| `/courses/` | 308 | — | — | no | → `/courses` | — | ✅ |
| `/blog/category/data-science/` | 308 | — | — | no | → `/blog/category/data-science` | — | ✅ |
| `//courses` | 308 | — | — | no | → `/courses` | — | ✅ |
| `/data-science-course` | 308 | — | — | no | → `/courses/data-science` | — | ✅ |
| `/data-science-course/` | 308, 308 | — | — | no | → `/data-science-course` → `/courses/data-science` | Two hops (trailing-slash rule runs first) | ⚠️ |
| `/blog/aws-interview-questions-for-data-engineers-2` (and the other 4 merged) | 308 | — | — | no | → the kept article | Was linked internally 5 times | 🔧 |
| `/sitemap-index.xml` | 308 | — | — | no | → `/sitemap.xml` | — | ✅ |
| `/blog-sitemap.xml` | 308 | — | — | no | → `/sitemaps/blog.xml` | — | ✅ |
| `/category-sitemap.xml` | 308 | — | — | no | → `/sitemaps/categories.xml` | — | ✅ |
| `/image-sitemap.xml` | 308 | — | — | no | → `/sitemaps/blog.xml` | — | ✅ |
| `/courses/Data-Science` | 200 | `/courses/data-science` | index, follow | no | — | Case variant; see §3 | ⚠️ |
| `/blog/DATA-SCIENCE-ROADMAP-2026-A-COMPLETE-STEP-BY-STEP-GUIDE` | 200 | `/blog/data-science-roadmap-…` | index, follow | no | — | Case variant; see §3 | ⚠️ |
| `/COURSES/data-science` | 200 | `/courses/data-science` | index, follow | no | — | Route segment matched case-insensitively (seen on Vercel) | ⚠️ |

### robots.txt, sitemaps, hosts and schemes

| URL | Status | Canonical | Indexability | Sitemap | Redirect | Issue | Result |
| --- | :---: | --- | --- | --- | --- | --- | :---: |
| `/robots.txt` (production origin) | 200 | — | `Allow: /`, `Disallow: /api/`, one `Sitemap:` | — | — | — | ✅ |
| `/robots.txt` (any other origin) | 200 | — | `Disallow: /` | — | — | — | ✅ |
| `/sitemap.xml` | 200 | — | — | index of 7 | — | — | ✅ |
| `/sitemaps/{pages,courses,blog,categories,locations,resources,compare}.xml` | 200 | — | — | children | — | — | ✅ |
| `/sitemaps/does-not-exist.xml` | 404 | — | — | — | — | — | ✅ |
| any path on `*.vercel.app` | 200 | per page | **`X-Robots-Tag: noindex`** | — | — | Production alias would be a crawlable mirror after the env fix | 🔧 |
| any path on `glorytecks.com` / `www.glorytecks.com` | — | — | no `X-Robots-Tag` | — | — | Checked with Next's matcher and a Host-header request | ✅ |
| Preview / per-deployment URLs | 302 | — | `X-Robots-Tag: noindex` (Vercel) | — | → Vercel SSO | Behind Vercel Authentication | ✅ |
| `http://glorytecks.com/*` | expected 308 | — | — | — | → `https://glorytecks.com/*` | Decided by the domain configuration | ⏳ post-cutover |
| `https://www.glorytecks.com/*` | expected 308 | — | — | — | → `https://glorytecks.com/*` | The legacy site answers **307** today | ⏳ post-cutover |

### Live legacy URLs with no route in this app (report §6 C1)

These are 200, indexed and self-canonical on the legacy site at glorytecks.com today. On the Next.js app they 404. Nothing was changed for them. Building pages or choosing redirects is a route and content decision that awaits your approval, and it must be settled **before** the domain moves.

| URL | Status | Canonical | Indexability | Sitemap | Redirect | Issue | Result |
| --- | :---: | --- | --- | --- | --- | --- | :---: |
| `/privacy-policy` | 404 | — | — | no | — | Live legal page on the legacy site | ⏳ |
| `/terms` | 404 | — | — | no | — | same | ⏳ |
| `/refund-policy` | 404 | — | — | no | — | same | ⏳ |
| `/cookie-policy` | 404 | — | — | no | — | same | ⏳ |
| `/disclaimer` | 404 | — | — | no | — | same | ⏳ |
| `/editorial-policy` | 404 | — | — | no | — | same | ⏳ |
| `/training-in-ameerpet` | 404 | — | — | no | — | Suggested: 308 → `/training-in-hyderabad` | ⏳ |
| `/agentic-ai-course-ameerpet` | 404 | — | — | no | — | Legacy location landing | ⏳ |
| `/agentic-ai-course-madhapur` | 404 | — | — | no | — | same | ⏳ |
| `/data-engineering-course-ameerpet` | 404 | — | — | no | — | same | ⏳ |
| `/data-engineering-course-hitech-city` | 404 | — | — | no | — | same | ⏳ |
| `/generative-ai-course-gachibowli` | 404 | — | — | no | — | same | ⏳ |
| `/sql-server-course-ameerpet` | 404 | — | — | no | — | same | ⏳ |
| `/sql-server-course-kukatpally` | 404 | — | — | no | — | same | ⏳ |

---

## 6. Preview and staging: why they cannot be indexed

| Host | Layer 1: robots.txt | Layer 2: X-Robots-Tag | Layer 3: access |
| --- | --- | --- | --- |
| Preview and per-deployment URLs | `Disallow: /` (non-production origin) | `noindex` (Vercel) **and** `noindex` (Phase 1 rule) | Vercel Authentication (302 to SSO) |
| Production alias `glorytecks-psi.vercel.app` | `Disallow: /` today. `Allow` once `NEXT_PUBLIC_SITE_URL` is corrected for cutover. | **`noindex`** (Phase 1 rule), whatever the env var says | public |
| A staging custom domain | `Disallow: /` if built with its own origin | — | per project |
| `glorytecks.com` | `Allow: /` | none (verified) | public |

Every canonical, og:url, JSON-LD `@id` and sitemap `<loc>` is built on `https://glorytecks.com` by `lib/seo/canonical.ts`. No URL in the code or in CMS content points at `http://`, `www.` or a `vercel.app` host (§4a).

---

## 7. Accepted behaviour

| Behaviour | Why it is accepted |
| --- | --- |
| Case variants of CMS slugs return 200 with the lowercase canonical | The canonical consolidates them. A page-level 308 caused a redirect loop (§3). A path-lowercasing proxy would run a function on every request. Nothing links to these URLs. |
| `/COURSES/data-science` returns 200 | Same as above. It serves the real page with its lowercase canonical. |
| `/blog?page=1`, `/blog?sort=latest`, `/blog?q=` (empty) return 200 | Identical to `/blog` and canonicalised to it. No internal link produces them. |
| `/_not-found` returns 200 | Next.js-internal. It is `noindex`, unlinked and not in any sitemap. |
| `/data-science-course/` takes two 308 hops | Trailing-slash normalisation runs before the redirect table. Both hops are permanent, and nothing links to the slashed form. |
| Streamed metadata on `/blog` and category archives | Next 16 streams `generateMetadata` into `<body>` on a cold dynamic render for crawlers not on its HTML-limited list (including Googlebot, which renders it). Seen as a warning on 2 cold renders in the smoke run. Report S1 has the `htmlLimitedBots` option if you want it disabled. |
| A brand-new course's brochure may 404 until the course list cache refreshes | The course list is cached for up to 1 h (`REVALIDATE.CONTENT`) or until the `courses` tag is purged on publish. The course page itself is live at once. |

---

## 8. Verification runs

### Required commands (`main-website/`, repo `.env`)

| Command | Result |
| --- | --- |
| `npm run typecheck` | ✅ exit 0 |
| `npm run lint` | ✅ exit 0: 0 errors, the same 9 warnings as before Phase 1, none introduced by it. Four are existing unused imports in `BlogArchive.tsx`, which Phase 1 touched but did not clean up, to keep the diff to the fix. |
| `npm test` | ✅ 11 files passed, 1 skipped: **340 passed**, 82 skipped (the live suite, which needs `SEO_SMOKE_BASE_URL`) |
| `npm run build` | ✅ exit 0, 42/42 static pages. The repo `.env` points at `localhost:5001`, which was not running, so CMS reads fell back through `safe()` as designed. |

### Verification against real data

| Run | Result |
| --- | --- |
| `next build` with the live backend and `NEXT_PUBLIC_SITE_URL=https://glorytecks.com` | ✅ exit 0, 97/97 pages, 0 fetch failures |
| `SEO_SMOKE_BASE_URL=http://localhost:3107 SEO_SMOKE_CRAWL=1 npm run test:smoke` | ✅ **82 passed**, 2 skipped (http→https and www→apex, which run only against the production domain). Includes all 57 policy probes and the crawl of all 656 sitemap URLs. |
| Host-header check on the same server | `glorytecks.com`, `www.glorytecks.com`, `localhost`: no `X-Robots-Tag`. Two `*.vercel.app` hosts: `X-Robots-Tag: noindex`. |
| Internal-link audit | 1,565 unique hrefs on 656 pages, all 200 (§4a) |

### Not executed

- **Deploying these changes.** Nothing was pushed or deployed. `glorytecks-psi.vercel.app` still runs the pre-Phase-1 build. After the next deploy, run `SEO_SMOKE_BASE_URL=https://glorytecks-psi.vercel.app npm run test:smoke`. It expects `X-Robots-Tag: noindex` on that host, and its canonical checks keep failing until `NEXT_PUBLIC_SITE_URL` is corrected (parity report §7).
- **The http→https and www→apex checks.** They depend on the domain configuration and can only run against glorytecks.com after cutover. The smoke suite runs them automatically when `SEO_SMOKE_BASE_URL=https://glorytecks.com`.
- **The `X-Robots-Tag` rule on Vercel's edge.** It was verified locally, against Next's own matcher, and with Host headers. The rule is compiled into Vercel's routing from the same `has` condition, but it is first proven on the next deploy by the smoke run above.
- **The 14 legacy URLs** (§5, last table). They await your decision.

---

## Appendix: re-running

```bash
cd main-website

# Offline gate (part of npm test)
npx vitest run lib/seo/crawl.test.ts lib/seo/smoke.test.ts

# Full live verification of any deployment, including every sitemap URL
SEO_SMOKE_BASE_URL=https://<host> SEO_SMOKE_CRAWL=1 npm run test:smoke
```

PowerShell: `$env:SEO_SMOKE_BASE_URL='https://<host>'; $env:SEO_SMOKE_CRAWL='1'; npm run test:smoke`
