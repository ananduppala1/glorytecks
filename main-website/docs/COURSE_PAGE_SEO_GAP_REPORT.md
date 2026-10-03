# Course Page SEO Gap Report

An audit of the nine commercial course pages: what they render, what their metadata and structured data say, how they compare with competing training pages on the information they give, and what can be improved without redesigning them or inventing anything.

| | |
| --- | --- |
| Date | 2026-09-24 |
| Pages | `/courses` and the 9 course pages: Data Science, Python Programming, Power BI, Data Analytics, Data Engineering, Generative AI, Agentic AI, MLOps, SQL Server |
| Sources compared | **Current source**: production build (`next build` + `next start`) with live CMS data.<br>**Deployed Next.js app**: `glorytecks-psi.vercel.app`.<br>**Live domain**: `glorytecks.com`, still the legacy SPA's prerendered pages (Phase 0). |
| CMS data | Read-only through the public API: all 9 course records, plus batches, trainers, FAQs, settings and brochures |
| Competitors | 18 institute pages (2 per course) that rank for each course's "{course} course/training in Hyderabad" query, checked for which *kinds* of information they state. No competitor text is used anywhere. |
| Changed in Phase 6 | Two structured-data additions, both built only from what the page already shows (§8.1). No UI, layout, copy or CMS change. |

---

## 1. Summary

The course pages are technically sound: one H1, a self-referencing canonical, `index, follow`, a titled breadcrumb, Course markup with no fabricated price, rating or review, and no meta keywords. Their weaknesses are **substance and accuracy**, and they are the same on all nine pages because they come from one template and one templated data set:

1. **87% of every syllabus is invisible to search engines.** The syllabus accordion renders only its first section's items into the HTML. **69 of 521 syllabus items** are in the server-rendered page; the rest mount only when a visitor clicks. Crawlers do not click. The live legacy pages expose every module as text, so the domain move would *reduce* the curriculum Google can see.
2. **The page asserts things it does not show.** The Course markup declares classroom and online instances, and the meta description says "taught in classroom and live online batches". But the rendered page mentions neither mode anywhere. The code comment that claims they appear in the FAQ is out of date: no course has FAQs in the CMS.
3. **Unsubstantiated claims are hard-coded.** Every course shows "Placement: 100% Support" and "Certification: Industry Recognized", and the CMS placement text on all nine says "100% placement assistance with 500+ hiring partners". The CMS lists 20 partner companies. The site's own vetted homepage FAQ says placement support "is assistance with the job search, not a guarantee of employment". The article block under each course says the guides were "written by the same trainers who teach the course", which the Phase 4 audit contradicts.
4. **The information buyers compare is missing:**
   - **Absent:** training mode, batch schedule, audience, prerequisites, trainer, fees or instalments, learning outcomes, practical workflow, and an FAQ.
   - **Stated only as a label:** certification ("Industry Recognized").
   
   Competing pages state most of these (§5). Much of it already exists in vetted GloryTecks copy (homepage FAQ, landing pages, the legacy course pages) and can be reused, not invented.
5. **The data has conflicts** (§4):
   - Python's duration is 4 months in the CMS and 2 months on the live site.
   - Power BI and SQL Server are 2 months in the CMS and "3 months" in the CMS's own general FAQ.
   - Data Science shows "14+ topics" over 13 syllabus sections.
   - MLOps is labelled "Gen AI".
   - All nine descriptions are the same sentence with the course name swapped.
6. **Brochure links break.** On 8 of 9 pages, "Download Brochure" silently redirects to `/courses`: only Data Science has a brochure file.
7. **The meta descriptions are too long to display.** They run 216–292 characters, so search results cut them off mid-sentence, and they begin with a run-on ("From data to decisions A 6 Months Data Science course…"). The CMS has an SEO field for this, but the page ignores it.

**What changed in Phase 6:** `/courses` now publishes an **ItemList** of the nine courses, which pairs with each page's Course markup for Google's course list rich result (previously none was eligible). Each course page now has a **WebPage node** tied to its Course. Both are built only from content the page already renders, and both are verified in the rendered HTML and covered by tests.

**Everything else is a recommendation.** Items that change visible copy or claims need your approval. Items that need facts only the business has (fees, trainers, prerequisites, brochures) need business data first.

## 2. Method

