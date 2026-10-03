# Local Landing Page Audit (Phase 7)

**Date:** 2026-09-24 · **Scope:** every `/{course}-course-{locality}` URL plus the two centre pages. That is 24 URLs on the live site (glorytecks.com, legacy SPA) and 16 in the Next.js build (15 landings plus the centre page).
**Changes made:** none. This phase is an audit only. No UI, copy, CMS, route, redirect or index-status change was made.
**Search Console:** not available. Every keep, consolidate or noindex decision below is **gated on GSC data** (§5).

Related reports:
- [`SEO_PRODUCTION_PARITY_REPORT.md`](SEO_PRODUCTION_PARITY_REPORT.md) covers the 8 URLs that 404 at cutover.
- [`LOCAL_SEO_MASTER_AUDIT.md`](LOCAL_SEO_MASTER_AUDIT.md) covers NAP and the 603/611 street number.
- [`SEO_KEYWORD_OWNERSHIP_MATRIX.md`](SEO_KEYWORD_OWNERSHIP_MATRIX.md) has the Phase 3 KEEP / MANUAL REVIEW status.
- [`COURSE_PAGE_SEO_GAP_REPORT.md`](COURSE_PAGE_SEO_GAP_REPORT.md) covers the parent course pages and the "100% / 500+" claims.

---

## 1. Summary

| | |
|---|---|
| Local URLs on the live site | **24**: 22 landings, `/training-in-hyderabad` and `/training-in-ameerpet`. All 24 are in the live `sitemap.xml`. |
| Local URLs in the Next build | **16**: 15 landings (route table `config/locationLandings.ts`) and `/training-in-hyderabad`. All 16 are in the new sitemaps. |
| **URLs that 404 at cutover** | **8**: 7 legacy-only landings and `/training-in-ameerpet`. Nothing redirects them (§7.3). |
| Physical centre | **Ameerpet only.** No page claims a branch, campus, address, local trainer, local classroom, local partnership or local placement office in any other locality. |
| Wording that implies more than the service area supports | FAQ puts "the Ameerpet centre, near {other locality}" on **9 of 15** new and **13 of 22** live pages. "{Locality} batch offers" appears on **15 of 15** new pages. The "Online & classroom batches" badge under a "{Locality}, Hyderabad" pin appears on **15 of 15** new pages. Weekend-batch wording with no location is on **4 of 15** new pages (§3). |
| Parent course overlap | New: **9–10%** of a landing's text is on its course page. Live: **34–56%**. Neither is a duplicate of its course page. |
| Sibling overlap | Same course, other locality, with names masked: **0.59–0.74** Jaccard. The locality copy (49–63 words) is the only real difference, and every landing in the same locality shares it (§4). |
| Technical SEO | **Passes** on all 15: 1 H1, self canonical, `index, follow`, in sitemap, 4 visible FAQs matching FAQPage, onsite CourseInstance → Ameerpet. There are 7 template-level defects, none blocking (§6). |
| **Street number** | New Ameerpet landings show **603** in the intro and **611** in the footer on the **same page**; the live landings show 611. This is an open business decision, [`LOCAL_SEO_MASTER_AUDIT.md`](LOCAL_SEO_MASTER_AUDIT.md) §1. **Not chosen here.** |

**Recommended actions** (details in §7). None has been applied, and each needs your approval.

1. **Keep and deepen** the 6 Ameerpet landings. They describe the one real centre.
2. **Keep the 9 non-Ameerpet landings indexed for now, but correct the wording first.** Decide keep, improve or consolidate per URL once GSC data exists. No page is noindexed or redirected on similarity alone.
3. **Decide the 8 cutover 404s before launch.** Suggested defaults:
   - `/training-in-ameerpet`: 308 to `/training-in-hyderabad`.
   - The 3 Ameerpet legacy landings: restore them in `config/locationLandings.ts`.
   - The 4 non-Ameerpet legacy landings: 308 to their course page, unless GSC shows clicks.

---

## 2. Inventory (Step 1)

### 2.1 Every local URL

"New" is the Next build, served locally (`next start` against the local API). "Live" is glorytecks.com on 2026-09-24. Parent is the course page each landing belongs to.

