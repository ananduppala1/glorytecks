# GloryTecks — Main Website (Next.js)

The public GloryTecks marketing site. Migrated from React.js (Vite + React Router
+ React Query) to **Next.js 16 (App Router) + React 19**, keeping the UI, the
URLs and the backend contract exactly as they were.

```
Next.js Main Website  →  Express.js Backend  →  Supabase PostgreSQL
                              ↑  Redis · Cloudinary
```

The website talks **only** to the backend's public REST API. It does not connect
to Supabase directly, holds no service-role key and duplicates no backend logic.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # then set NEXT_PUBLIC_API_BASE_URL
npm run dev                    # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (also typechecks) |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Vitest unit tests |

---

## Environment variables

Nothing secret lives here. The site uses only public, unauthenticated endpoints.

| Variable | Scope | Required | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Browser + server | **Yes** | Backend base URL including `/api/v1`, no trailing slash. Public by design — the contact form, demo form and brochure link are submitted from the browser. |
| `API_BASE_URL` | Server only | No | Overrides the above for Server Components, metadata, sitemaps and robots. Use when the Next.js server can reach the backend on a private address the browser cannot. |
| `NEXT_PUBLIC_SITE_URL` | Browser + server | Recommended | Canonical origin (default `https://glorytecks.com`). Drives canonical URLs, Open Graph URLs, JSON-LD `@id`s, robots.txt and every sitemap. **Set this on staging** so a preview never advertises production URLs. |
| `NEXT_PUBLIC_IMAGE_HOSTS` | Build time | No | Extra comma-separated hosts allowed through `next/image`. `res.cloudinary.com` is always allowed. |
| `REVALIDATE_FAST` | Server only | No | Seconds before editor-facing content revalidates. Default `60`. |
| `REVALIDATE_CONTENT` | Server only | No | Seconds before blogs/courses revalidate. Default `300`. |

**Never** put a Supabase service-role key, cookie secret, Cloudinary API secret
or any database credential in this project. Anything prefixed `NEXT_PUBLIC_` is
compiled into the browser bundle.

---

## Architecture

```
app/
  layout.tsx                  root: fonts, GTM/GA, site-wide JSON-LD, providers
  providers.tsx               React Query, tooltips, toasters, site-data context
  (site)/                     everything wrapped in header + footer
    layout.tsx                skip link · Header · <main> · Footer
    page.tsx                  /
    about|contact|courses|placements|entities|resources|compare|blog/…
    [landingSlug]/            /data-science-course-ameerpet, …
    not-found.tsx             in-chrome 404
  brochures/[slug]/download/  outside the chrome, as in the React app
  not-found.tsx               global 404 (no header/footer)
  error.tsx                   route error boundary
  robots.ts · sitemap.ts · *-sitemap.xml/route.ts

components/
  site/                       Header, Footer, Logo, DemoModal, floating CTAs
  blog/                       cards, cover, content renderer, archive, pagination
  views/                      page bodies extracted from the React pages
  seo/                        JsonLd, PaginationLinks, CourseFaqSchema
  ui/                         shadcn/ui primitives (see MIGRATION.md)
  common/states.tsx           loading / error / empty states
  SafeImage.tsx               next/image with a plain-<img> fallback

lib/
  api/client.ts               HTTP client, envelope handling, cache policy
  api/services.ts             one typed method per backend resource
  seo.ts                      Metadata builders (replaces the useSEO hook)
  schema.ts                   site-wide JSON-LD
  site-data.ts                server loaders + graceful-degradation wrapper
  sitemap-data.ts             sitemap helpers
  images.ts · contact.ts · courseNav.ts · analytics.ts · youtube.ts · blog/

config/                       route tables that are not CMS content
types/content.ts              domain types mirroring the backend responses
```

### Server / client split

Pages are Server Components. They fetch, build metadata and JSON-LD, then render
either plain server markup or a `"use client"` view component that receives the
data as props. Client components still render to HTML on the server, so the
content is in the initial response either way — the directive only controls
whether the component also hydrates.

Client boundaries exist for genuine interactivity: the header menus, the demo
modal, the floating CTAs, the contact form, the blog search box, the reading
progress bar and the table-of-contents scroll-spy. `BlogPagination`,
`Breadcrumbs` and the whole blog article body are Server Components and ship no
JavaScript at all.

---

## API integration

Everything goes through `lib/api/services.ts`, which returns the website's
domain types (`types/content.ts`) rather than raw API documents. `lib/api/client.ts`
owns the base URL, the `{ success, message, data, meta }` envelope, query-string
building, error mapping and the Next.js cache policy.

Complete endpoint mapping: **`docs/MIGRATION.md`**.

Failures degrade rather than crash. `safe()` in `lib/site-data.ts` wraps every
non-essential read so a backend blip leaves a section empty instead of taking
the page down — the same behaviour React Query gave the old site. Reads that
*define* a page (a blog post, a course) are not wrapped: a 404 from the backend
becomes a real HTTP 404, and anything else surfaces through `app/error.tsx`.

---

## Pagination, search and filtering

All server-side, all delegated to the backend.

- The blog archive requests **one page of six posts** per view:
  `GET /public/blogs?page=N&limit=6&sort=-date`.
- Category, tag and search filters become backend query parameters; the browser
  never downloads the archive to filter it.
- `page`, `q`, `tag` and `sort` live in the URL, so every filter combination is
  shareable and crawlable, and the back button steps through pages.
- The backend caps a public list request at 24 items. Nothing here asks for more,
  including the sitemap generator, which walks the archive at that cap with a
  50-page safety valve.

