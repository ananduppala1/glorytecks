<!-- generated:inputs -->
| Input | Value |
| --- | --- |
| Backup | `backend/backups/blog/2026-09-24T12-53-23-992Z` (taken 2026-09-24T12:53:29.074Z) |
| Articles | 600 (statuses: published) |
| Search Console / traffic data | none available (see §7) |
| Processing ledger | `backend/content/blog-rewrites/ledger.json` (600 articles) |
<!-- /generated:inputs -->


<!-- generated:totals -->
| Measure | Articles |
| --- | --- |
| Articles audited | 600 |
| Body mostly shared template text (> 50% boilerplate) | 600 |
| Near-duplicate of another article (body similarity ≥ 0.8) | 565 |
| Opening paragraph shared with 10 or more articles | 598 |
| Heading outline shared with 10 or more articles | 476 |
| No external source | 600 |
| No in-body internal link | 600 |
| Unsourced salary, percentage or demand claims | 600 |
| Title promises a number the body does not deliver | 5 |
| Title uses course-purchase wording (competes with a course page) | 0 |
| Title names a place (location-based) | 13 |
| Featured image set | 0 |
| Meta description outside 70–160 characters | 395 |
| Meta title identical to the H1 title | 599 |
| Canonical URL set in the CMS | 0 |
| noindex set in the CMS | 0 |
<!-- /generated:totals -->


<!-- generated:authors -->
| Byline | Articles |
| --- | --- |
| Arjun Nair | 50 |
| GloryTecks Team | 250 |
| Priya Sharma | 50 |
| Ravi Kumar | 125 |
| Sneha Reddy | 125 |
<!-- /generated:authors -->


<!-- generated:actions -->
| Action | Phase 4 classification | Phase 11 classification |
| --- | --- | --- |
| KEEP | 0 | 0 |
| IMPROVE | 0 | 0 |
| DEEP REWRITE | 577 | 540 |
| MERGE | 4 | 41 |
| REDIRECT | 5 | 5 |
| NOINDEX | 0 | 0 |
| MANUAL REVIEW | 14 | 14 |
<!-- /generated:actions -->


<!-- generated:statuses -->
| Processing status | Articles |
| --- | --- |
| analyzed | 520 |
| merge_candidate | 41 |
| needs_review | 34 |
| redirected | 5 |
<!-- /generated:statuses -->


<!-- generated:clusters -->
| Cluster type | Clusters | Articles | Same intent? |
| --- | --- | --- | --- |
| Exact duplicate | 5 | 10 | yes |
| Keyword-swapped (same text, different topics) | 30 | 458 | no |
| Template family | 22 | 590 | no |
| Same topic (body similarity) | 10 | 21 | yes |
| Same intent (curated, Phase 3 and 5) | 39 | 100 | yes |
| Same intent (title similarity, unreviewed) | 20 | 40 | possibly |
| Location-based titles | 1 | 13 | n/a |
| Competes with a course page | 0 | 0 | yes |
<!-- /generated:clusters -->