| # | URL | Course (parent) | Locality | New | Live | New sitemap | Live sitemap |
|---|---|---|---|---|---|---|---|
| 1 | `/data-science-course-ameerpet` | Data Science (`/courses/data-science`) | Ameerpet | 200 | 200 | ✅ `locations.xml` | ✅ |
| 2 | `/data-science-course-kukatpally` | Data Science | Kukatpally (KPHB) | 200 | 200 | ✅ | ✅ |
| 3 | `/data-science-course-madhapur` | Data Science | Madhapur | 200 | 200 | ✅ | ✅ |
| 4 | `/data-science-course-gachibowli` | Data Science | Gachibowli | 200 | 200 | ✅ | ✅ |
| 5 | `/data-science-course-hitech-city` | Data Science | HITEC City | 200 | 200 | ✅ | ✅ |
| 6 | `/data-science-course-dilsukhnagar` | Data Science | Dilsukhnagar | 200 | 200 | ✅ | ✅ |
| 7 | `/python-course-ameerpet` | Python Programming (`/courses/python-programming`) | Ameerpet | 200 | 200 | ✅ | ✅ |
| 8 | `/python-course-kukatpally` | Python Programming | Kukatpally (KPHB) | 200 | 200 | ✅ | ✅ |
| 9 | `/power-bi-course-ameerpet` | Power BI (`/courses/power-bi`) | Ameerpet | 200 | 200 | ✅ | ✅ |
| 10 | `/power-bi-course-kukatpally` | Power BI | Kukatpally (KPHB) | 200 | 200 | ✅ | ✅ |
| 11 | `/generative-ai-course-ameerpet` | Generative AI (`/courses/gen-ai`) | Ameerpet | 200 | 200 | ✅ | ✅ |
| 12 | `/generative-ai-course-madhapur` | Generative AI | Madhapur | 200 | 200 | ✅ | ✅ |
| 13 | `/data-analytics-course-ameerpet` | Data Analytics (`/courses/data-analytics`) | Ameerpet | 200 | 200 | ✅ | ✅ |
| 14 | `/data-analytics-course-kukatpally` | Data Analytics | Kukatpally (KPHB) | 200 | 200 | ✅ | ✅ |
| 15 | `/mlops-course-ameerpet` | MLOps (`/courses/mlops`) | Ameerpet | 200 | 200 | ✅ | ✅ |
| 16 | `/agentic-ai-course-ameerpet` | Agentic AI (`/courses/agentic-ai`) | Ameerpet | **404** | 200 | ❌ | ✅ |
| 17 | `/agentic-ai-course-madhapur` | Agentic AI | Madhapur | **404** | 200 | ❌ | ✅ |
| 18 | `/data-engineering-course-ameerpet` | Data Engineering (`/courses/data-engineering`) | Ameerpet | **404** | 200 | ❌ | ✅ |
| 19 | `/data-engineering-course-hitech-city` | Data Engineering | HITEC City | **404** | 200 | ❌ | ✅ |
| 20 | `/generative-ai-course-gachibowli` | Generative AI | Gachibowli | **404** | 200 | ❌ | ✅ |
| 21 | `/sql-server-course-ameerpet` | SQL Server (`/courses/sql-server`) | Ameerpet | **404** | 200 | ❌ | ✅ |
| 22 | `/sql-server-course-kukatpally` | SQL Server | Kukatpally (KPHB) | **404** | 200 | ❌ | ✅ |
| 23 | `/training-in-hyderabad` | Centre page (LocalBusiness) | Ameerpet | 200 | 200 | ✅ | ✅ |
| 24 | `/training-in-ameerpet` | Centre page (legacy duplicate) | Ameerpet | **404** | 200 | ❌ | ✅ |

URLs 16–22 have a course and a locality that both exist in the CMS. They 404 only because `config/locationLandings.ts` does not list them, and `dynamicParams = false`.

### 2.2 Head elements (new build)

The template is `app/(site)/[landingSlug]/page.tsx`:
- Title: `{Course} Course in {Locality}, Hyderabad | GloryTecks`
- H1: `{Course} Course in {Locality}, Hyderabad`
- Canonical: self (absolute)
- Robots: `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`
- Schema: EducationalOrganization, WebSite, Course, FAQPage, BreadcrumbList

| URL | Title (chars) | Description (chars) | H1 | Canonical | Robots |
|---|---|---|---|---|---|
| `/data-science-course-ameerpet` | 55 | 174 | ✅ 1 | self | index |
| `/data-science-course-kukatpally` | **64** | 183 | ✅ 1 | self | index |
| `/data-science-course-madhapur` | 55 | 174 | ✅ 1 | self | index |
| `/data-science-course-gachibowli` | 57 | 176 | ✅ 1 | self | index |
| `/data-science-course-hitech-city` | 57 | 176 | ✅ 1 | self | index |
| `/data-science-course-dilsukhnagar` | 59 | 178 | ✅ 1 | self | index |
| `/python-course-ameerpet` | 61 | 182 | ✅ 1 | self | index |
| `/python-course-kukatpally` | **70** | **191** | ✅ 1 | self | index |
| `/power-bi-course-ameerpet` | 51 | 179 | ✅ 1 | self | index |
| `/power-bi-course-kukatpally` | 60 | 188 | ✅ 1 | self | index |
| `/generative-ai-course-ameerpet` | 56 | 175 | ✅ 1 | self | index |
| `/generative-ai-course-madhapur` | 56 | 175 | ✅ 1 | self | index |
| `/data-analytics-course-ameerpet` | 57 | 180 | ✅ 1 | self | index |
| `/data-analytics-course-kukatpally` | **66** | 189 | ✅ 1 | self | index |
| `/mlops-course-ameerpet` | 48 | 169 | ✅ 1 | self | index |
| `/training-in-hyderabad` | 54 | 180 | ✅ 1 | self | index |

On the live site the titles use "Training" rather than "Course" (for example, "Data Science **Training** in Ameerpet, Hyderabad | GloryTecks") and drop "(KPHB)" from the title. Live titles are 50–65 characters and descriptions 130–154. So at cutover every landing's title and H1 wording changes from "Training" to "Course". This matches the URL slug and the Phase 3 keyword map. Note it when you read GSC before and after launch.

### 2.3 Page body (all 15 share one template)

`components/views/LocationCourseView.tsx`, top to bottom:

| Section | Source | Locality-specific? |
|---|---|---|
| Breadcrumb: Home › Courses › {Course} in {Locality} | template | name only |
| Pin label "{Locality}, Hyderabad" and H1 | template | name only |
| Intro paragraph | CMS `localities.intro` | ✅ |
| Paragraph: course description, then locality context | CMS `courses.description` + `localities.context` | context ✅ |
| CTAs (demo, WhatsApp, phone); badges: duration, "100% placement support", "Online & classroom batches" | template, CMS duration | ❌ |
| "Why learn {Course} in {Locality}?" | `localities.context` **again**, then a template sentence with `localities.nearby` | context ✅ (repeated), nearby ✅ |
| Curriculum (first 10 modules), tools, "View full syllabus" → course page | CMS course | ❌ |
| Career roles and salary ("Indicative ranges based on Hyderabad market trends") | CMS category | ❌ |
| FAQ (4, native `<details>`) | template (`buildFaqs`) | name and nearby only |
| "{Course} Course in Other Areas" / "Other Courses in {Locality}" | route table | links |
| CTA → `/contact` | template | ❌ |

**First 200 words.** 159–179 of the first 200 words come before the curriculum starts. Of those, 70–89 are locality sentences: the intro, the context **twice**, and the nearby list. The same locality text sits in the same place on every landing for that locality. The live pages show the context once, so their first 200 words hold 36–53 locality words.

**Unique local content.** Each locality has one intro, one context and one nearby list:

| Locality | Words (intro / context / nearby) | Landings sharing it (new) | Physical centre? | Courses the copy names |
|---|---|---|---|---|
| Ameerpet | 63 (27 / 26 / 10) | 6 | **Yes** | none (centre address, metro) |
| Kukatpally (KPHB) | 52 (21 / 24 / 7) | 4 | No | Data Science, analytics |
| Madhapur | 53 (23 / 22 / 8) | 2 | No | AI, Data Science |
| Gachibowli | 49 (19 / 21 / 9) | 1 | No | Data Science, Python, Power BI |
| HITEC City | 52 (21 / 24 / 7) | 1 | No | Data Science, Generative AI, Power BI |
| Dilsukhnagar | 50 (22 / 22 / 6) | 1 | No | Data Science, Python, analytics |

Nothing on a landing is specific to its **course × locality** pair beyond the two names.

**Internal links (in `<main>`).** Each landing has 7–15 links:
- breadcrumb: Home, Courses
- `/contact` (twice)
- the parent course, via "View full {Course} syllabus"
- the same course in other localities
- other courses in the same locality

**No in-body link** goes to the centre page, `/placements`, `/blog`, `/compare` or any article. The centre page `/training-in-hyderabad` links 9 course pages, `/placements` and `/contact` in its body, and **no landing**. Landings and the centre page reach each other only through the sitewide header ("Locations" → the 6 Data Science landings) and footer ("Popular Courses by Location": all 15, plus "IT Training in Hyderabad"). The live landings link in-body to the course page, `/training-in-ameerpet`, `/training-in-hyderabad` and `/placements`.

**FAQ.** Each landing has 4 FAQs, all visible, identical to the FAQPage JSON-LD. They are generated by `buildFaqs(course, loc, phone)`:
1. Where can I learn {Course} in {Locality}?
2. Duration and fee.
3. Placement support.
4. Suitability for beginners and professionals.

The live pages have the same four, and they are also visible.

**Schema.** The Course node is named `{Course} Course in {Locality}, Hyderabad`, with `provider → #organization` and 2 CourseInstances:
- `onsite`, with `location → #localbusiness` (the Ameerpet centre)
- `online`

The FAQPage and BreadcrumbList nodes are listed above. **No node places GloryTecks in the landing's locality.** The live pages also emit a full LocalBusiness node (Ameerpet) on every landing.

---

## 3. Physical vs service area (Step 2)

**The facts** (CMS, `config/business.ts`, [`LOCAL_SEO_MASTER_AUDIT.md`](LOCAL_SEO_MASTER_AUDIT.md)):
- There is one physical centre, in Ameerpet.
- Other localities are served by live online batches, plus classroom batches at Ameerpet.
- `areaServed` lists Hyderabad, Secunderabad and Telangana as names only, with no address. `lib/seo/nap.test.ts` asserts that no schema implies a second campus.

**Not found on any page (new or live):** a branch, a campus, an address other than Ameerpet, a local trainer, a local classroom, a local partnership or a local placement office.

**Correct and specific.** Two locality texts are worth keeping as the model:
- Kukatpally: "easy metro access to the Ameerpet centre via the Red Line"
- HITEC City: "available online and at the Ameerpet centre"

**Wording that overstates the service area.** Each item changes visible copy, so each needs your approval. The first 3 are template text in the repo; the rest are CMS content or business claims.

