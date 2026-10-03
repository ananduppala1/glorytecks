# Blog Content Action Plan

Decisions per cohort, derived from [`BLOG_CONTENT_AUDIT.md`](./BLOG_CONTENT_AUDIT.md).

**Nothing is deleted.** Per the brief, recommendations come first; only changes
backed by repository evidence and unambiguous SEO logic were implemented in
this pass. Everything requiring traffic data or an editorial decision is listed
in §4 with the exact input needed.

---

## 1. Cohort scorecard

| # | Cohort | Count | Decision | Rationale |
| --- | --- | ---: | --- | --- |
| 1 | `-2` duplicate interview articles | **5** | **MERGE** → 308 to the canonical twin | Identical title *and* excerpt; same intent. Cross-posted into two categories. Implemented. |
| 2 | Category archives | 12 | **KEEP + FIX** | Unique CMS intro copy and real article counts. The cache bug made them identical; fixed. Cluster navigation added. |
| 3 | `kind: salary` | 11 | **UPDATE** | Good hedging already; missing year + source. Render-time disclosure implemented; figures still need verification. |
| 4 | `kind: interview` | 56 | **KEEP** | Genuinely differentiated — real Q&A pairs per topic. The strongest cohort in the corpus. |
| 5 | `kind: roadmap` | 19 | **KEEP** | Step sequences are topic-specific and useful. |
| 6 | `kind: projects` | 17 | **KEEP** | Project briefs are concrete and topic-specific. |
| 7 | `kind: comparison` | 64 | **KEEP** | Comparison tables carry real per-topic rows. |
| 8 | `kind: certification` | 9 | **KEEP** | Grounded in real certification names. |
| 9 | `kind: whatis` | 2 | **UPDATE** | Too few to form a pattern; fold into guides. |
| 10 | **`kind: guide`** | **417** | **NOINDEX → rewrite, in tranches** | 92–97% near-identical within category. Most do not cover their own topic. **Gated on GSC data — see §4.1.** |

Totals: **597 audited · 5 merged · 11 needing factual updates · 417 flagged for
the tranche programme · 164 keep-as-is.**

---

## 2. Implemented in this pass

### 2.1 Cache-key collision — the prerequisite

`backend/src/lib/cache.ts`. Every filtered public blog query shared one Redis
key, so all twelve category archives served the same 50 Python articles. Fixed
with a recursive stable serialiser; 8 regression tests.

*Nothing else in this document would have been observable while this was live.*

### 2.2 Merge the 5 duplicate pairs

308 redirects in `next.config.mjs`, canonical twin chosen as the copy in the
**topic** category rather than the generic `interview-questions` bucket, because
the topic category is the better-matched archive:

```
/blog/aws-interview-questions-for-data-engineers-2          → /blog/aws-interview-questions-for-data-engineers
/blog/data-engineering-interview-questions-and-answers-2    → /blog/data-engineering-interview-questions-and-answers
/blog/data-analyst-interview-questions-and-answers-2        → /blog/data-analyst-interview-questions-and-answers
/blog/gcp-interview-questions-for-data-engineers-2          → /blog/gcp-interview-questions-for-data-engineers
/blog/mlops-interview-questions-and-answers-2               → /blog/mlops-interview-questions-and-answers
```

The 5 redirect sources are excluded from `/sitemaps/blog.xml` by
`MERGED_SLUGS` in `lib/blog/merged.ts`, so the sitemap never lists a redirect —
enforced by the Phase 1 sitemap invariants plus a new test.

The CMS rows are **not deleted**. If the business prefers, the duplicate can be
unpublished in the admin panel instead; the redirect then still serves anyone
holding the old URL.

### 2.3 Internal linking engine (hub & spoke)

There were **zero** internal links in body content. Rather than mutate CMS body
text — which would be editing published articles from code — linking is added
at render time, where it is contextual and reversible:

| Connection | Where | Status |
| --- | --- | --- |
| Article → its course | Blog post sidebar | already existed |
| Article → its category | Breadcrumb | already existed |
| **Category → its course** | Category archive | **added** |
| **Category → cluster pillars** | Category archive | **added** |
| **Course → cluster articles** | Course detail page | **added** |

Cluster membership is derived from `CategoryKnowledge.courseSlug`, which the
CMS already stores — no new mapping was invented. Pillars are selected by
`kind` priority (roadmap → interview → projects → salary → certification),
which surfaces the differentiated cohorts and deliberately leaves the weak
`guide` cohort out of the featured links.

