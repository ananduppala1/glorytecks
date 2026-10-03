# SEO Redirect Map

Every redirect this site serves, with the evidence for it. Implemented in
`next.config.mjs` → `redirects()`; asserted by `lib/seo/indexability.test.ts`.

`permanent: true` in Next emits **HTTP 308**, which preserves link equity
exactly as a 301 does and additionally preserves the request method. Both are
permanent redirects and Google treats them identically.

---

## Active redirects

| OLD URL | NEW URL | STATUS | REASON |
| --- | --- | --- | --- |
| `/data-science-course` | `/courses/data-science` | 308 | Legacy URL from the pre-React static site. Documented in `docs/MIGRATION.md` §3 as carried over from the React app's `vercel.json`; already present in `next.config.mjs` before this refactor and retained unchanged. Exact topical equivalent. |
| `/sitemap-index.xml` | `/sitemap.xml` | 308 | Sitemap architecture consolidated to one authoritative index. `docs/MIGRATION.md` §6 records that the React app's sitemap URLs were preserved specifically because they are already submitted to Search Console, so this URL is live and polled. `/sitemap.xml` is now the sitemap index, making it the exact functional successor. |
| `/blog-sitemap.xml` | `/sitemaps/blog.xml` | 308 | Same URL set, same purpose, new location under the sitemap index. |
| `/category-sitemap.xml` | `/sitemaps/categories.xml` | 308 | Same URL set (blog archive head + every category archive), new location. |
| `/image-sitemap.xml` | `/sitemaps/blog.xml` | 308 | **Closest surviving equivalent, not an exact one.** The image sitemap listed every `/blog/{slug}` URL a second time in order to attach `/blog-assets/{categorySlug}-cover.svg` to it. Those covers are not on the pages: `components/blog/BlogCover.tsx` renders a deterministic **inline** `<svg>` and never requests that file. The sitemap therefore advertised images that do not exist on the URLs it listed, and duplicated every blog URL across two sitemaps. It is not replaced; the blog sitemap carries the same URL set without the phantom images. |

---

## Why there are no other redirects

The brief asks for every known old public URL. These are all of them that the
repository actually supports. The search covered:

| Source | Finding |
| --- | --- |
| `main-website/docs/MIGRATION.md` §3 | The React Router → App Router route table, all 19 routes. States explicitly: **"Every public URL is preserved. No redirects were needed."** |
| `main-website/docs/MIGRATION.md` §3 | Names `/data-science-course` as the one legacy redirect inherited from `vercel.json`. |
| `main-website/docs/MIGRATION.md` §6 | Confirms the five sitemap paths were deliberately preserved because they are submitted to Search Console. |
| `backend/docs/MIGRATION.md` | A MongoDB→Supabase and JWT→Supabase-Auth migration. §6 confirms "all route paths and HTTP methods" unchanged. No public URL moved. |
| `admin-frontend/vercel.json` | One SPA rewrite (`/(.*)` → `/index.html`) for a different deployment. No redirects. |
| `backend/vercel.json` | One catch-all route to the Express entry point. No redirects. |
| Repository-wide search for `glorytecks.com` | No archived sitemap, no old `public/robots.txt`, no `_redirects`, no legacy route table, no Netlify or Apache config. |

**No old URL was invented.** Anything not evidenced above is absent from this
map on purpose.

---

## Deliberately NOT redirected

| URL | Decision | Reason |
| --- | --- | --- |
| `/privacy-policy`, `/terms`, `/refund-policy`, `/cookie-policy`, `/disclaimer`, `/editorial-policy` | 404 (no route) | The backend publishes all six at `/public/legal/{slug}` and `lib/api/services.ts` has working `fetchLegalDoc` methods, but **no frontend route has ever existed** for them — `docs/MIGRATION.md` §9 records this, and the footer's "Privacy Policy" / "Terms of Service" links point at `/contact`. Nothing in the repository shows these URLs were ever live, so redirecting them would invent a migration that did not happen, and creating the pages would be new functionality outside this brief's scope. Flagged as a content gap in `SEO_PHASE_1_AUDIT.md` §11.3. |
| `/gallery` | 404 (no route) | Same: a working `fetchGallery` service method with no page, and no evidence the URL existed. |
| `/brochures/*.pdf` (9 static PDFs in `public/brochures/`) | Left in place, no redirect | Nothing in the application links to them; the live flow is `/brochures/{slug}/download`, which streams from Cloudinary through the backend. There is no evidence they were ever linked, so there is no equity to preserve and no target to preserve it to. Deleting them would break any external link that does exist. Recorded as a watch item in `SEO_PHASE_1_AUDIT.md` §11.4. |
| Unknown course / blog post / comparison / category / resource / landing slugs | 404 | A bulk redirect of unknown slugs to a hub page is a soft-404 pattern: it tells Google a missing page is a live one and dilutes the hub. Every unknown slug returns a real HTTP 404 with `noindex, follow` and **no canonical**. |
| Filtered archive URLs (`/blog?q=`, `?tag=`, `?sort=`) | 200, `noindex, follow` | They must stay crawlable for the directive to be seen. Redirecting them would break a working feature. See `SEO_INDEXABILITY_MATRIX.md`. |
| Out-of-range pagination (`/blog?page=999999`) | 404 | A redirect to the last valid page would be a plausible alternative, but 404 is the honest answer — the URL never addressed anything — and it avoids an unbounded redirect surface where every invalid number generates a hop. Enforced by `archiveDecision()` and covered by `lib/seo/archive.test.ts`. |

---

## Invariants enforced by tests

`lib/seo/indexability.test.ts` asserts, against the list above:

- No redirect source is also a live static route.
- No redirect source collides with a resource slug or a location-landing slug.

`lib/seo/sitemap.test.ts` asserts that no sitemap entry carries a query string,
duplicates another entry, or fails canonical validation — which is what keeps a
redirect source out of a sitemap.

When you add a redirect to `next.config.mjs`, add its source to
`REDIRECT_SOURCES` in `lib/seo/indexability.test.ts` in the same commit.