<!-- generated:intent-groups -->
| Group | Source | Owner | Competing articles | Note |
| --- | --- | --- | --- | --- |
| I1 | phase3-ownership | /compare/power-bi-vs-excel | excel-vs-power-bi-which-should-you-learn-first, power-bi-vs-excel-when-to-use-each-tool | Phase 3 CHANGE INTERNAL TARGETING: The /compare page owns the comparison. Both posts reach it only through the footer: give each a contextual link to it, and me |
| I2 | phase3-ownership | /compare/data-science-vs-data-analytics | data-science-vs-data-analytics-which-career-is-right-for-you | Phase 3 REWRITE INTENT: Two /compare pages ask one question. Keep the field comparison as the owner and refocus the analyst-vs-scientist page on the job roles ( |
| I3 | phase3-ownership | /compare/data-engineering-vs-data-science | data-engineering-vs-data-science-roles-compared | Phase 3 CHANGE INTERNAL TARGETING: The /compare page owns it; the post reaches it only through the footer. Add a contextual link; merge only if GSC shows the po |
| I4 | phase3-ownership | /compare/power-bi-vs-tableau | power-bi-vs-tableau-a-detailed-2026-comparison | Phase 3 CHANGE INTERNAL TARGETING: As above: contextual link from the post to the /compare page. The three-way Power BI vs Tableau vs Looker post is a different |
| I5 | phase3-ownership | bigquery-vs-snowflake-vs-redshift-a-comparison | cloud-data-warehouses-compared-snowflake-vs-bigquery-vs-redshift, redshift-vs-snowflake-vs-bigquery-a-comparison | Phase 3 MERGE: Three posts compare the same three warehouses in a different order. Keep one, 308 the others once GSC confirms which earns the impressions. |
| I6 | phase3-ownership | orchestration-airflow-vs-dagster-vs-prefect | pipeline-orchestration-airflow-vs-prefect-vs-dagster | Phase 3 MANUAL REVIEW: Same three tools, Data Engineering vs MLOps category. Merge, or rewrite the MLOps copy around ML-pipeline orchestration. |
| I7 | phase3-ownership | power-bi-interview-questions-top-40-with-answers | power-bi-interview-questions-with-detailed-answers | Phase 3 MERGE: Topic-category copy wins over the generic interview-questions bucket, as for the five pairs merged earlier. Confirm with GSC, then 308. |
| I8 | phase3-ownership | azure-data-factory-interview-questions-and-answers | azure-data-factory-adf-interview-questions | Phase 3 MERGE: Same rule as the Power BI pair: the Azure Data Factory category copy owns it; the interview-questions bucket copy is the merge candidate. |
| I9 | phase3-ownership | python-interview-questions-top-50-with-answers | python-interview-questions-for-data-roles | Phase 3 REWRITE INTENT: Keep the general Python set as owner. The "for data roles" post becomes standard-library coding tasks from data interviews (Phase 4 pilo |
| I10 | phase3-ownership | data-analyst-roadmap-2026-skills-tools-and-timeline | how-to-become-a-data-analyst-with-no-experience | Phase 3 KEEP BOTH: Roadmap vs career-switch-with-no-experience: related but different questions. Cross-link them. |
| I11 | phase3-ownership | data-engineering-roadmap-2026-a-complete-guide | how-to-become-a-data-engineer-in-2026 | Phase 3 KEEP BOTH: Roadmap vs how-to-become: keep both angles distinct and cross-linked. |
| I12 | phase3-ownership | adf-pipelines-explained-building-your-first-pipeline | building-an-etl-pipeline-with-adf-step-by-step | Phase 3 MANUAL REVIEW: Both walk through building an ADF pipeline. Merge, or keep the second strictly about ETL design. |
| I13 | phase3-ownership | langgraph-tutorial-building-stateful-ai-agents | building-ai-agents-with-langgraph-a-hands-on-tutorial | Phase 3 MANUAL REVIEW: Two LangGraph agent tutorials in the same category. Merge is likely; needs an editor to confirm neither covers something the other does n |
| I14 | phase5-topical | data-science-roadmap-2026-a-complete-step-by-step-guide | how-to-become-a-data-scientist-in-2026-with-no-experience, data-science-without-a-degree-is-it-possible-in-2026 | The two transition roadmaps have distinct audiences (analysts, career switchers) and stay. "How to become … with no experience" and "without a degree" answer th |
| I15 | phase5-topical | statistics-for-data-science-the-20-you-actually-need | how-much-math-do-you-really-need-for-data-science | "How much maths" overlaps the statistics owner; refocus it on the maths (linear algebra, calculus) or merge. |
| I16 | phase5-topical | generative-ai-interview-questions-and-how-to-answer-them | generative-ai-and-llm-interview-questions | Same question twice. As in Phase 3, the topic-category copy owns it; the interview-questions copy is a merge candidate once Search Console confirms it earns not |
| I17 | phase5-topical | langgraph-tutorial-building-stateful-ai-agents | building-ai-agents-with-langgraph-a-hands-on-tutorial | Phase 3 MANUAL REVIEW: two LangGraph agent tutorials. Merge, or give the second a distinct build. |
| I18 | phase5-topical | learn-python-from-scratch-a-complete-2026-roadmap | from-python-beginner-to-job-ready-a-6-month-plan, how-to-learn-python-faster-a-proven-study-plan | Three answers to one question. Keep the roadmap; merge the 6-month plan into it (a timeline section) and refocus "learn faster" on study technique, or merge it  |
| I19 | phase5-topical | python-projects-for-beginners-15-ideas-to-build | python-mini-projects-to-build-in-a-weekend, python-for-automation-a-real-world-project-guide | Two project-idea lists and two automation guides. Merge the weekend list into the beginner list, and the automation guide into the ten scripts (or the reverse), |
| I20 | phase5-topical | python-interview-questions-top-50-with-answers | python-coding-challenges-to-practice-for-interviews | Data-roles post rewritten to standard-library coding tasks (Phase 4 pilot). "Coding challenges to practise" and "coding interview questions and patterns" answer |
| I21 | phase5-topical | power-bi-roadmap-2026-from-beginner-to-job-ready | from-power-bi-beginner-to-developer-a-career-roadmap | The career roadmap has the same body as the roadmap (Phase 4, keyword-swapped) and the same query: merge candidate. The 30-day plan is a time-boxed study plan a |
| I22 | phase5-topical | dax-guide-measures-calculated-columns-and-context | creating-calculated-columns-vs-measures-in-power-bi | The DAX guide already covers "measures and calculated columns". Refocus the comparison post on the decision (when to use which, with examples) or merge it. |
| I23 | phase5-topical | power-bi-interview-questions-top-40-with-answers | power-bi-interview-questions-with-detailed-answers | Phase 3 MERGE (Phase 4: gated on Search Console). |
| I24 | phase5-topical | airflow-tutorial-orchestrating-data-pipelines | workflow-orchestration-with-apache-airflow-dags | Two Airflow introductions. Merge the DAGs post into the tutorial, or refocus it on DAG design patterns. |
| I25 | phase5-topical | snowflake-explained-the-cloud-data-warehouse | cloud-data-warehouses-compared-snowflake-vs-bigquery-vs-redshift, redshift-vs-snowflake-vs-bigquery-a-comparison | Phase 3 MERGE: three posts compare the same three warehouses. bigquery-vs-snowflake-vs-redshift owns it. |
| I26 | phase5-topical | aws-roadmap-2026-for-data-engineers | how-to-start-an-aws-cloud-career-in-2026, aws-data-engineer-guide-skills-and-services | The "start an AWS cloud career" and "AWS data engineer guide" posts answer the roadmap question again: merge candidates. The ~40 other AWS articles support the  |
| I27 | phase5-topical | gcp-roadmap-2026-for-data-engineers | how-to-start-a-career-in-google-cloud-in-2026, streaming-data-into-bigquery-a-practical-guide | "Start a career in Google Cloud" repeats the roadmap. "Streaming data into BigQuery" overlaps "loading data into BigQuery: batch and streaming"; keep one owner  |
| I28 | phase5-topical | azure-data-factory-roadmap-2026-a-complete-guide | how-to-become-an-azure-data-engineer-in-2026, building-an-etl-pipeline-with-adf-step-by-step, azure-data-factory-adf-interview-questions | "How to become an Azure data engineer" repeats the roadmap. The ETL-pipeline post is a Phase 3 MANUAL REVIEW against the first-pipeline post, and the interview- |
| I29 | phase5-topical | data-engineer-salary-in-hyderabad-2026 | aws-data-engineer-salary-in-india-2026, gcp-data-engineer-salary-in-india-2026, azure-data-engineer-salary-in-hyderabad-2026 | Four salary pages, all Phase 4 MANUAL REVIEW. With a sourced dataset, one data-engineer salary page with a platform section is likely more useful than four. |
| I30 | phase5-topical | mlflow-tutorial-tracking-experiments-and-models | mlflow-for-data-scientists-tracking-experiments | The Data Science category has its own MLflow experiment-tracking post. MLOps owns MLflow; merge the DS post, or refocus it on the notebook workflow and link her |
| I31 | phase5-topical | docker-for-machine-learning-a-practical-guide | containerizing-a-machine-learning-model-step-by-step | Rewritten in the Phase 4 pilot. The step-by-step containerising post answers the same question: merge, or make it the worked walkthrough the guide links to. |
| I32 | phase5-topical | serving-ml-models-with-fastapi-and-docker | building-a-prediction-api-a-complete-walkthrough | Both the FastAPI post and "building a prediction API" walk through serving a model over HTTP. "From notebook to production" sits in Data Science and is linked h |
| I33 | phase5-topical | monitoring-ml-models-in-production-a-complete-guide | handling-concept-drift-in-live-ml-systems | Concept drift is covered by the drift article; merge, or keep only if it adds the retraining response. |
| I34 | phase5-career | linkedin-optimization-for-tech-job-seekers-in-2026 | building-a-personal-brand-on-linkedin, how-to-write-linkedin-posts-that-get-you-noticed, how-to-get-recruiters-to-notice-your-profile | Profile, posting and branding are sections of one guide; the post-writing article can stay if it is genuinely about content. |
| I35 | phase5-career | behavioral-interview-questions-for-data-roles | cracking-the-behavioral-interview-star-method, how-to-answer-tell-me-about-yourself-in-interviews, cracking-hr-round-questions-confidently | STAR and "tell me about yourself" are parts of behavioural-interview preparation. Merge or cross-link, pending Search Console. |
| I36 | phase5-career | how-to-get-your-first-data-job-with-no-experience | how-to-stand-out-in-a-crowded-junior-job-market, from-college-to-corporate-a-fresher-s-survival-guide, interview-tips-for-freshers-how-to-stand-out | The college-to-corporate post is about the first months in a job, a distinct question; the other two overlap the owner. |
| I37 | phase5-career | salary-negotiation-how-to-get-paid-what-you-re-worth | how-to-negotiate-a-job-offer-email-step-by-step, asking-for-a-raise-timing-script-and-evidence | Offer negotiation and raises are distinct moments; the email post overlaps the owner. The owner itself is a Phase 4 MANUAL REVIEW for its figures. |
| I38 | phase5-career | portfolio-building-projects-that-impress-recruiters | personal-projects-that-double-as-interview-stories, how-to-build-a-data-portfolio-website, github-profile-tips-to-impress-hiring-managers | Phase 4 found the first two word-for-word identical. Website and GitHub posts can stay as how-tos linked from the owner. |
| I39 | phase5-career | resume-building-for-data-roles-a-complete-guide | common-resume-mistakes-that-get-you-rejected, how-to-quantify-achievements-on-your-resume | Mistakes and quantifying achievements are sections of the resume guide or supporting how-tos; keep them only if they go deeper. |
<!-- /generated:intent-groups -->


<!-- generated:title-similarity -->
| Group | Article | Similar article | Similarity |
| --- | --- | --- | --- |
| I40 | a-b-testing-ml-models-in-production | monitoring-ml-models-in-production-a-complete-guide | 0.60 |
| I41 | adf-pipelines-explained-building-your-first-pipeline | building-a-metadata-framework-for-adf-pipelines | 0.71 |
| I42 | adf-pipelines-explained-building-your-first-pipeline | metadata-driven-pipelines-in-azure-data-factory | 0.67 |
| I43 | adf-pipelines-explained-building-your-first-pipeline | parameterizing-pipelines-in-azure-data-factory | 0.67 |
| I44 | adf-vs-databricks-when-to-use-each | azure-synapse-vs-azure-data-factory-a-comparison | 0.60 |
| I45 | aws-data-engineer-guide-skills-and-services | vpc-basics-for-data-engineers-on-aws | 0.60 |
| I46 | aws-data-engineering-projects-for-your-portfolio | data-engineering-projects-for-your-portfolio | 0.67 |
| I47 | azure-data-engineering-projects-for-your-portfolio | data-engineering-projects-for-your-portfolio | 0.67 |
| I48 | azure-synapse-pipelines-vs-standalone-adf | azure-synapse-vs-azure-data-factory-a-comparison | 0.67 |
| I49 | bigquery-window-functions-and-analytic-sql | window-functions-in-sql-for-data-engineers | 0.60 |
| I50 | building-a-metadata-framework-for-adf-pipelines | building-an-etl-pipeline-with-adf-step-by-step | 0.63 |
| I51 | copy-activity-in-azure-data-factory-a-practical-guide | data-partitioning-strategies-in-adf-copy-activity | 0.71 |
| I52 | data-engineering-projects-for-your-portfolio | gcp-data-engineering-projects-for-your-portfolio | 0.67 |
| I53 | data-engineering-roadmap-2026-a-complete-guide | how-to-become-an-azure-data-engineer-in-2026 | 0.67 |
| I54 | excel-power-query-cleaning-data-without-code | power-query-tutorial-transforming-data-without-code | 0.63 |
| I55 | how-to-become-a-data-engineer-in-2026 | how-to-become-an-azure-data-engineer-in-2026 | 0.67 |
| I56 | incremental-data-loading-in-azure-data-factory | loading-data-into-synapse-with-adf | 0.67 |
| I57 | loading-data-into-bigquery-batch-and-streaming | streaming-data-into-bigquery-a-practical-guide | 0.60 |
| I58 | metadata-driven-pipelines-in-azure-data-factory | parameterizing-pipelines-in-azure-data-factory | 0.67 |
| I59 | power-bi-vs-tableau-a-detailed-2026-comparison | power-bi-vs-tableau-vs-looker-a-2026-comparison | 0.75 |
<!-- /generated:title-similarity -->


<!-- generated:title-promises -->
| Article | Promised | Delivered (max items) |
| --- | --- | --- |
| data-science-projects-for-freshers-12-ideas-with-datasets | 12 | 10 |
| power-bi-interview-questions-top-40-with-answers | 40 | 9 |
| python-interview-questions-top-50-with-answers | 50 | 9 |
| python-projects-for-beginners-15-ideas-to-build | 15 | 10 |
| sql-interview-questions-top-50-with-answers | 50 | 9 |
<!-- /generated:title-promises -->


<!-- generated:title-defects -->
| Article | Stored title |
| --- | --- |
| mock-interview-guide-practising-out-loud-the-right-way | Mock Interview Guide: Practising Out Loud the Right Way 10 |
<!-- /generated:title-defects -->