- **Rendered audit.** Each page was fetched from all three sources. From each, the audit extracted the status, title, description, canonical, robots (meta tag and `X-Robots-Tag` header), Open Graph and Twitter tags, H1–H3, JSON-LD, the breadcrumb, images, links in the main content, and whether key claims are visible.
- **CMS audit.** Every field of every course record, plus the batches, trainers, general FAQs and site settings that could supply missing facts.
- **Search intent.** From the Phase 3 ownership matrix (`SEO_KEYWORD_OWNERSHIP_MATRIX.md`) and the Phase 5 cluster map (`lib/seo/topical.ts`).
- **Competitors.** For each course, two institute pages from the first results for "{course} course/training in Hyderabad", skipping directories and listicles. Each page was checked for 19 kinds of information using fixed patterns (`coverage.json` method in the appendix). The check measures only whether a kind of information is present; it does not judge whether the competitor's claim is true.
- **Structured data rules.** Checked against Google's current documentation. Note: Google **retired the Course info rich result** (announced 12 June 2025, documentation removed 9 September 2025). The **course list** rich result, which needs an ItemList summary page, is still supported.

## 3. Findings common to all nine pages

### 3.1 Rendered content

| Element | Status | Evidence |
| --- | --- | --- |
| H1 | ✅ One per page: "{Course} Course in Hyderabad" | All 9 |
| Description (body) | ⚠️ Present but identical across all nine, with only the name swapped: "Master {course} with our industry-aligned program at GloryTecks. Learn from expert mentors, work on real-time projects, and become job-ready with dedicated placement support." | CMS `description` |
| Tagline | ✅ Course-specific (e.g. "Query, design & optimize databases") | CMS `tagline` |
| Syllabus | ⚠️ Full in the CMS (9–18 sections, 47–76 items), but **only the first section's items are in the HTML** (69/521 overall) | Radix accordion unmounts closed content |
| Modules count | ⚠️ "{n}+ topics" uses `modules.length`, which differs from the visible syllabus on Data Science (14 vs 13) | §4 |
| Tools | ✅ 5–21 per course, visible | |
| Projects | ✅ 5 per course, visible | |
| Learning outcomes | ❌ None beyond the syllabus | No CMS field |
| Training mode | ❌ Not on the page | Stated in vetted homepage FAQ and landing pages |
| Classroom / online availability | ❌ Not on the page | As above |
| Batch schedule | ❌ Not on the page | CMS batches exist but all start in June 2026 and are still marked active |
| Duration | ✅ Shown | Conflicts in §4 |
| Trainer | ❌ Not shown | `course.trainer` empty; the 3 trainer records are unverified (§4) |
| Audience | ❌ | Vetted homepage FAQ has a site-wide answer |
| Prerequisites | ❌ | No CMS field |
| Certification | ⚠️ Hard-coded "Industry Recognized", with no detail | Vetted homepage FAQ: "course completion certificate… aligned to the syllabi of external certifications" |
| Placement wording | ⚠️ Hard-coded "100% Support"; CMS text "100% placement assistance with 500+ hiring partners" | Vetted homepage FAQ: "assistance with the job search, not a guarantee of employment" |
| Support actually offered | ⚠️ The CMS text lists "mock interviews, resume building, and career mentorship", which is specific and supportable | Keep this part |
| Visible FAQ | ❌ Not rendered: no course has CMS FAQs | The live pages have 4 per course |
| Related courses | ⚠️ The first 6 other courses by display order, not by relevance | Every page omits whichever two courses come last in the order: e.g. the Data Engineering page shows Gen AI and Agentic AI but omits Python and SQL Server |
| Related resources | ⚠️ 4 articles picked by recency (Phase 5); **none** for Agentic AI and SQL Server | |
| Brochure | ❌ 8 of 9 buttons redirect to `/courses` | Only Data Science has a file; the backend returns 404 for the rest |
| Images | ⚠️ No course image; `bannerImage` empty for all | Only the logo |

### 3.2 Metadata

| Element | Status |
| --- | --- |
| Title | ✅ "{Course} Course in Hyderabad \| GloryTecks", 38–51 characters, no superlatives or guarantees |
| Description | ❌ 216–292 characters (truncated in results); run-on tagline ("From data to decisions A 6 Months…"); "A 6 Months" grammar; asserts classroom and online delivery the page does not show. `course.seo.metaDescription` exists in the CMS but is never read. |
| Canonical | ✅ Self-referencing `https://glorytecks.com/courses/{slug}` (current source) |
| Robots | ✅ `index, follow, max-image-preview:large…` |
| Open Graph | ⚠️ Title and description mirror the metadata. The image is the site default `/og-image.jpg` for every course, while `og:image:alt` names the specific course. |
| Meta keywords | ✅ None. The live legacy pages carry a keyword list ("best IT training institute in Hyderabad…"); the new site drops it. |
| Hidden SEO text | ✅ None |
| **Deployed Next.js app** | ❌ Stale. Canonical and OG point at the dead `glorytecks-one.vercel.app`, and the Phase 1 `noindex` header for `*.vercel.app` is missing. The current source fixes both; a redeploy is needed (Phase 0). |

