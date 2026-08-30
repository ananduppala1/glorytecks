# React.js → Next.js Migration

Framework migration of the GloryTecks main website. The goal was to change the
framework and nothing else: same design, same content, same URLs, same backend.

- **From:** React 18 · Vite 8 · React Router 6 · TanStack Query 5 · Tailwind · shadcn/ui · framer-motion
- **To:** Next.js 16 (App Router) · React 19 · same Tailwind config · same shadcn/ui primitives · same framer-motion

---

## 1. Old architecture

A client-rendered single-page app. `index.html` shipped a static `<head>` and an
empty `<div id="root">`. After the JavaScript bundle loaded and React hydrated,
each page mounted its React Query hooks, fetched its content from the Express
backend, and finally mutated `document.head` from `useSEO()` to set the real
title, description, canonical and JSON-LD.

Consequences that this migration set out to fix:

- Any crawler or social scraper that does not execute JavaScript saw the
  homepage's title and description on **every** URL.
- First contentful paint waited on: HTML → JS bundle → React → API request →
  render.
- Every page view re-fetched shared data. The header alone issued three
  requests (`courses`, `localities`, `settings`) and the footer four more.
- Unknown slugs rendered a "not found" body with **HTTP 200** — a soft 404.
- Five sitemap files (~14,000 lines) were maintained by hand and were stale.

## 2. New architecture

Server Components fetch data, build metadata and structured data, and render.
Interactive parts are isolated client components that still server-render to
HTML. Nothing about the backend, the database, Redis, Cloudinary or the admin
frontend was touched.

---

## 3. Route mapping

Every public URL is preserved. No redirects were needed.

| React Router | Next.js file | Rendering | Status |
| --- | --- | --- | --- |
| `/` | `app/(site)/page.tsx` | Static + ISR | ✅ |
| `/courses` | `app/(site)/courses/page.tsx` | Static + ISR | ✅ |
| `/courses/:slug` | `app/(site)/courses/[slug]/page.tsx` | SSG (all courses) + ISR | ✅ |
| `/contact` | `app/(site)/contact/page.tsx` | Static | ✅ |
| `/resources` | `app/(site)/resources/page.tsx` | Static | ✅ |
| `/resources/:slug` | `app/(site)/resources/[slug]/page.tsx` | SSG (5 paths) | ✅ |
| `/placements` | `app/(site)/placements/page.tsx` | Static + ISR | ✅ |
| `/entities` | `app/(site)/entities/page.tsx` | Static | ✅ |
| `/about` | `app/(site)/about/page.tsx` | Static + ISR | ✅ |
| `/blog` | `app/(site)/blog/page.tsx` | Dynamic (reads `?page`/`?q`/`?tag`/`?sort`) | ✅ |
| `/blog/category/:categorySlug` | `app/(site)/blog/category/[categorySlug]/page.tsx` | Dynamic | ✅ |
| `/blog/:slug` | `app/(site)/blog/[slug]/page.tsx` | SSG (24 latest) + on-demand ISR | ✅ |
| `/training-in-hyderabad` | `app/(site)/training-in-hyderabad/page.tsx` | Static + ISR | ✅ |
| `/thank-you` | `app/(site)/thank-you/page.tsx` | Static, `noindex` | ✅ |
| `/compare` | `app/(site)/compare/page.tsx` | Static + ISR | ✅ |
| `/compare/:slug` | `app/(site)/compare/[slug]/page.tsx` | SSG + ISR | ✅ |
| `/:landingSlug` | `app/(site)/[landingSlug]/page.tsx` | SSG (15 landings) + ISR | ✅ |
| `/brochures/:slug/download` | `app/brochures/[slug]/download/page.tsx` | Dynamic, outside chrome | ✅ |
| `*` | `app/not-found.tsx` | 404, outside chrome | ✅ |

Route-group note: `/brochures/…` and the global 404 sit outside `(site)`, which
reproduces the React app where they rendered outside `<Layout />` (no header or
footer). The static segments (`about`, `courses`, `blog`, …) take precedence over
`[landingSlug]`, matching React Router's ordering.

The `/data-science-course → /courses/data-science` permanent redirect from
`vercel.json` moved to `next.config.mjs`.

---

## 4. API mapping

