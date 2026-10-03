# SEO Monitoring Plan

**Owner:** whoever runs the weekly Search Console check.
**Time:** ~20 min weekly, ~60 min monthly.
**Tooling:**
- Search Console exports, processed by `npm run seo:report`
- `lib/seo/monitoring.ts` and `lib/seo/monitoringReport.ts` (tested in `lib/seo/monitoring.test.ts`)

Related documents:

| Document | Covers |
|---|---|
| [`GOOGLE_SEARCH_CONSOLE_LAUNCH.md`](GOOGLE_SEARCH_CONSOLE_LAUNCH.md) | Launch-day setup |
| [`ANALYTICS_MEASUREMENT_PLAN.md`](ANALYTICS_MEASUREMENT_PLAN.md) | GA4 and conversions |
| [`PERFORMANCE_SEO_VERIFICATION.md`](PERFORMANCE_SEO_VERIFICATION.md) | How to measure Core Web Vitals properly |
| [`LOCAL_LANDING_PAGE_AUDIT.md`](LOCAL_LANDING_PAGE_AUDIT.md) | The GSC-gated landing decisions |

**Principles:**
1. **Read trends, not single points.** Compare equal-length periods, and never act on one week of a small number.
2. **Alerts must mean something.** Traffic and indexing-count rules need both a relative *and* an absolute change. Error rules (5xx, soft 404, canonical) use a small absolute floor, because any real increase matters. Traffic rules stay silent until there's enough baseline (§8).
3. **No production load.** The report reads files you export. The only network use is optional, and it's at most 8 cached sitemap requests.
4. **Monitoring never changes content.** It points at problems; a person decides and fixes.

---

## 1. What is monitored

### 1.1 Indexation

All of these come from Search Console → **Indexing → Pages**.

| Metric | Search Console source | In the report |
|---|---|---|
| Indexed pages | Chart, "Indexed" | Latest vs 7 and 28 days earlier; alert on a drop (§8) |
| Excluded / not indexed | Chart, "Not indexed" | Same |
| Discovered – currently not indexed | Reason table | Count and change; alert on growth |
| Crawled – currently not indexed | Reason table | Count and change; alert on growth |
| Duplicate without user-selected canonical | Reason table | Alert on increase |
| Duplicate, Google chose different canonical than user | Reason table + drill-down | Alert on increase; priority pages alert individually |
| Soft 404 | Reason table | Alert on increase |
| Not found (404) | Reason table + drill-down | Alert on a *significant* increase |
| Page with redirect / Redirect error | Reason table | Reported; redirect *errors* are treated as serious |
| Server error (5xx) | Reason table + drill-down | Alert on any real increase |
| Sitemap errors | Indexing → Sitemaps (no export; copy into `sitemaps.csv`) plus an optional live check | Alert on any status other than *Success*, or on a URL-count gap |

The expected total is the **656 URLs** in `docs/SEO_URL_INVENTORY.csv`. Not all of them will be indexed, and that's normal for a 595-article blog; read §9.

### 1.2 Search performance

From **Performance → Search results**.

| Metric | Notes |
|---|---|
| Clicks, impressions | Summed per page after URL normalisation (§5.4) |
| CTR | Always **recomputed** as clicks ÷ impressions; never an average of CTRs |
| Average position | **Impression-weighted** when rows merge |
| Queries | Normalised (case, whitespace); segmented as below |
| Page performance | Per page, per page group, per course |

**Query segments.** Each query gets exactly one segment, checked in this order. The rules live in `classifyQuery`.

| Segment | Meaning | Example |
|---|---|---|
| **branded** | Mentions GloryTecks | `glorytecks ameerpet` |
| **local** | A course or institute query with a place, or a locality name | `data science course hyderabad`, `python training kukatpally` |
| **commercial** | A buying query without a place | `power bi course fees` |
| **informational** | Everything else | `what is mlops`, `sql interview questions` |

Every query also gets a **course tag**, independent of its segment. For example, `python for data science` is tagged Data Science.

**Page groups:**
- homepage, course hub, course pages, the centre page (`/training-in-hyderabad`)
- local landings
- blog index, blog categories, blog articles
- comparisons, resources and static pages

Each page's **course** comes from its URL (course pages and landings) or from `supports_course` in the inventory (articles and categories). So "course-specific" and "blog-specific" performance are both readable.

### 1.3 Core Web Vitals

