# SEO Phase 1 — Technical Audit (pre-refactor state)

**Scope:** `main-website/` (Next.js 16 App Router). The Express backend and the
admin frontend were read to trace data sources, caching and crawl cost, but they
serve no public HTML and are not part of the indexable surface.

**Production origin:** `https://glorytecks.com`

**Date of audit:** 2026-09-22

**Method:** every file under `main-website/`, `backend/` and `admin-frontend/`
was read, including `main-website/docs/MIGRATION.md`, `backend/docs/MIGRATION.md`
and both READMEs. Routes were traced from the filesystem router, not from
filenames: metadata builders, canonical construction, `generateStaticParams`,
`notFound()`, `searchParams` handling, redirect config, every `fetch` a public
page issues, and every internal `<Link>`.

This document describes the state **before** the refactor. The changes made in
response to it are recorded in `SEO_INDEXABILITY_MATRIX.md` and
`SEO_REDIRECT_MAP.md`.

---

## 1. Current SEO architecture

| Concern | Where it lives | Notes |
| --- | --- | --- |
| Per-page meta tags | `lib/seo.ts` → `buildMetadata()` | One helper, called from each page's `metadata` / `generateMetadata`. Reproduces the React app's `useSEO()` hook tag-for-tag. |
| Site-wide defaults | `app/layout.tsx` | `metadataBase`, default title/description/keywords, robots, OG, Twitter, icons, plus ~18 legacy `<meta>` tags carried from the old `index.html`. Also sets `alternates: { canonical: '/' }` site-wide. |
| Origin resolution | `lib/seo.ts` → `SITE_URL` | `process.env.NEXT_PUBLIC_SITE_URL || 'https://glorytecks.com'`, trailing slashes stripped. **No validation** of the value's shape. |
| Absolute URLs | `lib/seo.ts` → `absoluteUrl()` | String concatenation, no path normalisation. |
| Canonical | `buildMetadata({ canonical })` | Each page passes a hand-written site-relative string. There is no shared normaliser, so nothing guarantees a canonical matches the sitemap URL for the same page. |
| Pagination canonical | `lib/seo.ts` → `paginationSeo()` | Builds `/blog?page=N` plus `prevUrl`/`nextUrl`. |
| `rel=prev` / `rel=next` | `components/seo/JsonLd.tsx` → `<PaginationLinks />` | Real `<link>` elements hoisted into `<head>` by React. |
| Structured data | `lib/schema.ts` + `components/seo/JsonLd.tsx` + `components/seo/CourseFaqSchema.tsx` | Organization, LocalBusiness, WebSite, FAQPage site-wide; Course, BlogPosting, CollectionPage, ItemList, AboutPage, ContactPage, BreadcrumbList per page. |
| robots.txt | `app/robots.ts` | 4 rule blocks, 21 named user-agents, 5 sitemap URLs, `host`. |
| Sitemaps | `app/sitemap.ts` + 4 route handlers + `lib/sitemap-data.ts` | `/sitemap.xml`, `/sitemap-index.xml`, `/blog-sitemap.xml`, `/category-sitemap.xml`, `/image-sitemap.xml`. |
| Redirects | `next.config.mjs` → `redirects()` | Exactly one entry. |
| Headers | `next.config.mjs` → `headers()` | CSP + security headers on `/:path*`; 30-day immutable cache on `/brochures/:path*`. |

### Data flow for a public page

Server Component → `lib/api/services.ts` → `lib/api/client.ts` → Express
`/api/v1/public/*` → Redis (`cacheWrap`) → Supabase PostgREST. Non page-defining
reads are wrapped in `safe()` (`lib/site-data.ts`), which swallows the error and
returns an empty fallback. Page-defining reads (a course, a post, a comparison)
are not wrapped, so a missing document surfaces as a 404 and a backend outage
surfaces as a 500.