All 20 read endpoints and 2 write endpoints from the React app are integrated.
None were changed, invented or bypassed.

| React usage | Backend endpoint | Method | Auth | Paginated | Next.js implementation |
| --- | --- | --- | --- | --- | --- |
| Blog listing / archive | `/public/blogs` | GET | Public | **Yes** | Server fetch from `searchParams`, `limit=6` |
| Featured strip | `/public/blogs?featured=true&limit=3` | GET | Public | Yes | Server fetch, unfiltered view only |
| Trending strip | `/public/blogs?trending=true&limit=4` | GET | Public | Yes | Server fetch, unfiltered view only |
| Popular sidebar | `/public/blogs?popular=true&limit=6` | GET | Public | Yes | Server fetch on post page |
| Latest sidebar / footer / home | `/public/blogs?limit=6` / `limit=3` | GET | Public | Yes | Server fetch |
| Blog detail | `/public/blogs/:slug?full=1` | GET | Public | No | Server fetch + `generateMetadata` |
| Related / prev / next | `/public/blogs/:slug/context` | GET | Public | No | Server fetch |
| Course listing | `/public/courses` | GET | Public | No | Server fetch |
| Course detail | `/public/courses/:slug` | GET | Public | No | Server fetch + `generateStaticParams` |
| Blog categories | `/public/categories` | GET | Public | No | Server fetch, shared via context |
| Authors | `/public/authors` | GET | Public | No | Service method retained (see §9) |
| Trainers | `/public/trainers` | GET | Public | No | Server fetch (home) |
| Testimonials | `/public/testimonials` | GET | Public | No | Server fetch (home) |
| Placements | `/public/placements` | GET | Public | No | Server fetch (placements) |
| Companies | `/public/companies` | GET | Public | No | Server fetch (home, placements) |
| Roadmaps | `/public/roadmaps` | GET | Public | No | Server fetch (home) |
| FAQs | `/public/faqs` | GET | Public | No | Server fetch (home) |
| Comparisons list | `/public/comparisons` | GET | Public | No | Server fetch, shared via context |
| Comparison detail | `/public/comparisons/:slug` | GET | Public | No | Server fetch + `generateStaticParams` |
| Localities | `/public/localities` | GET | Public | No | Server fetch, shared via context |
| Locality detail | `/public/localities/:slug` | GET | Public | No | Service method retained (see §9) |
| Batches | `/public/batches` | GET | Public | No | Server fetch (home) |
| Gallery | `/public/gallery` | GET | Public | No | Service method retained (see §9) |
| Legal docs | `/public/legal`, `/public/legal/:slug` | GET | Public | No | Service methods retained (see §9) |
| Site settings | `/public/settings` | GET | Public | No | Server fetch in root layout → context |
| About page | `/public/about` | GET | Public | No | Server fetch |
| Contact form | `/public/contact` | POST | Public | — | Client mutation (React Query) |
| Demo request | `/public/demo-requests` | POST | Public | — | Client mutation (React Query) |
| Brochure download | `/public/brochures/:courseSlug/download` | GET | Public | — | Client fetch → blob (unchanged) |

Request and response shapes, query parameter names, the `{ success, message,
data, meta }` envelope and the pagination meta fields are all byte-identical to
the React implementation. `lib/api/services.ts` retains its original mappers.

---

## 5. Authentication

**The main website has no authentication, and none was added.**

This was verified rather than assumed. The entire React source was audited for
`supabase`, `login`, `signIn`, `getSession`, `access_token`, `Authorization`
headers and credential storage. The findings:

- No `@supabase/supabase-js` dependency in `package.json`.
- No Supabase client, no auth context, no protected route wrapper.
- `lib/api/client.ts` never sent an `Authorization` header or `credentials`.
- Every endpoint used is under `/public/*`, which the backend documents as
  "read-only, only exposes published content and never requires authentication".
- The only writes are two public form POSTs, both validated and rate-limited
  server-side.

Authentication in this platform belongs to the **separate admin frontend**, which
is out of scope and untouched. Building a Supabase Auth flow into the marketing
site would have meant inventing a feature that does not exist — explicitly ruled
out by the brief. If authenticated functionality is added later, the correct
pattern is server-side sessions in HTTP-only cookies via Supabase's SSR helpers,
with the Express backend continuing to own authorisation.

