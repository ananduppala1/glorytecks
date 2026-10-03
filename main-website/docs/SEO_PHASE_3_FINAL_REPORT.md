# SEO Phase 3 — Keyword Ownership, Cannibalisation and Internal Linking

**What this phase answers:** which GloryTecks page should rank for which search intent, where pages compete with each other, and how internal links should route readers and authority to the pages that convert.

**Scope kept:** no page, component, route, slug, canonical, sitemap, schema or CMS row was changed. Every fix below is a recommendation. The code added is the analysis itself (`lib/seo/intent.ts`) and the checks that keep it true.

| Deliverable | What it is |
| --- | --- |
| [`SEO_KEYWORD_OWNERSHIP_MATRIX.md`](./SEO_KEYWORD_OWNERSHIP_MATRIX.md) | All 656 indexable URLs: primary intent, keyword cluster, secondary topics, search intent, canonical, competing URLs, action |
| [`SEO_URL_INVENTORY.csv`](./SEO_URL_INVENTORY.csv) | The same 656 URLs with title, H1, meta description, canonical, category, inbound (total / contextual / editorial) and outbound link counts, click depth |
| [`SEO_INTERNAL_LINK_GRAPH.md`](./SEO_INTERNAL_LINK_GRAPH.md) | How links actually flow: by page type, by cluster, concentration, depth, anchors |
| [`SEO_INTERNAL_LINK_RECOMMENDATIONS.csv`](./SEO_INTERNAL_LINK_RECOMMENDATIONS.csv) | 257 specific links to add: source, destination, natural anchor, reason, priority |
| `lib/seo/intent.ts`, `lib/seo/ownership.ts` | The detectors, and the machine-readable record of the reviewed overlaps |
| `lib/seo/intent.test.ts` (offline), `lib/seo/linkgraph.live.test.ts` (full-site crawl) | Automated validation — §9 |

**Method:**
- **Contract:** [`SEO_KEYWORD_MAP.md`](./SEO_KEYWORD_MAP.md), kept, not replaced.
- **Data:** a crawl of a production build of the current code with live CMS data (2026-09-24). That is 851 pages, including 195 paginated archives, and every real `<a>` link with its zone and anchor.
- **CMS inputs:** article kind, category → course mapping, course modules and comparison items, read from the public API.
- **Prior findings:** built on [`BLOG_CONTENT_AUDIT.md`](./BLOG_CONTENT_AUDIT.md) and [`BLOG_CONTENT_ACTION_PLAN.md`](./BLOG_CONTENT_ACTION_PLAN.md), not re-litigated.

---

## 1. Total indexable pages: 656

| Type | Pages | | Type | Pages |
| --- | ---: | --- | --- | ---: |
| Homepage | 1 | | Blog hub | 1 |
| Courses hub | 1 | | Category hubs | 12 |
| Course pages | 9 | | **Articles** | **595** |
| Centre page (`/training-in-hyderabad`) | 1 | | `/compare` hub | 1 |
| Location landings | 15 | | Comparison pages | 10 |
| About, Contact, Placements, Entities | 4 | | Resources hub + pages | 1 + 5 |

- **Canonicals:** all 656 declare exactly one self-canonical, and no two share a title, an H1 or a meta description.
- **Pagination:** the 195 archive pages (`?page=N`) are self-canonical and indexable, but not listed in the sitemap (Phase 1 policy).

## 2. Keyword ownership summary

| Search intent | Pages | Owner model |
| --- | ---: | --- |
| Commercial | 11 | `/` (IT training institute Hyderabad), `/courses` (IT courses Hyderabad), and 9 course pages (`{course} course Hyderabad`) — **one owner per query** |
| Local | 16 | `/training-in-hyderabad` (IT training Ameerpet) + 15 landings (`{course} course {locality}`) |
| Commercial investigation / comparison | 2 + 75 | `/placements`, the `/compare` hub, 10 `/compare` pages, 65 blog comparison posts |
| Informational hub | 15 | `/blog`, 12 category hubs, 2 "what is" posts |
| Tutorial | 405 | articles, almost all from the 417-article `guide` cohort |
| Interview · career · salary · project · certification | 58 · 28 · 11 · 16 · 10 | articles |
| Brand / navigational | 2 / 7 | `/about`, `/entities` / `/contact`, resources |

**What holds:**
- **Commercial queries have exactly one owner each.** No two course pages, and no course page and landing, make the same offer. Course ↔ landing separation holds in content as well as in titles: a landing shares only **6–7%** of its main copy with its course page.
- **No blog post targets a course query.** No title uses course, institute, fees, "training in" or classes-in wording. The blog stays informational, as the contract requires.
- **Category hubs own the topic-hub query**, not the course query. No article's topic collides with its category head term. "What Is Generative AI?" is informational, while `/courses/gen-ai` is commercial.