Next-level caching: `REVALIDATE.FAST` = 60 s, `REVALIDATE.CONTENT` = 300 s, set
per service method. Sitemaps declare `revalidate = 3600`.

---

## 2. All indexable routes (as currently emitted)

| URL | Source | Robots directive emitted |
| --- | --- | --- |
| `/` | `app/(site)/page.tsx` | index, follow |
| `/courses` | `app/(site)/courses/page.tsx` | index, follow |
| `/courses/{slug}` | `app/(site)/courses/[slug]/page.tsx` | index, follow |
| `/blog` | `app/(site)/blog/page.tsx` | index, follow |
| `/blog/{slug}` | `app/(site)/blog/[slug]/page.tsx` | index, follow |
| `/blog/category/{categorySlug}` | `app/(site)/blog/category/[categorySlug]/page.tsx` | index, follow |
| `/compare` | `app/(site)/compare/page.tsx` | index, follow |
| `/compare/{slug}` | `app/(site)/compare/[slug]/page.tsx` | index, follow |
| `/resources` | `app/(site)/resources/page.tsx` | index, follow |
| `/resources/{slug}` (5) | `app/(site)/resources/[slug]/page.tsx` | index, follow |
| `/about` | `app/(site)/about/page.tsx` | index, follow |
| `/contact` | `app/(site)/contact/page.tsx` | index, follow |
| `/placements` | `app/(site)/placements/page.tsx` | index, follow |
| `/entities` | `app/(site)/entities/page.tsx` | index, follow |
| `/training-in-hyderabad` | `app/(site)/training-in-hyderabad/page.tsx` | index, follow |
| `/{landingSlug}` (15) | `app/(site)/[landingSlug]/page.tsx` | index, follow |

**Landing slugs** are generated in `config/locationLandings.ts` from six
course × locality combos:

```
data-science-course-{ameerpet|kukatpally|madhapur|gachibowli|hitech-city|dilsukhnagar}
python-course-{ameerpet|kukatpally}
power-bi-course-{ameerpet|kukatpally}
generative-ai-course-{ameerpet|madhapur}
data-analytics-course-{ameerpet|kukatpally}
mlops-course-ameerpet
```

**Resource slugs** (`config/resources.ts`): `lms`, `glory-ai`,
`interview-questions`, `course-material`, `video-lectures`.

**Blog category slugs** (backend seed `sitedata/meta.ts`, 12): `data-science`,
`generative-ai`, `python`, `data-analytics`, `power-bi`, `mlops`,
`data-engineering`, `gcp`, `azure-data-factory`, `aws`, `career-guidance`,
`interview-questions`.

Also emitting `index, follow` but **not** a page a human would ask for:
every `?q=`/`?tag=`/`?sort=` combination of `/blog` and
`/blog/category/{slug}` — see §4.

---

## 3. All dynamic routes

| Route | `generateStaticParams` | `dynamicParams` | Backend calls on an unknown slug |
| --- | --- | --- | --- |
| `/courses/[slug]` | all published courses (`/public/courses`) | default `true` | `GET /public/courses/{slug}` in `generateMetadata` **and** again in the page body, plus `/public/courses` and `/public/settings` |
| `/blog/[slug]` | 24 most recent posts only | default `true` | `GET /public/blogs/{slug}?full=1` twice (metadata + body) plus 5 more collection reads |
| `/blog/category/[categorySlug]` | all categories | default `true` | `/public/categories` ×2 and `/public/blogs?…` ×2 |
| `/compare/[slug]` | all published comparisons | default `true` | `/public/comparisons/{slug}` ×2 plus `/public/comparisons` |
| `/resources/[slug]` | 5 in-repo slugs | default `true` | none — pure config |
| `/[landingSlug]` | in-repo combos **filtered against live CMS data**; returns `[]` if the backend is unreachable | default `true` | none — `findLanding()` resolves from config and `notFound()`s first |
| `/brochures/[slug]/download` | none | default `true` | none server-side; the browser fetches the backend proxy |

