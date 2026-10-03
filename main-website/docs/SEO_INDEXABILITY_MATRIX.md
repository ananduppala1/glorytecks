# SEO Indexability Matrix

Every public URL pattern on `https://glorytecks.com`, what it tells crawlers,
and why.

The source of truth for the fixed pages is `lib/seo/routes.ts`. The page files,
the sitemaps and this table all read from it, and
`lib/seo/indexability.test.ts` fails the build if they disagree.

`Canonical` is the absolute URL emitted in `<link rel="canonical">`.
`—` means **no canonical tag is emitted at all**, which is deliberate: a page
that should not be indexed must not point equity at a different page.

---

## Fixed pages

| URL pattern | Index? | Follow? | Canonical | Sitemap? | Dynamic? | Reason |
| --- | :---: | :---: | --- | --- | --- | --- |
| `/` | ✅ | ✅ | `https://glorytecks.com` | `pages.xml` | Static + ISR | Primary entry point. |
| `/courses` | ✅ | ✅ | `…/courses` | `pages.xml` | Static + ISR | Course catalogue hub. |
| `/blog` | ✅ | ✅ | `…/blog` | `categories.xml` | Dynamic (reads `searchParams`) | Head of the blog archive. Listed in `categories.xml` rather than `pages.xml` because its `lastmod` is the newest post date, not a source-controlled constant. |
| `/compare` | ✅ | ✅ | `…/compare` | `pages.xml` | Static + ISR | Hub for the comparison cluster. |
| `/resources` | ✅ | ✅ | `…/resources` | `pages.xml` | Static | Hub for the resources cluster. |
| `/about` | ✅ | ✅ | `…/about` | `pages.xml` | Static + ISR | Entity / authority page. |
| `/contact` | ✅ | ✅ | `…/contact` | `pages.xml` | Static | NAP and conversion page; carries `ContactPage` schema. |
| `/placements` | ✅ | ✅ | `…/placements` | `pages.xml` | Static + ISR | Unique proof-point content. |
| `/entities` | ✅ | ✅ | `…/entities` | `pages.xml` | Static | Brand disambiguation page with its own copy. |
| `/training-in-hyderabad` | ✅ | ✅ | `…/training-in-hyderabad` | `pages.xml` | Static + ISR | Local-SEO hub with its own `LocalBusiness` schema. |
| `/thank-you` | ❌ | ✅ | `…/thank-you` | ❌ | Static | Conversion confirmation. No search value and indexing it pollutes goal tracking. `follow` is kept so its links still pass equity. Self-canonical only — it never points at another page. |

## Dynamic content routes

| URL pattern | Index? | Follow? | Canonical | Sitemap? | Dynamic? | Reason |
| --- | :---: | :---: | --- | --- | --- | --- |
| `/courses/{slug}` | ✅ | ✅ | self | `courses.xml` | SSG all courses + ISR, `dynamicParams` **on** | Money pages. Courses are published from the CMS without a redeploy, so the route stays open. `lastmod` = the course row's real `updated_at`. |
| `/blog/{slug}` | ✅ | ✅ | self | `blog.xml` | SSG 24 newest + on-demand ISR, `dynamicParams` **on** | Hundreds of posts, published without a redeploy. `lastmod` = `updated` when genuinely later than `date`, else `date`. |
| `/blog/category/{categorySlug}` | ✅ | ✅ | self | `categories.xml` | SSG all categories + ISR, `dynamicParams` **on** | Real archive content. A category added in the CMS must not 404 until the next deploy. `lastmod` = newest post in that category, falling back to the category row's `updated_at`. |
| `/compare/{slug}` | ✅ | ✅ | self | `compare.xml` | SSG all + ISR, `dynamicParams` **on** | CMS-published comparison articles. `lastmod` = the row's real `updated_at`. |
| `/resources/{slug}` (5) | ✅ | ✅ | self | `resources.xml` | SSG, `dynamicParams` **off** | Finite, code-controlled set in `config/resources.ts`. Closing the route makes an unknown slug a static 404 with no function invocation and no backend call. |
| `/{landingSlug}` (15) | ✅ | ✅ | self | `locations.xml` | SSG, `dynamicParams` **off** | Finite route table in `config/locationLandings.ts`. This is also the site's single-segment catch-all, so closing it turns every bot probe (`/wp-login.php`, `/.env`, `/xmlrpc.php`) into a static 404 with no serverless invocation — the largest crawl-cost win in this refactor. `lastmod` = the locality row's `updated_at`. A landing whose course or locality is missing from the CMS 404s and is omitted from the sitemap. |