**Where it does not hold:**
- **Comparison intent** is published twice (§3).
- **Five informational questions** are each answered by two articles (§3).
- **The homepage title names Ameerpet**, the locality the keyword map assigns to `/training-in-hyderabad`.

## 3. Cannibalisation clusters: 14

A cluster is a set of indexable URLs that would answer the same query for the same reason. Two posts sharing template words ("X interview questions for data engineers") do not form one. Each cluster is recorded, with its decision, in `lib/seo/ownership.ts`.

| # | Cluster (primary first) | Overlap | Search intent | Primary | Recommended action |
| --- | --- | --- | --- | --- | --- |
| 1 | `/compare/power-bi-vs-excel` · `/blog/excel-vs-power-bi-which-should-you-learn-first` · `/blog/power-bi-vs-excel-when-to-use-each-tool` | same comparison, 3 URLs | comparison | `/compare/power-bi-vs-excel` | **CHANGE INTERNAL TARGETING**: the posts reach the /compare page only through the footer, so add contextual links. **MERGE** "when to use each" after a GSC check. |
| 2 | `/compare/data-science-vs-data-analytics` · `/compare/data-analyst-vs-data-scientist` · `/blog/data-science-vs-data-analytics-which-career-is-right-for-you` | same comparison; **two /compare pages** | comparison | `/compare/data-science-vs-data-analytics` | **REWRITE INTENT**: refocus analyst-vs-scientist on the job roles (duties, hiring, pay); the post supports the owner |
| 3 | `/compare/data-engineering-vs-data-science` · `/blog/data-engineering-vs-data-science-roles-compared` | same comparison | comparison | the /compare page | **CHANGE INTERNAL TARGETING**; merge only if GSC shows the post earns its own queries |
| 4 | `/compare/power-bi-vs-tableau` · `/blog/power-bi-vs-tableau-a-detailed-2026-comparison` | same comparison | comparison | the /compare page | **CHANGE INTERNAL TARGETING**. The three-way "vs Looker" post is a different query. |
| 5 | `/blog/bigquery-vs-snowflake-vs-redshift-a-comparison` · `/blog/redshift-vs-snowflake-vs-bigquery-a-comparison` · `/blog/cloud-data-warehouses-compared-snowflake-vs-bigquery-vs-redshift` | the same three warehouses, three orderings | comparison | `bigquery-vs-…` | **MERGE**: keep one, 308 the others once GSC shows which earns impressions |
| 6 | `/blog/orchestration-airflow-vs-dagster-vs-prefect` · `/blog/pipeline-orchestration-airflow-vs-prefect-vs-dagster` | same three tools (DE vs MLOps category) | comparison | the DE post | **MANUAL REVIEW**: merge, or rewrite the MLOps copy around ML pipelines |
| 7 | `/blog/power-bi-interview-questions-top-40-with-answers` · `/blog/power-bi-interview-questions-with-detailed-answers` | same interview topic | interview | the Power BI category copy | **MERGE** (the same rule as the 5 pairs merged earlier: the topic category beats the generic bucket), after GSC |
| 8 | `/blog/azure-data-factory-interview-questions-and-answers` · `/blog/azure-data-factory-adf-interview-questions` | same interview topic | interview | the ADF category copy | **MERGE**, after GSC |
| 9 | `/blog/python-interview-questions-top-50-with-answers` · `/blog/python-interview-questions-for-data-roles` | same interview topic | interview | the general set | **REWRITE INTENT**: the "data roles" post should cover pandas and NumPy only |
| 10 | `/blog/data-analyst-roadmap-2026-skills-tools-and-timeline` · `/blog/how-to-become-a-data-analyst-with-no-experience` | same career subject | career | the roadmap | **KEEP BOTH**: different angle (no experience); cross-link |
| 11 | `/blog/data-engineering-roadmap-2026-a-complete-guide` · `/blog/how-to-become-a-data-engineer-in-2026` | same career subject | career | the roadmap | **KEEP BOTH**, cross-link |
| 12 | `/blog/adf-pipelines-explained-building-your-first-pipeline` · `/blog/building-an-etl-pipeline-with-adf-step-by-step` | 83% of subject terms | tutorial | the first | **MANUAL REVIEW**: merge, or keep the second strictly about ETL design |
| 13 | `/blog/langgraph-tutorial-building-stateful-ai-agents` · `/blog/building-ai-agents-with-langgraph-a-hands-on-tutorial` | 80% of subject terms, same category | tutorial | the first | **MANUAL REVIEW**: merge likely |
| 14 | `/training-in-hyderabad` · `/` | both offer "IT training @ Ameerpet" | local | **`/training-in-hyderabad`** | **REWRITE INTENT**: the homepage title should target the city, not the locality. It is a copy change, so it needs approval. |

