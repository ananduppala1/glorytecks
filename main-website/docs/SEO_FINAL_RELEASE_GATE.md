# GloryTecks SEO Final Release Gate

**Date:** 2026-09-24
**Decision:** ❌ **NOT READY — BLOCKED** (4 critical issues, see the end)

**What was verified:**

| Target | What it is | How it was checked |
|---|---|---|
| **Release candidate (RC)** | The working tree on branch `fix/scroll-reveal-animations`: `1987ba3` plus the uncommitted Phases 4–10 work (77 paths in `git status`, this report included) | Built with `NEXT_PUBLIC_SITE_URL=https://glorytecks.com` and served locally against the live CMS through a local backend |
| **Deployed Next build** | `glorytecks-psi.vercel.app` (`bb939b9`) | Live requests |
| **Live production** | `glorytecks.com`, which is still the legacy SPA | Its sitemap, fetched once |

**Changes made in this phase:** one line in `lib/seo/nap.live.test.ts`, a test defect (see §Failed Checks, F-7). Nothing else. No UI, content, CMS or configuration was changed, and nothing was deployed.

---

## Critical Issues

Each of these blocks release.

### CR-1 — Business address conflict (603 vs 611) is not independently verified

The business-data portion **FAILS**.

| Fact | Sources that say one thing | Sources that say another |
|---|---|---|
| Street number | `config/business.ts`, the JSON-LD on every page, the CMS Ameerpet locality intro: **603, Annapurna Block** | Live CMS Settings (footer, contact page, centre page) and the legacy site: **611, Annapurna Block** |
| Email | Config and JSON-LD: `gloryteckss@gmail.com` | CMS Settings: `info@glorytecks.com` |
| Coordinates | Config: `17.4363325, 78.4422454` | Google listing: `17.4367335, 78.4450028`. The hard-coded embed in `LocationView.tsx`: `17.4375, 78.4463` with a different Maps place ID. |

- **Evidence:** `npm run test:nap` with `NAP_LIVE_API` (the production backend), `NAP_LIVE_GOOGLE=1` and `NAP_LIVE_SITE` (the RC) lists these as open conflicts. The RC's own Organization and LocalBusiness nodes agree with the config (PASS), so the code is consistent. The facts are what's unconfirmed.
- **Not guessed.** Required: the business confirms the street number from the door signage, rental agreement, GST registration and the Google Business Profile. Then `config/business.ts`, CMS Settings and the Ameerpet locality intro get updated in one change (LOCAL_SEO_MASTER_AUDIT.md §7).

### CR-2 — The production hostname is misconfigured on the Next.js Vercel project

- `robots.txt` on `glorytecks-psi.vercel.app` is `User-Agent: * / Disallow: /`.
- The canonical is `https://glorytecks-one.vercel.app/courses/data-science`, a host that returns `DEPLOYMENT_NOT_FOUND`.
- Every canonical, `og:url`, JSON-LD `@id` and sitemap `<loc>` uses that dead host.
- **Evidence:** `SEO_SMOKE_BASE_URL=https://glorytecks-psi.vercel.app npm run test:smoke` gives **53 failed**, 28 passed, 3 skipped.
- **Cause:** the project's Production `NEXT_PUBLIC_SITE_URL` (SEO_PRODUCTION_PARITY_REPORT.md §1.3). The same code with `https://glorytecks.com` passes everything (§Passed Checks).
- **If the domain moved today,** glorytecks.com would disallow all crawling.
- **Required (outside the repo):** set Production `NEXT_PUBLIC_SITE_URL=https://glorytecks.com`, redeploy, then re-run the smoke test until it shows 0 failures.

### CR-3 — 14 live, sitemap-listed URLs have no route in the release candidate (C1)

All 670 URLs in the live `glorytecks.com/sitemap.xml` were requested against the RC: **656 return 200 and 14 return 404.**

| URLs | Suggested handling (needs your decision) |
|---|---|
| `/privacy-policy`, `/terms`, `/refund-policy`, `/cookie-policy`, `/disclaimer`, `/editorial-policy` | Build the pages. The backend already serves `/public/legal/{slug}`, and `fetchLegalDoc` exists. A privacy policy is also needed alongside GA4 and Clarity. |
| `/agentic-ai-course-ameerpet`, `/data-engineering-course-ameerpet`, `/sql-server-course-ameerpet` | Restore via `config/locationLandings.ts` (LOCAL_LANDING_PAGE_AUDIT.md §7.3) |
| `/agentic-ai-course-madhapur`, `/data-engineering-course-hitech-city`, `/generative-ai-course-gachibowli`, `/sql-server-course-kukatpally` | 308 to the course page, unless Search Console shows clicks |
| `/training-in-ameerpet` | 308 to `/training-in-hyderabad` |