| Source | What it gives | Use |
|---|---|---|
| Search Console → **Experience → Core Web Vitals** (mobile, desktop) | Field data: URL groups Poor / Need improvement / Good over 90 days | **Primary.** The report reads the chart and alerts on trends. |
| PageSpeed Insights "Discover what your real users are experiencing" (CrUX) | Field p75 LCP / INP / CLS per URL or origin | Monthly spot check of the priority templates |
| Lighthouse with **applied** throttling (`--throttling-method=devtools`) | Lab | Only to diagnose a field regression; see PERFORMANCE_SEO_VERIFICATION.md §3 for why simulated scores mislead on this site |

Field data needs traffic. Until the Next.js site serves glorytecks.com, Core Web Vitals and CrUX describe the **legacy** site.

---

## 2. Important URLs

These pages alert individually: a single one in a problem list is enough. They're listed in `PRIORITY_PATHS`.

| Group | URLs |
|---|---|
| Homepage and hubs | `/`, `/courses`, `/contact`, `/about` |
| Course pages (9) | `/courses/data-science`, `/courses/gen-ai`, `/courses/agentic-ai`, `/courses/python-programming`, `/courses/power-bi`, `/courses/data-analytics`, `/courses/data-engineering`, `/courses/mlops`, `/courses/sql-server` |
| Centre page | `/training-in-hyderabad` |
| Local landings (15) | The route table in `config/locationLandings.ts` |

Watched as groups:

| Group | Report section |
|---|---|
| 12 blog categories (`/blog/category/*`) | 6.5 |
| Top 50 blog articles by clicks | 6.6 |
| Highest-impression articles (25), with a CTR flag | 6.7 |
| Zero-impression articles (full list in `normalized/zero-impression-articles.csv`) | 6.8 |
| The 8 legacy-only URLs from LOCAL_LANDING_PAGE_AUDIT.md §7.3 | 6.4, while they still get data |

---

## 3. Weekly checks (about 20 minutes)

1. **Security and manual actions.** Both must say *No issues detected*. Anything else overrides this whole plan; stop and fix it.
2. **Export and run the report** (§5).
3. **Read §1 "Alerts" in `report.md`.** Act using §10. No alerts means nothing to do; resist tinkering.
4. **Sitemaps.** Copy the status and discovered count into `sitemaps.csv` (§5.2); the report checks it.
5. **URL Inspection:** only the report's shortlist (§7), at most 10 URLs.
6. **After the domain moves to Next.js:** run `SEO_SMOKE_BASE_URL=https://glorytecks.com npm run test:smoke`. It sends about 80 requests, mostly served from the edge cache: 18 pages, 54 policy probes, robots.txt and the sitemaps. It confirms status codes, canonicals, robots and sitemaps haven't drifted.

## 4. Monthly checks (about 60 minutes)

1. **A monthly snapshot** in its own folder root (`monthly/`): Performance in *Compare → last 3 months vs previous period* mode, plus the same indexing and Core Web Vitals exports.
2. **Query segments (§5 of the report).**
   - Is non-branded growing?
   - Are local and commercial queries landing on course pages and landings, not blog posts?
3. **CTR opportunities (§6.7).** Articles on page one with CTR under 1%. Fix the title and description, not the content.
4. **Course pages (§6.1).**
   - Position and impressions per course.
   - Compare against the course's own queries: the course-tagged query clicks column.
5. **Local landings (§6.4).** This feeds the GSC-gated decisions in LOCAL_LANDING_PAGE_AUDIT.md §5, which needs 16 months of data for its thresholds.
6. **Zero-impression articles (§6.8).** Only articles at zero for **90+ days** qualify for BLOG_CONTENT_ACTION_PLAN.md decisions. Compare three consecutive monthly lists; one list is never enough.
7. **Core Web Vitals.** The trend in §7 of the report, plus a PageSpeed Insights field check of `/`, one course page, one landing and one article.
8. **Crawl health.** `SEO_SMOKE_CRAWL=1 npm run test:smoke` fetches all ~656 sitemap URLs sequentially. Run it monthly, or after a large deploy; no more often.

**Quarterly:**
- Re-generate `docs/SEO_URL_INVENTORY.csv` if pages were added or removed.
- Review the thresholds in §8 against a quarter of real data.
- Run the cannibalisation check in ANALYTICS_MEASUREMENT_PLAN.md §3.

---

## 5. CSV import process

### 5.1 Where the data lives

Keep exports **outside this repository**, for example `E:\GloryTecks-SEO-data\` or a shared drive. They're business data, and the repo shouldn't grow with them. Use one dated folder per snapshot, with weekly and monthly kept apart so each only compares with its own kind:

```
GloryTecks-SEO-data/
  weekly/
    2026-10-05/                       ← date you exported (YYYY-MM-DD)
      performance/                    ← Performance zip, extracted
      indexing/                       ← Page indexing zip, extracted
      indexing-not-found/             ← optional drill-downs, one folder per reason
      indexing-canonical-mismatch/
      cwv-mobile/                     ← Core Web Vitals zips, extracted
      cwv-desktop/
      sitemaps.csv                    ← typed by hand (§5.2)
      report.md, normalized/          ← written by the script
    2026-10-12/
  monthly/
    2026-10-31/
