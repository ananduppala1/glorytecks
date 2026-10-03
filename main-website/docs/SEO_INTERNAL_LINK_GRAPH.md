# SEO Internal Link Graph

How link equity actually flows through glorytecks.com, measured by crawling the current build. Read this with [`SEO_KEYWORD_OWNERSHIP_MATRIX.md`](./SEO_KEYWORD_OWNERSHIP_MATRIX.md), which says which page should own each query, and [`SEO_INTERNAL_LINK_RECOMMENDATIONS.csv`](./SEO_INTERNAL_LINK_RECOMMENDATIONS.csv), which says what to add.

| | |
| --- | --- |
| Crawl | 2026-09-24. A production build of the current code with live CMS data. BFS from `/` and every sitemap URL, following real `<a href>` links, paginated archives included. |
| Pages | **851 crawled**: 656 indexable plus 195 paginated archive pages. All returned 200. |
| Link targets checked | 883 further targets: `?tag=`, `?sort=` and `?q=` filters, brochure hand-offs |
| Re-run | `SEO_GRAPH_BASE_URL=<site> npm run test:graph` (`lib/seo/linkgraph.live.test.ts`) |

## How links are counted

| Measure | Counts a link when… | Why |
| --- | --- | --- |
| **total** | any page links here, from anywhere (header, footer, menus included) | discoverability |
| **contextual** | the link is in the page's `<main>` content and not inside a `<nav>` | excludes menus, breadcrumbs and pagination |
| **editorial** | contextual, **and** the source is not a blog listing page, **and** the anchor is not "Previous" or "Next" | the links an editor or a relatedness rule actually chose. **This is the measure of real internal support.** |

A page every menu links to can still have zero editorial support. `/training-in-hyderabad` is the example: 850 total inbound links and 0 editorial.

---

## 1. The graph by page type

Inbound links as min / median / max across the pages of each type.

| Page type | Pages | Total inbound | Contextual | **Editorial** | Click depth |
| --- | ---: | --- | --- | --- | --- |
| Homepage | 1 | — | — | — | 0 |
| Courses hub `/courses` | 1 | 850 | 3 | **3** | 1 |
| Course pages | 9 | 850 / 850 / 850 | 3 / 73 / 238 | **3 / 64 / 202** | 1 |
| Centre page `/training-in-hyderabad` | 1 | 850 | 0 | **0** | 1 |
| Location landings | 15 | 850 / 850 / 850 | 2 / 5 / 10 | **2 / 5 / 10** | 1 |
| Brand and utility (`/about`, `/contact`, `/placements`, `/entities`) | 4 | 850 | 0 / 2 / 633 | **0 / 2 / 633** | 1 |
| Blog hub `/blog` | 1 | 850 | 208 | **1** | 1 |
| Category hubs | 12 | 256 / 257 / 257 | 256 / 257 / 257 | **49 / 50 / 50** | 2 |
| **Articles** | **595** | 3 / 4 / 850 | 3 / 4 / 697 | **0 / 0 / 596** | 1–7 |
| `/compare` hub | 1 | 850 | 0 | **0** | 1 |
| Comparison pages | 10 | 850 | 1 / 10 / 10 | **1 / 10 / 10** | 1 |
| `/resources` hub | 1 | **5** | 5 | 5 | 2 |
| Resource pages | 5 | 850 | 1 | **1** | 1 |

**Orphans: 0.** Every indexable page is linked from at least three others.
**Hygiene after Phase 1:** 0 links to a missing page, 0 links through a redirect, and 0 links to a URL whose canonical is elsewhere.

---

## 2. The intended structure, and where it holds

The model is hub and spoke. Commercial course pages are the destinations, and informational pages support them without competing for their queries.

```
course ──► pillar articles ──► related articles ──► course
   ▲             ▲                                    │
   │         category hub ◄── every article ──────────┘
   │             │
location landing ─┘  (and ──► the Ameerpet centre page)
```

| Edge | Status | Evidence |
| --- | --- | --- |
| course → its cluster's pillar articles | ⚠️ partial | 4 links, from the **first** supporting category only. Data Engineering has 4 supporting categories (DE, GCP, ADF, AWS) and Data Science has 3, but each links into one. |
| course → its category hub | ❌ missing | No course page links to `/blog/category/…` |
| **Agentic AI** and **SQL Server** courses → any article | ❌ **none** | No blog category maps to either course, so both link to 0 articles and receive 0 article links. The Agentic AI Roadmap currently supports *Generative AI*. |
| category hub → its course | ✅ | "See the {Course} curriculum" block on every category |
| category hub → pillars, → sibling categories | ✅ | 4 pillars per category. The DE cluster's four categories all cross-link. |
| article → its course | ⚠️ generic | Sidebar card, in main content. The anchors are **"Explore course"** (595 links) and **"View curriculum"**. Never in the body. |
| article → its category | ✅ | Category link above the H1, plus the breadcrumb |
| article → related articles | ⚠️ concentrated | 3 related cards, which mostly resolve to the same pillars (see §3) |
| article → prev / next | ✅ (chronological) | Links neighbours by date, not by topic |
| blog comparison post → its `/compare` page | ⚠️ footer only | No contextual link |
| location landing → its course, → sibling landings | ✅ | |
| location landing → the Ameerpet centre page | ⚠️ footer only | No contextual link |
| centre page → Ameerpet landings, → courses | ✅ | |
| comparison page → related courses, → other comparisons | ✅ | |
| homepage → courses, → latest posts | ✅ | |
| homepage → centre page | ⚠️ footer only | The address block does not link it |

---

## 3. Where the equity goes: concentration

Editorial inbound links per article:

| Editorial inbound links | Articles |
| --- | ---: |
| 0 | **459** |
| 1–2 | 31 |
| 3–9 | 51 |
| 10–99 | 45 |
| 100+ | **9** |

The 9 articles with 100+ editorial links each (≈595) are the ones the **sitewide sidebars** show on every post:

- "Popular": Data Science Roadmap, GCP Roadmap, Python Interview Questions (Top 50), Amazon S3 Explained, Power Query Tutorial
- "Latest": Data Science Roadmap, What Is Generative AI, Learn Python from Scratch, Data Analyst Roadmap, Power BI Roadmap

The footer adds three of these again. Related-post cards resolve mostly to the same pillars.

By article kind, as median editorial links (and how many have none):

| Kind | Articles | Median editorial | With none |
| --- | ---: | ---: | ---: |
| roadmap | 19 | 13 | 7 |
| whatis | 2 | 596 | 0 |
| interview | 53 | 0 | 41 |
| comparison | 64 | 0 | 49 |
| projects | 17 | 0 | 13 |
| salary | 11 | 0 | 8 |
| certification | 9 | 0 | 6 |
| guide | 417 | 0 | 333 |

So the differentiated cohorts the content audit rated highest (interview, projects, certification and comparison, per `BLOG_CONTENT_AUDIT.md`) get almost no chosen links. Most are reachable only through prev/next and deep archive pagination.

---

## 4. Click depth

| Clicks from `/` | Indexable pages |
| ---: | ---: |
| 0 | 1 |
| 1 | 50 |
| 2 | 47 |
| 3 | 74 |
| 4 | 67 |
| **5** | **134** |
| **6** | **143** |
| **7** | **140** |

**417 indexable pages (all articles) sit 5–7 clicks deep**, reachable only by paging through `/blog?page=N` or a category's `?page=N`. Every course, landing, comparison and category is within 2 clicks.

---

## 5. Anchors and targets

| Finding | Scale | Note |
| --- | --- | --- |
| Generic anchor **"Explore course"** | 595 links, 7 different course targets | The only course link on each article. Same text, different destinations. |
| Generic anchor **"View details"** | 6 links, 6 course targets | Homepage course cards |
| **Anchor/target mismatch** | every article | Sidebar "**Download brochure**" points to `/contact`, not to a brochure |
| Noisy card anchors | every related / archive card | The card's link text includes the decorative cover text ("POWER BI PO GloryTecks · Hyderabad …") before the article title |
| Links to noindex filter URLs | 2,832 `?tag=` · 208 `?sort=` | Correctly noindex, follow, and not blocked (Phase 1). But ~5 tag links per article spend crawl on an unbounded, non-indexable URL space. |
| Links to redirects / 404s / non-canonical URLs | **0** | Phase 1 fixed the 5 links to merged articles |

---

## 6. Course clusters

| Course | Supporting categories | Articles linking in (contextual) | Articles it links to | Landings | Comparisons linking in |
| --- | --- | ---: | ---: | ---: | ---: |
| `/courses/data-engineering` | data-engineering, gcp, azure-data-factory, aws | 197 | 4 | 0 | 2 |
| `/courses/data-science` | data-science, career-guidance, interview-questions | 150 | 4 | 6 | 7 |
| `/courses/gen-ai` | generative-ai | 50 | 4 | 2 | 1 |
| `/courses/python-programming` | python | 50 | 4 | 2 | 1 |
| `/courses/power-bi` | power-bi | 50 | 4 | 2 | 2 |
| `/courses/data-analytics` | data-analytics | 49 | 4 | 2 | 5 |
| `/courses/mlops` | mlops | 49 | 4 | 1 | 2 |
| **`/courses/agentic-ai`** | **none** | **0** | **0** | 0 | 0 |
| **`/courses/sql-server`** | **none** | **0** | **0** | 0 | 0 |

"Articles linking in" counts the sidebar card ("Explore course") on every article in the cluster. None of those links is in body copy.

---

## 7. Recommendations

[`SEO_INTERNAL_LINK_RECOMMENDATIONS.csv`](./SEO_INTERNAL_LINK_RECOMMENDATIONS.csv) lists **257** specific links (source, destination, natural anchor, reason, priority).

**How the list was built:**

- Every recommendation is a link that does not exist in main content today.
- The anchor is the destination's own H1, or a descriptive phrase varied by article kind. It is never a repeated exact-match keyword.
- No links are spent on the guide cohort, which is pending its tranche review (`BLOG_CONTENT_ACTION_PLAN.md` §3).

| Rule | Links | Priority |
| --- | ---: | --- |
| Overlap-cluster members → the cluster's owner | 10 | high |
| Agentic AI / SQL Server ↔ their on-topic articles | 16 | high |
| Centre page `/training-in-hyderabad` ← homepage, contact, about, the 6 Ameerpet landings | 9 | 2 high · 7 medium |
| Course → its category hub, and → a pillar in each extra supporting category | 17 | 12 medium · 5 low |
| Pillar articles (roadmap, projects, salary, certification) → their course, one in-body sentence | 56 | medium |
| General ↔ platform-specific versions of the same article (DE ↔ AWS / GCP / Azure) | 12 | medium |
| Hubs with no contextual inbound link (`/compare`, `/resources`, `/entities`) | 3 | 2 medium · 1 low |
| Component anchor fixes ("Explore course", "Download brochure", "View details") | 11 | 10 medium · 1 low |
| Weak non-guide articles ← their most related article (shared tags) | 123 | low |

The single structural fix with the largest reach is not a link at all. The related-posts and sidebar selection should favour **same-category, non-pillar** articles by tag overlap instead of the same sitewide favourites. That would give the 459 zero-editorial articles a chosen link each, without anyone editing article bodies. It is a component change, so it is recorded here and not applied.