No Supabase key of any kind appears in this project.

---

## 6. SEO migration

| React | Next.js |
| --- | --- |
| `useSEO()` mutating `<head>` post-hydration | `generateMetadata` / `export const metadata` |
| JSON-LD appended by `useEffect` | `<JsonLd />` in the server response |
| `CourseFAQSchema` appending to `document.head` | `<CourseFaqSchema />` server component |
| `<link rel="prev/next">` via DOM | `<PaginationLinks />` (React hoists `<link>` into `<head>`) |
| Static `index.html` schemas | `lib/schema.ts` rendered in the root layout |
| 5 hand-maintained sitemap XML files | `app/sitemap.ts` + three route handlers, live data |
| `public/robots.txt` | `app/robots.ts` |

Every tag the old hook produced is reproduced: title, description, keywords,
robots (both string variants), canonical, `og:title`, `og:description`, `og:url`,
`og:type`, `og:image`, `og:image:alt`, `og:site_name`, `og:locale`,
`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`,
`twitter:site`.

**Improvements, not redesigns:**

- All of it is now in the server response.
- `/entities` and the five `/resources/:slug` pages had no `useSEO()` call at all
  and inherited the homepage title and description. They now describe themselves,
  using their own existing on-page copy — no invented content.
- Unknown slugs return HTTP 404 rather than 200.
- Sitemap URLs are identical, so nothing submitted to Search Console breaks.

One cosmetic difference: Next normalises the homepage canonical to
`https://glorytecks.com` (no trailing slash) where the React app emitted
`https://glorytecks.com/`. These are the same resource; no action needed.

---

## 7. Performance

Measured against a mock backend serving the real API contract (47 posts, 9
courses), 77 pages prerendered.

| | React (Vite SPA) | Next.js |
| --- | --- | --- |
| Content in initial HTML | None (empty `#root`) | Full page |
| Path to first content | HTML → JS → React → API → render | HTML |
| Shared-data requests per page view | ~6 from the browser | 0 (server, deduped) |
| Backend requests for one blog page view | 3–5 from the browser | **1** (`?page=4&limit=6`) |
| Meta tags for non-JS crawlers | Generic homepage tags | Correct per page |

Other changes:

- `BlogPagination`, `Breadcrumbs`, and the entire blog article body, author
  block, related posts and sidebar are Server Components — zero client JS.
- The blog post page went from one 547-line client component to a Server
  Component plus three small islands (reading progress, TOC scroll-spy, share).
- Next's fetch cache deduplicates shared collections across the layout and every
  page in a render pass.
- Fonts remain self-hosted via `@fontsource` — no external font requests.
- `priority` is set on exactly two images (homepage hero, About hero).

---

## 8. Notable implementation decisions

**`loading.tsx` was removed from `(site)`.** A route-level loading boundary makes
Next stream the shell immediately, which flushes a `200` status before
`notFound()` can run — turning every unknown slug back into a soft 404. Correct
status codes are worth more than a spinner on routes that are mostly static.

**`BlogPagination` is a Server Component.** Once the click-interception was
removed in favour of real navigation, it had no state or handlers. This also let
it accept the `buildPageUrl` callback, which a client component would have
rejected as an unserialisable prop.

**Blog sort moved into the URL.** `?sort=popular` is now a real URL so the server
can render it. The two toggle buttons look and behave the same; the result is a
shareable, crawlable URL per sort order.

**`generateStaticParams` validates against live data.** Location landings are
only prerendered when their course *and* locality both exist in the CMS, and the
list is empty if the backend is unreachable — so a blip during deploy degrades to
on-demand rendering instead of failing the build.

**`SafeImage`.** `next/image` throws on an unconfigured remote host. Since image
URLs come from the CMS, that would turn an editor's paste into a 500. `SafeImage`
falls back to a plain `<img>` instead.

**Non-client modules for shared values.** `whatsappLink()` and the resources
catalogue were moved out of `"use client"` modules: values exported from a client
module arrive on the server as opaque references, not real objects.

**`safe()` wrapper.** Reproduces React Query's soft-failure behaviour on the
server, where an unhandled throw would 500 the whole page instead of leaving one
section empty.

---

## 9. Assumptions and known limitations