```

Files are recognised by their **header row**, not their name; every Search Console zip reuses `Chart.csv` and `Table.csv`. The folder name only supplies what the CSV lacks: the device (`…mobile…`, `…desktop…`) and the drill-down reason. The report's §8 lists every file with what it was detected as. **Check that table on the first real export.** The detection was built from Search Console's documented export columns, not from a live export of this property, because none existed yet.

### 5.2 The exports

Use the Domain property `glorytecks.com`.

| Export | In Search Console | Save as |
|---|---|---|
| Performance | Performance → Search results → Date: **Compare → Last 28 days vs previous period** (weekly) or **last 3 months** (monthly) → Search type Web → Export → Download CSV | Extract into `performance/`: Pages.csv, Queries.csv, Dates.csv and Filters.csv are used; Countries, Devices and Search appearance are ignored |
| Page indexing | Indexing → Pages → Export → Download CSV | Extract into `indexing/` (Chart.csv, Critical issues.csv, Non-critical issues.csv) |
| Drill-downs (optional) | Indexing → Pages → click a reason → Export | Extract into `indexing-<reason>/`, e.g. `indexing-not-found`, `indexing-server-error`, `indexing-soft-404`, `indexing-canonical-mismatch`, `indexing-duplicate-no-canonical`, `indexing-crawled-not-indexed`, `indexing-discovered-not-indexed`. A folder named with Search Console's own wording also works. |
| Core Web Vitals | Experience → Core Web Vitals → Open report (Mobile) → Export; same for Desktop | `cwv-mobile/`, `cwv-desktop/` |
| Sitemaps | Indexing → Sitemaps. **There's no export.** | `sitemaps.csv`, typed by hand (below) |

```csv
Sitemap,Status,Discovered pages
https://glorytecks.com/sitemap.xml,Success,656
```

Export drill-downs only for reasons that changed or that matter; one folder each.

### 5.3 Accepted formats and fields

| Format | Columns (case-insensitive) |
|---|---|
| Search Console UI, single period | `Top pages` or `Top queries` or `Date`, then `Clicks, Impressions, CTR, Position` |
| Search Console UI, **Compare** mode | The same, with each metric twice (`Last 28 days Clicks`, `Previous 28 days Clicks`, …). Split into current and previous automatically. |
| API / Looker Studio / BigQuery | Any of `date, query, page` (or `url`) plus `clicks, impressions, ctr, position`. CTR may be a fraction (0.043) or a percentage (4.3%). |

Accepted dimension names:
- page: `Top pages`, `Page`, `URL`, `Landing page`
- query: `Top queries`, `Query`
- date: `Date`

Numbers may be `1,234`, `4.35%` or a decimal comma in CTR and position.

### 5.4 Normalisation (no duplicate URLs)

Every URL becomes one key: its canonical path.

| Input | Key |
|---|---|
| `https://glorytecks.com/courses/data-science/` | `/courses/data-science` |
| `http://www.glorytecks.com/courses/data-science` | `/courses/data-science` |
| `https://glorytecks.com//courses/data-science?utm_source=x#syllabus` | `/courses/data-science` (the dropped parameter is noted) |
| `https://glorytecks.com/blog?page=2` | `/blog?page=2` (paginated archives are their own canonical pages) |
| `https://glorytecks.com/blog?page=1` | `/blog` |
| `https://glorytecks-psi.vercel.app/…` or any other host | **Rejected** and reported. It isn't the site. |

- Rows that collapse onto the same key are **merged**: counts are summed, position is impression-weighted and CTR is recomputed. The number merged is reported.
- Path case is kept: `/Courses` is a different URL from `/courses`, and Search Console treats it that way.
- Queries are lower-cased, whitespace-collapsed and Unicode-normalised.

### 5.5 Validation

A row is **dropped and listed**, never guessed, if it has:
- a missing or foreign URL;
- an empty query;
- an unreadable date;
- non-numeric or negative clicks or impressions;
- more clicks than impressions.

