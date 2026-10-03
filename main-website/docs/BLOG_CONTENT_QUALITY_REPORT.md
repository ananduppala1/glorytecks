# Blog Content Quality Report

An audit of every blog article in the CMS: what the 600 posts contain, how alike they are, and why. It is the evidence behind [`BLOG_REMEDIATION_PLAN.md`](./BLOG_REMEDIATION_PLAN.md), which gives each article an action.

- **Per-article data:** [`BLOG_REWRITE_QUEUE.csv`](./BLOG_REWRITE_QUEUE.csv) has one row per article with 60 columns: every metric below, the article's search intent, an image plan, its action and its queue position.
- **Clusters:** [`BLOG_SIMILARITY_CLUSTERS.csv`](./BLOG_SIMILARITY_CLUSTERS.csv) has one row per cluster member.
- **Tables:** the sections marked `generated` are rewritten by `npm run blog:audit` (see [How to re-run](#how-to-re-run)). The analysis around them is written by hand.

<!-- generated:inputs -->
| Input | Value |
| --- | --- |
| Backup | `backend/backups/blog/2026-09-24T04-39-08-889Z` (taken 2026-09-24T04:39:16.600Z) |
| Articles | 600 (all `published`) |
| Search Console export | **none supplied** — see §7 |
| Shingle size | 5 words |
| Boilerplate threshold | a phrase in 10+ articles |
| Template-family threshold | normalised similarity ≥ 0.5 |
| Near-duplicate threshold | normalised similarity ≥ 0.8 |
| Exact-duplicate threshold | raw similarity ≥ 0.95 |
<!-- /generated:inputs -->

---

## 1. The finding in one paragraph

The blog is one article written 600 times. Each post was generated from a template: a fixed sequence of headings and sentences, with the post's title and category name substituted in. On average **99% of an article's phrasing appears in ten or more other articles**, and the median article has **no phrasing of its own**. Two guides on unrelated topics in the same category, for example *A/B Testing for Data Scientists* and *Best Free Datasets for Data Science Practice*, share the same body word for word. Only the topic name changes. No article cites a source, links to another article from its body, or has an image. Every article makes salary or market-demand claims without a source. This is the pattern Google's guidance calls scaled content: many pages whose main purpose is to exist, not to help. The remediation plan treats it as such.

## 2. Summary

<!-- generated:summary -->
| Measure | Value |
| --- | --- |
| Articles audited | 600 |
| Mostly original (≥ 60% unique phrasing, ≤ 20% boilerplate) | 0 |
| Mean unique phrasing per article | 0% |
| Median unique phrasing per article | 0% |
| Mean boilerplate per article | 99% |
| Mean similarity to same-category articles | 0.81 |
| Mean similarity to nearest same-category article | 0.97 |
| Mean similarity to nearest same-intent article | 0.97 |
| Articles with a near-duplicate (≥ 0.8) | 565 (94%) |
| Near-duplicate pairs | 9132 |
| Same-category pairs with different titles and ≥ 0.95 raw (word-for-word) similarity | 3488 |
| Mean raw similarity of same-category template pairs | 0.89 |
| Template-sharing pairs (≥ 0.5) | 92958 |
| Exact-duplicate clusters | 5 |
| Keyword-swapped groups | 30 (458 articles) |
| Same-topic clusters | 10 |
| Template families | 22 (590 articles) |
| Articles with an external link | 0 |
| Articles with an authoritative (official docs) link | 0 |
| Articles with an in-body internal link | 0 |
| Articles with an image (body or featured) | 0 |
| Articles with unsourced market claims (salary, %, "in demand") | 600 |
| Articles with first-hand evidence (screenshot, repo, output) | 0 |
| Articles by the generic "GloryTecks Team" author | 250 |
| Articles whose author has a profile URL | 0 |
| Articles never updated (updated = date) | 401 |
| Titles using course wording (commercial conflict) | 0 |
| Topics with official documentation available | 326 |
<!-- /generated:summary -->

How to read the similarity numbers:

- **Normalised similarity** compares articles after replacing each one's own title and category name with placeholders (`TTL`, `CAT`), so keyword-swapped copies are measured as the duplicates they are. It is the Jaccard overlap of the two articles' five-word phrases: 1.00 means identical phrasing, 0.00 nothing in common.
- **Raw similarity** is the same measure without placeholders. The notable finding: raw similarity between same-category template pairs averages 0.89, and **3,488 pairs of differently titled articles are at least 95% identical as written**. The title appears in so few sentences that swapping it barely changes the text.
- **Unique phrasing** is the share of an article's five-word phrases that appear in no other article. **Boilerplate** is the share that appears in ten or more.

## 3. By kind and category

The earlier audit ([`BLOG_CONTENT_AUDIT.md`](./BLOG_CONTENT_AUDIT.md)) rated the interview, projects, certification and comparison kinds as more differentiated than the 417 guides. Measured by phrasing, they are not. Each kind has its own template: comparison, interview and certification articles are nearly as alike as the guides (nearest-neighbour similarity 0.91–0.99). Salary and "what is" articles vary most, and even they are 76–91% boilerplate.

<!-- generated:kinds -->
| Kind | Articles | Mean words | Mean unique | Mean boilerplate | Mean max sim (category) | Mean max sim (intent) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| guide | 418 | 675 | 0% | 100% | 1.00 | 0.99 |
| comparison | 66 | 480 | 1% | 99% | 0.99 | 0.98 |
| interview | 58 | 519 | 1% | 99% | 0.91 | 0.96 |
| roadmap | 19 | 673 | 1% | 96% | 0.91 | 0.91 |
| projects | 17 | 563 | 0% | 99% | 0.83 | 0.85 |
| salary | 11 | 542 | 5% | 91% | 0.54 | 0.65 |
| certification | 9 | 525 | 0% | 67% | 0.94 | 0.96 |
| whatis | 2 | 482 | 6% | 76% | 0.60 | 0.63 |
<!-- /generated:kinds -->

<!-- generated:categories -->
| Category | Articles | Mean words | Mean unique | Mean sim (category) | Mean max sim (category) |
| --- | ---: | ---: | ---: | ---: | ---: |
| aws | 50 | 645 | 0% | 0.78 | 0.96 |
| azure-data-factory | 50 | 662 | 0% | 0.77 | 0.96 |
| career-guidance | 50 | 628 | 0% | 0.86 | 0.99 |
| data-analytics | 50 | 639 | 0% | 0.79 | 0.98 |
| data-engineering | 50 | 616 | 0% | 0.73 | 0.97 |
| data-science | 50 | 647 | 0% | 0.79 | 0.99 |
| gcp | 50 | 624 | 0% | 0.77 | 0.96 |
| generative-ai | 50 | 660 | 1% | 0.82 | 0.95 |
| interview-questions | 50 | 519 | 0% | 0.97 | 0.99 |
| mlops | 50 | 640 | 0% | 0.83 | 0.97 |
| power-bi | 50 | 664 | 0% | 0.81 | 0.96 |
| python | 50 | 619 | 0% | 0.78 | 0.97 |
<!-- /generated:categories -->

The `interview-questions` category is the most uniform (mean similarity 0.97 within the category). That is the category Phase 1 already found duplicating topic-category articles.

<!-- generated:distribution -->
**Unique phrasing per article**

| Unique share | Articles |
| ---: | ---: |
| 0%–10% | 599 |
| 10%–20% | 1 |
| 20%–35% | 0 |
| 35%–60% | 0 |
| 60%–100% | 0 |

**Similarity to the nearest same-category article**

| Similarity | Articles |
| ---: | ---: |
| 0%–20% | 0 |
| 20%–50% | 10 |
| 50%–80% | 25 |
| 80%–100% | 565 |
<!-- /generated:distribution -->

## 4. Structure and substance

<!-- generated:structure -->
| Measure | Min | Median | Max | Articles with none |
| --- | --- | ---: | --- | ---: |
| Words | 470 | 667 | 716 | 0 |
| Headings | 4 | 8 | 9 | 0 |
| Paragraphs | 3 | 8 | 8 | 0 |
| Tables | 0 | 1 | 1 | 86 |
| Code blocks | 0 | 1 | 1 | 182 |
| Examples | 0 | 1 | 1 | 182 |
| FAQ items | 4 | 4 | 9 | 0 |
| In-body internal links | 0 | 0 | 0 | 600 |
| External links | 0 | 0 | 0 | 600 |
| Unsourced market claims | 3 | 6 | 11 | 0 |
| First-person experience claims | 0 | 0 | 0 | 600 |
<!-- /generated:structure -->

- **Length.** Articles run to 470–716 words of prose, and 163 have fewer than 600. Length alone is not the problem; saying the same thing 600 times is.
- **Examples and code.** 418 articles have one code block, but it is the category's code sample, not the topic's. The single most repeated sample, a generic word-counting snippet, appears in 44 articles. The *A/B testing* guide's sample trains a random forest classifier. 182 articles have no example of any kind.
- **Headings.** A median of eight headings, from a fixed outline (see §5), so a table of contents says nothing about the topic.
- **FAQs.** Every article has an FAQ block, and the same questions appear in all 600 ("Do I need a degree or coding background?"). Each article turns its FAQ block into FAQPage structured data, so the same questions and answers are marked up on 600 pages.

## 5. What is repeated

<!-- generated:repetition -->
| Repeated element | Distinct repeated values | Articles affected | Most repeated (normalised: TTL = the article title, CAT = its category) |
| --- | --- | ---: | --- |
| Opening paragraph | 12 | 598 (100%) | 50× "ttl is one of the topics learners ask about most when they start with cat cat blends stati…" |
| Conclusion paragraph | 4 | 600 (100%) | 300× "ttl is very learnable with the right sequence and steady practice start small build in pub…" |
| Whole outline (heading sequence) | 8 | 493 (82%) | 418× "key takeaways \| understanding the essentials \| core skills you ll need \| step by step \| to…" |
| Headings | 40 | 600 (100%) | 600× "conclusion" |
| FAQ questions | 12 | 600 (100%) | 600× "do i need a degree or coding background" |
| FAQ answers | 34 | 600 (100%) | 600× "most committed learners reach a job ready level in 4 6 months of consistent study and proj…" |
| Code examples | 10 | 418 (70%) | 44× "# A tiny, idiomatic Python example from collections import Counter def top_words(text: str…" |
| Sentences (in 10+ articles) | 343 | 600 (100%) | 600× "a degree helps but isn t mandatory" |
<!-- /generated:repetition -->

The ten most repeated sentences (normalised):

<!-- generated:top-sentences -->
- 600× “a degree helps but isn t mandatory”
- 600× “cat skills are in active demand across hyderabad s it corridor from product companies in hitec city and gachibowli to services firms and startups”
- 600× “glorytecks provides 100 placement support in hyderabad including resume building mock interviews and hiring partner referrals alongside real time project based cat training”
- 600× “most committed learners reach a job ready level in 4 6 months of consistent study and projects”
- 600× “start small build in public and let projects pull you through the harder topics”
- 600× “the field rewards people who can show real applied work”
- 600× “this guide is written by glorytecks mentors in hyderabad and is built to be practical you ll leave knowing what to do next not just a list of definitions”
- 600× “with structured mentoring at glorytecks that timeline becomes more predictable because you re not guessing what to learn next”
- 597× “ttl is very learnable with the right sequence and steady practice”
- 588× “ttl is one of the topics learners ask about most when they start with cat”
<!-- /generated:top-sentences -->

Two of these are business claims, not article content, and both appear in all 600 posts:

- *"GloryTecks provides 100% placement support in Hyderabad including resume building, mock interviews and hiring partner referrals…"*
- *"This guide is written by GloryTecks mentors in Hyderabad…"*, on posts bylined to named authors and to "GloryTecks Team" alike.

Whether to keep a placement-support claim on the blog, and in what wording, is a business decision. It is recorded here and not changed. The pilot rewrites (§9) do not repeat either sentence. They link to the relevant course page instead, and an editor approving a rewrite is approving that change.

## 6. Clusters

Four kinds of cluster. An article can appear in more than one: every keyword-swapped group sits inside a template family.

| Kind | What it means | Action |
| --- | --- | --- |
| **Exact duplicate** | The same article (same topic and title) at two URLs | REDIRECT: the five `-2` posts, already 301'd in Phase 1 |
| **Same topic** | Two or more articles answering the same question | MERGE, or rewrite to distinct intents, per the Phase 3 ownership decisions ([`lib/seo/ownership.ts`](../lib/seo/ownership.ts)) |
| **Keyword-swapped** | Different topics, word-for-word the same body (raw similarity ≥ 0.95) | DEEP REWRITE each. **Never merge.** The topics are legitimate; only the text is shared. |
| **Template family** | Different topics sharing one body template within a category (normalised similarity ≥ 0.5) | DEEP REWRITE in priority order |

### Exact duplicates

<!-- generated:exact-clusters -->
| Cluster | Kind | Articles | Category | Intent | Mean sim | Strongest | Action | Members |
| --- | --- | ---: | --- | --- | ---: | --- | --- | --- |
| X1 | exact-duplicate | 2 | aws (+1 more) | interview | 0.69 | [aws-interview-questions-for-data-engineers](/blog/aws-interview-questions-for-data-engineers) | REDIRECT | `aws-interview-questions-for-data-engineers-2` |
| X2 | exact-duplicate | 2 | data-analytics (+1 more) | interview | 0.72 | [data-analyst-interview-questions-and-answers](/blog/data-analyst-interview-questions-and-answers) | REDIRECT | `data-analyst-interview-questions-and-answers-2` |
| X3 | exact-duplicate | 2 | data-engineering (+1 more) | interview | 0.71 | [data-engineering-interview-questions-and-answers](/blog/data-engineering-interview-questions-and-answers) | REDIRECT | `data-engineering-interview-questions-and-answers-2` |
| X4 | exact-duplicate | 2 | gcp (+1 more) | interview | 0.70 | [gcp-interview-questions-for-data-engineers](/blog/gcp-interview-questions-for-data-engineers) | REDIRECT | `gcp-interview-questions-for-data-engineers-2` |
| X5 | exact-duplicate | 2 | mlops (+1 more) | interview | 0.69 | [mlops-interview-questions-and-answers](/blog/mlops-interview-questions-and-answers) | REDIRECT | `mlops-interview-questions-and-answers-2` |
<!-- /generated:exact-clusters -->

### Same topic

<!-- generated:topic-clusters -->
| Cluster | Kind | Articles | Category | Intent | Mean sim | Strongest | Action | Members |
| --- | --- | ---: | --- | --- | ---: | --- | --- | --- |
| T1 | same-topic | 3 | gcp (+2 more) | comparison | 0.73 | [bigquery-vs-snowflake-vs-redshift-a-comparison](/blog/bigquery-vs-snowflake-vs-redshift-a-comparison) | MERGE | `cloud-data-warehouses-compared-snowflake-vs-bigquery-vs-redshift`<br>`redshift-vs-snowflake-vs-bigquery-a-comparison` |
| T2 | same-topic | 2 | power-bi (+1 more) | comparison | 0.72 | [power-bi-vs-excel-when-to-use-each-tool](/blog/power-bi-vs-excel-when-to-use-each-tool) | DEEP REWRITE | `excel-vs-power-bi-which-should-you-learn-first` |
| T3 | same-topic | 2 | data-engineering (+1 more) | comparison | 0.72 | [orchestration-airflow-vs-dagster-vs-prefect](/blog/orchestration-airflow-vs-dagster-vs-prefect) | MANUAL REVIEW | `pipeline-orchestration-airflow-vs-prefect-vs-dagster` |
| T4 | same-topic | 2 | azure-data-factory (+1 more) | interview | 0.70 | [azure-data-factory-interview-questions-and-answers](/blog/azure-data-factory-interview-questions-and-answers) | MERGE | `azure-data-factory-adf-interview-questions` |
| T5 | same-topic | 2 | data-analytics | career | 0.65 | [data-analyst-roadmap-2026-skills-tools-and-timeline](/blog/data-analyst-roadmap-2026-skills-tools-and-timeline) | DEEP REWRITE | `how-to-become-a-data-analyst-with-no-experience` |
| T6 | same-topic | 2 | data-engineering | career | 0.65 | [data-engineering-roadmap-2026-a-complete-guide](/blog/data-engineering-roadmap-2026-a-complete-guide) | DEEP REWRITE | `how-to-become-a-data-engineer-in-2026` |
| T7 | same-topic | 2 | power-bi (+1 more) | interview | 0.69 | [power-bi-interview-questions-top-40-with-answers](/blog/power-bi-interview-questions-top-40-with-answers) | MERGE | `power-bi-interview-questions-with-detailed-answers` |
| T8 | same-topic | 2 | python (+1 more) | interview | 0.70 | [python-interview-questions-top-50-with-answers](/blog/python-interview-questions-top-50-with-answers) | DEEP REWRITE | `python-interview-questions-for-data-roles` |
| T9 | same-topic | 2 | azure-data-factory | tutorial | 1.00 | [adf-pipelines-explained-building-your-first-pipeline](/blog/adf-pipelines-explained-building-your-first-pipeline) | MANUAL REVIEW | `building-an-etl-pipeline-with-adf-step-by-step` |
| T10 | same-topic | 2 | generative-ai | tutorial | 1.00 | [langgraph-tutorial-building-stateful-ai-agents](/blog/langgraph-tutorial-building-stateful-ai-agents) | MANUAL REVIEW | `building-ai-agents-with-langgraph-a-hands-on-tutorial` |
<!-- /generated:topic-clusters -->

Every same-topic cluster matches one Phase 3 already reviewed, and its decision is carried over. Two are **KEEP BOTH** (roadmap vs "how to become"), so both articles are rewritten to their own angle and cross-linked, not merged. T3, T9 and T10 were **MANUAL REVIEW** in Phase 3 and stay there.

### Keyword-swapped groups

<!-- generated:swapped-clusters -->
| Cluster | Kind | Articles | Category | Intent | Mean sim | Strongest | Action | Members |
| --- | --- | ---: | --- | --- | ---: | --- | --- | --- |
| S1 | keyword-swapped | 29 | data-science | tutorial | 1.00 | [best-free-datasets-for-data-science-practice-in-2026](/blog/best-free-datasets-for-data-science-practice-in-2026) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S2 | keyword-swapped | 40 | mlops | tutorial | 1.00 | [how-to-build-an-mlops-portfolio-that-stands-out](/blog/how-to-build-an-mlops-portfolio-that-stands-out) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S3 | keyword-swapped | 34 | azure-data-factory | tutorial | 1.00 | [copying-data-from-on-prem-sql-to-azure-with-adf](/blog/copying-data-from-on-prem-sql-to-azure-with-adf) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S4 | keyword-swapped | 36 | power-bi | tutorial | 1.00 | [power-bi-service-publishing-sharing-and-workspaces](/blog/power-bi-service-publishing-sharing-and-workspaces) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S5 | keyword-swapped | 38 | generative-ai | tutorial (+1 more) | 1.00 | [prompt-engineering-techniques-that-actually-improve-output](/blog/prompt-engineering-techniques-that-actually-improve-output) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S6 | keyword-swapped | 49 | interview-questions | interview | 1.00 | [docker-and-kubernetes-interview-questions-for-ml](/blog/docker-and-kubernetes-interview-questions-for-ml) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S7 | keyword-swapped | 32 | data-engineering | tutorial (+1 more) | 1.00 | [how-to-become-a-data-engineer-in-2026](/blog/how-to-become-a-data-engineer-in-2026) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S8 | keyword-swapped | 37 | aws | tutorial (+1 more) | 1.00 | [amazon-athena-querying-s3-with-sql](/blog/amazon-athena-querying-s3-with-sql) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S9 | keyword-swapped | 34 | python | tutorial | 1.00 | [python-args-and-kwargs-explained-clearly](/blog/python-args-and-kwargs-explained-clearly) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S10 | keyword-swapped | 3 | aws | certification | 0.99 | [aws-certified-data-engineer-associate-exam-guide](/blog/aws-certified-data-engineer-associate-exam-guide) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S11 | keyword-swapped | 2 | azure-data-factory | certification | 0.99 | [azure-data-engineer-certification-dp-203-guide](/blog/azure-data-engineer-certification-dp-203-guide) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S12 | keyword-swapped | 2 | azure-data-factory | comparison | 0.99 | [microsoft-fabric-vs-azure-data-factory-what-s-new](/blog/microsoft-fabric-vs-azure-data-factory-what-s-new) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S13 | keyword-swapped | 35 | gcp | tutorial | 1.00 | [bigquery-sql-tips-tricks-and-optimization](/blog/bigquery-sql-tips-tricks-and-optimization) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S14 | keyword-swapped | 19 | career-guidance | tutorial (+1 more) | 1.00 | [how-to-answer-tell-me-about-yourself-in-interviews](/blog/how-to-answer-tell-me-about-yourself-in-interviews) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S15 | keyword-swapped | 2 | data-analytics | project | 1.00 | [data-analytics-projects-for-your-resume](/blog/data-analytics-projects-for-your-resume) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S16 | keyword-swapped | 30 | data-analytics | tutorial | 1.00 | [data-cleaning-a-practical-step-by-step-guide](/blog/data-cleaning-a-practical-step-by-step-guide) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S17 | keyword-swapped | 2 | career-guidance | career | 1.00 | [career-switch-to-data-science-a-realistic-roadmap](/blog/career-switch-to-data-science-a-realistic-roadmap) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S18 | keyword-swapped | 2 | power-bi | comparison | 0.97 | [creating-calculated-columns-vs-measures-in-power-bi](/blog/creating-calculated-columns-vs-measures-in-power-bi) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S19 | keyword-swapped | 2 | data-analytics | career | 1.00 | [data-analytics-roadmap-for-non-tech-backgrounds](/blog/data-analytics-roadmap-for-non-tech-backgrounds) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S20 | keyword-swapped | 2 | data-engineering | career | 1.00 | [from-backend-developer-to-data-engineer-a-roadmap](/blog/from-backend-developer-to-data-engineer-a-roadmap) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S21 | keyword-swapped | 4 | data-science | career | 1.00 | [from-data-analyst-to-data-scientist-a-transition-roadmap](/blog/from-data-analyst-to-data-scientist-a-transition-roadmap) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S22 | keyword-swapped | 2 | mlops | career | 1.00 | [from-data-scientist-to-mlops-engineer-a-roadmap](/blog/from-data-scientist-to-mlops-engineer-a-roadmap) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S23 | keyword-swapped | 2 | power-bi | career | 1.00 | [from-power-bi-beginner-to-developer-a-career-roadmap](/blog/from-power-bi-beginner-to-developer-a-career-roadmap) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S24 | keyword-swapped | 3 | gcp | certification | 1.00 | [gcp-associate-cloud-engineer-certification-guide](/blog/gcp-associate-cloud-engineer-certification-guide) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S25 | keyword-swapped | 4 | data-science | tutorial | 1.00 | [how-much-math-do-you-really-need-for-data-science](/blog/how-much-math-do-you-really-need-for-data-science) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S26 | keyword-swapped | 2 | data-analytics | tutorial | 1.00 | [how-to-build-a-data-analyst-portfolio-in-2026](/blog/how-to-build-a-data-analyst-portfolio-in-2026) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S27 | keyword-swapped | 2 | career-guidance | tutorial | 1.00 | [how-to-use-kaggle-to-boost-your-job-profile](/blog/how-to-use-kaggle-to-boost-your-job-profile) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S28 | keyword-swapped | 5 | python | project | 1.00 | [how-to-structure-a-python-project-the-right-way](/blog/how-to-structure-a-python-project-the-right-way) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S29 | keyword-swapped | 2 | career-guidance | tutorial | 1.00 | [job-search-strategy-for-the-indian-tech-market-2026](/blog/job-search-strategy-for-the-indian-tech-market-2026) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| S30 | keyword-swapped | 2 | career-guidance | interview (+1 more) | 1.00 | [personal-projects-that-double-as-interview-stories](/blog/personal-projects-that-double-as-interview-stories) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
<!-- /generated:swapped-clusters -->

### Template families

<!-- generated:template-clusters -->
| Cluster | Kind | Articles | Category | Intent | Mean sim | Strongest | Action | Members |
| --- | --- | ---: | --- | --- | ---: | --- | --- | --- |
| F1 | template-family | 43 | data-science | tutorial (+2 more) | 0.90 | [how-to-become-a-data-scientist-in-2026-with-no-experience](/blog/how-to-become-a-data-scientist-in-2026-with-no-experience) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F2 | template-family | 42 | mlops | tutorial (+1 more) | 0.97 | [how-to-build-an-mlops-portfolio-that-stands-out](/blog/how-to-build-an-mlops-portfolio-that-stands-out) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F3 | template-family | 39 | azure-data-factory | tutorial (+2 more) | 0.96 | [azure-data-factory-roadmap-2026-a-complete-guide](/blog/azure-data-factory-roadmap-2026-a-complete-guide) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F4 | template-family | 10 | azure-data-factory | comparison (+2 more) | 0.75 | [wrangling-data-flows-vs-mapping-data-flows-in-adf](/blog/wrangling-data-flows-vs-mapping-data-flows-in-adf) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F5 | template-family | 42 | generative-ai | tutorial (+2 more) | 0.96 | [agentic-ai-roadmap-2026-from-prompts-to-autonomous-systems](/blog/agentic-ai-roadmap-2026-from-prompts-to-autonomous-systems) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F6 | template-family | 42 | power-bi | tutorial (+2 more) | 0.94 | [power-bi-service-publishing-sharing-and-workspaces](/blog/power-bi-service-publishing-sharing-and-workspaces) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F7 | template-family | 49 | interview-questions | interview | 1.00 | [docker-and-kubernetes-interview-questions-for-ml](/blog/docker-and-kubernetes-interview-questions-for-ml) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F8 | template-family | 35 | data-engineering | tutorial (+2 more) | 0.94 | [how-to-become-a-data-engineer-in-2026](/blog/how-to-become-a-data-engineer-in-2026) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F9 | template-family | 40 | aws | tutorial (+2 more) | 0.96 | [aws-roadmap-2026-for-data-engineers](/blog/aws-roadmap-2026-for-data-engineers) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F10 | template-family | 14 | data-engineering | comparison (+1 more) | 0.92 | [apache-iceberg-vs-delta-lake-vs-hudi](/blog/apache-iceberg-vs-delta-lake-vs-hudi) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F11 | template-family | 50 | career-guidance | tutorial (+6 more) | 0.86 | [salary-negotiation-how-to-get-paid-what-you-re-worth](/blog/salary-negotiation-how-to-get-paid-what-you-re-worth) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F12 | template-family | 43 | python | tutorial (+2 more) | 0.89 | [learn-python-from-scratch-a-complete-2026-roadmap](/blog/learn-python-from-scratch-a-complete-2026-roadmap) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F13 | template-family | 9 | aws | comparison (+2 more) | 0.70 | [aws-glue-vs-emr-vs-lambda-for-etl](/blog/aws-glue-vs-emr-vs-lambda-for-etl) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F14 | template-family | 7 | mlops | comparison (+2 more) | 0.76 | [what-is-mlops-devops-for-machine-learning-explained](/blog/what-is-mlops-devops-for-machine-learning-explained) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F15 | template-family | 39 | gcp | tutorial (+2 more) | 0.96 | [gcp-roadmap-2026-for-data-engineers](/blog/gcp-roadmap-2026-for-data-engineers) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F16 | template-family | 10 | gcp | comparison (+2 more) | 0.71 | [gcp-vs-aws-vs-azure-for-data-engineering](/blog/gcp-vs-aws-vs-azure-for-data-engineering) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F17 | template-family | 42 | data-analytics | tutorial (+2 more) | 0.92 | [data-cleaning-a-practical-step-by-step-guide](/blog/data-cleaning-a-practical-step-by-step-guide) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F18 | template-family | 7 | data-analytics | comparison (+1 more) | 0.86 | [data-analyst-salary-in-hyderabad-2026](/blog/data-analyst-salary-in-hyderabad-2026) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F19 | template-family | 7 | power-bi | comparison (+2 more) | 0.75 | [power-bi-developer-salary-in-hyderabad-2026](/blog/power-bi-developer-salary-in-hyderabad-2026) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F20 | template-family | 7 | data-science | comparison (+1 more) | 0.86 | [hyperparameter-tuning-grid-search-vs-random-search-vs-bayesian](/blog/hyperparameter-tuning-grid-search-vs-random-search-vs-bayesian) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F21 | template-family | 7 | generative-ai | comparison (+2 more) | 0.77 | [what-is-generative-ai-a-complete-beginner-s-guide](/blog/what-is-generative-ai-a-complete-beginner-s-guide) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
| F22 | template-family | 6 | python | comparison (+1 more) | 0.83 | [python-salary-in-india-2026-roles-and-expectations](/blog/python-salary-in-india-2026-roles-and-expectations) | DEEP REWRITE | see BLOG_SIMILARITY_CLUSTERS.csv |
<!-- /generated:template-clusters -->

"Strongest" in a family or keyword-swapped group means the article with the most original material and substance by the audit's measures. In a corpus where the maximum originality is 10%, that means *least weak*. It is not a merge target.

## 7. Search Console

<!-- generated:gsc -->
_No Search Console export was supplied, so every article is `gsc_class = unknown`._
<!-- /generated:gsc -->

No Search Console data was available for this audit. The site's production domain still serves the legacy SPA (see Phase 0), so data for the Next.js pages will only accumulate after the domain moves. Consequences:

- **No article is marked NOINDEX, and none is merged on similarity alone.** Those decisions need demand evidence.
- **The rewrite queue is ordered by editorial signals** (article kind, whether the site links it from every page, whether official sources exist), not by traffic.

When an export is available (Search Console → Performance → Pages → Export → CSV, 3–16 months), re-run with `BLOG_AUDIT_GSC=<file>`. Each article then gets a class, and the classification and queue order change accordingly:

| Class | Rule (`gscClass` in `lib/blog/quality.ts`) | Effect |
| --- | --- | --- |
| **A** | ≥ 5 clicks in the export window | Protect: never merged away; rewrite moves to the top of the queue |
| **B** | Impressions (≥ 50) but few clicks | Ranks but does not satisfy: rewrite, high priority |
| **C** | Listed with 0 impressions | Merge candidate if in a same-topic cluster; otherwise rewrite late, or NOINDEX if it will not be rewritten |
| **D** | Not in the export at all | Check indexing (URL Inspection) before anything else |

## 8. Strongest articles and main weaknesses

No article meets the "mostly original" bar (≥ 60% unique phrasing). The 15 with the most original material:

<!-- generated:strong -->
| Article | Kind | Words | Unique | Boilerplate | Nearest (sim) |
| --- | --- | ---: | --- | --- | ---: |
| [mock-interview-guide-practising-out-loud-the-right-way](/blog/mock-interview-guide-practising-out-loud-the-right-way) | guide | 641 | 10% | 90% | asking-for-a-raise-timing-script-and-evidence (0.69) |
| [generative-ai-salary-in-india-2026-roles-and-pay](/blog/generative-ai-salary-in-india-2026-roles-and-pay) | salary | 550 | 9% | 91% | mlops-engineer-salary-in-india-2026 (0.59) |
| [power-bi-developer-salary-in-hyderabad-2026](/blog/power-bi-developer-salary-in-hyderabad-2026) | salary | 552 | 8% | 90% | python-salary-in-india-2026-roles-and-expectations (0.62) |
| [python-salary-in-india-2026-roles-and-expectations](/blog/python-salary-in-india-2026-roles-and-expectations) | salary | 530 | 8% | 91% | power-bi-developer-salary-in-hyderabad-2026 (0.62) |
| [salary-negotiation-how-to-get-paid-what-you-re-worth](/blog/salary-negotiation-how-to-get-paid-what-you-re-worth) | salary | 535 | 7% | 91% | data-analyst-salary-in-hyderabad-2026 (0.64) |
| [data-analyst-salary-in-hyderabad-2026](/blog/data-analyst-salary-in-hyderabad-2026) | salary | 538 | 7% | 91% | salary-negotiation-how-to-get-paid-what-you-re-worth (0.64) |
| [what-is-mlops-devops-for-machine-learning-explained](/blog/what-is-mlops-devops-for-machine-learning-explained) | whatis | 474 | 6% | 76% | what-is-generative-ai-a-complete-beginner-s-guide (0.63) |
| [what-is-generative-ai-a-complete-beginner-s-guide](/blog/what-is-generative-ai-a-complete-beginner-s-guide) | whatis | 489 | 6% | 76% | what-is-mlops-devops-for-machine-learning-explained (0.63) |
| [azure-data-engineer-salary-in-hyderabad-2026](/blog/azure-data-engineer-salary-in-hyderabad-2026) | salary | 555 | 5% | 91% | data-engineer-salary-in-hyderabad-2026 (0.63) |
| [aws-data-engineer-salary-in-india-2026](/blog/aws-data-engineer-salary-in-india-2026) | salary | 545 | 5% | 91% | gcp-data-engineer-salary-in-india-2026 (0.70) |
| [data-engineer-salary-in-hyderabad-2026](/blog/data-engineer-salary-in-hyderabad-2026) | salary | 538 | 3% | 90% | data-scientist-salary-in-hyderabad-2026-freshers-to-senior (0.67) |
| [data-analyst-interview-questions-and-answers-2](/blog/data-analyst-interview-questions-and-answers-2) | interview | 532 | 3% | 94% | data-engineering-interview-questions-and-answers-2 (0.74) |
| [data-engineering-interview-questions-and-answers-2](/blog/data-engineering-interview-questions-and-answers-2) | interview | 532 | 3% | 94% | gcp-interview-questions-for-data-engineers-2 (0.74) |
| [aws-interview-questions-for-data-engineers-2](/blog/aws-interview-questions-for-data-engineers-2) | interview | 538 | 3% | 94% | gcp-interview-questions-for-data-engineers-2 (0.78) |
| [data-scientist-salary-in-hyderabad-2026-freshers-to-senior](/blog/data-scientist-salary-in-hyderabad-2026-freshers-to-senior) | salary | 545 | 3% | 91% | data-engineer-salary-in-hyderabad-2026 (0.67) |
<!-- /generated:strong -->

Salary pages score highest because their figures and role names vary by page. That same content is the corpus's biggest trust risk: the figures have no source.

<!-- generated:weaknesses -->
| Weakness | Articles |
| --- | ---: |
| Body mostly boilerplate (> 50% of phrasing shared with 10+ articles) | 600 |
| No external source at all | 600 |
| Unsourced salary / percentage / demand claims | 600 |
| No in-body internal link | 600 |
| No image, diagram or screenshot | 600 |
| No worked example (code or "for example") | 182 |
| Under 600 words of prose | 163 |
| Generic team byline | 250 |
| Author without a profile page | 600 |
| Meta description outside 70–160 characters | 395 |
<!-- /generated:weaknesses -->

Author and E-E-A-T notes, recorded and not changed:

- **250 of 600** posts are bylined "GloryTecks Team", which has no person behind it. The other 350 name one of four authors. No author has a profile page, a photo (`avatar` is empty for all five) or a link, so the Person markup on articles carries a name and role only.
- The author bios in the CMS make numeric claims ("2,000+ students", "100+ enterprise dashboards", "1,500+ freshers"). They are business facts this audit cannot verify, and they should be substantiated or removed before author pages are built.
- 401 posts have `updated` equal to `date`; the other 199 have a later `updated` date, although their bodies are the same template.

## 9. The pilot

Ten articles were rewritten as a controlled pilot. They are saved as reviewable files, **not published**. Results are in [`BLOG_REWRITE_PROGRESS.csv`](./BLOG_REWRITE_PROGRESS.csv); the method and each article's changes are in [`BLOG_PHASE_4_FINAL_REPORT.md`](./BLOG_PHASE_4_FINAL_REPORT.md).

| Measure | Original (10 articles) | Rewrite |
| --- | --- | --- |
| Prose words | 517–703 | 935–1,507 |
| Similarity to the article it replaces | — | 0.00 for all ten |
| Highest similarity to any other article | ≥ 0.99 for all ten | ≤ 0.001 |
| Template sentences | every article | 0 |
| Cited official sources | 0 | 3–11 per article (all fetched and checked on 2026-09-24) |
| Contextual internal links | 0 | 3–5 per article, all resolving to live, non-redirected pages |

## How to re-run

```bash
# 1. Take a fresh, read-only backup (backend)
cd backend && npx tsx src/scripts/blog-backup.ts

# 2. Regenerate this report, the queue, the clusters and the plan's tables (main-website)
cd main-website
BLOG_AUDIT_BACKUP=../backend/backups/blog/<stamp> \
BLOG_AUDIT_REWRITES=../backend/content/blog-rewrites \
BLOG_AUDIT_GSC=<optional Search Console pages CSV> \
npm run blog:audit
```

The measure, its thresholds and the classifier live in [`lib/blog/quality.ts`](../lib/blog/quality.ts) and are unit-tested in `quality.test.ts`. Changing a threshold changes the numbers here on the next run, and nowhere else.