Two structural problems fall out of this table and are expanded in §12/§13.

---

## 4. All query-parameter routes

Only two route files read `searchParams`: `app/(site)/blog/page.tsx` and
`app/(site)/blog/category/[categorySlug]/page.tsx`. Both delegate to
`parseArchiveParams()` in `components/blog/BlogArchive.tsx`.

| Parameter | Accepted values | Effect | Current indexability |
| --- | --- | --- | --- |
| `page` | any string; `parseInt` ≥ 1 wins, anything else falls back to `1` | server-side pagination, 6 per page | **indexable** |
| `q` | free text | server-side search across title / excerpt / category / tags | **indexable** |
| `tag` | free text | case-insensitive exact tag match | **indexable** |
| `sort` | `popular` (anything else → `latest`) | changes ordering only | **indexable** |

URL builders that emit these: `buildArchiveUrl()` and `sortUrl()` /
`clearTagUrl()` in `BlogArchive.tsx`, and `buildUrl()` in `BlogToolbar.tsx`.
Internal links that emit them: `/blog?tag={tag}` from every tag chip on every
blog post (`app/(site)/blog/[slug]/page.tsx`), and the Latest/Popular sort
toggle on both archives.

`lib/schema.ts` → `websiteSchema()` also declares a `SearchAction` targeting
`/courses?q={search_term_string}` — but `/courses` does not read `searchParams`
at all (course filtering is client-side, documented in `MIGRATION.md` §9), so
that template points at a URL that ignores the parameter.

No other route reads a query parameter, so any `?utm_*` or arbitrary parameter
on any other page renders identical content under a different URL.

---

## 5. All current sitemap routes

### `/sitemap.xml` — `app/sitemap.ts`

9 static pages, 5 resource pages, all courses, all comparisons, and the
CMS-validated location landings. **Every entry carries
`lastModified: new Date()`**, plus `changeFrequency` and `priority`.

### `/sitemap-index.xml` — `app/sitemap-index.xml/route.ts`

A `<sitemapindex>` listing `/sitemap.xml`, `/blog-sitemap.xml`,
`/category-sitemap.xml`, `/image-sitemap.xml`. `<lastmod>` is
`isoDate()` with no argument → today's date, regenerated hourly.

### `/blog-sitemap.xml` — `app/blog-sitemap.xml/route.ts`

Every published post (`fetchAllBlogPosts()` walks the archive at the backend's
24-item cap, 50-page ceiling). `<lastmod>` = `p.updated || p.date` — the only
genuinely real date in the whole sitemap set. Carries `changefreq`, `priority`
and an `<image:image>` pointing at `/blog-assets/{categorySlug}-cover.svg`.

### `/category-sitemap.xml` — `app/category-sitemap.xml/route.ts`

`/blog` plus every `/blog/category/{slug}`. `<lastmod>` = today for all.

### `/image-sitemap.xml` — `app/image-sitemap.xml/route.ts`

Re-lists every `/blog/{slug}` URL a second time, purely to attach the same
category cover SVG.

### Cross-cutting problems

1. **`lastmod` is fabricated on 4 of 5 sitemaps.** `new Date()` /
   `isoDate()` re-stamps every URL on every hourly revalidation, which tells
   Google the entire site changed an hour ago, every hour. This is the single
   most damaging signal in the current setup.
2. **`priority` and `changefreq` are ignored by Google** and are noise.
3. **`/blog/{slug}` appears in two sitemaps** (`blog-sitemap.xml` and
   `image-sitemap.xml`).
4. **The image sitemap advertises images that are not on the page.**
   `components/blog/BlogCover.tsx` renders a **deterministic inline `<svg>`** —
   it never loads `/blog-assets/{categorySlug}-cover.svg`. The files exist in
   `public/blog-assets/` (12, one per category) but nothing on a blog post links
   to one. Listing them violates the image-sitemap contract.
