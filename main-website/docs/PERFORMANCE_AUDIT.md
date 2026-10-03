# Performance Audit

**Target:** world-class SEO performance on Vercel Hobby + Supabase Free +
Cloudinary, without reducing page quality.

**Date:** 2026-09-23 · measured against the real build and the live backend.

---

## 1. Headline results

| Metric | Before | After |
| --- | ---: | ---: |
| Client JS (all chunks, gzipped) | ~364 KB | **302 KB** |
| Client JS (raw) | 1.3 MB | **1.1 MB** |
| Framer Motion in bundle | 62 KB gz / 4 chunks | **0** |
| Routes on a 60-second ISR window | **28 of 28** | **0** |
| Sitemap backend requests per hour | **~50** | **1** |
| Vercel image transformations for CMS images | all of them | **0** (Cloudinary CDN) |
| View components requiring hydration | 11 | **3** |

---

## 2. Client component classification (§A)

33 files carry `"use client"`. Classification and outcome:

### CONVERT TO SERVER — done (8)

Client **only** because of Framer Motion: zero `useState`, zero `useEffect`,
zero event handlers.

| Component | motion calls | Outcome |
| --- | ---: | --- |
| `views/AboutView.tsx` | 22 | ✅ Server Component |
| `views/ComparisonIndexView.tsx` | 2 | ✅ |
| `views/ComparisonView.tsx` | 12 | ✅ |
| `views/EntitiesView.tsx` | 4 | ✅ |
| `views/NotFoundView.tsx` | 14 | ✅ |
| `views/PlacementsView.tsx` | 14 | ✅ |
| `views/ResourcesView.tsx` | 14 | ✅ |
| `site/PageHeader.tsx` | 6 | ✅ |

### KEEP CLIENT — genuine interactivity (12)

| Component | Why |
| --- | --- |
| `site/Header.tsx` | 7 state, 17 handlers — mobile drawer, dropdowns |
| `site/DemoModal.tsx` | 6 state, form submission |
| `views/ContactView.tsx` | 4 state, 11 handlers — form |
| `views/CoursesView.tsx` | 3 state — search + category filter |
| `views/HomeView.tsx` | 6 state — modal, FAQ, roadmap tabs, counters |
| `blog/BlogToolbar.tsx` | 5 state — debounced search, dropdown |
| `blog/BlogPostIslands.tsx` | Reading progress, TOC scroll-spy, share |
| `site/FloatingButtons.tsx`, `site/StickyMobileCTA.tsx`, `site/ExitIntent.tsx` | Scroll/exit listeners |
| `app/providers.tsx`, `site/SiteDataProvider.tsx` | React context providers |
| `app/error.tsx`, `components/ErrorBoundary.tsx` | Error boundaries must be client |

### KEEP CLIENT — but now cheap (3)

| Component | Why it stays | Note |
| --- | --- | --- |
| `views/CourseDetailView.tsx` | `useContactInfo()` context | Framer removed; **to finish**, the page should pass derived contact info as a prop instead of reading context |
| `views/LocationCourseView.tsx` | same | same |
| `views/LocationView.tsx` | same | same |

### LAZY LOAD — candidate, not done

`site/DemoModal.tsx` is mounted eagerly by `HomeView` and `CoursesView` even
when closed. `next/dynamic` with `ssr: false` would defer it to first open.
Deferred because the modal is a primary conversion path and the current cost is
small now that Framer is gone.

### REMOVE — done

`framer-motion` (5.4 MB installed, 62 KB gz shipped) removed from
`package.json`. Nothing imports it.

### UNKNOWN — none

Every `"use client"` was traced to a specific cause.

---

## 3. Framer Motion (§C)

232 motion elements across the views, used for exactly one effect: fade-and-rise
on scroll. No gestures, no layout animation, no springs, no drag.

Three `AnimatePresence` uses — homepage roadmap tab crossfade, homepage FAQ
accordion, course filter grid — all decorative exit transitions.