**Title and H1 at cutover.** The live pages are titled and headed "{Course} **Training** in Hyderabad". The new ones say "**Course** in Hyderabad" (Phase 3 decision). Without Search Console data it is unknown which wording the current rankings rely on. Keep "Course" as the primary term, and let "training" appear naturally in the description and body (for example "classroom and live online training", once that is visible). Compare impressions before and after the move.

### 3.3 Structured data

| Type | Status | Notes |
| --- | --- | --- |
| Course | ✅ `name`, `description`, `provider` (→ Organization `@id`), `teaches`, `about`, `url` | No price, availability, rating, review, student count, placement rate or credential: verified absent on all 9 |
| Course provider | ✅ One EducationalOrganization node, referenced by `@id` | Organization-level statistics (3000+, 95%, 500+) are **not** in any schema; keep it that way |
| CourseInstance | ⚠️ Onsite (→ LocalBusiness) and online instances, with `courseWorkload: "6 Months"` | Asserts modes the page does not show, and `courseWorkload` is a free-text string. Google no longer uses Course info, so this has no rich-result value; fix by showing the modes, or drop it (§8.2) |
| BreadcrumbList | ✅ Home → Courses → {Course} Course; matches the visible breadcrumb | |
| WebPage relationship | ✅ **Added in Phase 6**: `WebPage` → `mainEntity` → Course | Name = visible H1; description = visible CMS description |
| Organization relationship | ✅ Via `provider`, `isPartOf` → WebSite | |
| `/courses` ItemList | ✅ **Added in Phase 6**: 9 `ListItem`s, canonical URLs, same order as rendered | Makes the courses eligible for the course list rich result |
| FAQPage | ✅ Correctly absent: no visible FAQ | `CourseFaqSchema` emits only when the CMS has FAQs |

### 3.4 Internal links

| Path | Status |
| --- | --- |
| Course → articles | 4 by recency from one category (Phase 5); 0 for Agentic AI and SQL Server; the Gen AI page links the Agentic AI roadmap; Data Science and Data Analytics link unsourced salary pages |
| Course → its Ameerpet landing pages | ❌ None, although 15 landing pages point at the courses |
| Course → `/compare` pages | ❌ None, although 10 exist |
| Course → `/training-in-hyderabad` (the centre page) | ❌ Footer only |
| Course → related courses | ⚠️ Not relevance-ordered |
| Articles → course | Sidebar "Explore course" card only; 54 articles point at the wrong course (Phase 5); no in-body links (Phase 4) |

## 4. Data conflicts the business must resolve

Nothing here was changed. Each needs a decision by someone who knows the facts.

| # | Conflict | Sources | Visible where |
| ---: | --- | --- | --- |
| 1 | **Python Programming duration**: 4 Months vs 2 Months | CMS course record vs live glorytecks.com (page, FAQ, schema) | Course page, meta description, schema |
| 2 | **Power BI and SQL Server duration**: 2 Months vs "3 months" | CMS course records vs CMS general FAQ "Course durations range from 3 months (SQL Server, Power BI)…" | Course pages vs wherever the general FAQ renders |
| 3 | **Data Science module count**: "14+ topics" vs 13 syllabus sections | `modules` (14) vs `syllabus` (13) | Course page |
| 4 | **MLOps category label** "Gen AI" | CMS `category` | Above the MLOps H1 and on its `/courses` card |
| 5 | **"500+ hiring partners"** vs 20 companies in the CMS | CMS `placement` (all 9), general FAQ, settings `stats` | All course pages |
| 6 | **Placement "100%"** vs the vetted homepage wording ("not a guarantee of employment") | Hard-coded card + CMS `placement` vs `HOME_FAQS` | All course pages |
| 7 | **"Industry Recognized" certification**: an institute completion certificate; recognised by whom is not stated | Hard-coded card vs `HOME_FAQS` | All course pages |
| 8 | **Batches**: all 9 start between 10 and 22 June 2026, all still `isActive` | CMS batches | Wherever batches render; unusable for a schedule until maintained |
| 9 | **Trainers**: 3 records, none linked to a course; "Priya Sharma" is a "Gen AI & LLM Expert, 9 yrs, Ex-Microsoft" here but the "Career Coach & Placement Lead" blog author | CMS trainers vs CMS authors | Not on course pages; do not add until verified |
| 10 | **"Written by the same trainers who teach the course"** under the article list | Hard-coded in `app/(site)/courses/[slug]/page.tsx` vs Phase 4 finding that the articles are template-generated | All course pages with articles |
| 11 | **Identical descriptions**: one sentence, nine course names | CMS `description` | All course pages, Course schema |

## 5. Competitor information gap

18 pages checked (2 per course; list in the appendix). The median competitor page has **5,599 words**; the GloryTecks course pages have **269–344 words of rendered content**. This compares information coverage only. Word count is not a target, and competitors' claims were not verified.