5. **`/sitemap-index.xml` and `/sitemap.xml` are siblings, not parent/child.**
   `robots.ts` advertises all five as top-level sitemaps, so `/sitemap.xml` is
   submitted both directly and as a child of the index.
6. **Resource slugs are hardcoded in `app/sitemap.ts`** as a second copy of
   `config/resources.ts`, free to drift.

---

## 6. All robots rules

`app/robots.ts` emits:

```
User-agent: *              Allow: /   Disallow: /api/   Crawl-delay: 1
User-agent: Googlebot      Allow: /                     Crawl-delay: 0
User-agent: Bingbot        Allow: /                     Crawl-delay: 1
User-agent: <21 agents>    Allow: /
Sitemap: {SITE_URL}/sitemap.xml
Sitemap: {SITE_URL}/sitemap-index.xml
Sitemap: {SITE_URL}/blog-sitemap.xml
Sitemap: {SITE_URL}/category-sitemap.xml
Sitemap: {SITE_URL}/image-sitemap.xml
Host: {SITE_URL}
```

The 21 named agents are `Googlebot-Image`, `Googlebot-Video`, `Twitterbot`,
`facebookexternalhit`, `LinkedInBot`, `WhatsApp`, `GPTBot`, `ChatGPT-User`,
`CCBot`, `anthropic-ai`, `Claude-Web`, `Google-Extended`, `GoogleOther`,
`Applebot`, `Applebot-Extended`, `Amazonbot`, `meta-externalagent`,
`Bytespider`, `cohere-ai`, `PerplexityBot`, `Perplexity-User`.

**Findings**

- Every one of those 21 blocks says `Allow: /`, which is the default. They add
  84 lines of surface area and change nothing.
- `Crawl-delay: 1` on `User-agent: *` is ignored by Googlebot and throttles the
  crawlers that do honour it — on a Vercel Hobby plan that is not obviously
  wrong, but it is applied indiscriminately.
- `Crawl-delay: 0` under `Googlebot` is meaningless (Google ignores the
  directive entirely) and exists only to neutralise the previous line.
- A named `Googlebot` block **overrides** the `*` block for Googlebot, which
  silently drops `Disallow: /api/` for Google. The rule was intended to be
  universal.
- Five sitemaps are advertised where one index should be.
- `Host:` is a non-standard directive only Yandex ever honoured.
- **No staging guard.** A preview deployment with `NEXT_PUBLIC_SITE_URL` unset
  falls back to the production origin and publishes `Allow: /` plus production
  sitemap URLs from a `*.vercel.app` host.

---

## 7. All canonical rules

Canonicals are hand-written per page. Collected:

| Page | Canonical passed | Absolute form emitted |
| --- | --- | --- |
| `/` | `'/'` | `https://glorytecks.com/` |
| `/about`, `/contact`, `/courses`, `/placements`, `/entities`, `/resources`, `/compare`, `/training-in-hyderabad`, `/thank-you` | literal path | `https://glorytecks.com{path}` |
| `/courses/{slug}` | `/courses/${course.slug}` | resolved |
| `/compare/{slug}` | `/compare/${cmp.slug}` | resolved |
| `/resources/{slug}` | `/resources/${slug}` | resolved |
| `/blog/{slug}` | `/blog/${post.slug}` | resolved |
| `/blog` | `paginationSeo('/blog', page, totalPages).canonical` | `/blog` or `/blog?page=N` |
| `/blog/category/{slug}` | same helper with the category base path | `/blog/category/{slug}` or `…?page=N` |
| `/{landingSlug}` | `/${landing.slug}` | resolved |
| `/brochures/{slug}/download` | **none** | — |
| Root layout default | `'/'` | `https://glorytecks.com/` |

**Findings**