**Replaced by `components/ui/reveal.tsx`**, a drop-in shim exporting the same
`motion.*` shape as Server Components that discard the animation props and
apply a `.reveal` class. The effect now lives in `globals.css` as a
scroll-driven `animation-timeline: view()` animation: **zero JavaScript**, runs
on the compositor (so it cannot contribute to INP), and honours
`prefers-reduced-motion`.

The keyframes sit inside an `@supports` block on purpose. Where scroll-driven
animations are unsupported (Safari, Firefox today) no animation is declared and
content renders in its final state — losing a fade is acceptable, rendering
invisible content is not.

Call sites were not rewritten; only the import line changed.

**Verified removed:** 0 bundle chunks contain `useMotionValue`, `motionValue`,
`VisualElement`, `createAnimationState`, or the string `framer-motion`.

---

## 4. Request map (§D)

Unique upstream requests per page render. Next's fetch cache dedupes identical
URLs within a render pass, so shared collections cost one request, not one per
consumer.

| Route | Layout (`getSiteData`) | Page-specific | Unique total |
| --- | ---: | ---: | ---: |
| `/` | 6 | 6 new | **12** |
| `/courses` | 6 | 0 (dedupes) | **6** |
| `/courses/{slug}` | 6 | 2 (`course`, cluster blogs) | **8** |
| `/blog` | 6 | 3 (archive, featured, trending) | **9** |
| `/blog/{slug}` | 6 | 4 | **10** |
| `/blog/category/{slug}` | 6 | 1 | **7** |
| `/about` | 6 | 1 | **7** |
| `/contact`, `/entities`, `/thank-you` | 6 | 0 | **6** |
| `/{landingSlug}` | 6 | 1 | **7** |

**The floor is 6** — `getSiteData()` in the root layout fetches settings,
courses, categories, localities, comparisons and latest blogs for the header
and footer on every route.

### Fixed in this pass

| Issue | Action |
| --- | --- |
| Course page fetched `settings` only to feed a hardcoded FAQ block | Removed (Phase 2) — one fewer request per course page |
| Sitemaps walked the blog archive 25 pages each, twice | Single feed endpoint — **~50 → 1** |
| Every route revalidated every 60 s | Retuned tiers + on-demand invalidation |

### Remaining, documented not fixed

The 6-request layout floor could become 1 with a single backend
`/public/site-bootstrap` endpoint returning all six collections. That is a
backend contract change and a bigger commitment than this pass warranted; it is
the highest-value remaining reduction.

---

## 5. Cache architecture (§E)

**The problem.** `REVALIDATE.FAST` was 60 s, the root layout reads Settings, so
every route inherited a 60-second window — `next build` printed `Revalidate: 1m`
on all 28 routes. A trafficked page could regenerate 60 times an hour, each a
function invocation and an ISR write, in case someone edited the phone number.

**The fix** is not simply a longer TTL — it is being able to *push* a change:

| Tier | Data | Before | After |
| --- | --- | ---: | ---: |
| `FAST` | settings, about, batches, testimonials, localities, trainers, companies, comparisons | 60 s | **600 s** |
| `CONTENT` | blogs, courses, categories | 300 s | **3600 s** |
| Sitemaps | route segment | 3600 s | 3600 s |

Plus **`app/api/revalidate/route.ts`**: a secret-guarded endpoint accepting
`{ tags: [...] }`, with all 18 service calls now tagged (`settings`, `courses`,
`blogs`, `categories`, `comparisons`, `localities`, `about`, `people`,
`marketing`).

The backend already purges Redis on every admin mutation in
`lib/cacheInvalidation.ts`; wiring the same hook to POST here makes edits appear
in seconds *and* lets the TTLs go longer still. The endpoint fails closed —
no `REVALIDATE_SECRET` configured means every request is refused, because an
open purge endpoint is a free way to burn the Hobby function budget.

**Result:** 28 routes at 1m → 25 at 10m, 6 at 1h, 3 at 5m.

---

## 6. Sitemap cost (§F)

`fetchAllBlogPosts()` walked `/public/blogs` at the endpoint's 24-item cap.
With 597 posts that is 25 requests — and `/sitemaps/blog.xml` and
`/sitemaps/categories.xml` each ran their own walk. **~50 requests and ~50
PostgREST round trips per hour**, to produce a list of slugs and dates, with
full card payloads discarded each time.