**Course filtering stays client-side.** `/public/courses` accepts no query
parameters and returns the full published catalogue in one ordered response. The
React app filtered that array in the browser and so does this. With ~9 courses
this is correct and cheap. Adding server-side course search would require a
backend change, which was out of scope. **Documented, not worked around.**

**Four service methods are unused by any page.** `fetchAuthors`,
`fetchLocality`, `fetchGallery`, `fetchLegalDocs` / `fetchLegalDoc` were already
unused in the React app — the routes that would consume them (`/gallery`,
`/privacy-policy`, `/terms`) do not exist. They are kept, typed and working, so
adding those pages is a page file away. The footer's Privacy Policy and Terms
links still point at `/contact`, exactly as they did before; changing them would
have required inventing pages.

**Blog `generateStaticParams` is capped at 24 posts.** The archive runs to
hundreds of posts and the backend caps a list request at 24. Prerendering
everything would mean dozens of build-time requests for low-traffic pages. The 24
most recent are prerendered; the rest render on first request and are then
cached. No post 404s.

**Sitemap walks the archive with a 50-page cap.** At 24 items per page that
covers 1,200 posts — comfortably above the current archive — and guarantees a
malformed `meta` response can never cause an unbounded request loop.

**Every page inherits a 60-second revalidation window** because the root layout
reads the Settings singleton, which the backend marks `must-revalidate`. This is
intentional (admin edits to the announcement bar, phone number and hero copy
appear site-wide within a minute) and tunable via `REVALIDATE_FAST`.

**The homepage FAQ block has hardcoded copy.** Those eight Q&As were inline in
the React page and are not in the CMS, so they stayed inline — and the FAQPage
schema uses the same strings, so the two cannot drift apart.

---

## 10. Dependency changes

**Added:** `next`, `react@19`, `react-dom@19`, `eslint-config-next`.

**Removed:** `react-router-dom` (replaced by App Router), `vite`,
`@vitejs/plugin-react-swc`, `lovable-tagger`, `jsdom`, `@testing-library/*`.

**Also removed — 40 unused shadcn/ui components and their exclusive dependencies.**
This was not guesswork. A transitive-reachability analysis from every non-`ui/`
source file found that exactly nine primitives are ever imported:

```
accordion · button · input · skeleton · sonner · textarea · toast · toaster · tooltip
```

The other 40 files (`calendar`, `chart`, `carousel`, `command`, `drawer`,
`sidebar`, `form`, `table`, …) were dead scaffold, referenced by nothing. Keeping
them would have meant keeping `react-day-picker@8`, `recharts`,
`embla-carousel-react`, `cmdk`, `vaul`, `input-otp`, `react-resizable-panels`,
`react-hook-form`, `@hookform/resolvers`, `zod`, `date-fns`, `recharts` and 20+
Radix packages — and `react-day-picker@8` peer-depends on React ≤18, which blocks
the React 19 upgrade Next.js 16 requires.

Nothing rendered on the site changed. Any primitive can be restored with
`npx shadcn@latest add <name>`.

---

## 11. Verification performed

A mock backend implementing the real public API contract (same paths, query
parameters, envelope and pagination meta) was used to build and serve the site,
then assert against the raw HTML with JavaScript disabled.

**76 automated checks, all passing:**

- 18 route-availability checks covering every URL in the React route table
- 6 status-code checks confirming unknown slugs return 404, not 200
- 19 SEO checks: canonical, title, OG, Twitter, `rel=prev/next`, `noindex`, and
  the presence of Organization, WebSite, Course, BlogPosting, FAQPage and
  BreadcrumbList JSON-LD in the server response
- 11 content checks confirming CMS-driven copy is in the HTML without JS
- 7 pagination and filtering checks (`Page 3 of 8`, `47 articles`, tag chip,
  server-side search, category narrowing)
- 7 sitemap and robots checks
- 6 security-header checks plus `x-powered-by` suppression
- a build-output scan for secret-like strings

Plus: `npm run build` exits 0 (77 pages generated), `npm run typecheck` exits 0,
`npm run lint` reports 0 errors, and `npm test` passes 8 unit tests.

The request log from the mock backend confirmed the two pagination requirements
directly: no blog request ever omitted `limit` or exceeded the backend's 24-item
cap, and a warm blog page view costs exactly **one** backend request.