`/public/courses` takes no query parameters — it returns the full published
catalogue in one ordered response. Course search and category filtering therefore
stay client-side over that array, exactly as in the React app. This is a backend
capability limit, not an oversight; see `docs/MIGRATION.md`.

---

## SEO

The React app set its meta tags from a `useEffect` **after** hydration, so
crawlers and social scrapers that don't run JavaScript saw only the generic tags
baked into `index.html`. Every one of those tags is now emitted server-side.

- `lib/seo.ts` reproduces the old `useSEO()` hook tag-for-tag through the
  Metadata API: title, description, keywords, robots, canonical, Open Graph,
  Twitter card.
- `components/seo/JsonLd.tsx` renders page schema and `BreadcrumbList` into the
  server response. `<` is escaped so CMS content cannot break out of the script.
- `rel="prev"` / `rel="next"` are real `<link>` elements on paginated archives.
- Structured data: Organization, LocalBusiness, WebSite, FAQPage (site-wide);
  Course, BlogPosting, CollectionPage, ItemList, AboutPage, ContactPage and
  BreadcrumbList per page. FAQ schema is only emitted where matching visible
  content exists.
- Sitemaps are generated from live backend data at `/sitemap.xml`,
  `/blog-sitemap.xml`, `/category-sitemap.xml`, `/image-sitemap.xml` and
  `/sitemap-index.xml` — the same paths the static files used.
- Unknown slugs now return **HTTP 404** instead of a 200 with a "not found" body.

---

## Caching

Two layers, deliberately aligned with the backend's own tiers.

| Tier | Endpoints | Default |
| --- | --- | --- |
| `REVALIDATE.FAST` | settings, about, batches, testimonials, placements, faqs, localities, trainers, companies, legal, roadmaps, comparisons, gallery | 60 s |
| `REVALIDATE.CONTENT` | blogs, courses, categories, authors | 300 s |

These mirror the backend's `Cache-Control` tiers: it marks editor-facing
endpoints `must-revalidate` because admins expect saves to appear immediately,
and edge-caches the high-volume content briefly. Redis sits in front of the
database and is purged on every admin mutation, so a revalidation is cheap.

Because the root layout reads the Settings singleton (FAST tier), **every page
inherits a 60-second revalidation window**. That is intentional: it is what makes
an admin's edit to the phone number, announcement bar or hero copy appear across
the whole site within a minute. Raise `REVALIDATE_FAST` if you would rather trade
freshness for fewer origin requests.

No `force-static`, no infinite cache, nothing that can strand production content.

### On-demand invalidation

If the admin backend is ever given an outbound webhook, add a route handler that
calls `revalidateTag()` and pass `tags` through `lib/api/client.ts` (already
plumbed). Until then the time-based windows above are the conservative choice.

---

## Images

Cloudinary remains the image store and its URLs are used unchanged. No images
were migrated or re-hosted.

`SafeImage` optimises through `next/image` when the host is in the allow-list and
falls back to a plain `<img>` otherwise, so an editor pasting a URL from a new
host degrades to an unoptimised image instead of a 500. Add hosts with
`NEXT_PUBLIC_IMAGE_HOSTS`.

Only the two above-the-fold images (homepage hero, About hero) use `priority`.
Blog body images stay as lazy `<img>` because their URLs are arbitrary CMS input.

---

## Security

- Headers ported verbatim from the React app's `vercel.json`: CSP, HSTS,
  `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`. `connect-src` additionally allows the configured backend
  origin. `x-powered-by` is suppressed.
- No secrets in the client bundle — verified by a build-output scan.
- No authentication: the main website consumes only public endpoints. See
  `docs/MIGRATION.md` for the audit behind that statement.
- JSON-LD is escaped; no `dangerouslySetInnerHTML` is used on CMS content
  anywhere else. The blog body renders through a typed block renderer, never raw
  HTML.
- The contact form keeps its honeypot field; the backend still validates and
  rate-limits every submission.
- CORS is unchanged. The frontend simply uses the configured backend URL.

---

## Deployment

Works on any Node 20.9+ host (Vercel, Netlify, Railway, a container).

```bash
npm ci
npm run build
npm run start
```

Set `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_SITE_URL` in the host's
dashboard. `vercel.json` is no longer needed — headers, redirects and rewrites
all live in `next.config.mjs`.

If the backend is unreachable during a build, the build still succeeds: static
generation is skipped for the affected routes and they render on demand once the
backend recovers. A deploy-time blip degrades to slower first requests rather
than a failed release.

---

## Troubleshooting

**Everything renders but content is empty.** `NEXT_PUBLIC_API_BASE_URL` is wrong
or the backend is down. Check the server logs for `[site-data] … failed` lines.

**Images 500 in production.** A CMS image host is not in the allow-list. Add it
to `NEXT_PUBLIC_IMAGE_HOSTS` and redeploy. (`SafeImage` should prevent this — if
you see it, an unwrapped `next/image` slipped in.)

**Admin edits are not appearing.** Wait for the revalidation window (60 s for
settings/about, 5 min for blogs/courses), then hard-refresh. If it persists, the
backend's Redis cache was not invalidated on save — that is a backend concern.

**Canonical URLs point at localhost.** `NEXT_PUBLIC_SITE_URL` is unset on that
environment.

**A page 404s that should exist.** Confirm the record's `status` is `published`
in the admin. Draft and archived content is excluded by the public API.

**Build fails on a missing type.** Run `npm run typecheck` for the full list; the
build only reports the first failure.