## Paginated archives

| URL pattern | Index? | Follow? | Canonical | Sitemap? | Dynamic? | Reason |
| --- | :---: | :---: | --- | --- | --- | --- |
| `/blog?page=N` — valid `N` | ✅ | ✅ | self (`…/blog?page=N`) | ❌ | Dynamic | Page 2+ is real archive content, so it is indexable and carries `rel=prev`/`rel=next`. Kept out of the sitemap: a sitemap lists a site's canonical documents, not every paginated slice of them. Discoverable through the numbered pagination control and `rel=next`. |
| `/blog?page=1` | ✅ | ✅ | `…/blog` | ❌ | Dynamic | Normalised: page 1 is the bare archive, so the explicit form canonicalises to it and never appears in an internal link. |
| `/blog?page=N` — `N` > last page | — | — | — | ❌ | **404** | Previously an empty HTTP 200 page with a canonical claiming to be the last real page — a textbook soft 404. Now `notFound()`. |
| `/blog?page=` malformed (`0`, `-1`, `abc`, `1.5`, `01`, repeated) | — | — | — | ❌ | **404** | These never addressed anything. Silently serving page 1 would mint a second URL for it. |
| `/blog/category/{slug}?page=N` | same as `/blog?page=N` | | | ❌ | Dynamic | Identical policy, same code path (`archiveDecision`). |
| `/blog/category/{unknown}` | — | — | — | ❌ | **404** | Unknown category is a real 404, not an empty grid at HTTP 200. |
| `/blog/category/{slug}` with no posts | ❌ | ✅ | — | ❌ | Dynamic | A real category that is still empty stays a 200 (it will fill up) but is `noindex` and left out of `categories.xml`, so an empty template is never indexed as a soft 404. Only an explicit backend total of 0 triggers it. Phase 1. |

## Search, filter and sort URLs

| URL pattern | Index? | Follow? | Canonical | Sitemap? | Dynamic? | Reason |
| --- | :---: | :---: | --- | --- | --- | --- |
| `/blog?q={term}` | ❌ | ✅ | — | ❌ | Dynamic | Unbounded URL space over a re-slice of the same ~50 posts. |
| `/blog?tag={tag}` | ❌ | ✅ | — | ❌ | Dynamic | Linked from every tag chip on every post, so it is reachable deep in the site — it must be *crawlable* to be seen as `noindex`, which is why it is not blocked in robots.txt. |
| `/blog?sort=popular` | ❌ | ✅ | — | ❌ | Dynamic | A pure re-ordering of the clean archive. Near-duplicate by construction. |
| any combination, with or without `?page=` | ❌ | ✅ | — | ❌ | Dynamic | Same policy; the presence of any filter parameter is what decides. |
| `/blog/category/{slug}` with any filter | ❌ | ✅ | — | ❌ | Dynamic | Same. |

### Why no canonical on a filtered view

The obvious move is `noindex` plus a canonical to `/blog`. It is the wrong one:
Google's guidance is not to combine `noindex` with a canonical pointing at a
different URL, because the directive can be attributed to the canonical target
— i.e. it risks de-indexing `/blog` itself. `noindex, follow` with **no**
canonical keeps the duplicate out of the index, keeps the links working, and
consolidates nothing onto the wrong URL.