| # | Wording | Where | New | Live | Problem | Safe wording (proposal) |
|---|---|---|---|---|---|---|
| W1 | FAQ 1: "…classroom training at the Ameerpet centre, **near {nearby}**" | `buildFaqs` | **9/15** (all non-Ameerpet) | 13/22 | It says the Ameerpet centre is near KPHB, Miyapur, the Financial District, LB Nagar and so on. The places listed are the landing's area, not the centre's. It is correct only on Ameerpet landings. | Non-Ameerpet: "GloryTecks offers the {Course} course for learners in {Locality} and nearby areas such as {nearby} through live online batches. Classroom batches run at the Ameerpet centre." Ameerpet: unchanged. |
| W2 | FAQ 2: "Call {phone} for the current fee structure **and any {Locality} batch offers**" | `buildFaqs` | **15/15** | 0/22 | It implies locality-specific batches or offers. There are none. The live site doesn't say it. | "Call {phone} for the current fee structure and batch timings." (the live wording, plus timings) |
| W3 | Badge "**Online & classroom batches**" directly under the pin label "{Locality}, Hyderabad" | `LocationCourseView.tsx` | **15/15** | 0/22 | Next to a pin, "classroom" reads as a classroom in that locality. It is correct only on Ameerpet landings. | Non-Ameerpet: "Online · classroom at Ameerpet". Ameerpet: unchanged. |
| W4 | Locality context "evening and weekend batches" (Madhapur), "online and weekend formats" (Gachibowli), "live online and weekend batches" (Dilsukhnagar) | CMS `localities.context` | 4/15 | 6/22 | It doesn't say where weekend batches happen. Weekend classroom sessions are at Ameerpet; online ones are online. | Say which it is: for example, "…live online evening classes and weekend classroom batches at the Ameerpet centre". **The business must confirm which formats exist.** |
| W5 | "affordable" (Dilsukhnagar context) | CMS | 1/15 | 1/22 | An unverified comparative claim | Remove the word, or state the EMI option already given in FAQ 2 |
| W6 | "100% placement support" (badge and meta description), "100% placement assistance with **500+ hiring partners**" (FAQ 3, from CMS `courses.placement`) | template + CMS | 15/15 | 22/22 | Already open from Phase 6: the CMS lists 20 partner companies. | Follow the Phase 6 decision ([`COURSE_PAGE_SEO_GAP_REPORT.md`](COURSE_PAGE_SEO_GAP_REPORT.md) §8.2). Reuse the vetted `HOME_FAQS` wording. |
| W7 | Street number: intro "603, Annapurna Block" and footer "611, Annapurna Block" on the **same** Ameerpet landing. The Organization JSON-LD says 603. Live Ameerpet landings say 611. | CMS `localities.intro` (Ameerpet), CMS Settings, `config/business.ts` | 6/15 | — | This is the open NAP conflict | **Business decision**, [`LOCAL_SEO_MASTER_AUDIT.md`](LOCAL_SEO_MASTER_AUDIT.md) §1. Do not choose here. |
| W8 | Salary ranges, "Indicative ranges based on Hyderabad market trends" | template + CMS `blog_categories` salary fields | 15/15 | 22/22 ("Indicative Hyderabad salaries") | No source on either site. The **figures also change at cutover for all 6 courses**. For example, Data Science is ₹4–7 / 10–18 / 20–40+ LPA live and ₹5–9 / 12–22 / 25–45 LPA in the CMS. The only figures that match are the Python fresher figure and the MLOps fresher and mid-level figures. | The business picks one set and a real source. Otherwise keep the "indicative" caveat and drop "based on Hyderabad market trends". **Never invent a source.** |

**Course relevance of the locality copy.** Each locality's text names particular courses, and it is shown on every course's landing for that locality:
- Kukatpally: "Data Science and analytics skills" appears on the Python landing.
- Gachibowli: "Data Science, Python and Power BI" appeared on the legacy Generative AI landing.
- HITEC City: "Data Science, Generative AI and Power BI" appeared on the legacy Data Engineering landing.

This is not a false claim, but it weakens the page's course relevance. If you ever restore those legacy pages as they are, they inherit this mismatch.

---

## 4. Duplication (Step 3)

### 4.1 Method

- Each page is split into 5-word shingles from its `<main>` text (JavaScript and CSS removed). For live pages, the prerendered `<body>` is used instead.
- **In-parent:** the share of the landing's shingles that also appear on its course page.
- **Sibling (norm.):** the Jaccard similarity to the closest landing for the **same course**, after masking locality and course names. This shows what the template shares when the names are hidden.
- **Unique:** the share of shingles found on neither the parent nor any other landing.
- **Attribution:** each word is assigned to the locality record, the course record or fixed template text.

Scripts are in the session scratchpad (`inventory.mjs`, `similarity.mjs`, `attribution.mjs`). Phase 3 reported 6–7% course overlap and 52–60% sibling overlap using a raw main-copy measure. The figures here use a different measure, so they differ.

### 4.2 Results (new build)

