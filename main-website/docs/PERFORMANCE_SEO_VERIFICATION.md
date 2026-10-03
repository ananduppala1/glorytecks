# Performance & Core Web Vitals Verification (Phase 8)

**Date:** 2026-09-24
**Measured from:** India, over the Vercel `bom1` (Mumbai) edge
**Tools:**
- Lighthouse 13.5.0 in both simulated and applied throttling
- Chrome 153 through Puppeteer, with applied throttling and scripted interactions
- `curl` timings and headers
- Vercel build and runtime logs
- the live GTM container

**Code changed:** one CSS change (§6) and one guard test. Nothing else, and no deployment. §9 has recommendations that need your approval.

Earlier work this builds on: [`PERFORMANCE_AUDIT.md`](PERFORMANCE_AUDIT.md), from 2026-09-23. That pass restructured the code but measured no Core Web Vitals.

---

## 1. Summary

| | |
|---|---|
| **What "production" is** | **glorytecks.com** is still the legacy Vite SPA, in another Vercel account. The **Next.js build** is live at `glorytecks-psi.vercel.app`, from commit `bb939b9` (main, PR #3). It has **no custom domain and no real traffic**, so it has no field data. Both were measured. |
| **Field data** | **None available.** The keyless PageSpeed Insights API returned `429 Quota exceeded … Queries per day`, and CrUX needs an API key. There's no Search Console access. For the legacy origin, field data would describe the legacy SPA anyway. |
| **Largest real problem found** | On mobile, the hero **fades in from opacity 0**. Chrome doesn't count opacity-0 paints for LCP, so the hero was recorded as LCP only after the fade: **+1.0 to +1.3 s** on a throttled mobile load, on every page with a hero. **Fixed**, with no visible change (§6). |
| **LCP after the fix** | Local production build, applied slow-4G throttling, median of 7: **1.78–1.93 s**, down from **2.88–3.13 s** (5 routes). Lighthouse with applied throttling: home **3.1 → 2.1 s**, landing **3.0 → 2.0 s**. |
| **INP (lab, 4× CPU)** | Median: home **131 ms**, `/courses/data-science` 93, landing 89, `/courses` search typing 59 (8 runs). All good. |
| **CLS** | ≤ 0.022 on every route, except the **landing hero: 0.124** under slow 4G. That's a web-font swap (Inter 400) reflowing the hero paragraph; not fixed (§9, P1). The legacy site measures **0.31–0.41** on the landing and blog pages. |
| **GA4 duplication** | **None.** GTM container `GTM-TD5HFZ79` (version 3) holds exactly one tag, Microsoft Clarity. GA4 `G-MKXRJHXL9C` is loaded once, directly. **Nothing removed**: removing `gtag.js` would remove GA4 entirely (§5). |
| **Heaviest third-party cost** | The home-page **YouTube embed loads eagerly**: 17 requests, **1,092 KB** transferred, 3.9 MB decoded, on every home visit. Its `loading="lazy"` doesn't help because it sits directly under the hero, inside Chrome's lazy-load distance. |
| **Caching** | ISR and edge caching work. But production **revalidates most pages once a day**, and the backend never calls `/api/revalidate`. So a CMS edit can take **up to 24 h** to appear (§7). `/blog` and `/blog/category/*` render on demand for every request: TTFB **0.54 s** and **1.58 s** median from India. |
| **Legacy vs Next** (mobile, applied throttling, Lighthouse) | Home LCP 4.5 → **3.1** (then **2.1** after the fix). Landing 5.1 → 3.0 (**2.0**). Blog post 5.2 → **2.1**. Next wins everywhere except Lighthouse's *simulated* score, which §3 explains. |

---

## 2. How it was measured

| Measurement | Conditions | Why |
|---|---|---|
| Lighthouse, **simulated** (the PageSpeed Insights default) | Mobile (Moto G Power, 4× CPU, slow 4G, modelled), and desktop. 6 routes × 2 devices × 3 runs, on both sites: 72 runs. | Matches the score PSI shows |
| Lighthouse, **applied** (`--throttling-method=devtools`) | Mobile; 562.5 ms request latency, 1.47 Mbps, 4× CPU actually applied. 3 routes × 3 runs, on both sites. | The simulation mis-models this site (§3) |
| Puppeteer paint harness | Same applied throttling as above. LCP, FCP and CLS read from `PerformanceObserver`, excluding input-driven shifts as the field does. 5–7 runs, median. Used for A/B tests on production (CSS injected before parse, verified in-page) and before/after on local builds. | Isolates one cause at a time |
| Lighthouse user flows | Mobile, 4× CPU. A navigation, then a timespan of real taps and typing: menu, FAQ, roadmap tabs, course search, syllabus accordion, landing FAQ. | Lab INP; Lighthouse navigation mode has none |
| `curl` | 3 runs per route, from India, reading `x-vercel-cache`, `age`, `cache-control` and `x-vercel-id` | TTFB and cache state |
| Vercel CLI | Deployment inspection and build logs, runtime logs | Deployed revalidate values, function regions |

**Limits:**
- There is no field data (§1).
- The Next deployment gets no traffic, so the runtime logs contain only these tests.
- Backend log lines aren't captured in production.
- Redis hit and miss are not directly observable (§7.3).
- The Supabase region could not be determined from outside: its 401 comes from the Cloudflare edge.

---

## 3. Why Lighthouse alone would mislead here

Lighthouse's simulated mode reports **home mobile LCP 13.0 s**. With the same throttling actually applied, the page's LCP is **3.1 s**, and **2.1 s** after the §6 fix.

Simulated mode loads the page unthrottled, then *models* a slow phone. It assumes everything that finished before the observed LCP is on the LCP's critical path. Two things made the observed LCP late:
- the opacity-0 fade (§6);
- the YouTube player, which starts downloading about 1.4 s in, before that late LCP.

So the model charged about 1 MB of YouTube JavaScript to the hero text. The same effect puts the simulated FCP at 7.6 s.

After the §6 fix, the course page's simulated LCP improves (7.4 → 5.2 s), but home and the landing barely move (13.0 → 12.8 s, 7.1 → 7.2 s). So **the PageSpeed Insights score for home won't reflect the fix** until the YouTube embed is deferred (§9).

Field LCP (CrUX, what Google uses) is recorded by Chrome the same way as the applied measurements. So those are the numbers to trust.

---

## 4. Results by route (Next production, `bb939b9`)

- **LCP:** applied throttling, with the simulated value in brackets. The applied figures come from different runs:
  - production Lighthouse devtools for `/`, the landing and the blog post;
  - the production A/B, variant A, for `/courses/data-science`;
  - the local before-build harness for `/courses` and `/about`.
- **INP:** lab median. Desktop INP was not measured.
- **TTFB:** `curl` median from India, including TLS.
- **JS:** first-party (brotli, estimated) + third-party transferred.

| Route | Device | LCP | INP | CLS | TTFB | JS 1P + 3P | Main bottleneck | Measured evidence | Recommended change | Risk | Result after change |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | Mobile | **3.1 s** (sim 13.0) | 131 ms | 0.002 | 0.18 s | 224 + 292 KB (+1,092 KB YouTube) | Hero fade from opacity 0; eager YouTube player; third-party main-thread work | LCP element (H1) in `.reveal` 3/3; A/B: fade from 0.01 gives 2,032 vs 3,080 ms; YouTube 17 requests / 1,092 KB; TBT 1,089 ms (applied) | **Done:** fade starts at 1%. **P1:** YouTube click-to-load | Low / needs approval (UI) | **LCP 1.84 s** (harness, local, −1,040 ms); Lighthouse applied **2.1 s**, score 71 → 80 |
| `/` | Desktop | 1.7 s (sim) | — | 0.002 | 0.18 s | 250 + 1,148 KB | Hero image in `.reveal`; YouTube | LCP element = hero image in `.reveal` 3/3 | Covered by the fix above | Low | Not re-measured on desktop |
| `/courses` | Mobile | **3.1 s** (sim 3.4) | 59 ms (8 runs) | 0.022 | 0.10 s | 216 + 292 KB | Hero fade | LCP `p.reveal` 3/3 | **Done** | Low | **1.78 s** (−1,316 ms) |
| `/courses/data-science` | Mobile | **3.2 s** (sim 7.4) | 93 ms | 0.001 | 0.11 s | 215 + 292 KB | Hero fade | A/B: 1,896 vs 3,228 ms | **Done** | Low | **1.84 s** (−1,188 ms); Lighthouse applied 2.4 s; sim 7.4 → 5.2 s |
| `/data-science-course-ameerpet` | Mobile | **3.0 s** (sim 7.1) | 89 ms | **0.124** | 0.30 s | 213 + 292 KB | Hero fade; **web-font swap CLS** | A/B: 1,864 vs 3,068 ms; CLS source "Web font loaded: inter-latin-400" (0.122) | **Done** (LCP). **P1:** font loading (§9) | Low / medium | **LCP 1.78 s** (−1,108 ms), Lighthouse applied 2.0 s, score 79 → 92; **CLS unchanged 0.124** |
| `/about` | Mobile | **3.1 s** (harness) | — | 0.016 | 0.41 s | 210 + 292 KB | Hero image fade | LCP `img` in `.reveal` | **Done** | Low | **1.93 s** (−1,204 ms) |
| `/blog` | Mobile | (sim 6.9) | — | 0.006 | **0.54 s** | 215 + 292 KB | **Rendered on demand** in `iad1` for every request | `ƒ Dynamic`, `private, no-store`, `MISS` 3/3; TTFB 0.46–3.01 s | **P2:** cache page 1 (§9) | Medium (architecture) | Not changed |
| `/blog/category/{slug}` | Mobile | — | — | — | **1.58 s** | — | Same as `/blog` | TTFB 0.73–6.03 s, `MISS` 3/3 | **P2:** as above | Medium | Not changed |
| `/blog/{slug}` | Mobile | **2.1 s** (sim 7.5) | — | 0.016 | 0.41 s | 217 + 292 KB | Third-party JS; react-dom | TBT 318 ms applied; `gtag.js` long tasks up to 180 ms (4×) | None needed for LCP (not in `.reveal`) | — | Unaffected |
| All pages | Desktop | 0.5–1.7 s (sim) | — | ≤ 0.006 | as above | 250–266 + 292 KB | — | Scores 93–100 | — | — | — |

### Legacy production (glorytecks.com), for comparison

| Route | Mobile LCP applied (sim) | Mobile CLS applied | Desktop CLS | Mobile TBT (sim) |
|---|---|---|---|---|
| `/` | 4.5 s (3.6) | 0.000 | 0.000 | 761 ms |
| `/data-science-course-ameerpet` | 5.1 s (3.7) | **0.312** | **0.412** | 262 ms |
| `/blog/{slug}` | 5.2 s (4.1) | **0.312** | **0.412** | 520 ms |
| `/courses/data-science` | — (3.9) | — | 0.000 | **2,201 ms** |

Legacy HTML is static and served as an edge `HIT` everywhere: TTFB 0.08–0.21 s. It loads Clarity twice, once directly (`?ref=bwt`) and once through GTM. The Next build loads it once.

---

## 5. Analytics duplication (Step 6)

**Checked:** the live container at `https://www.googletagmanager.com/gtm.js?id=GTM-TD5HFZ79`, parsed on 2026-09-24:

| Container field | Value |
|---|---|
| Version | 3 |
| Tags | **1**: `__cvt_MQDKZ` (custom template), `vtp_projectId: "xfaf76p6h5"`. This is the Microsoft Clarity loader; the container references `https://www.clarity.ms/tag/`. |
| GA4 / Google tag (`G-…`) | **None**. No measurement ID anywhere in the container. |
| Other IDs (`AW-`, `UA-`, `DC-`) | None |

**Verdict:** GA4 `G-MKXRJHXL9C` is loaded **once**, by the direct `gtag.js` block in `app/layout.tsx`. There is no duplicate pageview.

**No change made.** Removing the direct `gtag.js` would remove GA4 entirely, including the `generate_lead` events that `lib/analytics.ts` sends through `window.gtag`.

`lib/seo/performance.test.ts` now asserts that the layout loads GA4 exactly once, so a future "dedupe" can't silently delete it. The *possibility* documented in `PERFORMANCE_AUDIT.md` §10 and `ANALYTICS_MEASUREMENT_PLAN.md` is now resolved.

**What it costs** (transferred, main-thread at 4× CPU):

| Script | Transfer | Raw | Main thread | Unused |
|---|---|---|---|---|
| `gtag.js` (GA4) | 178 KB | 532 KB | 323–536 ms; long tasks up to 287 ms | ~70 KB |
| `gtm.js` (loads only Clarity) | 121 KB | 343 KB | 141–204 ms | 46–66 KB |
| Clarity loader + `clarity.js` | <1 KB + script | — | small | — |

The 121 KB GTM container exists only to load Clarity, whose own loader is 744 bytes. Loading Clarity directly would save 121 KB per page. But GTM may be kept on purpose for future marketing tags, so that's **a marketing decision** (§9, P3).

---

## 6. Change made: the reveal fade no longer starts at opacity 0

**The problem:**
- The views' fade-and-rise animation (`components/ui/reveal.tsx` + `app/globals.css`) holds each `.reveal` element at `opacity: 0` until it scrolls into view, then fades it from 0 to its own opacity.
- Every hero is a `.reveal`, so every page's LCP element started at opacity 0.
- Chrome skips opacity-0 paints when it records LCP.

**Evidence** (production HTML, CSS injected before parse and verified in-page, applied slow 4G + 4× CPU, median of 5):

| Variant | Home | Landing | Course |
|---|---|---|---|
| A: current (fade from 0) | 3,080 | 3,068 | 3,228 |
| B: no reveal at all | 2,052 | 1,880 | 2,004 |
| C: first section rises without fading | 2,192 | 1,872 | 1,836 |
| **D: same fade, starting at 0.01** | **2,032** | **1,864** | **1,896** |

(LCP, ms.) A frame-by-frame probe also showed that `data-inview` is already set *before* first paint. The delay is the fade itself, not the IntersectionObserver.

**The change** (`app/globals.css`, 2 declarations):
- `html.reveal-ready .reveal:not([data-inview]) { opacity: 0.01 }` (was `0`)
- `@keyframes gt-reveal { from { opacity: max(var(--reveal-opacity, 0), 0.01) } }` (was `var(--reveal-opacity, 0)`)

**Result after change** (local production builds of the same tree, applied throttling, median of 7):

| Route | FCP before → after | LCP before → after | CLS |
|---|---|---|---|
| `/` | 1,788 → 1,844 | **2,884 → 1,844** | 0.002 → 0.002 |
| `/courses/data-science` | 1,676 → 1,844 | **3,032 → 1,844** | 0.001 → 0.001 |
| `/data-science-course-ameerpet` | 1,788 → 1,772 | **2,884 → 1,776** | 0.124 → 0.124 |
| `/courses` | 1,696 → 1,740 | **3,100 → 1,784** | 0.022 → 0.022 |
| `/about` | 1,852 → 1,812 | **3,132 → 1,928** | 0.016 → 0.016 |

FCP moves by −40 to +168 ms, inside the run-to-run spread (the per-run LCP spread was 1,580–2,284 ms after the change). Lighthouse with applied throttling on the after build: home **2.1 s** (score 80), landing **2.0 s** (92), course 2.4 s (84).

**What it does and doesn't change:**
- 1% opacity is invisible. The filmstrip at 2.5 s shows the hero mid-fade exactly as before, and the animation, stagger and timings are untouched.
- The fade still takes 0.5–0.6 s. What changes is **when Chrome records the paint**: at the start of the fade rather than after it. That's the moment users start seeing the hero, rather than when it's fully opaque.
- The change that makes the hero *fully* readable sooner is variant C (no fade on the first section). It measures almost the same, but it changes the look, so it's **not** done.
- **Risk:** low. Browsers without CSS `max()` treat the declaration as invalid, and the element simply appears without a fade. With reduced motion, or without JS, nothing is hidden, same as before.
- **Guard:** `lib/seo/performance.test.ts` fails if either value returns to 0.
- **Not deployed.** Re-measure on production after the next deploy; field data follows the domain cutover.

---

## 7. Caching, API and ISR (Step 5)

### 7.1 Edge and ISR

| Check | Finding |
|---|---|
| Static assets (`/_next/static/**`, fonts, `/_next/image`) | `public, max-age=31536000, immutable`, brotli, edge `HIT` ✅ |
| ISR pages | Served from the `bom1` edge as `HIT`, `PRERENDER` or `STALE`. **Regeneration works**: `/data-science-course-ameerpet` went from `STALE` (age 36,598 s) to `HIT` (age 66 s) after a background regeneration. |
| **Revalidate in production** | The deployed build log shows **`1d`** on every route without an explicit value. The code defaults give 10 min (`REVALIDATE_FAST=600`) and 1 h (`REVALIDATE_CONTENT=3600`), and a local build shows `10m`. So production sets `REVALIDATE_FAST` and `REVALIDATE_CONTENT` to about 86,400. Inferred: the env values can't be listed because this folder isn't linked to the Vercel project. |
| **On-demand revalidation** | `app/api/revalidate/route.ts` exists, but **nothing calls it**: no reference in `backend/src`. |
| **Consequence (freshness)** | A CMS edit to settings, courses, localities or comparisons can take up to **24 h** to reach most pages. Landings (`revalidate = 300`) and sitemaps (1 h) are the exceptions. This is a freshness risk, not a speed problem; do **not** raise the TTL further. |
| `/blog`, `/blog/category/[slug]` | `ƒ Dynamic`, because they read `searchParams` (`?page`, `?q`). Every request runs a function in **`iad1`** (US East) behind the Mumbai edge: TTFB median **0.54 s** and **1.58 s**. |
| Function region | Both Vercel projects run in **`iad1`**. Cached pages don't care, but dynamic routes and ISR regeneration pay the India ↔ US round trip. |

### 7.2 Backend API (`glorytecks-backend-one.vercel.app`, `iad1`)

| Endpoint class | `Cache-Control` | Edge cache | TTFB from India (5 runs) |
|---|---|---|---|
| "Cached" reads (`/courses`, `/categories`, `/blogs`, `/blogs/sitemap`, a single blog post) | `max-age=30, s-maxage=120, stale-while-revalidate=300` | `MISS` then `HIT` | MISS 0.32–1.06 s; HIT 0.08–0.58 s |
| "Fast" reads (`/settings`, `/localities`, `/comparisons`, `/faqs`, …) | `max-age=0, s-maxage=0, must-revalidate` | Always `MISS` | 0.30–0.75 s, every request |

Visitors never call these; the Next server does, inside `iad1`. So this latency only shows up in dynamic routes and ISR regeneration.

### 7.3 Redis

| Check | Finding |
|---|---|
| Location | Redis Cloud (`*.db.redis.io`). TCP connect from India has a median of **298 ms**, against 242 ms to AWS `us-east-1` and 17 ms to `ap-south-1`. So it's in the US East, **next to the `iad1` functions** ✅ |
| Hit / miss | **Not observable in production.** There is no `X-Cache` header, runtime logs carry no application lines, and the Next deployment has no traffic. |
| Code finding | On Vercel, `server.ts` calls `void connectRedis()` without awaiting it, and `cacheGet` returns a miss until the client emits `ready`. The first request(s) on each **cold** function instance therefore bypass Redis and go to Supabase. Recommended in §9; not changed, because it's a backend behaviour change. |
| Not-found lookups | Still never cached (known since `PERFORMANCE_AUDIT.md` §8) |

### 7.4 Sitemaps

| Sitemap | URLs | Wire size | Cache | TTFB |
|---|---|---|---|---|
| `/sitemap.xml` (index) | 7 | 789 B | HIT | 0.12–0.14 s |
| `pages`, `courses`, `categories`, `locations`, `compare`, `resources` | 9 / 9 / 13 / 15 / 10 / 5 | 250–724 B | HIT or STALE → regenerated | 0.08–0.51 s |
| `blog.xml` | 595 | 12.6 KB | HIT, `s-maxage=3600, swr=86400` | 0.16–0.19 s |

Sitemaps load fast and are generated from one backend feed. Separately, every `<loc>` still uses the dead host `glorytecks-one.vercel.app`, from the `NEXT_PUBLIC_SITE_URL` env. That's already recorded in `SEO_PRODUCTION_PARITY_REPORT.md` and must be fixed at cutover.

---

## 8. JavaScript, images, fonts (Steps 3 and 4)

### 8.1 JavaScript

| Check | Finding |
|---|---|
| First-party JS per route | 12–14 scripts, **778–830 KB raw, ~210–224 KB brotli**, nearly identical on every route |
| Largest chunks | react-dom 223 KB raw / 60 KB br; Next router 152 / 35; a 110 / 34 KB app chunk; providers 112 / 30 (React Query, Radix toast, tooltip provider, Sonner) |
| Duplicate libraries | **None** (Lighthouse `duplicated-javascript`). Legacy-JS polyfills: 14 KiB. |
| Unused first-party | Small. Lighthouse flags ~20 KB of react-dom on home; the rest of the "unused JS" is third-party (§5). |
| Unused client dependencies | `<Sonner />` (plus `next-themes`) is mounted on every page, but **nothing calls its `toast`**. The site uses the Radix toaster. `TooltipProvider` is mounted, but no `Tooltip` is used. |
| Hydration | First-party script cost at 4× CPU: home 696 ms, landing 684, `/blog` 616, course 570, blog post 949. `HomeView` is one large client component. TBT is 256 ms simulated but **1,089 ms applied**, yet INP stays good (131 ms). |
| Browser-side fetching | None on page load; layout data is fetched on the server |
| HTML / RSC payload | Every page embeds the layout's `siteData` in its RSC payload: **~75 KB of CMS JSON** (the full course catalogue, 15.6 KB of comparison objects, 14 KB of categories). The home page serializes the courses twice. HTML is 158–346 KB raw (30–49 KB br); home HTML takes about 300 ms to parse on a fast desktop. |
| Continuous animation | `animate-pulse-glow` on the hero CTA animates **`box-shadow`** forever, so the main thread repaints it every frame. The float, ticker and bounce animations use `transform`, which is cheap. |

### 8.2 Images and Cloudinary

| Check | Finding |
|---|---|
| Home images | Hero is 25 KB AVIF (`/_next/image`, `w=750`), preloaded with `srcset`/`sizes`; logo 4 KB AVIF. Width and height are set; below-fold images are lazy. Lighthouse image-delivery passes ✅ |
| Cloudinary | **No CMS image is delivered on the audited pages.** The only Cloudinary asset is the brochure PDF (1.0 MB), a Cloudflare `hit`, `immutable, max-age=2592000`, fetched only on download ✅ |
| Layout reservation | CLS from images is 0 on every route ✅ |
| **`favicon.ico`** | **96.9 KB**, a single 256×256 32-bit image, also used as the Apple touch icon, with `max-age=0`. Downloaded on every first visit. It doesn't affect LCP, but it's the largest single first-party download on every page, bigger than any JS chunk (react-dom is 60 KB br). |

### 8.3 Fonts

| Check | Finding |
|---|---|
| Delivery | Self-hosted `@fontsource`: 9 CSS imports (Inter 400–800, Plus Jakarta Sans 500–800), all `font-display: swap`, immutable ✅. Nothing blocks rendering. |
| Weight | 6–7 files per page (121–199 KB). Home also pulls `inter-latin-ext-600` (35.7 KB) and YouTube's Roboto (34 KB). |
| Timing (slow 4G) | Fonts finish at **3.3–4.6 s**, well after FCP (1.8 s). They're discovered only after the CSS and compete with about 800 KB of JS. |
| **CLS** | On the landing, the Inter 400 swap reflows the hero paragraph: **0.122** of its 0.124 CLS |

---

## 9. Recommendations awaiting approval

Nothing here has been implemented. Each item names its evidence.

| # | Priority | Change | Evidence | Risk |
|---|---|---|---|---|
| 1 | **P1** | **Wire on-demand revalidation.** The backend's mutation hook (`lib/cacheInvalidation.ts`) POSTs `{tags}` to `/api/revalidate` with `REVALIDATE_SECRET`. Until then, set `REVALIDATE_FAST` and `REVALIDATE_CONTENT` back to the code defaults. | Deployed revalidate `1d`; no caller (§7.1) | Low; env + backend |
| 2 | **P1** | **YouTube click-to-load:** show the video's thumbnail and a play button, and load the iframe on tap | 17 requests, 1,092 KB, 3.9 MB decoded per home visit; the main driver of the simulated home score (§3) | Visible detail; needs your approval |
| 3 | **P1** | **Font loading:** move to `next/font/local` with the same files and weights. That adds preload for the files actually used and a size-adjusted fallback, so the swap no longer reflows text. | Landing CLS 0.124, 0.122 of it "Web font loaded" (§8.3) | Medium; check typography on every template |
| 4 | P2 | **`/blog` and `/blog/category/*`:** serve the unparameterised first page statically (ISR) and keep `?page`/`?q` dynamic, or move pagination into path segments | Dynamic every request; TTFB 0.54 s / 1.58 s median, up to 3–6 s | Medium (routing / SEO architecture) |
| 5 | P2 | **Trim `siteData`** to the fields the header and footer use (titles, slugs, names) | ~75 KB of JSON on every page; courses serialized twice on home | Medium; audit each `useSiteData` consumer |
| 6 | P2 | **Backend:** await Redis `ready` (with a short timeout) before the first read on a cold instance; add an `X-Cache: HIT/MISS` header; negative-cache not-found lookups | §7.3 | Low; backend |
| 7 | P3 | Remove the unused `<Sonner />` toaster (and with it `next-themes`) | No `toast()` call anywhere | Low |
| 8 | P3 | Replace `favicon.ico` with a 16/32/48 multi-size ICO (≤ 15 KB) plus a 180 px `apple-touch-icon` PNG | 96.9 KB favicon | Low; same artwork |
| 9 | P3 | Rebuild `pulse-glow` on `opacity`/`transform` (for example, a pseudo-element) | `box-shadow` repaints the main thread every frame | Visible detail; needs approval |
| 10 | P3 | Clarity: keep it in GTM (121 KB) or load its 744-byte tag directly | §5 | Marketing decision |

**Not recommended:**
- Moving functions to `bom1`: the backend (`iad1`), Redis (US East) and probably Supabase would all have to move together.
- Changing the GA4 loading strategy to `lazyOnload`: it would under-count quick bounces.
- Converting any component on theory alone: nothing measured justifies it.

---

## 10. Reproducing

The scripts are in the session scratchpad (`p8/`). The key ones:
- `ttfb.sh <base> 3`
- `js.mjs <base> <routes…>`
- `lh.sh <base> <tag>`, which runs Lighthouse 13.5.0 three times per route and device
- `agg.mjs <dir>`
- `flow/reveal-ab-lh.mjs <base> 5 <paths…>`
- `flow/measure.mjs <base> <label> 7 <paths…>`
- `flow/inp.mjs <base> <label> 3`

Local builds need the backend running on :5001 (`npx tsx src/server.ts`). Use `main-website/.env` as is: its API URL must keep the `/api/v1` suffix.