**Checked and not cannibalisation:**
- **Course pages sharing a title template.** "Data Science Course in Hyderabad" and "Data Analytics Course in Hyderabad" differ in subject.
- **Course page vs landing.** This is by contract, with only 6–7% of copy shared.
- **Platform-specific articles.** Data Engineering vs GCP / AWS / Azure roadmaps, projects and salaries are legitimate splits and are linked hub ↔ spoke in the recommendations.
- **Topic interview sets** ("AWS / GCP / Snowflake … interview questions for data engineers") ask different questions.

**Structural overlap, outside the clusters:** the nine non-Ameerpet location landings share **52–60%** of their copy with sibling landings for the same course. The keyword map (§4) already flags these for review against Search Console data. They are listed as competing URLs in the matrix.

## 4. Orphan pages: 0

Every indexable page is linked from at least three others. The most weakly *linked* pages are in §5.

## 5. Weak internal-link pages

"Weak" means **no editorial inbound link**: nothing in any page's main content chose to link here, apart from blog listings and prev/next.

| | Pages |
| --- | ---: |
| **All weak pages** | **463** |
| Articles — `guide` cohort (pending its tranche review) | 333 |
| Articles — comparison | 49 |
| Articles — interview | 41 |
| Articles — projects / salary / roadmap / certification | 13 / 8 / 7 / 6 |
| Articles — kind not returned by the API | 2 |
| **`/training-in-hyderabad`** (the LocalBusiness page) | 1 |
| `/about`, `/entities`, `/compare` hub | 3 |

In addition:
- **417 articles sit 5–7 clicks from the homepage**, reachable only through archive pagination.
- **`/resources`** is linked from just 5 pages, its own children.
- **Agentic AI** and **SQL Server** course pages receive no article links and link to none.
- Every article's only course link uses the anchor "**Explore course**" (595 links).

The cause is concentration. Nine sidebar-favourite articles receive ≈595 editorial links each, 45 receive 10–99, and 459 receive none. The differentiated cohorts the content audit rated highest (interview, comparison, projects) are the ones left out.

## 6. High-priority fixes

None applied. Ordered by impact.

| # | Fix | Why | Where |
| --- | --- | --- | --- |
| 1 | **Resolve the 14 clusters**: 10 contextual links from each secondary to its owner, then the GSC-gated merges (clusters 5, 7, 8), the two intent rewrites (2, 9) and the homepage title (14) | Every cluster splits one query's signals across 2–3 URLs | §3; CSV rows marked `high` |
| 2 | **Give Agentic AI and SQL Server informational support**: 16 links between each course and its on-topic articles | Two commercial pages with no supporting content at all. Longer term, map a blog category to each in the CMS (an editor decision). | CSV |
| 3 | **Link the centre page contextually** from the homepage address block and `/contact` (high), plus `/about` and the six Ameerpet landings (medium) | The LocalBusiness page, owner of "IT training Ameerpet", has 0 editorial links | CSV |
| 4 | **Change how related posts and sidebars pick articles**: same category, non-pillar, by tag overlap, instead of the same sitewide favourites | The one change that reaches all 459 zero-editorial articles and pulls the 417 deep pages up, without editing any article body. It is a component change. | `SEO_INTERNAL_LINK_GRAPH.md` §7 |
| 5 | **Fix the misleading and generic anchors**: "Explore course" ×595 → "{Course} course curriculum"; "Download brochure" → it points to `/contact`; "View details" ×6 | Anchor text is how links say what the destination is | CSV (component rows) |

Medium and low priority, in the CSV:
- 56 in-body pillar → course sentences
- 17 course → category-hub and extra-pillar links
- 12 platform hub ↔ spoke links
- 3 hub links (`/compare`, `/resources`, `/entities`)
- 123 weak-article → most-related-article links

## 7. Pages requiring manual review

