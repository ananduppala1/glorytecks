# Blog Content Audit

**Corpus:** 597 published articles, audited against the **live backend** (real
Supabase content), not the seed files.

**Date:** 2026-09-23

**Method:** full pagination of `/public/blogs`, full-body fetch of every
sampled article, 7-gram Jaccard near-duplicate analysis, block-type census, and
a read of the generation engine (`backend/src/seed/sitedata/content.ts`,
13.7k-line `topics.ts`, `meta.ts`).

---

## 0. The finding that reframes everything else

Before any content judgement: **the blog category API was serving the wrong
articles.**

```
GET /public/blogs?categorySlug=aws     → 50 PYTHON articles
GET /public/blogs?categorySlug=mlops   → 50 PYTHON articles
GET /public/blogs?categorySlug=power-bi→ 50 PYTHON articles
GET /public/blogs?kind=salary          → 50 PYTHON articles
```

**Cause.** `hashQuery()` in `backend/src/lib/cache.ts` built the Redis key with
`JSON.stringify(params, Object.keys(params).sort())`. An array as the second
argument to `JSON.stringify` is a *property allow-list applied at every level
of nesting*. The filter values live in `params.filters`, whose own keys were
not in that top-level list — so `filters` serialised as `{}` and **every
filtered public blog query collided onto one cache key.**

**Impact.** All twelve `/blog/category/{slug}` archives rendered the same 50
articles, each under its own title, H1, description and canonical. From a
crawler's point of view that is twelve near-duplicate pages whose titles
contradict their content. It also made the "featured" and "trending" homepage
strips unreliable and produced an inconsistent `total` (the API advertised 600
against 597 real rows).

**Status: fixed** — `hashQuery` now serialises with a recursive key sort and no
allow-list. 8 regression tests in `backend/tests/cacheKey.test.ts`.

No amount of content work would have been visible while this was live, which is
why it is item zero.

---

## 1. Corpus shape

| Category | Articles | | Kind | Articles |
| --- | ---: | --- | --- | ---: |
| interview-questions | 53 | | guide | 417 |
| generative-ai · python · data-analytics · power-bi · data-engineering · mlops · gcp · azure-data-factory · career-guidance · aws | 50 each | | comparison | 64 |
| data-science | 47 | | interview | 61 |
| | | | roadmap | 19 |
| | | | projects | 17 |
| | | | salary | 11 |
| | | | certification | 9 |
| | | | whatis | 2 |

Every article was produced by a template engine: 8 `build*` functions plus
shared section builders (`introBlocks`, `keyTakeaways`, `skillsSection`,
`toolsSection`, `careerSection`, `certSection`, `buildFaq`, `conclusion`). The
shared sections derive **only** from the category record — so they are constant
across all ~50 articles in a category.

---

## 2. Near-duplicate content — the central problem

7-gram Jaccard similarity between randomly sampled articles of the same
category **and** kind, with each article's own title and category name
normalised out:

| Cohort | n | Avg similarity | Max |
| --- | ---: | ---: | ---: |
| `power-bi` / guide | 39 | **97.2%** | **100.0%** |
| `mlops` / guide | 40 | 93.4% | 94.1% |
| `data-science` / guide | 36 | 93.3% | 94.0% |
| `python` / guide | 37 | 92.5% | 93.5% |

### Worked example — the 100% pair

`/blog/power-bi-bookmarks-and-buttons-for-interactivity`
vs `/blog/composite-models-and-directquery-in-power-bi`

**5 of 8 body paragraphs are byte-identical.** The three that differ do so only
by title substitution:

> "**{TITLE}** is one of the topics learners ask about most when they start
> with Power BI…"
> "{TITLE} sits inside Power BI, where power BI is Microsoft's leading BI tool…"
> "{TITLE} is very learnable with the right sequence and steady practice."

**The Power BI bookmarks article contains no information about bookmarks or
buttons.** The topic exists only in the title, the H1 and three substituted
sentences. The same is true of the DirectQuery article, and by extension of
most of the 417 `guide` articles.

This is the pattern Google's spam policy describes as **scaled content abuse**:
pages generated at scale that provide no original value. The risk is not
per-article ranking — it is a site-wide quality assessment that drags the
commercial pages down with it.

---

## 3. Duplicate intent and titles

**5 genuine duplicate-title pairs**, each cross-posted into both the topic
category and `interview-questions`, with identical titles and excerpts:

| Title | Canonical candidate | Duplicate |
| --- | --- | --- |
| AWS Interview Questions for Data Engineers | `/blog/aws-interview-questions-for-data-engineers` | `…-2` |
| Data Engineering Interview Questions and Answers | `/blog/data-engineering-interview-questions-and-answers` | `…-2` |
| Data Analyst Interview Questions and Answers | `/blog/data-analyst-interview-questions-and-answers` | `…-2` |
| GCP Interview Questions for Data Engineers | `/blog/gcp-interview-questions-for-data-engineers` | `…-2` |
| MLOps Interview Questions and Answers | `/blog/mlops-interview-questions-and-answers` | `…-2` |

*(Three further "duplicates" seen in the first pass — Python / Deep Learning /
Gen AI interview questions — were the **same row returned twice** by offset
pagination, not distinct articles. Verified by row id.)*

