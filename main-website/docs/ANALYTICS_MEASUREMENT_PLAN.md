# Analytics & SEO Measurement Plan

**Ranking position is not the goal.** An institute does not get paid for
position 3; it gets paid for enquiries. This plan measures the whole chain —
impressions → clicks → sessions → leads — so a change can be judged by what it
produced, not by where a keyword sat.

**Current stack:** GA4 (`G-MKXRJHXL9C`), Google Tag Manager (`GTM-TD5HFZ79`),
Search Console. Event helpers exist in `lib/analytics.ts`
(`trackEvent`, `trackLead`).

> ✅ **GA4 is loaded once (verified 2026-09-24).** The GTM container
> (`GTM-TD5HFZ79`, version 3) holds a single tag, Microsoft Clarity, and no GA4
> tag. `gtag.js` in `app/layout.tsx` is the only GA4 loader, so do not remove it.
> See `PERFORMANCE_SEO_VERIFICATION.md` §5.

---

## 1. What gets measured

### Search Console — visibility

| Metric | Segment by | Cadence | Read as |
| --- | --- | --- | --- |
| Impressions | Page type, query | Weekly | Is Google showing us at all? |
| Clicks | Page type, query | Weekly | Is the listing compelling? |
| CTR | Page, query | Monthly | Title/description quality |
| Average position | Query cluster | Monthly | Direction, never a target |

**Segment every report by page type.** Site-wide averages are meaningless when
9 course pages sit alongside 592 blog articles — the blog will dominate
impressions and hide what the commercial pages are doing.

| Segment | Filter |
| --- | --- |
| Commercial core | `/courses*`, `/training-in-hyderabad`, `/contact` |
| Local landings | 15 `{course}-course-{locality}` URLs |
| Blog | `/blog*` |
| Brand | Query contains "glorytecks" / "glory tecks" |
| Non-brand | Everything else — **the real growth number** |

### GA4 — behaviour and outcomes

| Metric | Why |
| --- | --- |
| Organic sessions | Traffic volume |
| Organic landing pages | Which pages are the entry points |
| Engagement rate by landing page | Did the page deliver what the query promised |
| Conversions by landing page | The number that matters |

---

## 2. Conversions

The site has five real lead actions. All should be GA4 **key events**.

| Event | Trigger | Where | Status |
| --- | --- | --- | --- |
| `generate_lead` (`method: contact_form`) | Contact form submit | `/contact` | Helper exists — `trackLead` |
| `generate_lead` (`method: demo`) | Demo request submit | `DemoModal`, site-wide | Helper exists |
| `generate_lead` (`method: whatsapp`) | WhatsApp click | 21 call sites | **Wire up** |
| `generate_lead` (`method: call`) | `tel:` click | 3 call sites + floating CTA | **Wire up** |
| `brochure_download` | Brochure link click | Course pages | **Wire up** |

Recommended parameters on every lead event:

```js
trackLead('whatsapp', {
  course_slug: 'data-science',   // which course prompted it
  page_path: '/courses/data-science',
  page_type: 'course',           // course | landing | blog | static
});
```

`page_type` is what lets you answer *"do blog readers ever enquire?"* — the
question that decides whether the 417 flagged guide articles are worth
rewriting or retiring.

### Micro-conversions

Useful leading indicators, not goals: `scroll_depth` ≥75% on course pages,
`view_syllabus` (syllabus accordion open), `view_item` on course detail.

---

## 3. Reporting cadence

### Weekly (5 min)

| Check | Healthy | Act if |
| --- | --- | --- |
| GSC Page indexing | Indexed climbing toward 653 | Errors appear, or indexed count drops |
| GSC Manual actions / Security | *No issues* | Anything at all — stop and fix |
| Sitemap status | *Success* | "Couldn't fetch" persists >48 h |
| GA4 organic sessions | Stable or up | Week-over-week drop >20% |

### Monthly (30 min)

1. Impressions and clicks by segment (§1) — commercial core separately.
2. Top 20 non-brand queries: are they course queries or blog queries?
3. Conversions by landing page and `page_type`.
4. CTR outliers: high impressions + low CTR = a title/description to rewrite.
5. Core Web Vitals: URL groups in *Good*.
6. GBP Insights: views, calls, direction requests.

### Quarterly

- Cannibalisation check: does one query return two of our URLs? Cross-check
  against `SEO_KEYWORD_MAP.md`.
- Content decision: blog URLs with 90 days of zero impressions →
  `BLOG_CONTENT_ACTION_PLAN.md` §3 tranche B.
- NAP drift audit.

---

## 4. Baselines to record on launch day

Record these before anything changes, or there is nothing to compare against.

| Metric | Value on launch |
| --- | --- |
| Indexed pages (GSC) | ____ |
| Total impressions, 28 d | ____ |
| Total clicks, 28 d | ____ |
| Non-brand clicks, 28 d | ____ |
| Organic sessions, 28 d | ____ |
| Organic leads, 28 d | ____ |
| Course-page organic sessions | ____ |
| Blog organic sessions | ____ |
| Avg position, commercial core | ____ |
| Core Web Vitals: Good URLs | ____ |

---

## 5. Reasonable expectations

| Horizon | What to look at | What *not* to conclude |
| --- | --- | --- |
| 0–4 weeks | Indexation, crawl health, technical errors | Nothing about rankings — too early |
| 1–3 months | Impressions rising; first non-brand queries | Position volatility is normal |
| 3–6 months | Clicks and CTR; early lead attribution | A flat month is not a failure |
| 6–12 months | Position trends; lead volume from organic | |

Changes shipped in these phases — canonical correctness, sitemap accuracy, a
coherent entity graph, 62 KB less JavaScript — act on *how Google understands
and renders the site*. That is a slow-moving input. The fast-moving one is the
content decision still pending on the blog.

---

## 6. Known measurement limitations

| Limitation | Consequence |
| --- | --- |
| Duplicate GA4 load | **Resolved: not duplicated** (GTM holds only Clarity; `PERFORMANCE_SEO_VERIFICATION.md` §5) |
| GSC query data is sampled and thresholded | Long-tail queries are invisible; use impressions, not query counts |
| Phone calls placed from a Maps listing | Not attributable to the site — read GBP Insights alongside GA4 |
| WhatsApp conversations | Only the click is measurable; the conversation is not |
| No CRM link | Lead *quality* and enrolment are not measurable here. Enquiry→enrolment is the number the business actually cares about, and it needs the CRM to be joined to `page_path`. |

The last one is the biggest gap. Until it closes, "organic leads" is a proxy
for revenue, not a measure of it.