Anchor text is the article's own title, so it varies naturally and is never
keyword-stuffed. Links are capped (≤4 per block) so no page links to
everything.

### 2.4 Salary disclosure

Articles containing a salary table now render a dated provenance note. This is
render-time, so it applies to all existing articles without a re-seed.

### 2.5 Update policy

Documented in §5 and enforced by test: `lastmod` must come from genuine content
dates, never the clock (carried over from Phase 1).

---

## 3. The 417 guides — recommendation

This is the decision that matters, and it is **not** implemented automatically.

**Assessment.** At 92–97% intra-category similarity, with articles that do not
cover their stated topic, this cohort is a site-wide quality liability. Google
assesses quality at site level; 417 thin pages can suppress the 9 course pages
that actually convert.

**Recommended programme — do not do this in one commit:**

| Tranche | Action | Gate |
| --- | --- | --- |
| A | Pull GSC: impressions + clicks per `/blog/*` URL, 90 days | — |
| B | Guides with **zero impressions** in 90 days → `noindex, follow`, drop from sitemap, keep published | Tranche A |
| C | Guides with impressions → keep indexed, queue for rewrite, highest-impression first | Tranche A |
| D | Rewrite queue: one real topic per article — a worked example, a dataset or screenshot, a failure case, and one authoritative external source | Editorial capacity |
| E | Re-index rewritten articles; measure before widening | Tranche D |

**Why not noindex all 417 now:** some are certainly earning impressions, and
de-indexing a ranking page is destructive and slow to reverse. The gate is one
CSV export.

**Why not rewrite all 417:** at any realistic editorial rate that is a
multi-year programme. Consolidation is the better lever — 417 thin guides could
become perhaps 60–80 genuinely useful articles, one per real topic, with the
rest merged or retired.

**Infrastructure is ready:** `lib/blog/merged.ts` accepts additional redirect
mappings and noindex slugs, and both are honoured by the sitemap, the metadata
and the tests. Executing a tranche is a data change, not a code change.

---

## 4. Blocked on inputs this repository cannot provide

| # | Decision | Input needed | Owner |
| --- | --- | --- | --- |
| 1 | Which guides to noindex vs rewrite | GSC impressions per URL, 90 days | SEO |
| 2 | Salary figures | Year + source (Naukri / AmbitionBox / Glassdoor / internal placement data) for each band in `meta.ts` | Business |
| 3 | 250 articles authored by "GloryTecks Team" | Reassign to a named trainer, or accept | Business |
| 4 | Author profile pages | Decide whether `/authors/{slug}` should exist so `Person` can be referenced by URL | Business |
| 5 | Article images | 0 of 597 have one. Screenshots would also fix `og:image` | Content |
| 6 | Whether the duplicate `-2` rows should be unpublished in the CMS | Editorial preference | Business |

---

## 5. Update policy

**Published (`date`)** — set once, when the article first goes live. Never
changed afterwards.

**Updated (`updated`)** — set **only** when the body materially changed:
a corrected fact, a new section, a refreshed figure, a reworked example.

Not a material change: fixing a typo, re-running the generator, a re-seed, a
CSS change, or wanting the article to look fresh.

**Enforcement.** `<lastmod>` uses `updated` when it is genuinely later than
`date`, otherwise `date` — never the clock. `lib/seo/sitemap.test.ts` asserts
that sitemap output is byte-identical under two different system clocks, so a
bulk date refresh cannot be introduced accidentally.

**On a re-seed:** the generator must not stamp `updated` across the corpus. 597
articles all updated on one day is the clearest possible signal of automated
content, and it would discard the genuine publication spread the archive has
now (2025-09 → 2026-06).

---

## 6. What was deliberately NOT done

| | Why |
| --- | --- |
| No new articles generated | Section C. The corpus already suffers from scaled generation; adding to it makes the problem worse. |
| No `{course} in {city}` pages | Section C, explicitly. |
| No bulk `updated` refresh | Section H. |
| No deletions | Section K. Merges are redirects; rows stay in the CMS. |
| No body-text rewriting from code | Published articles are CMS-owned. Editing 597 rows from a build script is not a content strategy, and it would discard editor changes. |
| No invented sources | A citation must point at something real. Adding plausible-looking sources to 597 articles would be worse than having none. |