1. **Not-found branches canonicalise to unrelated pages.** Five
   `generateMetadata` implementations return a canonical pointing somewhere
   else when the document is missing:
   - unknown course → `canonical: '/courses'`
   - unknown comparison → `canonical: '/compare'`
   - unknown blog post → `canonical: '/blog'`
   - unknown category → `canonical: '/blog'`
   - unknown resource → `canonical: '/resources'`

   These are 404 responses, so the tag is mostly academic — but it is exactly
   the "canonicalise an unrelated page to hide it" pattern, and if any of these
   ever returned 200 it would actively consolidate a 404 into a real page.
   The `/{landingSlug}` CMS-missing branch does the same with `/courses`.

2. **The root layout sets a site-wide default canonical of `/`.** Any page that
   ships metadata without an `alternates` key inherits `https://glorytecks.com/`.
   Nothing does today, but it is a latent whole-site-canonicalises-to-home bug.

3. **No normalisation anywhere.** `absoluteUrl()` concatenates. A canonical of
   `/courses/` or `//courses` or `/Courses` would be emitted verbatim. Nothing
   asserts that a canonical matches the sitemap entry for the same page.

4. **`?q=` / `?tag=` / `?sort=` are dropped from the blog canonical** (only
   `page` survives via `paginationSeo`), which is the right *canonical* target —
   but the pages are simultaneously `index, follow`, so the search-result page
   is offered for indexing while pointing at `/blog`. Conflicting signals; see
   §10.

5. **Query strings outside the blog are not normalised at all.** `/courses?x=1`
   canonicalises to `/courses`, which happens to be correct because the
   canonical is a hardcoded literal — not because anything normalised it.

---

## 8. All noindex pages

| URL | Mechanism | Correct? |
| --- | --- | --- |
| `/thank-you` | `buildMetadata({ noindex: true })` → `index:false, follow:false` | Should be `noindex, **follow**` — there is no reason to drop link equity from a conversion page. |
| `/brochures/{slug}/download` | inline `robots: { index:false, follow:false }` | Same. Also linked from every course page, so its links matter. |
| `app/not-found.tsx` (global 404) | `buildMetadata({ noindex: true })` | Fine; the 404 status already governs. |
| unknown course / comparison / post / category / resource / landing | `noindex` on the not-found metadata branch | Fine, but paired with a foreign canonical (§7.1). |

`app/(site)/not-found.tsx` (the in-chrome 404) exports **no metadata at all**,
so it inherits the root layout's title, description and `index, follow` robots
directive. It still returns HTTP 404, so this is not a live indexing bug, but a
404 body advertising `index, follow` is wrong on its face.

**`buildMetadata` offers only `noindex → index:false, follow:false`.** There is
no way to express `noindex, follow`, which is the directive this site actually
needs for filtered archives.

---

## 9. Possible soft-404 cases

1. **Out-of-range blog pagination — confirmed soft 404.**
   `/blog?page=999999` → `parseArchiveParams` keeps `page = 999999` → the
   backend returns an empty page → `currentPage = Math.min(999999, totalPages)`
   clamps the *displayed* number, but `posts` is empty. The page renders
   "No articles found" with **HTTP 200**, a `Blog` JSON-LD document, and a
   canonical of `/blog?page={totalPages}` — i.e. an empty page claiming to be
   the last real page. Same for `/blog/category/{slug}?page=999999`.

2. **Malformed pagination.** `?page=abc`, `?page=0`, `?page=-5`, `?page=1.5` all
   silently become page 1 and return 200 at a distinct URL — duplicate content
   rather than a soft 404, but the same root cause.

3. **Zero-result search / tag pages.** `/blog?q=asdfghjkl` returns 200 with an
   empty grid and an `index, follow` directive. Unbounded in number.

4. **Backend outage on an archive.** `fetchArchivePage` is wrapped in `safe()`,
   so a 500 from the API renders `<ErrorState />` with HTTP 200. Correct choice
   for availability (a 404 would de-index the archive during an outage) but it
   is a soft 404 by definition and should be understood as a deliberate
   trade-off, not an oversight.