| URL | Words | In-parent | Closest sibling (norm.) | Unique | Words: locality / course / template |
|---|---|---|---|---|---|
| `/data-science-course-ameerpet` | 578 | 9% | 0.71 (Madhapur) | 4% | 21% / 34% / 46% |
| `/data-science-course-kukatpally` | 568 | 9% | 0.64 (Gachibowli) | 3% | 21% / 34% / 45% |
| `/data-science-course-madhapur` | 547 | 9% | 0.72 (HITEC City) | 6% | 18% / 36% / 46% |
| `/data-science-course-gachibowli` | 532 | 10% | 0.74 (HITEC City) | 23% | 17% / 36% / 46% |
| `/data-science-course-hitech-city` | 546 | 9% | 0.74 (Gachibowli) | 25% | 20% / 35% / 45% |
| `/data-science-course-dilsukhnagar` | 531 | 10% | 0.74 (Gachibowli) | 24% | 17% / 37% / 46% |
| `/python-course-ameerpet` | 534 | 9% | 0.59 (Kukatpally) | 5% | 22% / 34% / 44% |
| `/python-course-kukatpally` | 524 | 9% | 0.59 (Ameerpet) | 4% | 22% / 34% / 44% |
| `/power-bi-course-ameerpet` | 557 | 10% | 0.60 (Kukatpally) | 5% | 22% / 36% / 43% |
| `/power-bi-course-kukatpally` | 547 | 10% | 0.60 (Ameerpet) | 4% | 21% / 36% / 43% |
| `/generative-ai-course-ameerpet` | 561 | 9% | 0.71 (Madhapur) | 5% | 21% / 37% / 42% |
| `/generative-ai-course-madhapur` | 530 | 10% | 0.71 (Ameerpet) | 6% | 19% / 39% / 42% |
| `/data-analytics-course-ameerpet` | 558 | 10% | 0.60 (Kukatpally) | 4% | 21% / 36% / 42% |
| `/data-analytics-course-kukatpally` | 548 | 10% | 0.60 (Ameerpet) | 3% | 21% / 37% / 42% |
| `/mlops-course-ameerpet` | 520 | 9% | — (no sibling; 0.56 to any landing) | 38% | 23% / 32% / 44% |

**Live site, for comparison.** In-parent is 34–39% for most landings and 55–56% for the two Power BI landings, which are longer (757 and 733 words). Sibling similarity is 0.64–0.75. The 7 legacy-only landings are 36–40% in-parent and 0.64–0.74 to their sibling.

### 4.3 Reading the numbers

- **Landing vs course page: not duplicates.** The new build's 9–10% is low partly because the course page renders only about 13% of its syllabus in HTML. The accordion hides the rest (Phase 6 §8.2). Once that is fixed, overlap will rise towards the live site's 34–56%. That is still a supporting page, not a copy, and the course page and landing target different queries (Phase 3 keyword map).
- **Landing vs landing: weakly differentiated.** With names masked, 59–74% of the text is the same as a sibling's. About 42–46% of every page is fixed template text and 32–39% is course data, which is identical across that course's landings. The 49–63 locality words are the only difference.
- **"Unique" measures reuse, not usefulness.** Gachibowli, HITEC City, Dilsukhnagar and MLOps score 23–38% only because their locality (or course) has a single landing, so no other page repeats that copy.

### 4.4 Classification

| Class | Landings | Why |
|---|---|---|
| **Genuinely useful** | 6 Ameerpet landings | They answer "{course} course Ameerpet" truthfully: the centre, its metro access, nearby areas and classroom batches that really happen there. |
| **Useful but thin** | Kukatpally ×4, HITEC City ×1 | The locality text gives true access information (Red Line metro to Ameerpet; online or at Ameerpet). Otherwise they are template text. |
| **Weakly differentiated** | Madhapur ×2, Gachibowli ×1, Dilsukhnagar ×1 | The locality text is about the local job market and batch format (W4, W5). It says nothing a learner there can act on beyond "online". Sibling similarity is 0.71–0.74. |
| **Nearly identical** (sibling ≥ 0.70, names masked) | DS Ameerpet, DS Madhapur, DS Gachibowli, DS HITEC City, DS Dilsukhnagar, both Generative AI landings | Similarity only. **Not a decision on its own** (§5). |
| **Not supported by the new architecture** | The 7 legacy-only landings | Not in the route table. Their course and locality exist in the CMS. This is a routing decision, not a business-fact problem (§7.3). |
| **Unsupported locality** (a place GloryTecks has no relationship with) | **None** | All 6 localities are active CMS records, and each one's service claim holds for online delivery. |

---

## 5. Search visibility (Step 4)

**Google Search Console data is not available** for glorytecks.com in this project. **No landing is classified by traffic here.**

**Proxy evidence only.** On 2026-09-24, seven site-restricted queries were run through a third-party web search tool. It is not Google, and it proves presence in *an* index, not traffic.
- Seen: `/python-course-kukatpally`, `/python-course-ameerpet`, `/data-science-course-gachibowli` and `/training-in-hyderabad`.
- None of the 7 legacy-only landings appeared, including for queries naming their course and locality.
- The indexed titles ("… Course in Kukatpally (KPHB), Hyderabad | GloryTecks — 4 Months") differ from the current live HTML titles. That index is out of date, so treat absence as meaningless.

**Data needed before any keep, consolidate or noindex decision.** Use the glorytecks.com property, which holds the legacy site's history:
1. Go to Performance › Search results, set the date range to **the last 16 months**, and open the **Pages** tab.
2. Filter for URLs containing `-course-`, plus `/training-in-`.
3. Export clicks, impressions, CTR and position.
4. Repeat with a Pages × Queries breakdown for the 24 URLs, to see whether the locality queries are what the page ranks for.
5. Check the Page indexing report, or URL Inspection, for each of the 24.

**Decision rules** (your framework). The thresholds are proposals for you to set:

| GSC result (16 months) | Proposed threshold | Action |
|---|---|---|
| Strong traffic | ≥ 50 clicks total **and** clicks in ≥ 3 of the last 6 months | **KEEP + DEEPEN** |
| Some visibility | ≥ 100 impressions, below "strong" | **IMPROVE UNIQUENESS**, using facts the business supplies (§8) |
| Old + zero visibility + near-duplicate | < 10 impressions over 16 months, indexed for ≥ 6 months, sibling ≥ 0.70 | **CANDIDATE** for consolidation (308 → course page) or noindex. **Your decision per URL.** |
| Unsupported locality | none found (§4.4) | — |

**Physical truth overrides traffic.** Whatever the numbers, the wording fixes in §3 apply to every page that stays indexed.

---

## 6. SEO check per page (Step 5)

**All 15 new landings pass:**
- 1 H1, matching the title's subject
- self-referencing absolute canonical
- `index, follow`, and no `X-Robots-Tag`
- listed in `/sitemaps/locations.xml`, with `lastmod` = the locality row's `updated_at`
- 4 visible FAQs, identical to FAQPage
- Course schema with the onsite instance → Ameerpet LocalBusiness and an online instance
- breadcrumb schema matching the visible breadcrumb
- locality in title, H1, intro and FAQ; course in title, H1, curriculum and FAQ
- links to the parent course

**Template-level defects.** Each affects all 15 unless noted.

| # | Check | Finding | Visible change? |
|---|---|---|---|
| T1 | First content section | `localities.context` appears **twice**: in the hero and as the opening of "Why learn…". The live site shows it once. This was introduced in the migration. | Yes (removes a repeated sentence) |
| T2 | Title | Kukatpally titles are 60–70 characters because of "(KPHB)": Python 70, Data Analytics 66, Data Science 64, Power BI 60. The live site drops "(KPHB)" from titles (it stays in the H1). | Yes (SERP) |
| T3 | Meta description | 169–191 characters, so it will be cut off. It carries "100% placement support" (W6). The live site uses 130–154. | Yes (SERP) |
| T4 | Internal links | No in-body link between the landings and the centre page, `/placements` or the course's `/compare` page. The centre page links no landing in its body. Phase 3 already recommended this (`SEO_INTERNAL_LINK_RECOMMENDATIONS.csv`). | Yes (adds links) |
| T5 | Schema | `timeRequired` and `courseWorkload` are "6 Months". schema.org expects ISO 8601, for example `P6M`. | No |
| T6 | Schema | The landing Course node has no `@id`. `teaches` lists every module (up to 18), while the page shows the first 10 and links to the rest. | No |
| T7 | Breadcrumb | Home › Courses › {Course} in {Locality} skips the parent course page. | Yes |

**FAQPage.** The markup is valid and matches the visible text. Since August 2023, Google shows FAQ rich results only for well-known government and health sites, so expect no rich result. The markup does no harm.

**Header navigation (robustness).** The "Locations" menu builds `/data-science-course-{slug}` for **every** CMS locality (`components/site/Header.tsx`), not from the route table. Today all 6 localities have a Data Science landing. If a locality is added to the CMS without one, the header will link to a 404.

---

## 7. Per-URL decisions (Step 6)

"Visibility" means the GSC result, which is unavailable for every URL; "seen" marks presence in the §5 search sample only. **Nothing below has been applied.**

### 7.1 Ameerpet landings: the physical centre

| URL | In-parent / sibling | Visibility | Uniqueness | Technical SEO | Action | Reason |
|---|---|---|---|---|---|---|
| `/data-science-course-ameerpet` | 9% / 0.71 | No GSC | Genuinely useful | Pass; T1–T7; W7 | **KEEP + DEEPEN** | True local page for the centre. Deepen with facts that already exist: in-body link to the centre page; this course's batch timings at the centre (CMS batches, once they are current); resolve 603/611. |
| `/python-course-ameerpet` | 9% / 0.59 | No GSC · seen | Genuinely useful | Pass; T1–T7; W7 | **KEEP + DEEPEN** | Same as above. |
| `/power-bi-course-ameerpet` | 10% / 0.60 | No GSC | Genuinely useful | Pass; T1–T7; W7 | **KEEP + DEEPEN** | Same as above. |
| `/generative-ai-course-ameerpet` | 9% / 0.71 | No GSC | Genuinely useful | Pass; T1–T7; W7 | **KEEP + DEEPEN** | Same as above. |
| `/data-analytics-course-ameerpet` | 10% / 0.60 | No GSC | Genuinely useful | Pass; T1–T7; W7 | **KEEP + DEEPEN** | Same as above. |
| `/mlops-course-ameerpet` | 9% / — | No GSC | Genuinely useful | Pass; T1–T7; W7 | **KEEP + DEEPEN** | Same as above. It is the only MLOps landing. |

### 7.2 Non-Ameerpet landings: service area, delivered online

Interim action for all 9: **KEEP INDEXED, FIX WORDING (W1–W3, plus W4/W5 where listed), then decide per §5 once GSC exists.** A sibling score of 0.70 or more alone does not move a page into the candidate row.