Letting these 404 at cutover would be an automatic removal. Redirecting them would be an automatic redirect. Neither was done.

### CR-4 — The verified release candidate is not what's deployed

- Everything that passes below was verified on the **RC**: the working tree with 77 uncommitted paths across Phases 4–10.
- The deployed Next build (`bb939b9`) lacks, among other things, the `/courses` ItemList, the WebPage `mainEntity` on course pages, the reveal LCP fix, the monitoring tooling and this phase's test fix.
- **Required:**
  1. Review and commit.
  2. Deploy with CR-2 fixed.
  3. Re-run the full gate against the deployment.

---

## High Issues

| # | Issue | Evidence | Needs |
|---|---|---|---|
| **H-1** | **Unverified and contradictory business claims** on money pages, some mirrored in structured data | See the list below | Business evidence, or approved copy changes. Not changed (copy and CMS). |
| **H-2** | **Unsupported local claims on 9 landings** (and in their FAQPage JSON-LD): "classroom training at the Ameerpet centre, **near** KPHB, Miyapur, …" puts the centre next to other localities. Also "{locality} batch offers" (15 pages) and the "Online & classroom batches" badge under a locality pin. | LOCAL_LANDING_PAGE_AUDIT.md §3 (W1–W3) | Approval of the proposed wording |
| **H-3** | **Stale site-wide announcement:** "Next Batch Starting June 10" on every page (today is 2026-09-24). All 9 CMS batches are also June 2026. | RC HTML; the CMS `announcementText`, or the `Header.tsx` fallback | A CMS update |
| **H-4** | **Blog authorship unverified.** Four named authors plus "GloryTecks Team", with exactly 50 / 50 / 125 / 125 / 250 posts: a pattern of bulk assignment. If these aren't real people with those roles, it's fabricated author information. | `authors.json` in the backup; blog byline and schema `author` | The business confirms each person and bio, or bylines are corrected |
| **H-5** | **Significant blog duplication (existing, not increased):** 417 near-duplicate templated guide articles | BLOG_CONTENT_QUALITY_REPORT.md; the blog audit re-run reproduced every output byte for byte | The content decision in BLOG_CONTENT_ACTION_PLAN.md, gated on Search Console |

**H-1 claims:**
- "100% placement assistance with **500+ hiring partners**": all 9 course pages and 15 landings (FAQPage JSON-LD on the landings). The CMS lists **20** partner companies.
- Homepage: "100% Placement Support" and "100% Placement" on course cards, **versus** "95% placement rate" in the stats and in the SEO paragraph.
- Homepage: "3000+ Students Placed", "4.9/5 Google Rating", "placed at … Google, Amazon, Microsoft, Infosys, TCS, Wipro, Deloitte and 500+ other hiring partners", "industry certifications".
- Centre page: "4.9/5 from 500+ Google Reviews".
- Course pages: "Placement 100% Support", "Certification … Industry Recognized" labels.

---

## Medium Issues

| # | Issue | Evidence |
|---|---|---|
| M-1 | Course meta descriptions run the tagline into the next sentence ("From data to decisions **A** 6 Months Data Science course…") on all 9 course pages, and run to 216–292 characters | RC HTML; S2 in the parity report. It changes text, so it awaits approval. |
| M-2 | `www.glorytecks.com` → apex is a **307**, not a 308 | `curl`, live; a domain setting at cutover (C2) |
| M-3 | Landing CLS **0.124** on slow-4G mobile, caused by the Inter 400 font swap | PERFORMANCE_SEO_VERIFICATION.md §8.3 |
| M-4 | The home YouTube embed loads the full player on every visit: **1.09 MB**, 17 requests | Same, §1 |
| M-5 | `/blog` and `/blog/category/*` render on demand for every request: TTFB median **0.54 s** and **1.58 s** from India | Same, §7.1 |
| M-6 | Production revalidates most pages once a day, and nothing calls `/api/revalidate`, so CMS edits can take up to 24 h to appear | Same, §7.1 |
| M-7 | The homepage stat counters are server-rendered as "**0+** Students Trained, **0%** Placement Rate, **0+** …" and only count up after JavaScript runs | RC HTML; `HomeView.tsx` `useCounter` |
| M-8 | Five `/resources/*` pages are thin, templated and indexable; three have 52–58 words of body text (soft-404 risk) | Release crawl |
| M-9 | 463 indexable pages have no editorial inbound link; 417 are 5+ clicks from `/` (not orphans) | `test:graph` output |
| M-10 | CMS Settings list `https://x.com/glorytecks`, which isn't in `config/business.ts` or the `sameAs` list | `test:nap` live, 1 failure |
| M-11 | Salary ranges on course pages and landings have no source, and differ between the live site and the CMS for all 6 courses | LOCAL_LANDING_PAGE_AUDIT.md W8 |