5. **`/brochures/{slug}/download` for an unknown slug.** The page always renders
   the "Preparing brochure…" spinner with HTTP 200; the slug is only validated
   by the backend after hydration, and on failure the client redirects to
   `/courses`. Mitigated by `noindex`.

6. **Not a soft 404 (verified):** unknown course, comparison, blog post, blog
   category, resource and landing slugs all call `notFound()` and return a real
   HTTP 404. `MIGRATION.md` §8 records that `loading.tsx` was deliberately
   removed from `(site)` to stop Next flushing a 200 before `notFound()` could
   run. That fix is intact.

---

## 10. Duplicate / near-duplicate URL risks

| Risk | Detail |
| --- | --- |
| **Blog filter combinatorics** | `q × tag × sort × page` are all indexable and all crawlable. With 12 categories, hundreds of tags and two sort orders, the crawlable set is effectively unbounded while the content is a re-slice of ~50 posts. Highest-severity issue in this audit. |
| **`?sort=popular` is a pure re-order** | `/blog` and `/blog?sort=popular` page 1 contain the same posts in a different order. Both indexable. Same for every category archive. |
| **Tag chips multiply it** | Every blog post links `/blog?tag={tag}` for each of its tags, so the filtered space is reachable from deep inside the site with real internal links, not just from the toolbar. |
| **Arbitrary parameters on non-blog pages** | `/courses?utm_source=x` renders identical HTML at a new URL. The hardcoded canonical saves it; nothing else does. |
| **`/blog/{slug}` in two sitemaps** | `blog-sitemap.xml` + `image-sitemap.xml`. |
| **`/sitemap.xml` submitted twice** | directly in `robots.txt` and as a child of `/sitemap-index.xml`. |
| **Course ↔ location landing overlap** | `/courses/data-science` and `/data-science-course-ameerpet` describe the same programme. The landings do carry genuinely localised copy (locality intro, nearby landmarks, locality-specific FAQs built in `buildFaqs()`), so this is thin-content *risk*, not confirmed duplication — but it is the axis to watch if landings are ever expanded past the curated 15. |
| **Trailing-slash and case variants** | Next normalises trailing slashes by default (`trailingSlash` is not set), so `/courses/` 308s to `/courses`. Case variants (`/Courses`) 404. Both fine — noted so the refactor does not regress them. |
| **Home canonical form** | `absoluteUrl('/')` emits `https://glorytecks.com/` **with** a trailing slash, while `app/sitemap.ts` lists `${SITE_URL}/` — these agree. `MIGRATION.md` §6 claims Next normalises it to no slash; that claim is about `metadataBase` resolution and does not apply when an absolute string is passed. Verified: they match. |

---

## 11. Old static → new dynamic URL risks

Evidence in the repository about the previous application:

- `main-website/docs/MIGRATION.md` §3 — the React Router → App Router route
  table. It states plainly: **"Every public URL is preserved. No redirects were
  needed."** All 19 routes map 1:1.
