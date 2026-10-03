# SEO Production Parity Report

**Question.** Is https://glorytecks.com serving the metadata that this repository generates?

**Answer.** No, on all 18 audited URLs. The cause is not a stale build, a CDN cache or a metadata bug. **glorytecks.com is attached to a different Vercel project, and that project serves the legacy Vite/React SPA** (the code in `website-main.zip`). The Next.js app in `main-website/` is deployed, but only on `*.vercel.app` hosts. That deployment is also built with the wrong `NEXT_PUBLIC_SITE_URL`, so it cannot take over the domain as it stands.

| | |
| --- | --- |
| Audit date | 2026-09-24 (responses captured 2026-09-23, 20:29–20:50 UTC) |
| Production | `https://glorytecks.com` |
| Source audited | `main-website/` at `1987ba3` (`fix/scroll-reveal-animations`: `main` @ `596a65d` plus one animation-only commit that touches no metadata) |
| Next.js deployment | Vercel project `glorytecks`, team `gloryteksystems-3457`, root `main-website`. Latest production deployment `dpl_5vgZoEtBVxQaN3n5VWhYdSnAcfX6`, created 2026-09-23 23:43 IST. Aliases: `glorytecks-psi.vercel.app`, `glorytecks-gloryteksystems-3457.vercel.app`, `glorytecks-git-main-gloryteksystems-3457.vercel.app`. Its HTML carries `1987ba3`'s reveal script, so it was built from this branch's HEAD. |
| Method | Raw HTML fetched with a Googlebot user agent and no JavaScript execution, the same view a non-rendering crawler gets. The same extractor ran on both hosts. Vercel facts come from the Vercel CLI (read-only commands). |

"Expected" throughout means what the repository generates. It was taken from the live Next.js deployment and rewritten from its wrong host to `https://glorytecks.com`. The static routes were cross-checked against a local `next build && next start` with `NEXT_PUBLIC_SITE_URL=https://glorytecks.com`.

---

## 1. Root cause

### 1.1 glorytecks.com is served by the legacy SPA

| Probe | glorytecks.com | Next.js deployment | What the repo does |
| --- | --- | --- | --- |
| Page shell (all 18 URLs) | `<script type="module" src="/assets/index-D-cfcD01.js">`, zero `/_next/` references | `/_next/static/…` chunks | Next.js App Router |
| `Content-Security-Policy` | Byte-identical to `website-main/vercel.json` (`connect-src … https://api.web3forms.com`, `form-action 'self' https://api.web3forms.com`) | From `next.config.mjs` (backend origins, `form-action 'self'`) | `next.config.mjs` |
| `X-Nextjs-Prerender` / `X-Matched-Path` | absent | present | — |
| `/sitemaps/pages.xml` | 200 `text/html` (the SPA's `index.html`) | 200 XML | route handler |
| `/sitemap-index.xml` | 200, legacy `<sitemapindex>` | 308 → `/sitemap.xml` | `next.config.mjs` redirect |
| `/api/revalidate` | 200 `text/html` | 405 | route handler |
| `/blog/aws-interview-questions-for-data-engineers-2` | 200 | 308 → merged article | `next.config.mjs` redirect |
| Unknown URL | 200 (soft 404) | 404 | `notFound()` |
| `robots.txt` | Legacy 24-agent file listing 5 sitemaps | one `*` block (see 1.3) | `app/robots.ts` |

The legacy bundle hash (`index-D-cfcD01.js`) is the same on every page. That includes responses marked `X-Vercel-Cache: MISS`, which the origin generated at request time (`/courses/agentic-ai` and `/blog`, `Last-Modified: Wed, 23 Sep 2026 20:30:44 GMT`, `Age: 0`). **The origin itself is the legacy deployment**, so purging the CDN would change nothing.

### 1.2 The Next.js project has no custom domain

- `vercel project ls`: team `gloryteksystems-3457` has three projects: `glorytecks` (this app), `glorytecks-backend` and `admin-frontend`.
- `vercel domains ls`: **0 domains** on that team.
- `vercel domains inspect glorytecks.com`: *"You don't have access to the domain glorytecks.com under gloryteksystems-3457."*

The domain is held by another Vercel account, and the headers above identify that project's build as the `website-main` codebase. **Confirmed by the site owner on 2026-09-24:** glorytecks.com is still connected to the static website in the other Vercel account.

### 1.3 `NEXT_PUBLIC_SITE_URL` on the Next.js project points at a dead host

Every absolute URL the Next.js deployment emits uses `https://glorytecks-one.vercel.app`: canonical, `og:url`, `og:image`, every JSON-LD `@id` and every sitemap `<loc>`. That host returns **`404 DEPLOYMENT_NOT_FOUND`**. The value is the project's `NEXT_PUBLIC_SITE_URL` (encrypted in the dashboard, but it's the only input to `lib/seo/canonical.ts`). It's a valid origin, so `resolveSiteOrigin()` accepts it, correctly flags it as non-production, and `app/robots.ts` then serves:

```
User-Agent: *
Disallow: /
```

