# Google Search Console — Launch Checklist

Do these in order. Steps 1–2 are the only ones that must happen on launch day;
the rest are verification and monitoring.

---

## 1. Verify the property

Use a **Domain property** (`glorytecks.com`), not a URL-prefix property. A
domain property covers `http`/`https`, `www`/non-`www` and every subdomain at
once, so nothing is missed because it was submitted under the wrong variant.

1. Search Console → *Add property* → **Domain** → `glorytecks.com`
2. Copy the TXT record it gives you.
3. Add it at your DNS provider: type `TXT`, host `@`, value as supplied.
4. Wait for propagation (usually minutes, up to 24 h) → *Verify*.

If DNS access is not available, fall back to a URL-prefix property for
`https://glorytecks.com/` verified by HTML tag — but add the domain property
later.

> **Keep verification in place.** Removing the TXT record un-verifies the
> property and you lose historical data access.

---

## 2. Submit the sitemap

**One URL. Do not submit the children individually.**

```
https://glorytecks.com/sitemap.xml
```

Sitemaps → *Add a new sitemap* → `sitemap.xml` → Submit.

It is a `<sitemapindex>` pointing at seven children, which Google discovers
itself:

| Child | URLs |
| --- | ---: |
| `/sitemaps/pages.xml` | 9 |
| `/sitemaps/courses.xml` | 9 |
| `/sitemaps/blog.xml` | 592 |
| `/sitemaps/categories.xml` | 13 |
| `/sitemaps/locations.xml` | 15 |
| `/sitemaps/resources.xml` | 5 |
| `/sitemaps/compare.xml` | 10 |
| **Total** | **653** |

**Expected result:** *Success*, 7 sitemaps discovered, 653 URLs. "Couldn't
fetch" immediately after submission is usually just Google not having crawled
yet — re-check after 24 h before investigating.

### Old sitemap URLs

Four URLs were previously submitted and now 308-redirect:

```
/sitemap-index.xml    → /sitemap.xml
/blog-sitemap.xml     → /sitemaps/blog.xml
/category-sitemap.xml → /sitemaps/categories.xml
/image-sitemap.xml    → /sitemaps/blog.xml
```

Leave them in Search Console for a few weeks so Google processes the redirects,
then delete those four entries. Do **not** delete them on day one.

---

## 3–7. URL inspection

Inspect a **representative sample**, not everything. The purpose is to confirm
Google renders each *template* correctly — one page per template proves the
template.

| # | Page | URL | What to confirm |
| --- | --- | --- | --- |
| 3 | Homepage | `https://glorytecks.com` | Indexable · canonical is `https://glorytecks.com` (no trailing slash) · Organization, WebSite, LocalBusiness, FAQPage detected |
| 4 | Training centre | `https://glorytecks.com/training-in-hyderabad` | LocalBusiness detected · address matches the Google Business Profile **exactly** |
| 5 | Course pages (all 9) | `/courses/{slug}` | Course schema · no `offers` warning · title and H1 match |
| 6 | Blog (3–5 samples) | `/blog`, `/blog/category/python`, 2–3 articles | BlogPosting · author present · category archive shows **its own** articles |
| 7 | Location landing | `/data-science-course-ameerpet` | Course + FAQPage · canonical self-referencing |

**The nine course URLs:**

```
/courses/data-science        /courses/gen-ai            /courses/agentic-ai
/courses/python-programming  /courses/power-bi          /courses/mlops
/courses/data-engineering    /courses/data-analytics    /courses/sql-server
```

For each: *Inspect* → **Test Live URL** → check *View crawled page* renders
content (not an empty shell) and *Enhancements* lists the expected schema.

> **Check the category archives specifically.** A cache-key bug was serving the
> same 50 Python articles on all twelve category pages. It is fixed, but this is
> the thing to confirm with your own eyes on `/blog/category/aws` and
> `/blog/category/mlops`.

---

## 8. Request indexing — sparingly

**Request indexing for these ~15 URLs only:**

- Homepage
- `/courses`, `/training-in-hyderabad`, `/contact`, `/about`
- The 9 course detail pages

That is the commercial core. Everything else is discovered through the sitemap
and internal links.

**Do not request indexing for the 592 blog articles.** The daily quota is ~10
URLs; manual submission does not rank pages faster, and bulk-submitting
low-differentiation content is a poor signal. The blog sitemap handles
discovery.

> Related: `BLOG_CONTENT_ACTION_PLAN.md` flags 417 near-duplicate guide
> articles pending a keep/rewrite decision. Do not push them for indexing
> before that decision is made.

---

## 9. Monitoring schedule

### Week 1 — daily

| Report | Watch for | Action if bad |
| --- | --- | --- |
| **Sitemaps** | Status *Success*, 653 discovered | Fetch the sitemap yourself; check for a 5xx |
| **Page indexing** | Errors appearing | Read the reason before acting |
| **Manual actions** | Must be *No issues detected* | Address immediately — this overrides everything |
| **Security issues** | Must be *No issues detected* | Address immediately |

### Weeks 2–4 — weekly

| Report | Healthy | Investigate if |
| --- | --- | --- |
| **Page indexing** | Indexed count climbing toward 653 | "Crawled – currently not indexed" grows on *course* pages (content signal), or "Duplicate, Google chose different canonical" appears at all |
| **Core Web Vitals** | URLs entering *Good* | Any *Poor* group — cross-check `PERFORMANCE_BUDGET.md` |
| **HTTPS** | 100% HTTPS | Any HTTP URL reported |
| **Crawl stats** | Steady, no 5xx spike | Response time climbing — check Vercel function usage |

### Ongoing — monthly

- **Performance**: impressions, clicks, CTR, average position — segment by page
  type (see `ANALYTICS_MEASUREMENT_PLAN.md`)
- **Links**: internal link counts should reflect the hub-and-spoke structure —
  course pages should be among the most-linked
- Re-check **Page indexing** for drift

---

## 10. Expected indexing pattern

| Timeframe | Reasonable expectation |
| --- | --- |
| 24–48 h | Sitemap processed; homepage and course pages indexed |
| 1–2 weeks | Most static and course pages indexed; blog indexing under way |
| 4–8 weeks | Bulk of the archive settled; first meaningful query data |
| 3 months | Position trends become readable |

**Not everything will be indexed, and that is normal.** Google indexes
selectively. A large gap on the blog would be a *content* signal, not a
technical one — the technical side is verified below.

---

## 11. Pre-flight — verified in this release

Confirmed by crawling the production build against the live backend:

- ✅ 87 routes crawled, **all HTTP 200**
- ✅ 0 duplicate titles, descriptions or canonicals
- ✅ 10 redirects, **all exactly 1 hop**, no chains, no loops
- ✅ 14 must-404 URLs (bot probes, bad slugs, invalid pagination) all return 404 — **no soft 404s**
- ✅ Sitemap index + 7 children, **653 unique URLs**, none in two sitemaps
- ✅ robots.txt permits crawling, blocks only `/api/`, one sitemap URL
- ✅ JSON-LD parses on all 10 page types; one Organization node; no self-serving ratings

### One deployment-order requirement

`GET /public/blogs/sitemap` is new backend code. **Deploy the backend first.**
If the frontend goes out ahead of it the sitemap still works — it falls back to
the paginated walk — but at ~50 requests/hour instead of 1. Verify after
deploy:

```
curl -s -o /dev/null -w "%{http_code}\n" https://<backend>/api/v1/public/blogs/sitemap   # expect 200
```