| Kind of information | Competitor pages stating it | GloryTecks course pages | Truthful source available? |
| --- | ---: | --- | --- |
| Curriculum depth | 18/18 | ✅ in the CMS, but 87% not in the HTML | Yes, the CMS syllabus |
| Projects | 18/18 | ✅ | — |
| Tools | 17/18 | ✅ | — |
| Training mode (online / classroom / hybrid) | **18/18** | ❌ | **Yes**: vetted `HOME_FAQS`, landing pages, live course FAQ |
| Practical workflow (labs, assignments, case studies) | **18/18** | ❌ | Partly: the syllabus has "Case Studies" (Data Science) and the CMS placement text mentions mock interviews; the business must describe the actual workflow |
| Certification details | 17/18 | ⚠️ label only | **Yes**: vetted `HOME_FAQS` answer |
| Fees / instalments | 17/18 | ❌ | Partly: `HOME_FAQS` says fees vary and instalments exist; actual fees are a business decision |
| FAQs | 17/18 | ❌ | **Yes**: the live course FAQs (4 per course), after correcting their "100%" line and the Python duration |
| Placement support | 16/18 | ⚠️ unsubstantiated "100%" | **Yes**: vetted `HOME_FAQS` answer and the CMS list of services |
| Duration | 15/18 | ✅ | Conflicts in §4 |
| Reviews / ratings | 13/18 | ❌ (correctly) | Only with verifiable reviews; never self-certified ratings |
| Recorded sessions | 13/18 | ❌ | **Yes**: `HOME_FAQS` ("recorded session access") |
| Course audience | 12/18 | ❌ | **Yes**: `HOME_FAQS` (site-wide); per-course audience needs the business |
| Batch schedule | 12/18 | ❌ | Weekday/weekend availability is in `HOME_FAQS`; dated batches need maintained data |
| Prerequisites | 11/18 | ❌ | No: the business must state them |
| Trainer information | 10/18 | ❌ | No: the trainer records are unverified (§4) |
| Learning outcomes | 9/18 | ❌ | Partly: derive from the syllabus; the business confirms |
| Demo class | 7/18 | Sitewide "Free Demo" button | — |

## 6. Search intent