| URL | In-parent / sibling | Visibility | Uniqueness | Technical SEO | Action | Reason |
|---|---|---|---|---|---|---|
| `/data-science-course-kukatpally` | 9% / 0.64 | No GSC | Useful but thin | Pass; T1–T7; **T2 (64)**; W1–W3 | **MANUAL REVIEW, GSC-gated** | Locality text gives true access information (Red Line to Ameerpet). The FAQ places the centre "near KPHB, Miyapur…". |
| `/data-science-course-madhapur` | 9% / 0.72 | No GSC | Weakly differentiated | Pass; T1–T7; W1–W4 | **MANUAL REVIEW, GSC-gated** | "Evening and weekend batches" doesn't say where. |
| `/data-science-course-gachibowli` | 10% / 0.74 | No GSC · seen | Weakly differentiated | Pass; T1–T7; W1–W4 | **MANUAL REVIEW, GSC-gated** | It is in an index, so don't drop it without GSC. "Online and weekend formats" doesn't say where. |
| `/data-science-course-hitech-city` | 9% / 0.74 | No GSC | Useful but thin | Pass; T1–T7; W1–W3 | **MANUAL REVIEW, GSC-gated** | Locality text is accurate ("online and at the Ameerpet centre"). |
| `/data-science-course-dilsukhnagar` | 10% / 0.74 | No GSC | Weakly differentiated | Pass; T1–T7; W1–W5 | **MANUAL REVIEW, GSC-gated** | "Affordable" is unverified. Weekend format doesn't say where. The FAQ places the centre near Kothapet and LB Nagar. |
| `/python-course-kukatpally` | 9% / 0.59 | No GSC · seen | Useful but thin | Pass; T1–T7; **T2 (70)**, **T3 (191)**; W1–W3 | **MANUAL REVIEW, GSC-gated** | It is in an index. Longest title and description. Kukatpally intro names Data Science and analytics, not Python. |
| `/power-bi-course-kukatpally` | 10% / 0.60 | No GSC | Useful but thin | Pass; T1–T7; **T2 (60)**; W1–W3 | **MANUAL REVIEW, GSC-gated** | Same Kukatpally copy as its 3 siblings. |
| `/generative-ai-course-madhapur` | 10% / 0.71 | No GSC | Weakly differentiated | Pass; T1–T7; W1–W4 | **MANUAL REVIEW, GSC-gated** | Madhapur copy ("upskilling into AI") fits the course. The batch format doesn't say where. |
| `/data-analytics-course-kukatpally` | 10% / 0.60 | No GSC | Useful but thin | Pass; T1–T7; **T2 (66)**; W1–W3 | **MANUAL REVIEW, GSC-gated** | Same Kukatpally copy as its 3 siblings. |

### 7.3 URLs that 404 at cutover: decision required before launch

Allowing these to 404 at cutover would be an automatic removal. Redirecting them would be an automatic redirect. **Both need your decision.** Each URL has three options:
- **(a) Restore:** add the pair to `config/locationLandings.ts`. The existing template and CMS data generate the page; no new copy is needed. It also enters `locations.xml`.
- **(b) Consolidate:** 308 to the course page, or to the centre page.
- **(c) Let it 404.**