## Low Issues

| # | Issue |
|---|---|
| L-1 | The 10 `/compare/*` Article nodes have no `datePublished`. A date must not be invented; source it from the CMS if one exists. |
| L-2 | Course pages and landings reference `#localbusiness`, and articles and categories reference `/blog#webpage`, nodes that live on other pages. Valid JSON-LD; noted only. |
| L-3 | Landing `timeRequired` / `courseWorkload` are "6 Months", not ISO 8601. |
| L-4 | The backend public rate limiter is disabled, so 3 backend rate-limit tests fail. Not SEO; recorded since Phase 4. |
| L-5 | The 97 KB `favicon.ico`, the unused Sonner toaster, and a `box-shadow` pulse animation (PERFORMANCE_SEO_VERIFICATION.md §9). |
| L-6 | Homepage WebPage `@id` form `https://glorytecks.com#webpage` (cosmetic; S4). |

---

## Passed Checks

Every item was executed in this phase unless it says otherwise.

### Step 1 — every intended indexable URL (RC, all 656 sitemap URLs)

Checked by the release crawl and `SEO_SMOKE_CRAWL=1 npm run test:smoke`.

| Check | Result |
|---|---|
| HTTP 200, no redirect | ✅ 656/656 |
| Exactly one canonical, equal to the final URL, on `https://glorytecks.com` | ✅ 656/656 |
| Exactly one title, one meta description, one H1 | ✅ 656/656 |
| Robots `index, follow`, no `X-Robots-Tag: noindex` | ✅ 656/656 |
| `og:url` = canonical; og:title, og:description and an absolute https og:image | ✅ 656/656 |
| JSON-LD parses; no duplicate `@id` on a page | ✅ 656/656 |
| No non-production host (localhost, `*.vercel.app`, `glorytecks-one`, `http://`) in head metadata or JSON-LD | ✅ 0 found |
| No duplicate titles, descriptions or H1s across the set | ✅ 0 (crawl and `test:graph`) |
| No page serving "not found" content with a 200 | ✅ 0 (3 thin pages under M-8) |
| Sitemap membership: every URL crawled came from the sitemap | ✅ `test:graph` reached every sitemap URL |

### Step 2 — sitemap (RC)

| Check | Result |
|---|---|
| Index + 7 children, 656 URLs | pages 9, courses 9, blog 595, categories 13, locations 15, resources 5, compare 10 |
| Duplicates / query URLs / foreign hosts | ✅ 0 / 0 / 0 |
| Redirected or noindex URLs | ✅ none (crawl: all 200, index) |
| `<priority>` / `<changefreq>` | ✅ none |
| `lastmod` | ✅ present and valid on all 656; none in the future; **none equals today's date**, so no build-time timestamps |
| Important pages included | ✅ home, 9 courses, centre, 15 landings, 12 categories, `/blog`, `/courses`, `/about`, `/contact`, comparisons, resources |

### Step 3 — blog

| Check | Result |
|---|---|
| No bulk publication-date or `lastmod` changes | ✅ All 600 posts: the CMS `date` and `updated` fields are identical to the Phase 4 backup; database `updated_at` is unchanged for 600/600 (read-only query), with none added or removed |
| Schema dates | ✅ `datePublished` = CMS date for 595/595 articles; sitemap `lastmod` comes from content dates |
| No increase in duplication; no new templated content | ✅ `blog:audit` against the backup reproduced all 8 blog docs **byte-identically**. No rewrite was applied (pilot still `needs_review`). |
| No keyword stuffing, cannibalisation or broken links | ✅ `test:graph`: no blog post targets a course query; every intent overlap reviewed; 0 broken internal links |
| No fake citations | ✅ No content was written in any phase |
| Canonical / noindex | ✅ self-canonical and indexable (Step 1) |
| Fake author information | ⚠️ Not passable without evidence (H-4) |