| Course | Primary commercial intent (owner: the course page) | Supporting intents the page should also satisfy | Informational support (Phase 5 owners) | Competing internal URLs |
| --- | --- | --- | --- | --- |
| Data Science | Data Science course in Hyderabad | training, online, syllabus, duration, fees | DS roadmap, DS projects, DS interview questions, ML algorithms | 6 Ameerpet-centre locality landings (locality intent, distinct); `/compare/data-science-vs-*` (comparison intent) |
| Python Programming | Python course in Hyderabad | Python training, online, syllabus, duration | Learn Python roadmap, projects, interview questions | 2 locality landings; `/compare/python-vs-r-for-data-science` |
| Power BI | Power BI course in Hyderabad | training, PL-300 preparation, online, duration | Power BI roadmap, projects, interview questions, PL-300 article | 2 locality landings; `/compare/power-bi-vs-tableau`, `/compare/power-bi-vs-excel` |
| Data Analytics | Data Analytics course in Hyderabad | data analyst course, online, tools | DA roadmap, projects, interview questions | 2 locality landings; 3 `/compare` pages |
| Data Engineering | Data Engineering course in Hyderabad | **Azure / GCP / AWS data engineer training** (the query's results mix general courses with platform-specific ones), online | DE roadmap + AWS/GCP/Azure roadmaps, projects, interview questions | `/compare/data-engineering-vs-data-science`; no landings |
| Generative AI | Generative AI course in Hyderabad | Gen AI training, LLM/RAG course, online | What is Gen AI, learning path, projects, interview questions | 2 locality landings; `/compare/generative-ai-vs-machine-learning` |
| Agentic AI | Agentic AI course in Hyderabad | AI agents course, LangGraph/CrewAI training | Agentic roadmap, how agents work (6 existing articles, Phase 5) | Competing articles and sidebar in the Gen AI category; no landings |
| MLOps | MLOps course in Hyderabad | MLOps training, online | MLOps roadmap, MLflow, Docker, CI/CD | 1 locality landing; `/compare/mlops-vs-devops` |
| SQL Server | SQL Server course in Hyderabad | SQL / T-SQL training, online | SQL interview questions, window functions, optimisation (Phase 5; 4 gaps) | `/compare/sql-vs-nosql`; no landings |

No blog article targets a course query (Phase 5, tested). The locality landings own "{course} course {locality}", a distinct local intent, and `/compare` pages own "X vs Y". Neither competes with the course page's primary intent, as long as the course page links to them rather than repeating them.

**Data Engineering note.** Results for "data engineering course in Hyderabad" mix general data-engineering courses with platform-specific pages (Azure data engineer, GCP data engineer). A search that adds "Azure" returns almost only Azure-specific courses. The GloryTecks course already covers all three clouds (Azure Data Factory, Databricks, Redshift, BigQuery). So the course page should own those supporting platform intents in its own description and syllabus text, not through new pages.

---

## 7. Course by course

Each section adds only what is specific to the course; §3 applies to all.

### 7.1 Data Science: `/courses/data-science` · Priority **P2**

- **Current strengths.** 13-section syllabus with 63 items, from Python and statistics through deep learning, NLP and deployment. 16 tools; 5 named projects; the only course with a brochure PDF; 6 locality landings point at it; course-specific tagline.
- **Missing information.** Training mode, audience, prerequisites, outcomes, FAQ, trainer, fees. The syllabus has a "Career Preparation" section, but the practical workflow (assignments, case studies) is not described.
- **Technical SEO.** "14+ topics" over 13 sections (§4 #3). 57 of 63 syllabus items are not in the HTML. The description is 229 characters with the run-on tagline.
- **Structured data.** Valid; the CourseInstance modes are not visible.
- **Internal links.**
  - Links today: the DS roadmap, ML roadmap, DS projects and **DS salary** (unsourced) articles.
  - Phase 5 would instead link: the DS roadmap, DS projects, DS interview questions and ML algorithms (drop the salary page).
  - It links none of its 6 landing pages and none of its 5 relevant `/compare` pages.
- **Competitor gap** (nareshit.in, qualitythought.in). Both state training mode, batch schedule, practical workflow and FAQs; one each states trainer experience, audience, prerequisites and fees.
- **Safe implementation.** Align `modules` with the syllabus in the CMS; link the landing and compare pages from the related-courses area; the §8.2 template fixes.

### 7.2 Python Programming: `/courses/python-programming` · Priority **P1**

- **Current strengths.** 18 syllabus sections with 74 items, the most sections of any course. 11 tools; 5 projects.
- **Missing information.** As §3, plus: the most-searched beginner questions (audience, prerequisites) are unanswered on the page most likely to attract beginners.
- **Technical SEO.** **Duration conflict: 4 Months (CMS, new site) vs 2 Months (live site).** Whichever is wrong, the domain move would change a published fact without anyone deciding it. 64 of 74 syllabus items are not in the HTML. The description is 251 characters.
- **Structured data.** Valid; `courseWorkload` will carry whichever duration is right.
- **Internal links.** Links the Python roadmap, top-50 interview questions, projects and a lists-vs-tuples post. Phase 5 would swap the last for the core data-structures reference. 2 landings are not linked; `/compare/python-vs-r-for-data-science` is not linked.
- **Competitor gap** (codegnan.com, shyamtechnologies.in). Both state learning outcomes, mode, trainer experience, certification, audience, fees, practical workflow and FAQs.
- **Safe implementation.** Resolve the duration first; then the §8.2 fixes.

### 7.3 Power BI: `/courses/power-bi` · Priority **P2**

- **Current strengths.** 10-section syllabus covering the full Power BI lifecycle (Power Query to Service); 11 tools; 5 dashboard projects; PL-300 has a supporting article.
- **Missing information.** As §3. Certification is the most relevant gap here: the course prepares for PL-300, a real Microsoft certification (a Phase 5 topic owner exists), but the page says only "Industry Recognized".
- **Technical SEO.** **Duration conflict: 2 Months (CMS) vs "3 months" (CMS general FAQ).** 42 of 47 syllabus items are not in the HTML. The description is 266 characters, the longest but one.
- **Structured data.** Valid.
- **Internal links.** Links the roadmap, interview questions, projects and Power BI-vs-Excel posts. Phase 5 would swap the last for the beginner's first-report guide, then the Power Query tutorial; the PL-300 article (a topic owner) is also worth linking. `/compare/power-bi-vs-tableau` and `/compare/power-bi-vs-excel` are not linked; 2 landings are not linked.
- **Competitor gap** (besanttechnologies.com, vcubesoftsolutions.com). Both state mode, batch schedule, trainer, certification, fees, practical workflow and FAQs.
- **Safe implementation.** State "prepares for Microsoft PL-300", if the business confirms, instead of "Industry Recognized"; link the PL-300 article.

### 7.4 Data Analytics: `/courses/data-analytics` · Priority **P3**

- **Current strengths.** A coherent tool path (Excel → SQL → Python → Power BI) with 13 tools; the most consistent data of the nine.
- **Missing information.** As §3.
- **Technical SEO.** 39 of 48 syllabus items are not in the HTML; description 259 characters.
- **Structured data.** Valid.
- **Internal links.** Links the roadmap, the **salary page** (unsourced), Excel-vs-Power BI and descriptive-vs-predictive posts. Phase 5 would link the roadmap, projects, interview questions and "what analytics is". 2 landings and 3 `/compare` pages are not linked.
- **Competitor gap** (fita.in, 360digitmg.com, the two longest pages sampled). Both state mode, batch schedule, certification, prerequisites, fees, practical workflow, FAQs and recorded sessions.
- **Safe implementation.** The §8.2 fixes only.

### 7.5 Data Engineering: `/courses/data-engineering` · Priority **P2**

- **Current strengths.** 14 sections and 76 items across Python, SQL, Spark, Airflow, Kafka and all three clouds; 20 tools; 5 projects including multi-cloud. The richest syllabus.
- **Missing information.** As §3.
- **Technical SEO.** 66 of 76 syllabus items are not in the HTML, the most lost of any course. Description 238 characters.
- **Structured data.** Valid.
- **Internal links.** Reaches only the data-engineering category (roadmap, ETL vs ELT, lake vs warehouse, warehouse explained); none of the AWS, GCP or Azure roadmaps. `/compare/data-engineering-vs-data-science` is not linked; there are no landings.
- **Competitor gap** (fita.in and 360digitmg.com, the top general data-engineering pages). Both state learning outcomes, mode, batch schedule, certification, fees, practical workflow, FAQs and recorded sessions. Azure-specific competitors (qualitythought.in, versionit.org) add DP-203 certification preparation.
- **Safe implementation.** Make the Azure, AWS and GCP coverage explicit in the course description (supporting the Azure data engineer intent, §6); link the three platform roadmaps (Phase 5). A certification line (e.g. DP-203 preparation) only if the business confirms it.

### 7.6 Generative AI: `/courses/gen-ai` · Priority **P2**

- **Current strengths.** 12 sections covering LLMs, RAG, vector databases and deployment; 19 tools; 5 projects.
- **Missing information.** As §3.
- **Technical SEO.** 45 of 53 syllabus items are not in the HTML; description 241 characters.
- **Structured data.** Valid.
- **Internal links.** Links the **Agentic AI roadmap** (belongs to the Agentic AI course), fine-tuning vs RAG, what is Gen AI and the ChatGPT guide. Phase 5 would link the learning path, projects, interview questions and "what is Gen AI". `/compare/generative-ai-vs-machine-learning` is not linked.
- **Competitor gap** (excelr.com, visualpath.in). Both state mode, certification, audience, fees, practical workflow and FAQs.
- **Safe implementation.** The Phase 5 course-link wiring; the §8.2 fixes.

### 7.7 Agentic AI: `/courses/agentic-ai` · Priority **P1**

- **Current strengths.** 11 sections on agents, LangGraph, CrewAI and multi-agent systems; 21 tools, the most of any course; 5 agent projects.
- **Missing information.** As §3. Competitors frame Agentic AI as a follow-on to Gen AI, but nothing on the page tells a reader how this course differs from the Gen AI course or who should take which.
- **Technical SEO.** 37 of 47 syllabus items are not in the HTML. At 273 words, this is one of the two thinnest rendered pages. Description 242 characters.
- **Structured data.** Valid.
- **Internal links.** **Links no article.** Six agent articles exist (Phase 5); none links here; its roadmap is linked from the Gen AI course instead.
- **Competitor gap** (excelr.com, cromacampus.com). Both state mode, certification, audience, prerequisites, fees, practical workflow and FAQs.
- **Safe implementation.**
  - The Phase 5 course-link wiring, which alone gives the page six relevant links.
  - Prerequisites are especially important here: the syllabus starts with "Core AI & ML", so the business should say what a learner needs before joining.

### 7.8 MLOps: `/courses/mlops` · Priority **P2**

- **Current strengths.** 14 sections from Git to Kubernetes, monitoring and cloud MLOps; 16 tools; 5 production-style projects.
- **Missing information.** As §3.
- **Technical SEO.** **Category label "Gen AI"** above the H1 (§4 #4). 49 of 56 syllabus items are not in the HTML; description 216 characters, the shortest, but still truncated.
- **Structured data.** Valid.
- **Internal links.** Links the roadmap, what-is-MLOps, the MLflow tutorial and Docker for ML; all four are Phase 5 topic owners. `/compare/mlops-vs-devops` is not linked; 1 landing is not linked.
- **Competitor gap** (360digitmg.com, brollyacademy.com). Both state outcomes, mode, certification, prerequisites, fees, practical workflow, FAQs and recorded sessions.
- **Safe implementation.** Correct the category in the CMS; the §8.2 fixes.

### 7.9 SQL Server: `/courses/sql-server` · Priority **P1**

- **Current strengths.** 13 SQL Server-specific sections (SSMS, T-SQL, procedures, triggers, performance); 5 database projects.
- **Missing information.** As §3. The live page's description names concrete skills (T-SQL, joins, stored procedures, query tuning); the new one does not.
- **Technical SEO.** **Duration conflict: 2 Months (CMS) vs "3 months" (CMS general FAQ).** 53 of 57 syllabus items are not in the HTML. 269 rendered words, the thinnest page. Description 292 characters, the longest.
- **Structured data.** Valid.
- **Internal links.** **Links no article.** About 15 SQL articles exist in other categories (Phase 5), and 4 SQL Server topics are gaps. `/compare/sql-vs-nosql` is not linked; there are no landings.
- **Competitor gap** (vcsitsol.com, abtrainings.com). Both state mode, certification, prerequisites, fees, practical workflow and recorded sessions.
- **Safe implementation.** Resolve the duration; the Phase 5 wiring; restore the course-specific description.

---

## 8. Implementation plan

### 8.1 Done in Phase 6 (structured data only; nothing visible changed)

| Change | Files | Verified |
| --- | --- | --- |
| `/courses` ItemList: 9 `ListItem`s with canonical URLs, in rendered order; omitted if the course API fails | `lib/schema.ts` (`courseListSchema`), `app/(site)/courses/page.tsx` | Rendered HTML: 9 items, same set as the visible course links; `lib/seo/onpage.test.ts` |
| Course-page WebPage node with `mainEntity` → Course | `lib/schema.ts` (`webPageSchema` `mainEntity` option), `app/(site)/courses/[slug]/page.tsx` | Rendered HTML on all 9 pages; `lib/seo/onpage.test.ts` |

### 8.2 Recommended, awaiting approval (changes visible copy, markup or claims)

| # | Priority | Change | Why | Source of truth, so nothing is invented |
| ---: | --- | --- | --- | --- |
| 1 | **P1** | Render the syllabus so every section's items are in the HTML while staying collapsed: native `<details>`/`<summary>` styled like today, as the homepage FAQ already does | 452 of 521 syllabus items are invisible to crawlers; the domain move would otherwise reduce indexable curriculum | CMS syllabus (unchanged) |
| 2 | **P1** | Replace the hard-coded "100% Support" and "Industry Recognized" card values with the vetted site wording, and the CMS "100% … 500+ hiring partners" line with the services list alone | Unsubstantiated outcome and recognition claims; the site's own vetted FAQ says the opposite | `HOME_FAQS` (placement, certificate); CMS `placement` minus the numbers |
| 3 | **P1** | Remove "Written by the same trainers who teach the course." from the article block | Contradicted by the Phase 4 audit | — |
| 4 | **P1** | Show how the course runs (live online and classroom at Ameerpet, recorded sessions, weekday and weekend batches) as one line or FAQ item on each course page. Otherwise, remove the CourseInstance modes and the "classroom and live online" phrase from the metadata | Structured data and the meta description must match the page | `HOME_FAQS` "Does GloryTecks offer online training?" |
| 5 | **P1** | Fix the meta description template: sentence break after the tagline, "6-month", at most ~155 characters. Use `course.seo.metaDescription` when the CMS sets it. Seed it with the live site's course-specific descriptions (150–159 characters, already published) | Every description is truncated and starts with a run-on | The live course descriptions (already published); CMS SEO field |
| 6 | **P2** | Move the four live course FAQs into each course's CMS `faqs`, correcting the "100%" answer (item 2) and the durations (§4). The existing template then renders them with FAQPage markup automatically | FAQs are the most common competitor section; the live pages have them and the new ones would lose them | The live course FAQs |
| 7 | **P2** | "Download Brochure": upload brochures for the other 8 courses, or show the button only when a brochure exists | 8 of 9 buttons silently redirect to `/courses` | CMS `brochureUrl` |
| 8 | **P2** | Course → related links: its Ameerpet landing pages, relevant `/compare` pages, and relevance-ordered related courses | Pages that exist to support the course are not linked from it | Phase 3 matrix, Phase 5 map |
| 9 | **P2** | The Phase 5 course reading-block wiring (curated owners, not recency) | Agentic AI and SQL Server link no articles; Gen AI links the wrong roadmap | `lib/seo/topical.ts` |
| 10 | **P3** | "Placement Support" heading from `h3` to `h2` (same styling) | It follows `h2` sections and is a section of its own | — |
| 11 | **P3** | Extend the metadata guards in `onpage.test.ts` (no guarantees, no superlatives, length) to course-page metadata, which they do not cover today | Course pages are dynamic and outside `STATIC_ROUTES` | — |

### 8.3 Needs business data first (do not fill in without it)

| Information | What is needed |
| --- | --- |
| Correct durations | Confirm Python (2 or 4 months), Power BI and SQL Server (2 or 3 months), then make the CMS course records and the general FAQ agree |
| Fees | Whether to publish fees or a range; the site currently says only that fees vary and instalments exist |
| Prerequisites and audience per course | A line each, written by the course owner |
| Trainer per course | Verified trainer profiles (name, role, experience that can be substantiated) linked to courses. The current 3 records conflict with the blog authors |
| Certification detail | What the completion certificate is, and which external exams each course prepares for (e.g. PL-300, DP-203), if any |
| Placement facts | Substantiation for "500+ hiring partners", "95%" and "3000+" before they appear anywhere, or retire them |
| Batch schedule | A maintained batch list (the current 9 batches all started in June), before any dated schedule or `courseSchedule` markup |
| Learning outcomes and practical workflow | What a learner can do at the end, and how practice works (labs, assignments, reviews), per course |
| Course images | A real banner per course for `bannerImage` (used as the OG image) |
| Course descriptions | A course-specific description to replace the nine identical sentences (the live course descriptions are a starting point) |

## 9. Verification

Checks run on 2026-09-24:

| Check | Result |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm run lint` | 0 errors, 9 warnings (the same pre-existing 9; none in Phase 6 files) |
| `npm test` | Test files 15 passed, 4 skipped (19). Tests **420 passed**, 100 skipped (522); the skipped ones are opt-in live and backup suites |
| `npm run build` | Compiled successfully; 97/97 static pages with live CMS data |
| Rendered `/courses` | ItemList with 9 items; set equal to the visible course links |
| Rendered course pages | WebPage → Course on all 9; no price, rating, review, availability, student-count or placement-rate fields |

## Appendix: sources

**Competitor pages checked** (fetched 2026-09-24; coverage indicators only):

- Data Science: [nareshit.in](https://nareshit.in/data-science-training/), [qualitythought.in](https://qualitythought.in/data-science-training/)
- Python: [codegnan.com](https://codegnan.com/python-course-in-ameerpet/), [shyamtechnologies.in](https://shyamtechnologies.in/python-programming-training-in-hyderabad/)
- Power BI: [besanttechnologies.com](https://www.besanttechnologies.com/power-bi-training-in-hyderabad), [vcubesoftsolutions.com](https://vcubesoftsolutions.com/power-bi-training-in-hyderabad/)
- Data Analytics: [fita.in](https://www.fita.in/data-analytics-course-in-hyderabad/), [360digitmg.com](https://360digitmg.com/india/hyderabad/data-analytics-certification-course-training-institute)
- Data Engineering: [fita.in](https://www.fita.in/data-engineering-course-in-hyderabad/), [360digitmg.com](https://360digitmg.com/india/hyderabad/data-engineering-certification-course-training-institute). A first sample came from a search that included "Azure", which biased it towards Azure-only courses. It was replaced by these two general pages from the unmodified query; the Azure pages ([qualitythought.in](https://qualitythought.in/azure-data-engineer-training/), [versionit.org](https://www.versionit.org/azure-data-engineer-training-in-hyderabad.html)) are noted in §7.5 only.
- Generative AI: [excelr.com](https://www.excelr.com/generative-ai-course-training-in-hyderabad), [visualpath.in](https://www.visualpath.in/generative-ai-course-online-training.html)
- Agentic AI: [excelr.com](https://www.excelr.com/gen-ai-and-agentic-ai-course-in-hyderabad), [cromacampus.com](https://www.cromacampus.com/courses/agentic-ai-course-in-hyderabad/)
- MLOps: [360digitmg.com](https://360digitmg.com/india/hyderabad/mlops-engineering-certification-course-training-institute), [brollyacademy.com](https://brollyacademy.com/mlops-training-in-hyderabad/)
- SQL Server: [vcsitsol.com](https://www.vcsitsol.com/sql-server-training-in-hyderabad), [abtrainings.com](https://abtrainings.com/sql-server-course-training-in-hyderabad/)

Two first-choice pages could not be measured and were replaced by the next result: sathyatech.com (renders only with JavaScript) and nareshit.in/sql-server-training (connection failed).

**Coverage method.** Each page's text was matched against fixed patterns for 19 kinds of information (training mode, batch schedule, duration, trainer experience, certification, placement, audience, prerequisites, practical workflow, fees, FAQs, reviews, related resources, recorded sessions, demo class, learning outcomes, projects, tools, syllabus depth). A match means the kind of information is present somewhere on the page, including navigation. So competitor counts are upper bounds, and the GloryTecks column in §5 comes from the source code, not from pattern matching.

**Google documentation.**

- [Course list structured data](https://developers.google.com/search/docs/appearance/structured-data/course): ItemList summary page plus Course detail pages; `name`, `description` required, `provider` recommended.
- [Search Central updates](https://developers.google.com/search/updates): course info rich result retired (June 2025) and documentation removed (September 2025).