Any parameter not on the canonical allow-list (`utm_*`, `fbclid`, `gclid`,
anything else) is stripped by `canonicalPath()`, so `/blog?utm_source=news`
canonicalises to `https://glorytecks.com/blog` and stays indexable.

## Utility routes

| URL pattern | Index? | Follow? | Canonical | Sitemap? | Dynamic? | Reason |
| --- | :---: | :---: | --- | --- | --- | --- |
| `/brochures/{slug}/download` | ❌ | ✅ | — | ❌ | Dynamic | File hand-off, not a document — the page is a spinner that fetches the PDF from the backend's Cloudinary proxy. Nothing for a search result to show. `follow` is kept because it is linked from every course page. **Not** blocked in robots.txt: a crawler must be able to fetch it to see the directive. A slug that is not a published course is a real **404** (it used to be a 200 spinner). Phase 1. |
| `app/not-found.tsx` (global 404) | ❌ | ✅ | — | ❌ | HTTP 404 | Real 404 status. Previously carried no metadata at all, so it inherited the root layout's homepage title and `index, follow` — the head said the opposite of the status line. |
| `app/(site)/not-found.tsx` (in-chrome 404) | ❌ | ✅ | — | ❌ | HTTP 404 | Same fix. Serves unknown course / comparison / category / landing slugs. |
| `/robots.txt` | n/a | n/a | n/a | ❌ | Static | One rule block, one sitemap. Disallows `/api/` only. On any non-production origin it disallows everything, so a preview deployment cannot compete with the live site. Independently of the origin, every `*.vercel.app` host also sends `X-Robots-Tag: noindex` (`next.config.mjs`), so the production deployment's own alias is not an indexable mirror. Phase 1. |
| `/sitemap.xml` | n/a | n/a | n/a | — | ISR 1 h | The sitemap **index**, and the only sitemap URL advertised in robots.txt. |
| `/sitemaps/*.xml` (7) | n/a | n/a | n/a | children | ISR | `pages`, `courses`, `blog`, `categories`, `locations`, `resources`, `compare`. |
| `/data-science-course`, `/sitemap-index.xml`, `/blog-sitemap.xml`, `/category-sitemap.xml`, `/image-sitemap.xml` | — | — | — | ❌ | **308** | See `SEO_REDIRECT_MAP.md`. |
| `/privacy-policy`, `/terms`, `/gallery` | — | — | — | ❌ | **404** | No route in this app. **Correction (2026-09-24):** `/privacy-policy`, `/terms`, `/refund-policy`, `/cookie-policy`, `/disclaimer` and `/editorial-policy` *are* live and indexed on the legacy site currently serving glorytecks.com. How to handle them is pending a decision before cutover — see `SEO_PRODUCTION_PARITY_REPORT.md` §6 C1. |
| `/courses/Data-Science` and other case variants of a CMS slug | ✅ | ✅ | the lowercase slug | ❌ | as the route | The backend resolves slugs case-insensitively, so a variant renders the real page, and its canonical points at the lowercase URL. It is deliberately **not** redirected from the page: an ISR-rendered 308 was tried and could be cached under the canonical URL — see `lib/seo/slugs.ts`. |
| `/{anything-else}` | — | — | — | ❌ | **404** | `/{landingSlug}` has `dynamicParams = false`, so an unknown single-segment URL is a static 404 with no function invocation. |

---

## Sitemap contents

`https://glorytecks.com/sitemap.xml` is a `<sitemapindex>` listing seven
children. Every entry in every child is canonical, absolute, indexable, returns
200, and appears exactly once across the whole set.