| Pages | Question to answer | Input needed |
| --- | --- | --- |
| Clusters 5, 7, 8 (6 URLs) | Which copy to keep before a 308 | GSC impressions / clicks per URL, 90 days |
| Clusters 6, 12, 13 (6 URLs) | Merge, or rewrite to a distinct angle? | GSC data, plus an editor reading both |
| `/compare/data-analyst-vs-data-scientist` | Rewrite around job roles | Editorial |
| `/blog/python-interview-questions-for-data-roles` | Narrow to data-role questions | Editorial |
| `/` title | Drop "Ameerpet" so the centre page owns the locality | Approval: it is copy in the route registry |
| 9 non-Ameerpet landings | Keep indexed? (52–60% shared copy) | GSC data, per keyword map §4 |
| 417 `guide` articles | The existing tranche programme | GSC data, per `BLOG_CONTENT_ACTION_PLAN.md` §3 |
| Tag chips (2,832 links to noindex `?tag=` pages) | Keep linking every tag? | Product decision. The URLs are correctly noindex. |

## 8. Pages that should NOT be changed

| Pages | Why |
| --- | --- |
| The 9 course pages (titles, H1s, URLs) | Clean single ownership of `{course} course Hyderabad`. They need more links in, not new wording. |
| `/courses`, `/training-in-hyderabad` | Owners of their queries. The centre page needs links, not changes. |
| The 6 Ameerpet landings | The only locality with a physical centre |
| The 12 category hubs | Distinct topic-hub intent, 2 clicks deep, ~50 editorial links each, already linked to their course and pillars |
| `/compare/*` except analyst-vs-scientist | Primaries of their comparisons |
| The 9 heavily linked pillar articles | Keep their links. Stop *adding* concentration. |
| Platform-specific DE articles (AWS, GCP, Azure variants) | Legitimate distinct intents. Link, do not merge. |
| Interview articles in topic categories | The strongest cohort (content audit); clusters 7–8 keep the topic copy |
| All blog slugs, canonicals and sitemap membership | Phase 1 verified. The 5 earlier merge redirects stay. |
| Every other article with no competing URL | No overlap found. KEEP (the guides remain in the tranche programme). |

---

## 9. Automated validation

| Check | Where | Fails when |
| --- | --- | --- |
| Duplicate title / H1 / meta description | `intent.ts` → `findOverlaps`; live in `linkgraph.live.test.ts` | any two indexable pages share one |
| Duplicate commercial intent | `commercialKey` (subject @ place); offline over the registry + course and landing templates; live over the whole site | two commercial pages make the same offer in the same place, unless the overlap is reviewed |
| Blog post reaching for a course query | `targetsCourseIntent`; live | any blog title uses commercial course wording |
| Suspicious intent overlap | same comparison (order-independent) · same informational subject within one intent type · ≥75% shared tutorial subject terms | a cluster appears that is not in `ownership.ts` (**NEW**), or a reviewed one disappears (**STALE**) |
| Orphan pages | `auditLinks`; live | any indexable page has no inbound link |
| Broken / redirected / non-canonical internal links | `auditLinks`; live | any internal link hits a 4xx/5xx, a 3xx, or a page canonicalised elsewhere |
| Course pages with no support | live | a course page has no editorial inbound link |
| Template drift | `intent.test.ts` | the course or landing title template in the page files changes without the contract test |

**Deliberately not a keyword-density test.** Overlap is judged on the subject and the intent type, after removing template words, so "AWS interview questions for data engineers" and "GCP interview questions for data engineers" do not collide while the two Power BI interview posts do.

Proven on real data:
- **Live, current build:** `linkgraph.live.test.ts` passes **9/9**, both with and without the CMS API (851 pages crawled).
- **Mutation:** with the Power BI interview cluster removed from `ownership.ts`, the run failed with `NEW same-subject: …power-bi-interview-questions-top-40-with-answers ⇄ …with-detailed-answers` and passed again once restored.
- **Offline:** the unit tests cover each detector's positive and negative cases. They include "storage classes" not being commercial, a two-way comparison never equalling a three-way one, and "Python vs R" keeping its one-letter item.

## 10. Verification

| Command | Result |
| --- | --- |
| `npm run typecheck` | ✅ exit 0 |
| `npm run lint` | ✅ exit 0: 0 errors, the same 9 pre-existing warnings |
| `npm test` | ✅ 13 files passed, 3 skipped: **384 passed**, 96 skipped (the opt-in live suites). `intent.test.ts` 23/23. |
| `npm run build` | ✅ exit 0, 42/42 static pages |
| `SEO_GRAPH_BASE_URL=http://localhost:3107 [SEO_GRAPH_API=…] npm run test:graph` against a production build with live data | ✅ 9/9 live (and 23/23 offline) |

**Not executed:**
- **Any link, merge, redirect, rewrite or title change.** All are recommendations, awaiting approval or GSC data.
- **GSC-based decisions.** No Search Console data was available.
- **A crawl of glorytecks.com.** It still serves the legacy site, so the crawl used a local production build of this code against the live CMS.

**Stopping here. Phase 4 has not been started.**