### Step 4 — the 9 course pages (RC)

| Check | Result |
|---|---|
| Unique titles, H1s, descriptions; self-canonical | ✅ |
| Commercial intent ownership | ✅ `test:graph` (course query owned by its course page; overlaps reviewed) |
| Course schema | ✅ name, description (≥ 20 characters), `provider` → `#organization`, onsite (→ `#localbusiness`) and online instances; **no** `offers`, price, `aggregateRating`, `review` or `startDate` (crawl and `test:nap` live Course check) |
| WebPage with `mainEntity`, BreadcrumbList sequential and ending at the canonical | ✅ 9/9 |
| `/courses` ItemList of the 9 | ✅ |
| Internal links | ✅ every course page has editorial support (`test:graph`) |
| No false or fabricated claims | ❌ See H-1 |

### Steps 5 and 6 — local SEO and structured data (RC)

| Template | Types found on every page of the template |
|---|---|
| `/` | EducationalOrganization, WebSite, WebPage, LocalBusiness, FAQPage, BreadcrumbList |
| `/courses` | EducationalOrganization, WebSite, CollectionPage, ItemList, BreadcrumbList |
| `/courses/*` (9) | EducationalOrganization, WebSite, WebPage, Course, BreadcrumbList |
| `/training-in-hyderabad` | EducationalOrganization, WebSite, LocalBusiness, WebPage, BreadcrumbList |
| Landings (15) | EducationalOrganization, WebSite, Course, FAQPage, BreadcrumbList |
| `/blog` | EducationalOrganization, WebSite, Blog, BreadcrumbList |
| Categories (12) | EducationalOrganization, WebSite, CollectionPage, BreadcrumbList |
| Articles (595) | EducationalOrganization, WebSite, BlogPosting, FAQPage, BreadcrumbList |
| Comparisons (10) | EducationalOrganization, WebSite, Article, FAQPage, BreadcrumbList |

**Structured-data checks:**
- LocalBusiness appears only on `/` and `/training-in-hyderabad`.
- The RC's Organization and LocalBusiness nodes agree with `config/business.ts` (`test:nap` live).
- No second campus is declared (`nap.test.ts`).
- The site's Google Maps share link resolves to the canonical place, name and pin (`test:nap` live).
- **FAQ alignment:** every FAQPage question appears as visible text on its page, with 0 misses across all templates.
- The accuracy of the facts is a separate matter: CR-1 and H-1.

### Step 7 — internal links (RC, 851 pages crawled by `test:graph`)

| Check | Result |
|---|---|
| Broken, redirected or non-canonical internal links, and orphans | ✅ 0 / 0 / 0 / 0 |
| Course pages supported by editorial links | ✅ |
| Link volume | ✅ 84–105 internal links per page (51–73 unique), mostly header and footer; 10–31 in the body. Not excessive. |
| Editorial depth | ⚠️ See M-9 |

### Step 8 — performance (measured today; PERFORMANCE_SEO_VERIFICATION.md)

| Metric | Result |
|---|---|
| LCP (mobile, applied slow 4G + 4× CPU, local RC, median of 7) | ✅ **1.78–1.93 s** on 5 templates, down from 2.88–3.13 s, after the reveal fix |
| INP (lab, 4× CPU) | ✅ 59–131 ms |
| CLS | ✅ ≤ 0.022, except the landing (M-3) |
| TTFB (cached pages, from India) | ✅ ~0.1–0.5 s |
| First-party JS | ✅ 210–224 KB brotli per route |
| Images | ✅ sized, lazy, AVIF |
| Fonts | ✅ self-hosted, `font-display: swap` |
| Caching | ✅ immutable static assets; ISR works |
| Measured problems | M-3 to M-6 |
| **No regression against the live site:** applied-throttling LCP | Next 2.1–3.1 s vs legacy 4.5–5.2 s |

### Step 9 — analytics