| Sitemap | Contents | `lastmod` source |
| --- | --- | --- |
| `/sitemaps/pages.xml` | 9 fixed pages (`/`, `/courses`, `/training-in-hyderabad`, `/placements`, `/about`, `/contact`, `/compare`, `/resources`, `/entities`) | `STATIC_PAGE_REVIEWED` in `lib/seo/routes.ts` — a source-controlled constant, bumped by hand when the page copy changes |
| `/sitemaps/courses.xml` | every published course | course row `updated_at` |
| `/sitemaps/blog.xml` | every published post | `updated` when genuinely later than `date`, else `date` |
| `/sitemaps/categories.xml` | `/blog` + every category archive with at least one post | newest post date in scope; falls back to the category row's `updated_at` only when the post feed could not be read |
| `/sitemaps/locations.xml` | location landings whose course **and** locality both exist | locality row `updated_at` |
| `/sitemaps/resources.xml` | the 5 resource pages | `STATIC_PAGE_REVIEWED` |
| `/sitemaps/compare.xml` | every published comparison | comparison row `updated_at` |

**Never emitted:** `<priority>`, `<changefreq>` (Google ignores both).

**Never fabricated:** when an item has no usable date, `<lastmod>` is *omitted*
rather than filled with today. `isoDate()` returns `null` for a missing or
malformed value and there is no `new Date()` fallback anywhere in the sitemap
path — `lib/seo/sitemap.test.ts` asserts output is identical under two different
system clocks.

**Excluded by design:** noindex pages, `/thank-you`, search and filter URLs,
paginated archive pages, brochure hand-off URLs, redirect sources, invalid
slugs, and any URL carrying a query string. `sanitizeEntries()` drops anything
that slips through before the XML is written.

---

## Tests backing this table

| Guarantee | Test |
| --- | --- |
| Missing / duplicate / malformed canonical | `indexability.test.ts` → *canonicals* |
| Indexable page missing from a sitemap | `indexability.test.ts` → *sitemap membership* |
| Noindex page inside a sitemap | `indexability.test.ts` → *sitemap membership* |
| Redirect URL inside a sitemap | `indexability.test.ts` → *redirects*, `sitemap.test.ts` → *validateEntries* |
| Fabricated `lastmod` | `sitemap.test.ts` → *isoDate*, *buildUrlset*, *source-controlled constants* |
| Invalid sitemap URL (relative, query string, trailing slash, duplicate) | `sitemap.test.ts` → *validateEntries* |
| Missing title / description | `indexability.test.ts` → *metadata completeness* |
| Duplicate title / description | `indexability.test.ts` → *no duplicate titles or descriptions* |
| Staging / preview hostname leak | `canonical.test.ts` → *isValidCanonical*, `indexability.test.ts` → *never emits a staging or preview hostname* |
| Malformed canonical | `canonical.test.ts` → *normalizePath*, *isValidCanonical* |
| Unknown dynamic slug returning 200 | `indexability.test.ts` → *dynamic route protection*; verified end-to-end against a mock backend |
| Search / filter URL accidentally indexable | `archive.test.ts` → *search / filter / sort URLs are never indexable* |
| Empty 200 page for invalid pagination | `archive.test.ts` → *invalid pagination never produces an empty 200* |
| Empty category indexed | `crawl.test.ts` → *an empty archive is never an indexable 200* |
| `*.vercel.app` alias indexable | `crawl.test.ts` → **.vercel.app hosts are never indexable** (runs Next's own host matcher against the real `next.config.mjs`) |
| robots.txt blocks a URL whose noindex must be seen | `crawl.test.ts` → *robots.txt* |
| Redirect chain or temporary redirect | `crawl.test.ts` → *redirect table* (reads `next.config.mjs` itself) |
| Internal link through a merged-article redirect | `crawl.test.ts` → *blogPath* |
| Brochure soft 404 | `crawl.test.ts` → *knownSlugStatus* |
| Any of the above on a real deployment | `production.smoke.test.ts` → *URL policy* (57 probes) and *SEO_SMOKE_CRAWL* (every sitemap URL) |