**Warnings**, where the row is kept:
- a stated CTR that disagrees with clicks ÷ impressions (it's recomputed);
- a position outside 1–1000 (it's ignored);
- an export of exactly **1,000 rows**. That's the UI export limit, so rows are missing. Zero-impression analysis is then switched off; use the Search Console API or Looker Studio for a full export.

### 5.6 Running it

```bash
# Git Bash
SEO_DATA="/e/GloryTecks-SEO-data/weekly/2026-10-05" npm run seo:report
```

```powershell
# PowerShell
$env:SEO_DATA = "E:\GloryTecks-SEO-data\weekly\2026-10-05"; npm run seo:report; Remove-Item Env:SEO_DATA
```

| Variable | Default | Purpose |
|---|---|---|
| `SEO_DATA` | (required) | The snapshot folder |
| `SEO_DATA_PREVIOUS` | Newest dated sibling folder | What to compare with. Compare-mode columns in the same export take precedence. |
| `SEO_INVENTORY` | `docs/SEO_URL_INVENTORY.csv` | Expected URLs, page types, categories and courses |
| `SEO_SITEMAP_BASE` | (off) | Also fetches `/sitemap.xml` and its children (8 requests) and validates hosts. Use it after cutover. Before then, glorytecks.com serves the legacy flat sitemap, and the Vercel deployment still lists the dead `glorytecks-one` host; both are flagged correctly. |

**Output**, written into the snapshot folder:
- `report.md`
- `normalized/pages.csv` (one row per page, with the previous period)
- `normalized/queries.csv`
- `normalized/zero-impression-articles.csv`

The console prints the alert titles. `npm test` skips the runner when `SEO_DATA` is unset.

---

## 6. Search Console limits to keep in mind

- **Data lag:** about 2–3 days. The last day or two of any export is partial, so don't read a "drop" in yesterday.
- **Anonymised queries:** rare queries never appear in the Queries export. The report measures the gap using Dates.csv, which includes them. Page totals are complete.
- **1,000-row UI exports:** see §5.5.
- **Average position** is impression-weighted. A new ranking at position 60 *raises* the average while being good news. Read position together with impressions.
- **Indexing counts lag crawling** by days to weeks. A deploy's effect on indexing shows up the week after.

---

## 7. URL Inspection policy

URL Inspection is for **diagnosis**. "Request indexing" is a small daily quota and doesn't make pages rank.

Use it **only** for:
1. **Major technical fixes.** After fixing a 5xx, a wrong canonical, a noindex or a robots block, inspect a few affected URLs, not all of them. Use *Validate fix* in the Page indexing report for the rest.
2. **Important new pages:** a new course page, landing or hub.
3. **Canonical corrections:** confirm the Google-selected canonical on a sample.
4. **High-value pages after substantive changes:** course pages, the centre page, the homepage. A real content change, not a typo fix.

**Never:**
- request indexing for batches of blog articles; the sitemap handles discovery;
- request indexing for pages marked "Crawled – currently not indexed" without first improving them, since that's a quality signal;
- re-request the same URL on consecutive days.

The report's **§2 shortlist** holds at most 10 URLs, priority pages first, each linked to the alert that selected it. That's the whole weekly budget. Inspect (live test) first; request indexing only once the cause is fixed.

---

## 8. Alert conditions

Thresholds live in `THRESHOLDS` in `lib/seo/monitoring.ts`; this table mirrors them. Change both together.

| Alert | Condition | Severity |
|---|---|---|
| **Sudden indexation loss** | Indexed pages fall ≥ **10%** *and* ≥ **20** pages vs 7 days earlier (from the chart's own history) | Critical |
| **Server errors** | "Server error (5xx)" up ≥ **5** pages vs the previous snapshot | Critical |
| **404 increase** | "Not found (404)" up ≥ **25** pages *and* ≥ **20%** | Warning |
| Soft 404 | Up ≥ **3** pages | Warning |
| **Canonical mismatch** | "Google chose different canonical" or "without user-selected canonical" up ≥ **5** | Warning |
| Not indexed growth | Crawled or Discovered – currently not indexed up ≥ **30** pages *and* ≥ **25%** | Warning |
| **Priority page in a problem list** | Any priority URL (§2) in a 5xx, redirect-error, 404, soft 404, 401/403, canonical, noindex, robots or not-indexed drill-down | Critical, and added to the inspection shortlist |
| **Sitemap failure** | Any status other than *Success*; the live check fails; discovered URLs ≥ **5%** from the inventory | Critical / warning |
| **Major traffic drop** | Site clicks −**25%** *and* −**50** clicks | Critical |
| **Major impression change** | Site impressions ±**30%** *and* ±**2,000** | Critical if down, warning if up |
| Group drop | A priority group (course, course hub, landing, home, centre, categories, articles) loses −**30%** *and* **20** clicks (or −30% *and* 300 impressions), **and** is ≥ **15 points** worse than the site overall | Warning |
| **Course page visibility** | A course page with ≥ **100** impressions drops to **0** | Critical, and shortlisted |
| | A course page's impressions −**40%** (≥ 100 before), ≥ 15 points worse than the site | Warning, and shortlisted |
| | Average position worse by ≥ **3.0**, with ≥ **100** impressions in both periods | Warning |
| Core Web Vitals | Poor URLs +**5** vs 28 days earlier, or Good share −**10 points** (per device) | Warning |

**Noise controls:**
- No traffic alert fires until the previous period has **500+ impressions**.
- Traffic and count rules need both a relative and an absolute change; error rules need a real absolute increase.
- A site-wide change is reported once, not once per group.
- Normal cutover churn stays below the 404 rule by design: the 8 known legacy URLs are fewer than 25.

---

## 9. Interpreting the numbers

- **Indexed below 656 is normal.** Google indexes selectively, and this blog has hundreds of near-duplicate articles (BLOG_CONTENT_QUALITY_REPORT.md). A falling *trend* matters; a fixed gap doesn't.
- **"Crawled – currently not indexed" on articles is a content signal.** On a course page or landing, it's an alert.
- **Impressions up while CTR goes down** usually means new, low-position rankings. That's growth, not a problem.
- **Branded vs non-branded.** Branded queries measure awareness. Non-branded local and commercial queries are the growth number for an institute.
- **Course pages vs landings vs articles.** Local and commercial queries should land on course pages and landings. If an article ranks for `… course hyderabad`, check ownership (SEO_KEYWORD_OWNERSHIP_MATRIX.md) before changing anything.
- **During the domain cutover** (legacy SPA → Next.js):
  - expect the 8 legacy-only URLs to show in 404 or redirect reports, depending on the Phase 7 decision;
  - expect title changes ("Training" → "Course") to move CTR for a few weeks;
  - start a **new baseline** from the first full 28 days after cutover, and don't compare across it;
  - Core Web Vitals field data turns over on a 28-day rolling window.

---

## 10. Actions when a problem is detected

| Alert | First step | Then | Don't |
|---|---|---|---|
| Indexation loss | Which reason grew by the same amount? Was there a deploy on that date? | Check robots.txt, `X-Robots-Tag`, canonicals and the sitemap on 2–3 affected URLs (live test); run `npm run test:smoke` | Don't mass-request indexing |
| 5xx | Export the drill-down; reproduce with `curl` | Check Vercel function logs and the backend; fix; *Validate fix* | Don't raise revalidate times to hide errors |
| 404 increase | Export the list: removed content, or broken links? | Removed content: decide 404/410 vs 308 per URL (no automatic redirects). Broken link: fix the link. | Don't redirect everything to the homepage |
| Soft 404 | Open 2–3 listed URLs | Empty or thin page returning 200: make it a real 404, or give it content | — |
| Canonical mismatch | URL Inspection: user-declared vs Google-selected | Duplicate content → consolidate; a wrong tag → fix the template | Don't change canonicals on one data point |
| Sitemap failure | Fetch `/sitemap.xml` and the children yourself | Fix generation or host, then resubmit `/sitemap.xml` only | Don't submit the children individually |
| Traffic drop | Rule out indexing, manual actions and the date range first | Find the pages and queries that lost the most (report §5–6); a single query or page is a ranking change | Don't rewrite pages in the first week |
| Course page visibility | Inspect the URL (shortlist) | Check its queries: lost ranking, or a competing URL of ours? | Don't edit course content without the business (project rule) |
| Core Web Vitals | Which metric and which URL group? A deploy at the turn? | Reproduce with applied-throttling Lighthouse; fix; watch 28 days | Don't trust a simulated Lighthouse score alone |

Any fix that changes visible copy, course information or business facts still needs approval first; that rule is unchanged.

---

## 11. What is in the repository

| File | Role |
|---|---|
| `lib/seo/monitoring.ts` | CSV parsing, number and URL normalisation, export detection, snapshot assembly, page and query segmentation, alert rules, `THRESHOLDS` |
| `lib/seo/monitoringReport.ts` | Report assembly, Markdown and normalised CSV rows |
| `lib/seo/monitoring.report.test.ts` | The runner behind `npm run seo:report` (skipped without `SEO_DATA`) |
| `lib/seo/monitoring.test.ts` | Unit tests: variants de-duplicate, Compare-mode split, validation, segmentation, every alert rule including its noise floor |
| `docs/SEO_URL_INVENTORY.csv` | The expected URL set; re-generate quarterly |
