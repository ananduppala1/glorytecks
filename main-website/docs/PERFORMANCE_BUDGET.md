# Performance Budget

Budgets are ceilings, not targets. Crossing one is not automatically a bug — it
is a decision that has to be argued for in the pull request. The point is that
regressions get noticed while they are one component, not after a year of
accumulation.

Baselines are the measured values as of 2026-09-23, after the Phase 4 work.

---

## 1. JavaScript

| Budget | Ceiling | Current | Notes |
| --- | ---: | ---: | --- |
| Total client JS, all chunks (gz) | **340 KB** | 302 KB | ~12% headroom |
| First Load JS, any single route (gz) | **130 KB** | — | Measure with `next build` per route |
| Largest single chunk (gz) | **75 KB** | 69 KB | React + Next runtime |
| New third-party library (gz) | **20 KB** | — | Above this, justify in the PR |
| Client components per page view | **6** | 3–6 | Each is a hydration boundary |

**Rules**

1. **A component is a Server Component until it demonstrably cannot be.** The
   test is state, effects, event handlers or browser APIs — *not* animation.
   Framer Motion cost 62 KB gz and forced 11 views to hydrate, purely so static
   marketing copy could fade in.
2. **No animation library.** Scroll reveals use `.reveal` in `globals.css`.
   If an interaction genuinely needs spring physics, argue it per-route and
   load it with `next/dynamic`.
3. **No dependency that duplicates something already present** — date
   formatting, HTTP, icons, class-name joining are all solved.
4. **`next/dynamic` for anything below the fold or behind an interaction.**

---

## 2. Images

| Budget | Ceiling | Notes |
| --- | ---: | --- |
| LCP image, transferred | **180 KB** | AVIF/WebP via `f_auto` |
| Any single content image | **250 KB** | |
| Total image weight, initial viewport | **400 KB** | |
| Images with `priority` per page | **1** | The LCP element and nothing else |
| Images without width/height or aspect ratio | **0** | Non-negotiable — CLS |

**Rules**

1. **Cloudinary images use `cloudinaryLoader`**, never Vercel's optimizer.
   Cloudinary is already a CDN; re-processing pays twice and burns the Hobby
   quota. `SafeImage` routes this automatically.
2. **Local static assets** (`/assets/*`) use `next/image` normally.
3. **`priority` on exactly one image per page.** A second one competes with the
   first for bandwidth — the header logo used to do exactly this.
4. **Every image needs dimensions.** Where the source has none (CMS blocks),
   reserve space with an aspect ratio instead.
5. **Alt text describes the image.** Decorative images get `alt=""`.

---

## 3. API & database requests

| Budget | Ceiling | Current | Notes |
| --- | ---: | ---: | --- |
| Upstream requests per page render | **10** | 6–12 | `/` is at 12 — see below |
| Layout (`getSiteData`) floor | **6** | 6 | Target 1 via `/public/site-bootstrap` |
| Client-side fetches on load | **0** | 0 | Forms only, on submit |
| Sitemap requests per regeneration | **2** | 1 | Was ~50 |
| Requests for an unknown slug | **2** | 2 | Metadata + page |
| Requests for a non-existent route | **0** | 0 | Static 404 |

**Rules**

1. **Fetch on the server.** A client fetch on load is a waterfall.
2. **Rely on the fetch cache for shared collections** — identical URLs dedupe
   within a render pass. Do not hand-thread data through props to "save" a call
   that was already deduped.
3. **New page must not add an upstream call** if an existing one already has
   the data.
4. `/` is over budget at 12. Fixing the layout floor brings it to 7.

---

## 4. Caching

| Data | Revalidate | Tag |
| --- | ---: | --- |
| Settings, about, people, marketing collections | 600 s | `settings`, `about`, `people`, `marketing` |
| Courses, blogs, categories | 3600 s | `courses`, `blogs`, `categories` |
| Sitemaps | 3600 s | — |
| Static pages | build-time + ISR | — |

**Rules**

1. **No route may carry a revalidate window under 300 s** without a written
   reason. Sixty seconds site-wide was costing up to 60 regenerations per page
   per hour.
2. **Freshness comes from invalidation, not from short TTLs.** Anything needing
   to appear immediately gets a tag and a `POST /api/revalidate`.
3. **Every tagged fetch uses a `CACHE_TAGS` constant.** A string literal typo
   silently never invalidates.

---

## 5. Core Web Vitals

Field targets (p75, mobile). "Good" thresholds, because the site competes on
search.

| Metric | Good | Budget | Alert |
| --- | ---: | ---: | ---: |
| **LCP** | ≤ 2.5 s | **2.0 s** | > 2.5 s |
| **INP** | ≤ 200 ms | **150 ms** | > 200 ms |
| **CLS** | ≤ 0.1 | **0.05** | > 0.1 |
| TTFB | ≤ 800 ms | **600 ms** | > 800 ms |
| FCP | ≤ 1.8 s | **1.5 s** | > 1.8 s |

Budgets sit inside the "good" thresholds deliberately: a budget set *at* the
threshold is already failing for half the users it describes.

**Measure with field data** (CrUX / Search Console Core Web Vitals), not only
Lighthouse. Lab scores miss real device and network variance.

---

## 6. Free-tier ceilings

Alert well before the limit — a hard stop mid-month is worse than a smaller
change made early.

| Resource | Plan limit | Alert at |
| --- | --- | --- |
| Vercel function invocations | Hobby quota | 60% |
| Vercel image source images | Hobby quota | 50% — should stay near zero now |
| Vercel bandwidth | Hobby quota | 60% |
| Supabase DB size | 500 MB | 250 MB |
| Supabase egress | Free quota | 60% |
| Cloudinary credits | Free quota | 60% |

**Rules**

1. **Never store binary assets in Postgres.** Images and PDFs belong in
   Cloudinary; the database stores URLs. Currently correct — keep it that way.
2. **Bot traffic must not cost function time.** Finite route sets use
   `generateStaticParams` + `dynamicParams: false`.
3. **Background work is a recurring bill.** The sitemap ran ~50 requests an
   hour — 36,000 a month — for a list of slugs.

---

## 7. Enforcement

| Budget | How it is checked today |
| --- | --- |
| No framer-motion | Absent from `package.json`; nothing imports it |
| Cloudinary loader correctness | `lib/images.test.ts` (8 tests) |
| Cache tags are valid | `CACHE_TAGS` is a closed union; `/api/revalidate` rejects unknown tags |
| Sitemap URL validity | `lib/seo/sitemap.test.ts` |
| `priority` on one image | Manual — candidate for a lint rule |
| JS bundle ceiling | **Manual today.** Best next step: fail CI when total gz exceeds 340 KB |

Budgets that are not enforced decay. The bundle ceiling is the one most worth
automating next.
