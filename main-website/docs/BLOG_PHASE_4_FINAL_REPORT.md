# Phase 4 Final Report: Blog Quality and Scaled-Content Recovery

**Date:** 2026-09-24 · **Status:** pilot complete, stopped for review · **Published changes:** none

Phase 4 backed up every blog article, measured all 600, classified each one, and rewrote a pilot of ten as reviewable files. Nothing was written to the CMS. Nothing was deleted, redirected, de-indexed or re-dated.

| Document | What it holds |
| --- | --- |
| [`BLOG_CONTENT_QUALITY_REPORT.md`](./BLOG_CONTENT_QUALITY_REPORT.md) | The audit: metrics, similarity, repetition, clusters, weaknesses |
| [`BLOG_REWRITE_QUEUE.csv`](./BLOG_REWRITE_QUEUE.csv) | All 600 articles × 60 columns: metrics, intent profile, image plan, action, priority |
| [`BLOG_SIMILARITY_CLUSTERS.csv`](./BLOG_SIMILARITY_CLUSTERS.csv) | Every cluster member, with its similarity to the cluster's strongest article |
| [`BLOG_REMEDIATION_PLAN.md`](./BLOG_REMEDIATION_PLAN.md) | Every article's action, the rewrite standard, the apply/rollback workflow |
| [`BLOG_REWRITE_PROGRESS.csv`](./BLOG_REWRITE_PROGRESS.csv) | The ten pilot rewrites: before/after, checks, what changed |

---

## 1. Totals

| Measure | Result |
| --- | ---: |
| Articles analysed | **600** (all `published`) |
| Articles with mostly original content (≥ 60% unique phrasing) | **0** |
| Articles with 10% or more unique phrasing | 1 |
| Mean boilerplate per article (phrasing shared with 10+ articles) | **99%** |
| Mean similarity to same-category articles | **0.81** |
| Mean similarity to the nearest same-category article | **0.97** |
| Mean raw (word-for-word) similarity of same-category template pairs | 0.89 |
| Articles with a near-duplicate (similarity ≥ 0.8) | 565 (94%) |
| **Clusters** | |
| Exact duplicates: same article at two URLs | 5 pairs (already redirected in Phase 1) |
| Keyword-swapped groups: different topics, identical body | 30 groups, 458 articles |
| Same-topic clusters: one question, several articles | 10 |
| Template families: one body template per category | 22 families, 590 articles |
| **Actions** | |
| Rewrite candidates (DEEP REWRITE) | **577**, including the 10 pilot articles |
| … queue band P1 / P2 / P3 | 17 / 50 / 524 (bands include the 14 manual-review articles) |
| Merge candidates (gated on Search Console) | **4** |
| NOINDEX candidates | **0**: needs Search Console data (§3) |
| Manual review | **14**: 11 salary pages and 3 Phase 3 manual-review pairs |
| Redirects | 5, done in Phase 1 |
| Keep / Improve as-is | 0 / 0 |

**Strong articles.** None meets the "mostly original" bar. The single highest is a guide, *Mock Interview Guide*, at 10% unique phrasing. After it come the salary pages (3–9%), because their figures vary by page. Those figures have no source, so they are the corpus's largest trust risk, not its strength.

**Main weaknesses** (articles affected, of 600):

| Weakness | Articles |
| --- | ---: |
| Body is mostly boilerplate | 600 |
| No external source | 600 |
| Unsourced salary, percentage or demand claims | 600 |
| No in-body internal link | 600 |
| No image, diagram or screenshot | 600 |
| Same FAQ questions and answers (marked up as FAQPage) | 600 |
| "100% placement support" business claim in the body | 600 |
| Meta description outside 70–160 characters | 395 |
| Generic "GloryTecks Team" byline | 250 |
| No worked example | 182 |
| Under 600 words of prose | 163 |

## 2. Step by step