| Check | Result |
|---|---|
| GTM loads once (`GTM-TD5HFZ79`) | ✅ on `/`, a course page and an article (RC HTML) |
| GA4 `gtag.js` (`G-MKXRJHXL9C`) loads once, with one `gtag('config')` | ✅ same pages |
| No duplicate GA4 | ✅ The container (v3) holds only a Clarity tag (verified in Phase 8); `performance.test.ts` guards against deleting the only GA4 loader |
| GA4 hits fire | ✅ `g/collect?tid=G-MKXRJHXL9C` requests were recorded on the deployed Next build in the Phase 8 Lighthouse runs |
| Analytics untouched by the SEO phases | ✅ `layout.tsx` analytics blocks unchanged |
| Lead events | ⚠️ `trackLead` fires for the contact form and the floating/sticky WhatsApp and call buttons. The demo form, brochure downloads and in-page WhatsApp and call links aren't wired (ANALYTICS_MEASUREMENT_PLAN.md §2). An existing gap, not caused by SEO work. |

### Step 10 — automated tests

Every command below was actually run in this phase.

| Command | Result |
|---|---|
| `npm run typecheck` | **PASS** (exit 0) |
| `npm run lint` | **PASS**: 0 errors, 9 warnings (the same pre-existing 9) |
| `npm test` | **PASS**: 17 files passed, 5 skipped; **446 passed**, 101 skipped (549) |
| `npm run build` | **PASS**: 97/97 static pages, no data-fetch errors |
| `test:smoke` on the RC, with `SEO_SMOKE_CRAWL=1` | **PASS**: 82 passed, 2 skipped (the scheme/host checks only run against the real domain) |
| `test:smoke` on `glorytecks-psi.vercel.app` | **FAIL**: 53 failed, 28 passed, 3 skipped (CR-2) |
| `test:graph` (intent + live link graph) on the RC | **PASS**: 32/32 |
| `test:nap` (offline + live: production CMS, Google Maps, RC schema) | **FAIL**: 1 of 26 (M-10); open conflicts reported (CR-1) |
| `blog:audit` with the backup and rewrites | **PASS**: 38/38; outputs byte-identical |
| Backend `npm test` | **FAIL**: 3 of 335, all rate-limit tests (L-4). The Phase 4 blog-rewrite tests pass 63/63. |
| Backend `typecheck` / `lint` | **PASS** / **PASS** (0 errors, 3 warnings) |
| Release crawl (656 URLs), legacy parity (670 URLs), read-only blog-DB integrity | Run. Results above, CR-3, L-1, M-8. |
| `seo:report` | **NOT TESTED**: no Search Console data exists; only a synthetic run in Phase 9 |
| `test:smoke` on `glorytecks.com` | **NOT TESTED**: it serves the legacy SPA, which fails this suite by design (parity report) |
| Search Console, CrUX field data, Google Rich Results Test | **NOT TESTED**: no access or API key. JSON-LD structure was validated by the crawl, not by Google's tool. |

## Failed Checks

| # | Check | Result |
|---|---|---|
| F-1 | Business data (NAP) consistency | CR-1 |
| F-2 | Production hostname on the Next.js deployment | CR-2 |
| F-3 | Legacy parity (670 live URLs → RC) | 14 × 404 (CR-3) |
| F-4 | Source = production | CR-4 |
| F-5 | No false or fabricated claims (course pages, home, centre) | H-1 |
| F-6 | No unsupported local claims | H-2 |
| F-7 | `test:nap` live Course check. **Fixed (a test defect).** It asserted `/\S{20,}/`, 20 characters without a space, which no real sentence can satisfy. It now checks for a description of at least 20 characters, and the RC passes. This is the only change made in Phase 10. | Fixed |
| F-8 | `test:nap` live CMS Settings | X profile drift (M-10) |
| F-9 | Backend rate-limit tests | L-4 |

## Warnings

- Author identity is unverified (H-4). Blog duplication is existing, not new (H-5). Editorial link depth (M-9).
- Stale batch dates site-wide (H-3), and counters render as 0 in server HTML (M-7).
- Performance items M-3 to M-6. Some analytics lead events aren't wired (the demo form, brochure downloads, in-page WhatsApp and call links).
- The legacy site has CLS 0.31–0.41 and serves Clarity twice. Neither carries over, because the Next.js build replaces it.