| URL | Live similarity (in-parent / sibling) | Visibility | Uniqueness | Suggested default | Reason |
|---|---|---|---|---|---|
| `/training-in-ameerpet` | — (duplicate of the centre page's intent) | No GSC | Duplicate intent | **(b) 308 → `/training-in-hyderabad`** | The Phase 3 registry assigns the Ameerpet intent to `/training-in-hyderabad`. The live pages are two LocalBusiness pages for one centre. |
| `/agentic-ai-course-ameerpet` | 36% / 0.72 | No GSC · not seen | As §7.1 | **(a) Restore** | Ameerpet is true, and the course exists and is taught there. Restoring keeps parity with the other Ameerpet landings. |
| `/data-engineering-course-ameerpet` | 38% / 0.73 | No GSC · not seen | As §7.1 | **(a) Restore** | Same as above. |
| `/sql-server-course-ameerpet` | 37% / 0.64 | No GSC · not seen | As §7.1 | **(a) Restore** | Same as above. |
| `/agentic-ai-course-madhapur` | 38% / 0.72 | No GSC · not seen | Weakly differentiated | **(b) 308 → `/courses/agentic-ai`** unless GSC shows clicks, then (a) | Non-physical locality. Not in the new architecture. Not seen in the index sample. Would inherit W1–W4. |
| `/data-engineering-course-hitech-city` | 40% / 0.73 | No GSC · not seen | Useful but thin; **course mismatch** | **(b) 308 → `/courses/data-engineering`** unless GSC shows clicks, then (a) | HITEC City copy names Data Science, Generative AI and Power BI, not Data Engineering. |
| `/generative-ai-course-gachibowli` | 39% / 0.74 | No GSC · not seen | Weakly differentiated; **course mismatch** | **(b) 308 → `/courses/gen-ai`** unless GSC shows clicks, then (a) | Gachibowli copy names Data Science, Python and Power BI, not Generative AI. |
| `/sql-server-course-kukatpally` | 38% / 0.64 | No GSC · not seen | Useful but thin; **course mismatch** | **(b) 308 → `/courses/sql-server`** unless GSC shows clicks, then (a) | Kukatpally copy names Data Science and analytics, not SQL Server. |

The 4 non-Ameerpet defaults rest on four points taken together: the locality has no centre, the URL is not in the new architecture, the copy names the wrong course, and the page was absent from the index sample. **Similarity is not the deciding factor.** Once you choose, the change is one config line (a) or one `redirects()` entry (b) per URL. [`SEO_PRODUCTION_PARITY_REPORT.md`](SEO_PRODUCTION_PARITY_REPORT.md) lists the same 8 URLs.

### 7.4 Centre page

| URL | Visibility | Technical SEO | Action | Reason |
|---|---|---|---|---|
| `/training-in-hyderabad` | No GSC · seen | Pass: 1 H1, self canonical, index, `pages.xml`, LocalBusiness (Ameerpet) + WebPage + BreadcrumbList | **KEEP**; add in-body links to the 6 Ameerpet landings (T4) | This page owns "IT training Ameerpet". The title changes at cutover from "IT Training Institute in Hyderabad \| GloryTecks" to "IT Training in Ameerpet, Hyderabad — GloryTecks Centre" (Phase 3 decision). The page text shows 611 twice, while its JSON-LD `streetAddress` shows 603. W7 applies. |

---

## 8. Fixes awaiting approval

Nothing is applied. The P1 and P2 items change visible text or links, so each needs your approval under the project's rule on copy changes. The P3 items don't change what visitors see.

| Priority | Fix | Pages | Where | Needs |
|---|---|---|---|---|
| **P0** | Decide the 8 cutover URLs (§7.3) | 8 | `config/locationLandings.ts` or `next.config.mjs` `redirects()` | Your decision |
| **P0** | Street number 603 vs 611 (W7) | all; visible on 6 | CMS locality intro, CMS Settings, `config/business.ts` | Business: door, rental agreement, GST, Google Business Profile |
| **P1** | W1: FAQ 1 wording for non-Ameerpet landings | 9 | `buildFaqs` (FAQPage JSON-LD follows automatically) | Approval |
| **P1** | W2: drop "{Locality} batch offers" | 15 | `buildFaqs` | Approval |
| **P1** | W3: badge "Online · classroom at Ameerpet" for non-Ameerpet landings | 9 | `LocationCourseView.tsx` | Approval |
| **P1** | W4/W5: say where weekend and evening batches run; drop "affordable" | Madhapur, Gachibowli, Dilsukhnagar | CMS `localities.context` | The business confirms formats, then approval |
| **P1** | W6: "100%" and "500+ hiring partners" | 15 | template + CMS | Phase 6 decision |
| **P2** | T1: show the locality context once (restores live parity) | 15 | `LocationCourseView.tsx` | Approval |
| **P2** | T4: in-body links between each landing and the centre page, both ways | 15 + centre | view files | Approval |
| **P2** | T2/T3: drop "(KPHB)" from titles only; description template ≤ 155 characters, without "100%" | 15 | `[landingSlug]/page.tsx` `describe()` / title | Approval |
| **P2** | W8: choose between the live and CMS salary figures (they differ for all 6 courses); cite a real source, or drop "based on Hyderabad market trends" | 15 | CMS category salary fields, `LocationCourseView.tsx` | Business data, then approval; never invent a source |
| **P3** | T5: ISO 8601 durations (`P6M`); omit if the duration can't be parsed | 15 | `[landingSlug]/page.tsx` | None visible |
| **P3** | T6: Course `@id` = `{url}#course`; `teaches` = the modules shown | 15 | `[landingSlug]/page.tsx` | None visible |
| **P3** | T7: breadcrumb Home › Courses › {Course} › {Locality} | 15 | `[landingSlug]/page.tsx` | Approval (visible) |
| **P3** | Header "Locations" menu: build from the route table, not every CMS locality | header | `Header.tsx` | None visible today |

**Deepening without inventing.** These are only the sources that exist, or that the business can confirm:
- CMS batches: timings and mode per course, once they are current (they are stale: all June 2026, Phase 6).
- Real travel options to Ameerpet: the metro lines already named in the CMS copy.
- Locality-specific learner counts, testimonials or employers, **only if the business has records**.

Anything else (local trainers, local partnerships, local placement offices) must not be added.

---

## 9. Reproducing this audit

1. Start the backend: `npx tsx src/server.ts` in `backend/`, on :5001.
2. Build with `NEXT_PUBLIC_API_BASE_URL=http://localhost:5001` and serve it (`next start`).
3. Run `inventory.mjs <base> <out.json>` against both the local server and `https://glorytecks.com`.
4. Run `similarity.mjs` and `attribution.mjs` on the output.

The live sitemap is the flat `https://glorytecks.com/sitemap.xml` (670 URLs). The new sitemaps are `/sitemaps/locations.xml` and `/sitemaps/pages.xml`. Figures are as of 2026-09-24 and will drift as the CMS changes.

## Sources

- Google, FAQ rich result eligibility change (August 2023): <https://developers.google.com/search/blog/2023/08/howto-faq-changes>
- schema.org `Course.timeRequired` (Duration, ISO 8601): <https://schema.org/timeRequired>
- Search sample (third-party tool, 2026-09-24): [python-course-kukatpally](https://glorytecks.com/python-course-kukatpally), [python-course-ameerpet](https://glorytecks.com/python-course-ameerpet), [data-science-course-gachibowli](https://glorytecks.com/data-science-course-gachibowli), [training-in-hyderabad](https://glorytecks.com/training-in-hyderabad)