| Step | Outcome |
| --- | --- |
| 1. Backup | `backend/src/scripts/blog-backup.ts` (read-only, SELECT only). Exported 600 blogs, 12 categories and 5 authors with every column, id, slug, relationship and date, plus one file per post and a manifest of per-row content checksums. Written to `backend/backups/blog/2026-09-24T04-39-08-889Z/` (22 MB). |
| 2. Audit | `lib/blog/quality.ts` measures every article: words, headings, paragraphs, lists, tables, code, FAQs, examples, practical content, first-hand evidence, first-person claims, unsourced claims, unique and boilerplate share, similarity to same-category, same-intent and any article, internal, external and authoritative links, images, author, author URL, dates, topic, category, intent, commercial conflict and source availability. |
| 3. Clustering | Five-word shingles, measured with the title and category replaced by placeholders so keyword swaps count as duplicates. Four cluster kinds; the Phase 3 ownership decisions are carried over. Keyword-swapped articles are never merge candidates. |
| 4. Search Console | No data available (§3). Parser and A/B/C/D classifier built and tested; the classifier and queue use them automatically once an export is supplied. |
| 5. Intent | Every article has a primary question, intent, audience, unique purpose, topic, supporting topics and competing pages in the queue CSV. These are derived automatically and confirmed by the editor at rewrite time. |
| 6–8. Rewrite rules | Applied to the pilot and codified as a standard (remediation plan §3) with automated checks. |
| 9. Internal links | Pilot: 3–5 contextual links each, to verified live targets, with course links only where the syllabus covers the topic. |
| 10. Images | Every article has `image_needed`, `image_type` and `image_description` in the queue CSV: a diagram or product screenshot, or deliberately none. Never stock imagery. |
| 11. Quality review | Automated checks in two places (§4). All pilot files are `needs_review`, and only an editor can set `approved`. |
| 12. Remediation plan | All 600 articles classified with a reason and a gate. |
| 13. Pilot | 10 articles; below. |
| 14. This report | |

## 3. Search Console

No Search Console export was available. glorytecks.com still serves the legacy SPA from another Vercel account, so there is no data for the new pages yet. As a result:

- no article is marked NOINDEX, and no merge is carried out on similarity alone;
- the queue is ordered by editorial signals. Re-running with `BLOG_AUDIT_GSC=<pages.csv>` classifies each article as **A** (earning clicks: protect), **B** (impressions without clicks: rewrite first), **C** (no impressions: merge or NOINDEX candidate) or **D** (not indexed: investigate), and the classification and queue update themselves.

## 4. The pilot

**Selection.** Ten DEEP REWRITE articles, one per category across ten categories. All have official documentation to cite, and most are linked sitewide (trending or popular). They include the Phase 3 REWRITE INTENT article, and exclude every merge and manual-review cluster.

**Method, per article.** Read the original. Define one primary question that no neighbouring article owns, and name the neighbours it defers to. Fetch the official documentation, and trace every technical statement to a page that supports it: each file lists what each source backs. Run the code where a runtime was available. Write the article, validate it, compare it with the original and all 600 articles, and save it as a file.

| Article | Words | Sources | Internal links | Similarity to original / to any article | Code |
| --- | --- | ---: | ---: | --- | --- |
| amazon-s3-explained-storage-classes-and-best-practices | 680 → 1,507 | 11 | 5 | 0.00 / 0.001 | CLI and JSON, checked against the AWS docs |
| bigquery-explained-google-s-serverless-data-warehouse | 656 → 1,021 | 8 | 5 | 0.00 / 0.001 | SQL and `bq` flags, checked against the Google Cloud docs |
| triggers-in-adf-schedule-tumbling-window-and-event | 703 → 1,268 | 5 | 4 | 0.00 / 0.001 | Trigger JSON, in the documented format |
| power-query-tutorial-transforming-data-without-code | 691 → 1,367 | 9 | 5 | 0.00 / 0.001 | M query, standard functions |
| partitioning-and-bucketing-in-spark-explained | 679 → 1,001 | 6 | 3 | 0.00 / 0.001 | **Not executed** (no Spark runtime); documented API only |
| cross-validation-in-machine-learning-a-practical-guide | 676 → 1,065 | 3 | 5 | 0.00 / 0.001 | **Executed** (scikit-learn 1.8); outputs shown are real |
| docker-for-machine-learning-a-practical-guide | 667 → 979 | 7 | 5 | 0.00 / 0.001 | **Not built** (Docker daemon not running); pinned versions verified on PyPI |
| numpy-guide-arrays-broadcasting-and-vectorization | 646 → 1,016 | 5 | 3 | 0.00 / 0.001 | **Executed** (NumPy 1.26); outputs shown are real |
| prompt-injection-and-llm-security-what-you-need-to-know | 696 → 1,133 | 5 | 5 | 0.00 / 0.001 | Illustrative Python (validation and prompt structure) |
| python-interview-questions-for-data-roles | 517 → 935 | 8 | 4 | 0.00 / 0.001 | **Executed** (Python 3.11); outputs shown are real |

The rewrites are also dissimilar to each other (maximum 0.002), so the pilot is not a new template.

**What changes when a pilot article is applied:** body, excerpt, meta description, and `updated` (set to the apply date). **What does not change:** id, slug, title, category, author, tags, featured image and publication date.

**Corrections made during verification.** These are the reason every claim is traced to a source:

- **S3:** Athena does not fail on archived objects, as the first draft implied. It skips them silently. The article now says so, citing the Athena documentation.
- **ADF:** storage event triggers support **only** ADLS Gen2 and general-purpose v2 accounts. The draft was broader.
- **Power Query:** in text columns, Replace Values replaces substrings by default; whole-cell matching is opt-in. The draft had it the other way round.
- **Docker:** a claim about Alpine and scientific-Python wheels was outdated, and was removed.
- **Python interview:** Phase 3 proposed refocusing it on pandas and NumPy questions, but both already have dedicated articles. It now covers standard-library coding tasks, and `lib/seo/ownership.ts` records that.

**Saved safely.** Files are in `backend/content/blog-rewrites/pilot-2026-09-24/`, one per article, each with its baseline checksum, sources, intent, internal links, image plan, automated results and editor checklist. A read-only `plan` against the live CMS confirmed that all ten baselines still match the live rows. `apply` without `--confirm` blocked all ten ("status is needs_review, not approved"). No snapshot or write occurred.

**Editor actions before approval:** run the Spark samples on a Spark 3.x runtime and build the Docker example once. Then review each file against its checklist.

## 5. Findings outside Phase 4 scope

Recorded for decision, not changed:

1. **Public API rate limiting is disabled in the committed backend.** In `backend/src/app.ts` (unchanged since commit `fc77a39 deployed`), the middleware that applies `apiLimiter`, `publicReadLimiter` and `publicReadGuard` is commented out. The backend's own suite fails three tests because of it ("public reads have a flood ceiling", "a search costs more budget than a plain read", "a rate-limited response is not itself expensive"), and lint flags the three limiters as unused. Re-enabling it changes production behaviour, so it needs your decision.
2. **"100% placement support"** appears in all 600 posts. Approving a rewrite removes it from that post.
3. **Author bios** make unverifiable numeric claims; no author has a profile page or photo.
4. **The backup folder** (`backend/backups/`, 22 MB) is not in `.gitignore`.

## 6. Verification

Run on 2026-09-24 after all Phase 4 changes.

**main-website**

| Check | Result |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm run lint` | 0 errors, 9 warnings. All 9 pre-existing (the same count as Phase 3); none in Phase 4 files. |
| `npm test` | Test files: 14 passed, 4 skipped (18). Tests: **405 passed**, 97 skipped (504). The skipped suites are the opt-in live and export suites. |
| `npm run build` | Compiled successfully; 42/42 static pages generated |
| `npm run blog:audit` with the backup and rewrites | 21/21 unit tests, and the export ran; its results are the docs above |

**backend** (new code: backup script, rewrite CLI, helpers, two test files)

| Check | Result |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm run lint` | 0 errors, 3 warnings. All 3 are the unused limiters in `src/app.ts` (§5.1), pre-existing. |
| `npm test` | 335 tests: **332 passed, 3 failed**. The 3 failures are the rate-limit route tests in §5.1: pre-existing, caused by the commented-out middleware, and in a file Phase 4 did not touch. The Phase 4 suites pass in full: `blogRewrite.test.ts` 12/12, `blogRewriteFiles.test.ts` 51/51. |

## 7. Files

**New:**

- `backend/src/scripts/blog-backup.ts`, `backend/src/scripts/blog-rewrite.ts`, `backend/src/scripts/lib/blogRewrite.ts`
- `backend/tests/blogRewrite.test.ts`, `backend/tests/blogRewriteFiles.test.ts`
- `backend/content/blog-rewrites/pilot-2026-09-24/*.json` (10 files)
- `backend/backups/blog/2026-09-24T04-39-08-889Z/` (the backup)
- `main-website/lib/blog/quality.ts`, `quality.test.ts`, `quality.export.test.ts`
- `main-website/docs/BLOG_CONTENT_QUALITY_REPORT.md`, `BLOG_REMEDIATION_PLAN.md`, `BLOG_PHASE_4_FINAL_REPORT.md`, `BLOG_REWRITE_QUEUE.csv`, `BLOG_SIMILARITY_CLUSTERS.csv`, `BLOG_REWRITE_PROGRESS.csv`

**Changed:**

- `main-website/package.json`: the `blog:audit` script
- `main-website/README.md`: a row for `blog:audit`
- `main-website/lib/seo/ownership.ts`: the note on the Python interview pair

No UI, layout, component, route, CMS row or business value was changed.

## 8. Next steps

1. Review the ten pilot files; approve or send back each one.
2. Apply the approved ones (`blog-rewrite.ts apply … --confirm`), then monitor them.
3. Decide the items in §5 and the salary-page approach.
4. Once Search Console covers the new site, re-run the audit with the export. Then settle the four merges and decide NOINDEX for class-C articles.
5. Continue the queue in batches of 10–20. Phase 5 has not been started.

**Stopped after the 10-article pilot, as instructed.**