The same code with the correct value is fine. A local `next build && next start` with `NEXT_PUBLIC_SITE_URL=https://glorytecks.com` emits canonicals on `https://glorytecks.com`, `robots.txt` as `Allow: /` with `Sitemap: https://glorytecks.com/sitemap.xml`, and registry titles on every static route.

> **If the domain were moved to the Next.js project today,** glorytecks.com would serve `Disallow: /` site-wide, with every canonical pointing at a host that 404s. The env var must be fixed and the project redeployed *before* the domain moves.

Environment variables on project `glorytecks` (`vercel env ls`, names only):

| Name | Environments | Created |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Production, Preview | 5 days ago |
| `NEXT_PUBLIC_API_BASE_URL` | Production, Preview | 2 days ago |
| `REVALIDATE_FAST` | Production, Preview | 2 days ago |
| `REVALIDATE_CONTENT` | Production, Preview | 2 days ago |

---

## 2. Suspect checklist

| Suspect | Finding |
| --- | --- |
| **Vercel deployment/version** | **Cause.** glorytecks.com resolves to a legacy Vite deployment in another Vercel account. The Next.js project's latest production deployment is healthy but only on `*.vercel.app` aliases. |
| **Stale build** | Not the cause. A stale *Next.js* build would still ship `/_next/` assets. The legacy SPA serves identical bundles on cache HIT and cache MISS. |
| **CDN cache** | Not the cause. `MISS` responses serve the same legacy HTML. Cached `Age` reaches 964 961 s (≈ 11 days, `Last-Modified: Sat, 12 Sep 2026`), which only shows the legacy deployment has not changed since then. |
| **Environment variables** | **Cause of the second defect.** `NEXT_PUBLIC_SITE_URL` is wrong (§1.3). `NEXT_PUBLIC_API_BASE_URL` resolves to `https://glorytecks-backend-one.vercel.app` (visible in the deployment's CSP `connect-src`), and CMS content renders, so it is fine. |
| **`NEXT_PUBLIC_SITE_URL`** | Vercel project: `https://glorytecks-one.vercel.app` (dead host). Local `.env`: `https://glorytecks.com` (correct). Must be `https://glorytecks.com` on Production. It is inlined at build time, so a redeploy is required. |
| **`API_BASE_URL`** | Not set on Vercel, so the server falls back to `NEXT_PUBLIC_API_BASE_URL`. Correct. Local `.env` points at `http://localhost:5001/api/v1`; no local backend was running, which only affects local builds. |
| **`metadataBase`** | `new URL(SITE_URL)` in `app/layout.tsx`, so it inherits whatever `NEXT_PUBLIC_SITE_URL` is. It's correct once the env var is. Every canonical is already absolute via `canonicalUrl()`, so nothing depends on `metadataBase` resolution. |
| **Root metadata inheritance** | Correct. No audited page shows the root default title. The root layout sets no canonical (deliberately), and `buildMetadata()` always emits `alternates`, so no page inherits a canonical. Page-level `openGraph`/`twitter` fully replace the root objects. |
| **Route-level metadata** | Correct. All 7 registry routes emit the registry title and description verbatim. All 11 CMS routes match their page templates. The smoke test passes 18/18 pages against the deployment's own origin (§8). |
| **CMS H1 vs metadata** | Content question, not a technical fault. The homepage H1 comes from CMS `settings.heroSection` ("Launch Your Tech Career with Hyderabad's Best Training"), while the title comes from the route registry. See §6, S3. |
| **Old deployment serving homepage HTML** | **Yes, and not only on the homepage.** The legacy deployment serves all 18 URLs and every other path. |

---

## 3. Homepage, field by field

| # | Field | Expected (repository) | Production (glorytecks.com) | Match |
| --- | --- | --- | --- | --- |
| 1 | HTTP status | 200 | 200 | ✓ |
| 2 | Final URL | `https://glorytecks.com` (no redirect) | `https://glorytecks.com/` (no redirect) | ✓ |
| 3 | `<title>` | GloryTecks — IT Training Institute in Ameerpet, Hyderabad | Best IT Training Institute in Hyderabad \| GloryTecks | ✗ |
| 4 | Meta description | GloryTecks runs classroom and live online IT courses in Ameerpet, Hyderabad — Data Science, Generative AI, Python, Power BI, MLOps and Data Engineering — taught by working practitioners, with placement support and free demo classes. | GloryTecks is an IT training institute in Ameerpet, Hyderabad offering career-focused Data Science, AI, Python, Power BI and SQL courses with real-time projects. | ✗ |
| 5 | Canonical | `https://glorytecks.com` | `https://glorytecks.com/` | ≈ same resource. The repo standardises on the bare origin because that is what Next renders (`lib/seo/canonical.ts`). |
| 6 | Robots meta | `index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1` | Same directives, plus `googlebot` and `bingbot` `index, follow` | ✓ equivalent. The per-agent tags were removed in the repo on purpose. |
| 7 | `og:title` | = title | GloryTecks — Best IT Training Institute in Hyderabad | ✗ |
| 8 | `og:description` | = description | Career-focused IT training in Ameerpet, Hyderabad — Data Science, Generative AI, Agentic AI, Python, Power BI, MLOps, Data Engineering and SQL Server. | ✗ |
| 9 | `og:url` | `https://glorytecks.com` | `https://glorytecks.com/` | ≈ |
| 10 | `og:image` | `https://glorytecks.com/og-image.jpg` (alt = title, no dimensions) | Same URL, `1200×630`, different alt | ✓ URL |
| 11 | Twitter | `summary_large_image`; title and description = page's; image = og-image; `site @glorytecks`; no `creator` | `summary_large_image`; title "GloryTecks — Best IT Training Institute in Hyderabad"; description "…MLOps courses with 100% placement. Best IT training in Ameerpet Hyderabad."; `creator @glorytecks` | ✗ |
| 12 | H1 | From CMS: "Launch Your Tech Career with Hyderabad's Best Training". The code fallback is "…with Training in Hyderabad". | Best IT Training Institute in Hyderabad | ✗ |
| 13 | JSON-LD | EducationalOrganization, WebSite, WebPage, LocalBusiness, FAQPage, BreadcrumbList | EducationalOrganization, LocalBusiness+EducationalOrganization, WebSite (+SearchAction), BreadcrumbList, FAQPage | ✗ |
| 14 | Breadcrumb | 1 Home → `https://glorytecks.com` | 1 Home → `https://glorytecks.com/` | ≈ |
| 15 | Page schema | WebPage `https://glorytecks.com#webpage`; FAQPage `…/#faq` with the 8 questions in `HOME_FAQS` | FAQPage with 7 questions, including "100% placement assistance … 500+ hiring partners" | ✗ |
| 16 | Internal links (server HTML, unique) | 51 | 26 (prerender snapshot) | ✗ |
| 17 | Sitemap | `/sitemaps/pages.xml` | `/sitemap.xml` (legacy flat urlset) | ✓ listed on both |
| 18 | Indexable | Yes, once the env var is fixed. Today the Next.js deployment is `Disallow: /`. | Yes | — |

Production also carries `meta keywords`, `hreflang` `en-in` and `x-default`, and the 1990s-era metas (`revisit-after`, `classification`, …). The repo removed all of these deliberately; the reasons are in the comments in `app/layout.tsx` and `lib/seo/index.ts`.

---

## 4. All 18 URLs

### 4.1 Matrix

Every row: HTTP 200 on both sides, no redirects, and the robots meta is `index, follow` on both.

| URL | Title | Desc. | Canonical / og:url | OG / Twitter | H1 | Page schema | Breadcrumb | Links (prod → exp.) | Sitemap | Indexable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | ✗ | ✗ | ≈ trailing `/` | ✗ | ✗ | ✗ | ≈ | 26 → 51 | ✓ both | ✓ both |
| `/courses` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ none → CollectionPage | ✓ | 26 → 51 | ✓ both | ✓ both |
| `/training-in-hyderabad` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ label | 26 → 51 | ✓ both | ✓ both |
| `/courses/data-science` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ no FAQPage¹ | ✗ label | 23 → 55 | ✓ both | ✓ both |
| `/courses/python-programming` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ no FAQPage¹ | ✗ label | 22 → 55 | ✓ both | ✓ both |
| `/courses/power-bi` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ no FAQPage¹ | ✗ label | 22 → 56 | ✓ both | ✓ both |
| `/courses/data-analytics` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ no FAQPage¹ | ✗ label | 22 → 56 | ✓ both | ✓ both |
| `/courses/data-engineering` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ no FAQPage¹ | ✗ label | 22 → 56 | ✓ both | ✓ both |
| `/courses/gen-ai` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ no FAQPage¹ | ✗ label | 22 → 55 | ✓ both | ✓ both |
| `/courses/agentic-ai` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ no FAQPage¹ | ✗ label | 22 → 52 | ✓ both | ✓ both |
| `/courses/mlops` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ no FAQPage¹ | ✗ label | 22 → 56 | ✓ both | ✓ both |
| `/courses/sql-server` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ no FAQPage¹ | ✗ label | 22 → 52 | ✓ both | ✓ both |
| `/blog` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ none → Blog | ✓ | 629 → 73 | ✓ both | ✓ both |
| `/blog/category/data-science` | ✓ | ✗ | ✓ | desc. only | ✓ | ≈ ItemList dropped | ✓ | 67 → 71 | ✓ both | ✓ both |
| `/blog/category/generative-ai` | ✓ | ✗ | ✓ | desc. only | ✓ | ≈ ItemList dropped | ✓ | 67 → 71 | ✓ both | ✓ both |
| `/placements` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ none → WebPage | ✓ | 17 → 51 | ✓ both | ✓ both |
| `/about` | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ none → AboutPage | ✓ | 26 → 51 | ✓ both | ✓ both |
| `/contact` | ✗ | ✗ | ✓ | ✗ | ✓ | ✗ none → ContactPage | ✓ | 17 → 51 | ✓ both | ✓ both |

**Mismatch:** 18 of 18 URLs differ in at least one of title, description or H1.
**Likely cause (all rows):** §1.1, the legacy deployment serves the domain.
**Fix (all rows):** §7, required steps 1–6. No per-URL code change is needed.

¹ This is working as designed, not a regression. The legacy site emitted five *hardcoded* course FAQ questions. The repo emits FAQPage only from the course's own CMS `faqs` (`components/seo/CourseFaqSchema.tsx`), and the backend currently returns `faqs: []` for these courses. Course FAQ markup appears automatically once FAQs are added in the admin.

### 4.2 Differences common to all 18 URLs

- **Build.** Legacy Vite SPA with prerendered heads, versus Next.js server rendering.
- **`og:title`, `og:description`, `twitter:title`, `twitter:description`.** Both sides mirror the page's own title and description on every URL except the production homepage (§3, rows 7, 8 and 11). These columns therefore differ wherever the title or description differs.
- **`og:image`.** `https://glorytecks.com/og-image.jpg` on all 18 on both sides. The course pages would use the CMS `bannerImage`, but it is empty for all nine.
- **Twitter.** Production adds `twitter:creator` and `twitter:image:alt`. The repo emits `twitter:site` only.
- **Production-only tags.** `meta keywords`, `hreflang`, `googlebot` and `bingbot`. All were removed in the repo on purpose.
- **Site-wide JSON-LD.** Production emits a LocalBusiness node on every page. The repo emits it only on `/` and `/training-in-hyderabad`, the pages that show the address (see the comment in `app/layout.tsx`).
- **`geo.position`.** Production `17.4375;78.4463`; repo `17.436332501389888;78.44224537686785` (from `config/business.ts`). This is business data, so it is recorded here and not changed.
- **Internal links.** The repo's server HTML carries the full header and footer navigation (51+ unique links per page), against 17–26 in the legacy prerender. The exception is `/blog`: the legacy prerender linked all 595 posts from one page, while the repo paginates, and posts stay reachable through category archives and `/sitemaps/blog.xml`.

### 4.3 Titles

| URL | Expected | Production |
| --- | --- | --- |
| `/courses` | IT Courses in Hyderabad \| GloryTecks | IT Training Courses in Hyderabad \| GloryTecks |
| `/training-in-hyderabad` | IT Training in Ameerpet, Hyderabad — GloryTecks Centre | IT Training Institute in Hyderabad \| GloryTecks |
| `/courses/{slug}` (×9) | `{Course} Course in Hyderabad \| GloryTecks`, e.g. "Data Science Course in Hyderabad \| GloryTecks" | `{Course} Training in Hyderabad \| GloryTecks`, e.g. "Data Science Training in Hyderabad \| GloryTecks". The Python page reads "Python Training…" on production and "Python Programming Course…" in the repo. |
| `/blog` | Blog — Data Science, AI and Cloud Career Guides \| GloryTecks | Blog \| Data Science, AI & Python Guides \| GloryTecks |
| `/blog/category/data-science` | Data Science Blogs & Tutorials (50+ Guides) \| GloryTecks Hyderabad | *identical* |
| `/blog/category/generative-ai` | Generative AI Blogs & Tutorials (50+ Guides) \| GloryTecks Hyderabad | *identical* |
| `/placements` | Placement Support at GloryTecks | Placement Support \| GloryTecks Hyderabad |
| `/about` | About GloryTecks | About GloryTecks \| IT Training Institute in Hyderabad |
| `/contact` | Contact GloryTecks — Ameerpet, Hyderabad | Contact GloryTecks \| IT Training Institute Ameerpet |

### 4.4 Meta descriptions

| URL | Expected | Production |
| --- | --- | --- |
| `/courses` | Every course GloryTecks offers, in one place: Data Science, Generative AI, Agentic AI, MLOps, Python, Power BI, Data Analytics, Data Engineering and SQL Server. Compare duration, modules, tools and batch formats. | Browse all IT training courses at GloryTecks Hyderabad — Data Science, Generative AI, Agentic AI, Data Engineering, Python, Power BI, SQL Server and MLOps. |
| `/training-in-hyderabad` | Visit the GloryTecks training centre in Ameerpet, a short walk from Ameerpet Metro Station. Classroom and weekend batches, opening hours, directions and the courses taught on site. | GloryTecks is an IT training institute in Hyderabad offering Data Science, Generative AI, Python, Power BI, SQL and Data Engineering courses, online and in class. |
| `/courses/data-science` | From data to decisions A 6 Months Data Science course in Hyderabad covering 14 modules and tools including Python, Jupyter Notebook, Google Colab, NumPy, Pandas, taught in classroom and live online batches with placement support. | Data Science training in Hyderabad at GloryTecks, Ameerpet. Learn Python, SQL, statistics, machine learning and data visualisation through real-time projects. |
| `/courses/python-programming` | Master Python end-to-end A 4 Months Python Programming course in Hyderabad covering 18 modules and tools including Python, Visual Studio Code, PyCharm, Jupyter Notebook, Google Colab, … | Python training in Hyderabad at GloryTecks, Ameerpet. Learn Python from fundamentals to OOP, file handling, libraries and automation with guided practice. |
| `/courses/power-bi` | Build interactive BI dashboards A 2 Months Power BI course in Hyderabad covering 10 modules and tools including Microsoft Power BI, Microsoft Excel, MySQL, … | Power BI training in Hyderabad at GloryTecks, Ameerpet. Learn Power Query, data modelling, DAX and dashboard design by building real business reports. |
| `/courses/data-analytics` | Insights that drive growth A 4 Months Data Analytics course in Hyderabad covering 9 modules and tools including Microsoft Excel, MySQL, … | Data Analytics training in Hyderabad at GloryTecks, Ameerpet. Master Excel, SQL, Power BI and Python analytics with hands-on dashboards and reporting projects. |
| `/courses/data-engineering` | Build robust data pipelines A 3 Months Data Engineering course in Hyderabad covering 14 modules and tools including Python, Jupyter Notebook, … | Data Engineering training in Hyderabad at GloryTecks, Ameerpet. Build ETL and ELT pipelines with SQL, Python, Azure Data Factory, Databricks and Synapse. |
| `/courses/gen-ai` | Build LLM-powered apps A 5 Months Generative AI course in Hyderabad covering 12 modules and tools including Python, … OpenAI API, Hugging Face, … | Generative AI training in Hyderabad at GloryTecks, Ameerpet. Learn LLMs, prompt engineering, embeddings, RAG and LangChain by building deployable AI apps. |
| `/courses/agentic-ai` | Build autonomous AI agents A 5 Months Agentic AI course in Hyderabad covering 11 modules and tools including Python, … | Agentic AI training in Hyderabad at GloryTecks, Ameerpet. Build autonomous AI agents with LangChain, LangGraph, tool calling, memory and multi-agent workflows. |
| `/courses/mlops` | Productionize ML systems A 4 Months MLOps course in Hyderabad covering 14 modules and tools including Python, Jupyter Notebook, Git, GitHub, MLflow, … | MLOps training in Hyderabad at GloryTecks, Ameerpet. Learn to package, deploy, automate and monitor machine learning models with Docker, MLflow and CI/CD. |
| `/courses/sql-server` | Query, design & optimize databases A 2 Months SQL Server course in Hyderabad covering 13 modules and tools including Microsoft SQL Server, … | SQL Server training in Hyderabad at GloryTecks, Ameerpet. Learn T-SQL queries, joins, stored procedures, database design and query tuning on real datasets. |
| `/blog` | Roadmaps, tutorials, salary guides and interview preparation across Data Science, Generative AI, Python, Power BI, MLOps, Data Engineering, AWS, GCP and Azure, written by GloryTecks trainers. | Practical guides on Data Science, Generative AI, Python, Power BI, SQL, Data Engineering and MLOps — roadmaps, tutorials and interview questions from GloryTecks. |
| `/blog/category/data-science` | …model deployment. Browse expert Data Science guides, tutorials, roadmaps, salary insights and interview questions from GloryTecks Hyderabad. | …model deployment. Browse 50+ expert Data Science guides, tutorials and interview questions from GloryTecks Hyderabad. |
| `/blog/category/generative-ai` | …used in production today. Browse expert Generative AI guides, tutorials, roadmaps, salary insights and interview questions from GloryTecks Hyderabad. | …used in production today. Browse 50+ expert Generative AI guides, tutorials and interview questions from GloryTecks Hyderabad. |
| `/placements` | How GloryTecks supports the job search: career counselling, resume and ATS review, LinkedIn preparation, mock interviews and introductions to hiring partners — plus where past learners have been placed. | How GloryTecks supports your job search in Hyderabad — resume building, LinkedIn optimisation, mock interviews and referrals to hiring partners. |
| `/about` | Who we are: an IT training institute in Ameerpet, Hyderabad, teaching Data Science, AI and analytics through project-based courses led by practitioners working in the field. | Learn how GloryTecks trains students and working professionals in Ameerpet, Hyderabad — industry mentors, real-time projects and dedicated placement support. |
| `/contact` | Phone, WhatsApp, email and directions for GloryTecks in Ameerpet, Hyderabad. Ask about course fees, upcoming batch dates, or book a free demo class. | Contact GloryTecks at 611, Annapurna Block, Aditya Enclave, Ameerpet, Hyderabad – 500038. Call +91 99080 99980 or book a free demo for any IT course. |

The missing full stop in the expected course descriptions ("From data to decisions A 6 Months…") is a real template defect. See §6, S2.

### 4.5 H1, breadcrumb and page schema

| URL | H1 expected | H1 production | Breadcrumb (last item) expected / production | Page schema expected / production |
| --- | --- | --- | --- | --- |
| `/courses` | Explore Our Courses | IT Training Courses in Hyderabad | Courses / Courses | CollectionPage / — |
| `/training-in-hyderabad` | IT Training in Ameerpet, Hyderabad | IT Training Institute in Hyderabad | Training in Ameerpet / IT Training Institute in Hyderabad | WebPage + LocalBusiness / LocalBusiness+EducationalOrganization (×2) |
| `/courses/{slug}` (×9) | `{Course} Course in Hyderabad` | `{Course} Training in Hyderabad` | `{Course} Course` / `{Course} Training` | Course / Course + FAQPage |
| `/blog` | IT Career Guides & Free Resources | GloryTecks Blog — IT Career Guides | Blog / Blog | Blog / — |
| `/blog/category/data-science` | Data Science Guides & Tutorials | *identical* | Data Science / Data Science | CollectionPage / CollectionPage + ItemList |
| `/blog/category/generative-ai` | Generative AI Guides & Tutorials | *identical* | Generative AI / Generative AI | CollectionPage / CollectionPage + ItemList |
| `/placements` | Placements at GloryTecks | Placement Support at GloryTecks | Placements / Placements | WebPage / — |
| `/about` | Shaping Careers. Building Futures. | About GloryTecks | About / About | AboutPage / — |
| `/contact` | Contact GloryTecks | *identical* | Contact / Contact | ContactPage / — |

Every breadcrumb's last `item` equals the page's canonical on both sides. The expected side was verified by the smoke test.

---

## 5. Sitemap membership and indexability

| | glorytecks.com (legacy) | Repository (Next.js) |
| --- | --- | --- |
| `robots.txt` sitemaps | `sitemap-index.xml`, `sitemap.xml`, `blog-sitemap.xml`, `category-sitemap.xml`, `image-sitemap.xml` | `sitemap.xml` only (an index) |
| `/sitemap.xml` | Flat `<urlset>`, 670 URLs | `<sitemapindex>` → `pages` (9), `courses` (9), `blog` (595), `categories` (13), `locations` (15), `resources` (5), `compare` (10) |
| 18 audited URLs | All 18 in `/sitemap.xml`. `/blog` and both categories are also in `category-sitemap.xml`. | `/`, `/courses`, `/training-in-hyderabad`, `/placements`, `/about`, `/contact` → `pages`; nine courses → `courses`; `/blog` and both categories → `categories` |
| `<loc>` host | `https://glorytecks.com` | Today `https://glorytecks-one.vercel.app` (dead). After the env fix, `https://glorytecks.com`. |
| Indexable today | Yes (200, `index`, self-canonical, crawl allowed) | Page metas say `index`, but `robots.txt` is `Disallow: /` and canonicals point at a dead host. **Not indexable until the env var is fixed.** |

---

## 6. Findings that need a decision before or after cutover

These do not cause the parity mismatch. No code was changed for any of them.

### C1 — 14 live, indexed URLs have no route in the Next.js app (cutover blocker)

Every URL in the live sitemaps was requested by path from the Next.js deployment: **656 of 670 return 200; 14 return 404.** All 14 are 200, `index, follow` and self-canonical on glorytecks.com today, and all are routed in the legacy `src/App.tsx`.

| URL (live, indexed) | Production title | Next.js | Suggested handling (needs approval) |
| --- | --- | --- | --- |
| `/privacy-policy` | Privacy Policy \| GloryTecks IT Training Institute Hyderabad | 404 | Build the page. The backend already serves `/public/legal/privacy-policy` and `fetchLegalDoc` exists. |
| `/terms` | Terms of Service \| … | 404 | same |
| `/refund-policy` | Refund Policy \| … | 404 | same |
| `/cookie-policy` | Cookie Policy \| … | 404 | same |
| `/disclaimer` | Disclaimer \| … | 404 | same |
| `/editorial-policy` | Editorial Policy \| … | 404 | same |
| `/training-in-ameerpet` | IT Training Institute in Ameerpet \| GloryTecks | 404 | 308 → `/training-in-hyderabad`, which the registry says now owns the Ameerpet intent |
| `/agentic-ai-course-ameerpet` | Agentic AI Training in Ameerpet, Hyderabad \| GloryTecks | 404 | Add to `config/locationLandings.ts`, or 308 → `/courses/agentic-ai` |
| `/agentic-ai-course-madhapur` | Agentic AI Training in Madhapur, Hyderabad \| GloryTecks | 404 | same |
| `/data-engineering-course-ameerpet` | Data Engineering Training in Ameerpet, Hyderabad \| GloryTecks | 404 | same (→ `/courses/data-engineering`) |
| `/data-engineering-course-hitech-city` | Data Engineering Training in HITEC City, Hyderabad \| GloryTecks | 404 | same |
| `/generative-ai-course-gachibowli` | Generative AI Training in Gachibowli, Hyderabad \| GloryTecks | 404 | same (→ `/courses/gen-ai`) |
| `/sql-server-course-ameerpet` | SQL Server Training in Ameerpet, Hyderabad \| GloryTecks | 404 | same (→ `/courses/sql-server`) |
| `/sql-server-course-kukatpally` | SQL Server Training in Kukatpally, Hyderabad \| GloryTecks | 404 | same |

`docs/SEO_REDIRECT_MAP.md` and `docs/SEO_INDEXABILITY_MATRIX.md` say the six legal URLs were never live. That was inferred from the React codebase this app was migrated from, which is not the codebase serving the domain. Production shows they are live and indexed. Those two documents should be corrected in the same change that resolves C1.

### C2 — `www` redirect is temporary

`https://www.glorytecks.com/` currently answers **307** → `https://glorytecks.com/`. When the domain moves, configure `www` in Vercel as a redirect to the apex with **308** (permanent). `http://` already 308s to `https://`.

### S1 — Streamed metadata on `/blog` and `/blog/category/*`

These routes read `searchParams`, so they render per request. Next 16 streams `generateMetadata` output for user agents not on its HTML-limited list, and Googlebot is not on that list. On one cold render, `<title>`, canonical and robots arrived at byte 222 648 inside `<body>`. Every later render (`Googlebot`, `facebookexternalhit`, `Twitterbot` and a browser user agent) had them in `<head>`. This is documented framework behaviour (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` § *Streaming metadata*). Google reads body-placed tags after rendering, and social and Bing bots always get blocking `<head>` metadata.

**Option, not applied:** `htmlLimitedBots: /.*/` in `next.config.mjs` forces `<head>` placement for everyone, at a TTFB cost on those routes. The smoke test reports streamed metadata as a warning, not a failure.

### S2 — Course meta description joins the CMS tagline without punctuation

`describe()` in `app/(site)/courses/[slug]/page.tsx:53-56` renders `${course.tagline} A ${course.duration} …`, which produces "From data to decisions A 6 Months Data Science course…" on all nine course pages. The technical fix is to add ". " when the tagline has no terminal punctuation. **This changes the rendered description text, so it awaits your approval.**

### S3 — Homepage H1 comes from the CMS and uses a superlative

The live H1 is the CMS `settings.heroSection.headingLine2` value "…with Hyderabad's Best Training". The code fallback ("…with Training in Hyderabad") is deliberately neutral, and `components/views/HomeView.tsx:189-193` already flags the CMS copy for review. This is an admin/CMS content decision, not code.

### S4 — Homepage WebPage `@id` form (informational)

`webPageSchema('/')` yields `https://glorytecks.com#webpage`, while other nodes use `https://glorytecks.com/#…`. Nothing references this node by the other spelling, so it is cosmetic. No action.

---

## 7. Fixes

### Applied in this phase (repository)

Nothing in the SEO architecture was changed: the route registry, canonical system, sitemaps, schema graph, caching and existing tests are all untouched.

| File | Change |
| --- | --- |
| `lib/seo/smoke.ts` | **New.** Pure checker. Holds a served page to the route registry (static routes) or its page template (CMS routes). Checks: HTTP 200 with no redirect; Next.js build fingerprint (rejects the legacy SPA); exactly one title, description, canonical and robots; canonical and `og:url` on the expected origin; OG and Twitter present; no `meta keywords`; exactly one H1; required JSON-LD types; every `@id` on the origin; breadcrumb ends at the canonical; ≥ 10 internal links. Also checks `robots.txt` and sitemaps. |
| `lib/seo/smoke.test.ts` | **New.** 17 offline tests of the checker, using fixtures shaped like the real Next.js page, the real legacy homepage and the wrong-origin build. Runs in `npm test`. |
| `lib/seo/production.smoke.test.ts` | **New.** Live suite: the 18 URLs, `robots.txt`, sitemap index plus membership of all 18, and legacy fingerprints (`/sitemaps/pages.xml` must be XML; unknown URLs must 404). **Skipped unless `SEO_SMOKE_BASE_URL` is set**, so `npm test` stays offline. |
| `package.json` | `test:smoke` script. |
| `README.md`, `.env.example` | `NEXT_PUBLIC_SITE_URL` must be exactly `https://glorytecks.com` on Production. Pre- and post-cutover smoke commands. Two troubleshooting entries. |

### Required outside the repository, in this order

1. **Vercel project `glorytecks` → Settings → Environment Variables:** set `NEXT_PUBLIC_SITE_URL` = `https://glorytecks.com` for **Production**. Keep Preview on a non-production value so previews stay `Disallow: /`.
2. **Redeploy production.** The value is inlined at build time.
3. **Vet the new deployment before any DNS or domain change:**
   `SEO_SMOKE_BASE_URL=https://glorytecks-psi.vercel.app npm run test:smoke` → must be 21/21 green.
4. **Resolve C1** (your decision), redeploy, and re-run step 3.
5. **Move `glorytecks.com` and `www.glorytecks.com`** from the legacy project, in the Vercel account that owns the domain, to project `glorytecks`. Set `www` → apex as a 308 (C2).
6. **Verify production:** `SEO_SMOKE_BASE_URL=https://glorytecks.com npm run test:smoke` → 21/21 green. Then follow `docs/GOOGLE_SEARCH_CONSOLE_LAUNCH.md` to submit `/sitemap.xml`.

Steps 1–2 and 5 change live infrastructure. Step 5 also needs access to the other Vercel account, which this session did not have. None of them was attempted.

### Awaiting your approval (not applied)

- **C1:** build or redirect the 14 URLs.
- **S2:** add the missing separator in the course description template.
- **S3:** the CMS homepage H1 copy.
- **S1 (optional):** `htmlLimitedBots`.

---

## 8. Verification results

### Required commands, run in `main-website/`

| Command | Before changes | After changes |
| --- | --- | --- |
| `npm run typecheck` | ✅ pass (exit 0) | ✅ pass (exit 0) |
| `npm run lint` | ✅ 0 errors, 9 warnings | ✅ 0 errors, the same 9 warnings (none in new files) |
| `npm test` | ✅ 9 files, 289 passed | ✅ 10 files passed, 1 skipped (the live suite): **306 passed, 21 skipped** |
| `npm run build` | ✅ exit 0, 42/42 static pages | ✅ exit 0, 42/42 static pages |

Both builds ran with the local `.env` (`NEXT_PUBLIC_API_BASE_URL=http://localhost:5001/api/v1`). No local backend was running, so CMS fetches logged `Network request failed` and fell back through `safe()` as designed. The build still succeeds, but it prerenders CMS routes without content.

### Live smoke test

| Target (`SEO_SMOKE_BASE_URL`) | Canonicals held to | Result | Meaning |
| --- | --- | --- | --- |
| `https://glorytecks.com` | `https://glorytecks.com` | ❌ 20 failed / 1 passed | Every page: "served by the legacy Vite SPA", plus title and description mismatches. Sitemap is not an index. `/sitemaps/pages.xml` is HTML. Only `robots.txt` passes. |
| `https://glorytecks-psi.vercel.app` | `https://glorytecks.com` | ❌ 20 failed / 1 passed | Every page: canonical, `og:url`, `@id` and breadcrumb on `glorytecks-one.vercel.app`. `robots.txt` disallows everything. The sitemap index is on the wrong host. Only the legacy-fingerprint test passes. |
| `https://glorytecks-psi.vercel.app` | `https://glorytecks-one.vercel.app` | 20 passed / ❌ 1 failed | **All 18 pages match the repository exactly.** The only failure is `robots.txt` (`Disallow: /`), which is correct behaviour for a non-production origin. This confirms the checker has no false positives against real output. |

The same failure shows on every page of the second run. Sample for `/about`:

```
canonical https://glorytecks-one.vercel.app/about, expected https://glorytecks.com/about
og:url https://glorytecks-one.vercel.app/about, expected https://glorytecks.com/about
JSON-LD @id https://glorytecks-one.vercel.app/#organization is not on https://glorytecks.com
JSON-LD @id https://glorytecks-one.vercel.app/#website is not on https://glorytecks.com
JSON-LD @id https://glorytecks-one.vercel.app/about#webpage is not on https://glorytecks.com
breadcrumb ends at https://glorytecks-one.vercel.app/about, expected https://glorytecks.com/about
```

### Could not be executed

- **Making production match source.** That needs steps 1–6 above: live infrastructure changes, one of them in a Vercel account this session cannot access.
- **A passing smoke run against glorytecks.com.** Only possible after the domain moves.
- **Reading the encrypted value of `NEXT_PUBLIC_SITE_URL`.** It was inferred from the deployment's output rather than read (`vercel env pull` was not run, to avoid writing secrets to disk).
- **Rendering CMS routes locally.** There is no local backend. The live Next.js deployment, which uses the real backend, was used as the expected baseline instead.

---

## Appendix — reproducing

```bash
cd main-website

# Parity gate against any host; canonicals always held to https://glorytecks.com
SEO_SMOKE_BASE_URL=https://glorytecks.com npm run test:smoke
SEO_SMOKE_BASE_URL=https://<deployment>.vercel.app npm run test:smoke

# Hold a deployment to its own origin (e.g. a preview)
SEO_SMOKE_BASE_URL=https://<deployment>.vercel.app \
SEO_SMOKE_EXPECTED_ORIGIN=https://<deployment>.vercel.app npm run test:smoke
```

On Windows PowerShell, set the variable first: `$env:SEO_SMOKE_BASE_URL='https://glorytecks.com'; npm run test:smoke`.

Cutover check for C1: every URL in the **live** sitemaps must resolve on the deployment.

```bash
node -e '
const LIVE="https://glorytecks.com", NEXT=process.argv[1];
(async()=>{const s=new Set();for(const m of ["/sitemap.xml","/blog-sitemap.xml","/category-sitemap.xml"])
for(const [,l] of (await (await fetch(LIVE+m)).text()).matchAll(/<loc>([^<]+)<\/loc>/g))s.add(new URL(l).pathname);
for(const p of s){const r=await fetch(NEXT+p,{redirect:"manual"});if(r.status>=400)console.log(r.status,p)}})()' \
https://glorytecks-psi.vercel.app
```