**Template title patterns** (topic normalised out): 17 × `{TOPIC}: A Practical
Guide`, 6 × `{TOPIC}: A Complete Guide`, 6 × `{TOPIC}: A Comparison`, 5 ×
`{TOPIC}: When to Use Each`. 18 titles end `…Interview Questions and Answers`.

---

## 4. Quality census

Random sample of 40 articles, full body:

| Dimension | Result | Verdict |
| --- | --- | --- |
| Has an author | 40/40 (100%) | ✅ |
| Has FAQ block | 40/40 (100%) | ✅ |
| Has a table | 34/40 (85%) | ✅ |
| Has code | 31/40 (78%) | ✅ (where relevant) |
| **Has any image** | **0/40 (0%)** | ❌ |
| **Has `featuredImage`** | **0/40 (0%)** | ❌ |
| **Has an internal link in the body** | **0/40 (0%)** | ❌ |
| **Has an external/authoritative link** | **0/40 (0%)** | ❌ |
| Cites a named source | ~8/40, mostly regex false positives | ❌ |

### Images — 0%

No article has a `featuredImage` or an inline image block. This is why the
Phase 2 `og:image` fix falls back to the site default on every article: there
is nothing else to use. Cover art is a per-category inline SVG rendered by
`BlogCover`, which is decorative and not indexable as an image.

### Internal links — 0%

Not one body paragraph links to another article, a category, or a course page.
All internal linking is chrome: breadcrumbs, the sidebar "Recommended course"
card, prev/next and related posts. **There is no hub-and-spoke structure and no
contextual linking at all** — section E of the brief is starting from zero.

### First-hand experience — absent

The engine has no mechanism for it. No article contains a worked example from a
real project, a screenshot, a dataset, a failure case, or anything a
practitioner would recognise as first-hand. Introductions are one substituted
sentence; conclusions are the same substituted sentence plus a CTA.

---

## 5. Salary and market claims

Only 11 articles are `kind: salary`, but `careerSection` injects a
"Career paths and salaries in Hyderabad" table into **many** guide articles.

**What is already right:** values are labelled *indicative*, geography is
stated (Hyderabad), experience bands are explained, and `buildSalary` ends with
a warning callout telling readers to validate against live Naukri and LinkedIn
listings. That is better hedging than most competitors.

**What is missing, against section I:**

| Requirement | Status |
| --- | --- |
| Show the year | ❌ No year anywhere near a salary figure |
| Identify the data source | ❌ Values come from `meta.ts` seed constants with no provenance |
| Distinguish estimate from observed data | ⚠️ "Indicative" implies it, never states it |
| Show geography | ✅ Hyderabad |
| Explain experience range | ✅ Fresher / mid / senior bands |

One unsupported comparative claim recurs: *"Hyderabad's pay for {X} roles is
competitive with Bangalore and Pune"* — no source.

The underlying figures (e.g. Data Science `₹5–9 LPA` fresher) are seed values
with no recorded date or origin. Per the brief, they must not be presented as
current fact without verification.

---

## 6. Other checks

| Check | Finding |
| --- | --- |
| **Outdated information** | Almost no year references in body text (only 2 mentions of 2026 across 40 articles). Content is year-agnostic, so it does not *read* stale — but it also cannot signal freshness. Dates span 2025-09 → 2026-06. |
| **"Best/top" claims** | Largely absent from body copy — the engine avoids superlatives. Titles use "Top {N}" in 3 cases (acceptable for listicles). ✅ |
| **Author information** | 5 authors, all with role + bio. Attribution is topically credible: Sneha Reddy (Data Engineering) → data-engineering/mlops/gcp/adf/aws; Arjun Nair (BI) → power-bi/data-analytics; Priya Sharma (Career) → career-guidance/interview-questions. ⚠️ **250 articles (42%) are attributed to "GloryTecks Team"**, which is not a person and cannot carry author E-E-A-T. No author profile pages exist, so `Person` cannot be referenced by URL. |
| **Commercial cannibalization** | ✅ No blog article targets `{course} course Hyderabad`. The Phase 2 intent separation holds — the blog stays informational. |
| **Category pages** | Each has genuine unique `description` copy in the CMS. Real article counts (47–53 each). Thin-category risk is low **once the cache bug fix is deployed**; before it, all twelve were identical. |
| **Weak introductions / conclusions** | Both are single substituted template sentences across the entire corpus. ❌ |

---

## 7. Severity summary

| # | Issue | Scope | Severity |
| --- | --- | --- | --- |
| 1 | Category API served wrong articles (cache collision) | 12 category pages | **Critical — fixed** |
| 2 | 92–97% near-duplicate body content within category+kind | ~417 guides | **Critical** |
| 3 | Articles do not cover their own stated topic | most guides | **Critical** |
| 4 | Zero internal links in body content | 597 | High |
| 5 | Zero images | 597 | High |
| 6 | Zero authoritative external sources | 597 | High |
| 7 | 5 duplicate-title pairs | 10 URLs | Medium |
| 8 | Salary figures without year or source | ~11 + career sections | Medium |
| 9 | 42% of articles authored by a non-person | 250 | Medium |
| 10 | Template intros and conclusions | 597 | Medium |

Recommendations, with a KEEP / UPDATE / MERGE / NOINDEX / REMOVE decision per
cohort, are in [`BLOG_CONTENT_ACTION_PLAN.md`](./BLOG_CONTENT_ACTION_PLAN.md).