## Pages Requiring Manual Verification

| What | Where | Verify against |
|---|---|---|
| Street number 603 / 611, email, coordinates | Footer, `/contact`, `/training-in-hyderabad`, JSON-LD on every page | Door signage, rental agreement, GST, Google Business Profile |
| X profile `x.com/glorytecks` | CMS Settings, footer | Whether the business owns the account |
| "100% placement", "95% placement rate", "3000+ students placed", "500+ hiring partners", named employers | `/`, 9 course pages, 15 landings | Placement records; the partner list (the CMS has 20) |
| "4.9/5 Google rating", "500+ Google reviews" | `/`, `/training-in-hyderabad` | The Google Business Profile, on the day of release |
| "Industry Recognized" certification, "industry certifications" | Course pages, `/` | The actual certificate issued |
| Author names, roles and bios | 595 articles | Real staff records |
| Next batch date; the 9 batch records | Every page (announcement), course pages | The current schedule |
| Salary ranges | Course pages, landings | A cited source |
| Legal page content (once built) | 6 legal URLs | Current policies |

## Production Verification

| Environment | State |
|---|---|
| **glorytecks.com (live)** | Still the legacy Vite SPA in another Vercel account. 670 URLs in its sitemap. `www` is a 307. Not the release. |
| **glorytecks-psi.vercel.app** (Next.js, `bb939b9`) | Serves content, but **`Disallow: /`** and canonicals on a dead host (CR-2). Missing the Phase 5–10 changes (CR-4). |
| **Release candidate** (local, correct origin) | Passes every automated technical SEO check listed above |
| **Search Console / field data** | Not available. Baselines start after cutover (SEO_MONITORING_PLAN.md). |

**After deploying, and before moving the domain:**
1. `SEO_SMOKE_BASE_URL=https://<deployment> npm run test:smoke` → 0 failures.
2. `SEO_SMOKE_CRAWL=1` → every sitemap URL 200, self-canonical, indexable.
3. `SEO_GRAPH_BASE_URL=https://<deployment> npm run test:graph` → pass.
4. `NAP_LIVE_SITE=https://<deployment> npm run test:nap` → pass, once CR-1 is settled.

**After moving the domain:** the same four commands against `https://glorytecks.com`. Then GOOGLE_SEARCH_CONSOLE_LAUNCH.md and the first weekly `seo:report`.

## Recommended Final Actions

In this order. Each item needs your or the business's decision, or access this session doesn't have.

1. **CR-1:** the business confirms the address (and email, coordinates, X profile). Then one change updates config, CMS Settings and the locality intro. Re-run `test:nap` live.
2. **H-1, H-2, H-3, H-4:** confirm or correct the claims, the local wording, the batch date and the author identities. Only approved copy changes (project rule).
3. **CR-3:** decide the 14 URLs (build the 6 legal pages; restore or 308 the landings; 308 `/training-in-ameerpet`).
4. **Commit** the Phase 4–10 work after review (CR-4).
5. **CR-2:** set Production `NEXT_PUBLIC_SITE_URL=https://glorytecks.com` on project `glorytecks`, then redeploy.
6. **Re-run this gate** against the deployment (Production Verification, steps 1–4). It must show no critical issues.
7. Move the domain. Set `www` → apex as a 308 (M-2). Re-run the gate against `glorytecks.com`. Submit `/sitemap.xml`.
8. **After release,** the Medium items with approval, in this order: M-6 revalidation webhook, M-1 description template, M-3 fonts, M-4 YouTube facade, M-5 blog archive caching.

## Release Decision

**❌ NOT READY — BLOCKED.**

**Four critical issues remain:**
- **CR-1:** unverified business address and a NAP conflict. The business-data portion **fails**, as required.
- **CR-2:** the production hostname is misconfigured, so the deployment disallows crawling and canonicalises to a dead host.
- **CR-3:** 14 live URLs would 404 at cutover, pending a decision.
- **CR-4:** the verified release candidate isn't what's deployed.

The release-candidate **code** passes every automated technical SEO check that was run: 656/656 URLs clean, sitemap clean, 0 broken links, valid schema, blog data untouched, and faster than the live site. It becomes releasable once the blockers are resolved and the gate is re-run against the actual deployment. This decision must not be read as "technical SEO passed, so release": the blockers are exactly the ones this gate exists to catch.