**Added `GET /public/blogs/sitemap`** — one indexed query
(`blogs_status_date_idx`), projecting exactly four columns
(`slug`, `date`, `updated`, `categorySlug`). No body, no content blocks, no
author join. Registered before `/blogs/:slug` so the param route cannot capture
it, Redis-cached, and hard-bounded at 5,000 rows.

The frontend falls back to the old page walk if the endpoint 404s, so a
frontend deployed ahead of the backend degrades to the previous cost rather
than emitting an empty sitemap.

---

## 7. Database (§G)

Audited and found **healthy** — no changes made, and none justified.

| Check | Finding |
| --- | --- |
| Missing indexes | 34 indexes present, including `blogs_status_date_idx`, `blogs_status_category_date_idx`, GIN on `tags`, and partial indexes for `featured` / `trending`. The new sitemap query is covered by the first. |
| `SELECT *` | None. `BaseRepository.select()` builds an explicit column list from the table definition; the public blog list projects card fields only. |
| N+1 | None. Author/trainer come through a PostgREST embedded select, not a per-row lookup. `/blogs/:slug/context` is 3 bounded queries, not a loop. |
| Unbounded pagination | Public list capped at 24; collections capped by `PUBLIC_COLLECTION_MAX` (1000); new sitemap feed capped at 5000. |
| Expensive sorting | Sorts are on indexed columns. |

**Not adding indexes** was the correct call — on Supabase Free, every index
costs write throughput and disk, and the query plans here are already covered.

---

## 8. Bot / random URL protection (§H)

Largely resolved in Phase 1; re-verified:

| URL shape | Cost |
| --- | --- |
| `/random-page`, `/wp-login.php`, `/.env` | **Static 404.** `[landingSlug]` has `dynamicParams = false`, so no function runs. |
| `/resources/anything` | **Static 404**, same mechanism. |
| `/courses/abcxyz` | One function invocation + one uncached PostgREST lookup → 404. |
| `/blog/asdfgh` | Same. |
| `/blog?page=999999` | **404**, no backend call beyond the archive query. |

**Remaining exposure:** unknown course/blog/comparison slugs still reach the
database, because `cacheWrap` treats a `null` result as a miss and so never
caches a not-found. A short negative-cache TTL in the backend would close this.
Recorded, not implemented — it is a backend behaviour change.

---

## 9. Images (§I)

| Check | Status |
| --- | --- |
| `priority` on true LCP only | ✅ Fixed in Phase 2 — the 48 px header logo was competing; now only the home and About heroes |
| Width/height set | ✅ On every `SafeImage` |
| Responsive `sizes` | ✅ |
| Lazy below fold | ✅ Default; `SafeImage` sets `loading="lazy"` unless `priority` |
| CLS from CMS images | ✅ Fixed in Phase 3 — blog body images have a reserved aspect ratio |
| **Vercel vs Cloudinary** | ✅ **Fixed here** |

**The Cloudinary decision.** Cloudinary *is* an image CDN. Passing its URLs
through `next/image` meant Vercel fetched, re-encoded and re-served bytes that
were already optimised — paying twice, and consuming the Hobby plan's monthly
source-image quota. When that quota is exhausted, images stop being optimised
at all.

`cloudinaryLoader` in `lib/images.ts` now injects Cloudinary's own
transformation segment (`f_auto,q_auto,c_limit,w_<width>`) and delivers from
Cloudinary's CDN. Same output, **zero Vercel image cost**. An editor-supplied
transformation is detected and left untouched, so a deliberate crop is not
overridden. 8 unit tests.

Local static assets (`hero.webp`, `about1.webp`, `logo.png`) still use the
Vercel optimizer, which is correct — they are not on a CDN.

**Open gap:** 0 of 597 blog articles has an image (Phase 3 finding), so no
article generates image requests at all.

---

## 10. Third-party JavaScript (§J)