- `main-website/docs/MIGRATION.md` §3 — *"The `/data-science-course →
  /courses/data-science` permanent redirect from `vercel.json` moved to
  `next.config.mjs`."* This is the **only** legacy URL the repository documents.
- `main-website/docs/MIGRATION.md` §6 — *"Sitemap URLs are identical, so nothing
  submitted to Search Console breaks."* The five sitemap paths are therefore
  **live, already-submitted URLs**, not internal implementation detail.
- `lib/sitemap-data.ts` header — the React app shipped five hand-maintained XML
  files in `/public` totalling ~14,000 lines, all stamped `2026-06-24`.
- `app/robots.ts` header — the React app shipped a static `/public/robots.txt`
  whose rules were ported verbatim.
- `backend/docs/MIGRATION.md` — a database/auth migration only. No URL changes.
  Confirms `/public/brochures/:courseSlug/download` still streams PDFs through
  the backend domain.

**Risks**

1. **Changing the sitemap architecture breaks four already-submitted URLs.**
   `/sitemap-index.xml`, `/blog-sitemap.xml`, `/category-sitemap.xml` and
   `/image-sitemap.xml` are in Search Console. Deleting them produces 404s on
   URLs Google polls. They must be redirected, not removed.
2. **No other old URL is evidenced anywhere in the repository.** There is no
   archived `public/sitemap.xml`, no legacy route table, no `_redirects`, no
   Netlify config, and `admin-frontend/vercel.json` contains only an SPA
   rewrite. Inventing redirect sources beyond `/data-science-course` would be
   guesswork, so none were invented.
3. **`/privacy-policy`, `/terms` and `/gallery` do not exist as routes**, yet the
   backend publishes `/public/legal/privacy-policy`, `/terms`, `/refund-policy`,
   `/cookie-policy`, `/disclaimer`, `/editorial-policy` and a gallery
   collection. `MIGRATION.md` §9 records this: the service methods exist and are
   unused because the pages were never built, and the footer's "Privacy Policy"
   and "Terms of Service" links point at `/contact`. Whether those URLs ever
   existed in the old static app is **not evidenced** in the repository, so no
   redirect is asserted for them. Flagged as a content gap, not a migration
   regression.
4. **`public/brochures/*.pdf` (9 files) are reachable but orphaned.** Nothing in
   the application links to `/brochures/data-science.pdf` et al; the product flow
   goes through `/brochures/{slug}/download`, which streams from Cloudinary via
   the backend. If those paths were ever linked in the old app they are indexable
   PDFs competing with the course pages. No evidence either way, so they are left
   in place and recorded as a watch item.

---

## 12. Vercel usage risks (Hobby plan)

| Risk | Mechanism | Severity |
| --- | --- | --- |
| **Unknown slug → function invocation + 2 backend round trips** | `/courses/[slug]`, `/blog/[slug]` and `/compare/[slug]` all run `generateMetadata` *and* the page body, each calling the detail endpoint separately, before `notFound()`. A crawler walking a bad link list costs two upstream requests per URL. | High |
| **Unknown single-segment URL → function invocation** | `/[landingSlug]` has `dynamicParams` on, so `/wp-login.php`, `/.env`, `/xmlrpc.php` and every other bot probe invokes a serverless function. It 404s without touching the backend (`findLanding()` is pure config), but the invocation is still billed. | High (volume) |
| **Unbounded filtered-archive crawl** | Every `?q=`/`?tag=`/`?sort=` combination is a **dynamic** render (`searchParams` opts the route out of static generation) that issues 2–4 backend requests. Indexable and internally linked, so crawlers will enumerate it. | High |
| **`fetchAllBlogPosts()` runs three times per sitemap cycle** | `blog-sitemap.xml` and `image-sitemap.xml` each walk the entire archive at 24 posts/page. Next's fetch cache dedupes within a render pass, not across two separate route handlers. At 50 pages that is up to 100 backend requests per hour for two files listing the same URLs. | Medium |
| **Hourly sitemap regeneration with fabricated `lastmod`** | Cheap in itself, but it re-advertises every URL as freshly modified every hour, which invites re-crawling of the entire site hourly. | Medium |
| **Root layout fetches on every dynamic render** | `getSiteData()` issues six reads. Deduped per render and cached for 60 s, but every filtered-archive URL is a fresh dynamic render. | Medium |
| **Blog archive issues a duplicate list query** | `generateMetadata` and the page body both call `fetchArchivePage`. Next's fetch cache dedupes them inside one render pass, so this is 1 request, not 2 — verified against `lib/api/client.ts` cache options. Not a defect; recorded so it is not "fixed" into a regression. | None |

---

## 13. Supabase / API crawl risks

- **The public site holds no Supabase credential of any kind.** Verified:
  `main-website/package.json` has no `@supabase/*` dependency, `lib/api/client.ts`
  never sends `Authorization` or `credentials`, and `.env.example` documents that
  only the backend base URL and the site URL are exposed. `backend/docs/MIGRATION.md`
  §4 confirms RLS is enabled on all 21 tables with no policies and the anon grants
  revoked, so a leaked anon key yields zero rows.
- **`Disallow: /api/` in robots.txt matches nothing on this origin.** The backend
  is a separate deployment; the website never proxies it. Harmless, retained as
  defence in depth.
- **Crawlers reach Postgres on every bad slug.** `cacheWrap()` stores the fetched
  value but `cacheGet()` treats `null` as a miss, so a *not-found* document is
  never cached. Every distinct bogus slug that passes the backend's `SLUG_RE`
  validator is a fresh PostgREST query. Bounded by `publicWriteLimiter` only for
  writes — public GETs are exempted from the general limiter in `app.ts`. This is
  the main reason unknown slugs must fail as cheaply and as early as possible.
- **The backend's own rate limiting will not save a crawl.** Only
  `/public/brochures/:courseSlug/download` (`publicDownloadLimiter`) and the two
  POST endpoints are limited.
- **No API URL is ever emitted into indexable HTML.** `brochureDownloadUrl()`
  builds a backend URL, but it is only used inside a client-side `fetch`, never
  as an `href`. The user-visible link is `/brochures/{slug}/download` on this
  origin. Confirmed — the Cloudinary origin never appears in a crawlable link
  either.
- **Backend `Cache-Control` tiers are correctly mirrored** by `REVALIDATE.FAST` /
  `REVALIDATE.CONTENT`. No change needed.

---

## 14. Summary of defects to fix

| # | Defect | Section |
| --- | --- | --- |
| 1 | `lastmod` fabricated with `new Date()` on 4 of 5 sitemaps | §5 |
| 2 | `priority` / `changefreq` emitted (ignored by Google) | §5 |
| 3 | `/blog/{slug}` listed in two sitemaps | §5 |
| 4 | Image sitemap lists images that are not on the page | §5 |
| 5 | Five top-level sitemaps instead of one index | §5, §6 |
| 6 | Resource slugs duplicated between `app/sitemap.ts` and `config/resources.ts` | §5 |
| 7 | 21 redundant user-agent blocks; `Crawl-delay` noise; `Googlebot` block silently drops `Disallow: /api/` | §6 |
| 8 | No staging guard in robots.txt | §6 |
| 9 | Not-found metadata canonicalises 404s to unrelated live pages (×6) | §7 |
| 10 | Root layout sets a site-wide default canonical of `/` | §7 |
| 11 | No canonical normalisation, no shared utility, no guarantee canonical == sitemap URL | §7 |
| 12 | `noindex` always implies `nofollow`; `noindex, follow` is not expressible | §8 |
| 13 | In-chrome 404 inherits `index, follow` and the homepage title | §8 |
| 14 | Out-of-range pagination returns an empty HTTP 200 page (soft 404) | §9 |
| 15 | Malformed `?page=` values silently render page 1 at a distinct URL | §9 |
| 16 | Search / tag / sort URLs are indexable and unbounded | §4, §10 |
| 17 | `WebSite` `SearchAction` targets `/courses?q=`, which ignores the parameter | §4 |
| 18 | Blog post `og:image` is an SVG (`/blog-assets/*.svg`), which most social scrapers refuse to render | §5 |
| 19 | Unknown slugs cost a function invocation plus two uncached PostgREST queries | §12, §13 |
| 20 | Changing sitemap paths would 404 four URLs already in Search Console | §11 |

Nothing in this list requires a UI change, a business-logic change, or a new
page. Fixes are recorded in `SEO_INDEXABILITY_MATRIX.md` and
`SEO_REDIRECT_MAP.md`.