| Script | Strategy | Assessment |
| --- | --- | --- |
| GTM container | `afterInteractive` | Correct — not render-blocking |
| GTM `<noscript>` iframe | — | Standard |
| **gtag.js (GA4) loaded directly** | `afterInteractive` | ⚠️ **See below** |
| Fonts | `@fontsource`, self-hosted | ✅ No external font requests, no render-blocking Google Fonts |
| Chat / social widgets | none | ✅ |

⚠️ **GA4 appears to be loaded twice.** The layout loads the GTM container *and*
`gtag.js` for `G-MKXRJHXL9C` directly. If the GTM container also contains a GA4
tag — the usual setup — the site loads two analytics libraries and may
double-count pageviews.

**Not changed unilaterally:** whether the GTM container has a GA4 tag is not
knowable from this repository, and silently removing analytics is not a
performance optimisation. Check the container in GTM; if GA4 is configured
there, delete the direct `gtag.js` block from `app/layout.tsx` for roughly
45 KB less third-party JS on every page.

Also removed in Phase 2: ~12 dead `<meta>` tags (`revisit-after`,
`HandheldFriendly`, `MobileOptimized`, …) that no engine reads.

---

## 11. Core Web Vitals (§K)

| Metric | Action taken |
| --- | --- |
| **LCP** | Hero images carry `priority` + explicit dimensions + `sizes`; the competing logo preload removed; Cloudinary serves AVIF/WebP via `f_auto`; fonts self-hosted so no external blocking request. |
| **INP** | 8 view components no longer hydrate at all. Scroll animation moved from a JS animation loop to a compositor-driven CSS timeline, so it cannot block the main thread. 62 KB less JS to parse and execute. |
| **CLS** | Every image has width/height or a reserved aspect ratio; blog body images given `aspect-[16/9]`; the reveal animation only transforms `opacity`/`translateY`, neither of which triggers layout. |

**Not measured here:** field data. These are structural improvements with
predictable direction; confirm with CrUX/PSI after deploy.

---

## 12. Vercel Hobby safety (§L)

| Lever | Action | Why |
| --- | --- | --- |
| ISR writes | 60 s → 600 s / 3600 s | The single largest source of avoidable function invocations |
| On-demand invalidation | Added | Lets TTLs be long without stale content |
| Image transformations | Cloudinary loader | Hobby image optimization is quota-limited |
| Bot rendering | `dynamicParams: false` on two route families | Random URLs cost zero function time |
| Sitemap generation | ~50 → 1 request/hour | Was the largest recurring background cost |
| Client JS | −62 KB gz | Less bandwidth per visit |

## 13. Supabase Free safety (§M)

| Lever | Status |
| --- | --- |
| Query volume | Sitemap 50 → 1/hour; blog list cache collision fixed in Phase 3 (was serving wrong rows *and* defeating the cache) |
| Row growth | 597 blogs + ~700 other rows — trivial against the 500 MB limit |
| Large assets | ✅ **None in Postgres.** Images and PDFs live in Cloudinary; the DB stores URLs only. This is the single most important free-tier discipline and it is already correct. |
| Connections | PostgREST is stateless HTTP — no pool to exhaust |
| Redis shielding | `cacheWrap` fronts every public read; the key-collision bug that was defeating it is fixed |

**Watch item:** not-found lookups are never cached (`cacheWrap` treats `null`
as a miss), so bot traffic on unknown slugs reaches Postgres directly.

---

## 14. Remaining opportunities, ranked

| # | Opportunity | Est. impact | Effort |
| --- | --- | --- | --- |
| 1 | Backend `/public/site-bootstrap` → layout floor 6 requests → 1 | High | Medium |
| 2 | Wire the backend's mutation hook to `POST /api/revalidate` | High | Low |
| 3 | ~~Confirm the GA4 duplication and drop one loader~~ **Checked 2026-09-24: not duplicated.** GTM holds only Clarity, so keep `gtag.js` (`PERFORMANCE_SEO_VERIFICATION.md` §5) | — | — |
| 4 | Pass contact info as props → last 3 views become Server Components | Medium | Medium |
| 5 | Negative-cache 404 lookups in the backend | Medium | Low |
| 6 | `next/dynamic` for `DemoModal` | Low | Low |
