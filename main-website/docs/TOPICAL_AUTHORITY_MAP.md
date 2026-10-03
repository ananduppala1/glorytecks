# Topical Authority Map

How the blog should support the nine commercial course pages: which informational topics belong to each course, which article owns each topic, and how internal links should carry authority from categories and articles to the course. The per-course detail (every owner, supporting article, gap, duplicate and link to add) is in [`COURSE_CLUSTER_MATRIX.md`](./COURSE_CLUSTER_MATRIX.md). The machine-readable map is [`lib/seo/topical.ts`](../lib/seo/topical.ts).

**Phase 5 scope.** Phase 5 designed the architecture and measured the gap. It did not change the UI, a component, any CMS content or an existing link. It created no page. The map is data plus tests. Rendering from it changes which articles existing blocks list, so that step waits for your approval (§6).

---

## 1. Summary

| | |
| --- | --- |
| Commercial pillars | 9 course pages |
| Supporting topics | **113**: 5–15 per course, each with a role (roadmap, fundamentals, tools, implementation, advanced, troubleshooting, projects, interview, career, salary, certification, comparison) |
| Topic owners | **99** existing articles, one per topic. Comparison topics are owned by `/compare` pages; 7 topics are gaps. |
| Supporting placements | 329 |
| Duplicates to resolve | 30 in course clusters, plus 16 in the career layer. All are merge-or-refocus candidates gated on Search Console. |
| Missing topics | **7**, all in the two courses with no articles of their own: Agentic AI (3) and SQL Server (4) |
| Coverage | Every one of the 595 live articles has a place: 451 in a course cluster, 94 under a platform sub-pillar, 50 in the shared career layer |
| New pages proposed for mature courses | **0** |

What the measurements say (Phase 3 crawl of the current code with live CMS data):

1. **Two commercial pillars get no support.** `/courses/agentic-ai` and `/courses/sql-server` link to no article, because no blog category maps to them. Yet 6 agent articles and about 15 SQL articles already exist in other categories.
2. **Course pages link by recency, not relevance.** Each course page lists the four "best" of the 12 newest posts in its first supporting category. As a result:
   - `/courses/gen-ai` links the Agentic AI roadmap;
   - Data Science and Data Analytics link salary pages whose figures have no source;
   - `/courses/data-engineering` reaches one of its four categories and none of the AWS, GCP or Azure roadmaps.
3. **The CMS maps two generic categories wholesale to Data Science.** Every interview-questions and career-guidance article's "Explore course" card points at Data Science, including the SQL, Power BI, MLOps and data-engineering interview sets. **54** articles the map places elsewhere send readers to the wrong course.
4. **Topic owners are hard to reach.** **40 of 99** owners receive no editorial link (only menus, archives and prev/next), and **34 of 99** sit five or more clicks from the homepage. "Related articles" come from the 12 newest posts in a category, so an older owner is never suggested.
5. **No article competes with a course page for its commercial query.** No title uses course, fees, institute or "classes in" wording (checked in `topical.test.ts`). The cannibalisation that exists is article against article (§5), not article against course.

## 2. The model

```text
COURSE PAGE   /courses/{course}                              ← commercial pillar
   │    ▲
   │    └─ each owner links up once, in context, where the syllabus covers its topic
   ▼  curated reading block: roadmap, projects, interview, core topics
TOPIC OWNERS   5–15 per course, one article per topic
   roadmap · fundamentals · tools · implementation · advanced · troubleshooting
   projects · interview · certification · salary · comparison (owned by /compare pages)
   │    ▲
   │    └─ every supporting article links up to its owner
   ▼  each owner links down to its 3–5 strongest supporting articles
SUPPORTING ARTICLES   narrower subtopics of one owner

Category hub    lists the owners in its category first, then the archive
Platform hubs   the AWS, GCP and Azure roadmaps own their ~50 platform articles each (Data Engineering)
Career layer    shared by every course; links to a course only when an article is about a specific role
```

Rules the map enforces, in `topical.test.ts`:

- **One page, one topic.** An article owns at most one topic across the whole site. This is the Phase 3 intent contract, applied to course clusters.
- **Owners are never redirect or merge candidates.** Phase 1 redirects are never placed. Phase 3 MERGE secondaries appear only as duplicates.
- **Gaps must justify themselves.** Every gap states the independent value it would add, and none may exist for a course whose syllabus is already covered.
- **Commercial intent stays on the course page.** No owner's title reaches for a course query.

## 3. What exists today versus the model

| Link path | Model | Today (measured) |
| --- | --- | --- |
| Course page → articles | Curated owners: roadmap, projects, interview, core topics | 4 links, the "best" of the category's 12 newest posts; 0 for Agentic AI and SQL Server; 21 of the 28 links are topic owners |
| Article body → course | One contextual sentence in owners, where the syllabus covers the topic | None (Phase 4: 0 in-body internal links in 600 articles) |
| "Explore course" card | The article's cluster course (`courseForArticle`); `/courses` for generic career articles | The category's course: 54 placed articles point at the wrong one |
| Supporting → owner | Every supporting article links up in its body | None |
| Owner → supporting | 3–5 strongest | None |
| Related articles | Same topic first, then same-cluster owners | Tag overlap among the category's 12 newest posts |
| Category hub → articles | The owners in that category | The kind-ranked "best" of the current archive page |
| Platform articles (AWS/GCP/ADF) → platform roadmap | Every one | Only if the roadmap is among the 12 newest |
| Comparison posts → `/compare` page | Always | Footer only (Phase 3) |

## 4. The cluster graphs

Each tree shows the pillar, its topic owners by role, and up to three supporting articles per owner. The full lists, with measurements, are in the matrix.

### Data Science

```text
/courses/data-science   ← commercial pillar (Data Science)
├── Roadmap         data-science-roadmap-2026-a-complete-step-by-step-guide   (2 supporting, 2 duplicates)
│       ├─ from-data-analyst-to-data-scientist-a-transition-roadmap
│       └─ career-switch-to-data-science-a-realistic-roadmap
├── Roadmap         machine-learning-roadmap-for-beginners-in-2026   (1 supporting)
│       └─ natural-language-processing-nlp-roadmap-for-2026
├── Fundamentals    top-10-machine-learning-algorithms-explained-for-beginners   (9 supporting)
│       ├─ supervised-vs-unsupervised-learning-a-clear-comparison
│       ├─ regression-vs-classification-when-to-use-each
│       ├─ bias-variance-tradeoff-explained-with-real-examples
│       └─ … 6 more
├── Fundamentals    statistics-for-data-science-the-20-you-actually-need   (2 supporting, 1 duplicate)
│       ├─ probability-for-data-science-concepts-you-must-know
│       └─ a-b-testing-for-data-scientists-a-practical-guide
├── Tools           python-for-data-science-the-essential-libraries
├── Tools           sql-for-data-science-queries-every-data-scientist-must-know   (1 supporting)
│       └─ pandas-vs-sql-for-data-analysis-when-to-use-which
├── Implementation  exploratory-data-analysis-eda-a-step-by-step-walkthrough   (3 supporting)
│       ├─ data-preprocessing-cleaning-data-the-right-way
│       ├─ feature-engineering-a-practical-guide-with-examples
│       └─ handling-imbalanced-datasets-techniques-that-work
├── Implementation  evaluation-metrics-accuracy-precision-recall-and-f1-demystified   (3 supporting)
│       ├─ confusion-matrix-explained-reading-it-correctly
│       ├─ cross-validation-in-machine-learning-a-practical-guide
│       └─ hyperparameter-tuning-grid-search-vs-random-search-vs-bayesian
├── Advanced        deep-learning-guide-neural-networks-explained-simply   (5 supporting)
│       ├─ computer-vision-basics-from-pixels-to-predictions
│       ├─ time-series-forecasting-a-beginner-friendly-introduction
│       ├─ recommendation-systems-how-netflix-and-amazon-suggest-items
│       └─ … 2 more
├── Projects        data-science-projects-for-freshers-12-ideas-with-datasets   (4 supporting)
│       ├─ end-to-end-machine-learning-project-a-complete-walkthrough
│       ├─ best-free-datasets-for-data-science-practice-in-2026
│       ├─ kaggle-for-beginners-how-to-start-and-win-medals
│       └─ … 1 more
├── Interview       data-science-interview-questions-and-answers-2026   (8 supporting)
│       ├─ machine-learning-interview-questions-concepts-and-answers
│       ├─ statistics-interview-questions-for-data-science
│       ├─ probability-interview-questions-for-data-science
│       └─ … 5 more
├── Career          data-science-career-guide-roles-skills-and-growth-path   (3 supporting)
│       ├─ data-science-internships-in-hyderabad-how-to-land-one
│       ├─ top-data-science-companies-hiring-in-hyderabad
│       └─ best-programming-languages-for-data-science-in-2026
├── Salary          data-scientist-salary-in-hyderabad-2026-freshers-to-senior
└── Comparison      /compare/data-science-vs-data-analytics (compare page)   (2 supporting)
```

### Generative AI

```text
/courses/gen-ai   ← commercial pillar (Generative AI)
├── Fundamentals    what-is-generative-ai-a-complete-beginner-s-guide   (8 supporting)
│       ├─ how-large-language-models-llms-work-under-the-hood
│       ├─ how-transformers-changed-ai-attention-explained
│       ├─ tokenization-in-llms-why-it-matters-more-than-you-think
│       └─ … 5 more
├── Roadmap         how-to-become-a-generative-ai-engineer-in-2026
├── Implementation  prompt-engineering-techniques-that-actually-improve-output   (3 supporting)
│       ├─ chain-of-thought-prompting-making-llms-reason
│       ├─ few-shot-vs-zero-shot-prompting-a-practical-guide
│       └─ prompt-templates-and-versioning-managing-prompts-at-scale
├── Implementation  rag-architecture-explained-retrieval-augmented-generation   (6 supporting)
│       ├─ chunking-strategies-for-rag-getting-retrieval-right
│       ├─ vector-databases-explained-pinecone-faiss-and-chromadb
│       ├─ retrieval-evaluation-measuring-rag-quality
│       └─ … 3 more
├── Advanced        fine-tuning-vs-rag-which-should-you-choose   (2 supporting)
│       ├─ lora-and-qlora-efficient-fine-tuning-explained
│       └─ synthetic-data-generation-with-llms-a-practical-guide
├── Tools           langchain-tutorial-build-your-first-llm-app   (7 supporting)
│       ├─ llamaindex-vs-langchain-which-framework-to-pick
│       ├─ hugging-face-transformers-a-practical-getting-started-guide
│       ├─ ollama-tutorial-run-llms-locally-on-your-machine
│       └─ … 4 more
├── Implementation  deploying-a-gen-ai-app-on-the-cloud-a-walkthrough   (4 supporting)
│       ├─ vllm-and-model-serving-scaling-llm-inference
│       ├─ cost-optimization-for-llm-applications-in-production
│       ├─ evaluating-llm-outputs-metrics-tools-and-best-practices
│       └─ … 1 more
├── Troubleshooting prompt-injection-and-llm-security-what-you-need-to-know   (2 supporting)
│       ├─ how-to-reduce-llm-hallucinations-in-production
│       └─ guardrails-for-llms-keeping-ai-apps-safe-and-on-topic
├── Projects        top-generative-ai-projects-to-build-for-your-portfolio
├── Interview       generative-ai-interview-questions-and-how-to-answer-them   (1 duplicate)
├── Salary          generative-ai-salary-in-india-2026-roles-and-pay
└── Comparison      /compare/generative-ai-vs-machine-learning (compare page)
```

### Agentic AI

```text
/courses/agentic-ai   ← commercial pillar (Agentic AI)
├── Roadmap         agentic-ai-roadmap-2026-from-prompts-to-autonomous-systems
├── Fundamentals    ai-agents-guide-how-autonomous-agents-actually-work
├── Implementation  function-calling-and-tool-use-in-llms-explained
├── Tools           model-context-protocol-mcp-explained-for-beginners
├── Tools           langgraph-tutorial-building-stateful-ai-agents   (1 duplicate)
├── Advanced        building-a-multi-agent-system-patterns-and-pitfalls
├── Troubleshooting (no single owner) Agent safety: excessive agency and prompt injection   (1 supporting)
├── Projects        [gap P2] AI agent projects for a portfolio
├── Implementation  [gap P3] Evaluating and observing agents
└── Comparison      [gap P2] Agentic AI vs generative AI: which course
```

### Python Programming

```text
/courses/python-programming   ← commercial pillar (Python Programming)
├── Roadmap         learn-python-from-scratch-a-complete-2026-roadmap   (2 duplicates)
├── Fundamentals    python-data-structures-a-complete-reference   (6 supporting)
│       ├─ python-lists-vs-tuples-vs-sets-vs-dictionaries
│       ├─ list-comprehensions-in-python-a-complete-guide
│       ├─ python-string-methods-every-developer-should-know
│       └─ … 3 more
├── Fundamentals    object-oriented-programming-oop-in-python-explained
├── Advanced        python-generators-and-iterators-made-simple   (5 supporting)
│       ├─ python-decorators-explained-with-real-examples
│       ├─ python-decorators-vs-context-managers-when-to-use-each
│       ├─ python-iterators-vs-generators-vs-comprehensions
│       └─ … 2 more
├── Advanced        async-programming-in-python-asyncio-explained   (1 supporting)
│       └─ multithreading-vs-multiprocessing-in-python
├── Implementation  python-file-handling-reading-and-writing-files   (4 supporting)
│       ├─ reading-and-writing-csv-files-in-python
│       ├─ working-with-json-in-python-a-practical-guide
│       ├─ datetime-in-python-working-with-dates-and-times
│       └─ … 1 more
├── Troubleshooting error-handling-in-python-try-except-and-best-practices   (6 supporting)
│       ├─ unit-testing-in-python-with-pytest-a-beginner-s-guide
│       ├─ python-logging-a-practical-setup-for-real-projects
│       ├─ python-best-practices-writing-pythonic-code
│       └─ … 3 more
├── Tools           numpy-guide-arrays-broadcasting-and-vectorization   (4 supporting)
│       ├─ pandas-guide-dataframes-cleaning-and-aggregation
│       ├─ pandas-performance-making-your-code-10x-faster
│       ├─ top-python-libraries-every-developer-should-know
│       └─ … 1 more
├── Implementation  building-rest-apis-with-python-a-practical-guide   (6 supporting)
│       ├─ fastapi-guide-build-a-production-api-step-by-step
│       ├─ flask-vs-fastapi-vs-django-which-to-choose-in-2026
│       ├─ pydantic-explained-data-validation-in-python
│       └─ … 3 more
├── Projects        python-projects-for-beginners-15-ideas-to-build   (1 supporting, 2 duplicates)
│       └─ automate-boring-tasks-with-python-10-scripts
├── Interview       python-interview-questions-top-50-with-answers   (4 supporting, 1 duplicate)
│       ├─ python-interview-questions-for-data-roles
│       ├─ python-coding-interview-questions-and-patterns
│       ├─ numpy-interview-questions-for-data-roles
│       └─ … 1 more
└── Salary          python-salary-in-india-2026-roles-and-expectations
```

### Power BI

```text
/courses/power-bi   ← commercial pillar (Power BI)
├── Roadmap         power-bi-roadmap-2026-from-beginner-to-job-ready   (1 supporting, 1 duplicate)
│       └─ how-to-learn-power-bi-in-30-days-a-study-plan
├── Fundamentals    power-bi-for-beginners-your-first-report-in-1-hour
├── Implementation  power-query-tutorial-transforming-data-without-code   (3 supporting)
│       ├─ power-query-m-language-basics-for-beginners
│       ├─ power-bi-error-handling-in-power-query
│       └─ power-bi-dataflows-explained-for-beginners
├── Fundamentals    data-modeling-in-power-bi-star-schema-explained   (5 supporting)
│       ├─ star-schema-vs-snowflake-schema-in-power-bi
│       ├─ power-bi-relationships-one-to-many-and-cardinality
│       ├─ handling-many-to-many-relationships-in-power-bi
│       └─ … 2 more
├── Implementation  dax-guide-measures-calculated-columns-and-context   (6 supporting, 1 duplicate)
│       ├─ dax-calculate-function-explained-step-by-step
│       ├─ dax-filter-and-all-functions-explained
│       ├─ dax-variables-writing-cleaner-faster-measures
│       └─ … 3 more
├── Implementation  power-bi-dashboard-design-a-practical-guide   (11 supporting)
│       ├─ conditional-formatting-in-power-bi-a-practical-guide
│       ├─ kpis-and-cards-in-power-bi-designing-scorecards
│       ├─ power-bi-bookmarks-and-buttons-for-interactivity
│       └─ … 8 more
├── Implementation  power-bi-service-publishing-sharing-and-workspaces   (5 supporting)
│       ├─ power-bi-data-refresh-scheduled-and-incremental
│       ├─ power-bi-gateway-explained-connecting-on-prem-data
│       ├─ power-bi-deployment-pipelines-for-teams
│       └─ … 2 more
├── Troubleshooting power-bi-performance-tuning-make-reports-faster
├── Tools           connecting-power-bi-to-sql-server-a-step-by-step-guide
├── Projects        power-bi-projects-to-build-for-your-portfolio   (2 supporting)
│       ├─ building-a-sales-dashboard-in-power-bi-from-scratch
│       └─ building-a-finance-dashboard-in-power-bi
├── Interview       power-bi-interview-questions-top-40-with-answers   (1 supporting, 1 duplicate)
│       └─ dax-interview-questions-for-power-bi-developers
├── Certification   power-bi-certification-pl-300-how-to-prepare
├── Salary          power-bi-developer-salary-in-hyderabad-2026
└── Comparison      /compare/power-bi-vs-tableau (compare page)   (3 supporting)
```

### Data Analytics

```text
/courses/data-analytics   ← commercial pillar (Data Analytics)
├── Roadmap         data-analyst-roadmap-2026-skills-tools-and-timeline   (3 supporting)
│       ├─ data-analytics-roadmap-for-non-tech-backgrounds
│       ├─ how-to-become-a-data-analyst-with-no-experience
│       └─ data-analyst-career-path-from-junior-to-lead
├── Fundamentals    business-analytics-explained-a-beginner-s-guide   (4 supporting)
│       ├─ descriptive-vs-diagnostic-vs-predictive-analytics
│       ├─ the-modern-data-analytics-stack-explained
│       ├─ statistical-concepts-every-data-analyst-must-know
│       └─ … 1 more
├── Tools           excel-for-data-analysis-formulas-that-matter   (4 supporting)
│       ├─ pivot-tables-in-excel-a-complete-tutorial
│       ├─ forecasting-in-excel-simple-methods-that-work
│       ├─ excel-power-query-cleaning-data-without-code
│       └─ … 1 more
├── Tools           sql-for-data-analysts-the-queries-you-need-daily   (1 supporting)
│       └─ from-excel-to-sql-a-smooth-transition-guide
├── Implementation  data-cleaning-a-practical-step-by-step-guide   (3 supporting)
│       ├─ how-to-handle-missing-data-in-analytics
│       ├─ how-to-audit-a-messy-dataset-before-analysis
│       └─ outlier-detection-for-analysts-methods-and-tools
├── Implementation  dashboard-design-principles-for-data-analysts   (6 supporting)
│       ├─ data-visualization-best-practices-and-common-mistakes
│       ├─ building-your-first-interactive-dashboard
│       ├─ looker-studio-tutorial-free-dashboards-for-beginners
│       └─ … 3 more
├── Advanced        product-analytics-101-events-funnels-and-retention   (6 supporting)
│       ├─ funnel-analysis-measuring-conversion-step-by-step
│       ├─ cohort-analysis-explained-with-examples
│       ├─ customer-segmentation-for-analysts-a-practical-guide
│       └─ … 3 more
├── Implementation  how-to-create-effective-kpis-for-any-business   (3 supporting)
│       ├─ building-kpi-scorecards-for-executives
│       ├─ metrics-that-matter-vanity-vs-actionable-metrics
│       └─ how-data-analysts-add-real-business-value
├── Projects        data-analytics-projects-for-your-resume   (3 supporting)
│       ├─ building-a-sales-dashboard-a-hands-on-project
│       ├─ how-to-build-a-data-analyst-portfolio-in-2026
│       └─ spreadsheet-to-insight-a-repeatable-analysis-workflow
├── Interview       data-analyst-interview-questions-and-answers   (3 supporting)
│       ├─ excel-interview-questions-for-data-analysts
│       ├─ pandas-interview-questions-every-analyst-should-know
│       └─ tableau-interview-questions-and-answers
├── Tools           top-free-tools-for-data-analysts-in-2026   (2 supporting)
│       ├─ self-service-analytics-empowering-business-teams
│       └─ data-governance-basics-every-analyst-should-know
├── Salary          data-analyst-salary-in-hyderabad-2026
└── Comparison      data-analyst-vs-business-analyst-key-differences   (1 supporting)
        └─ power-bi-vs-tableau-vs-looker-a-2026-comparison
```

### Data Engineering

```text
/courses/data-engineering   ← commercial pillar (Data Engineering)
├── Roadmap         data-engineering-roadmap-2026-a-complete-guide   (5 supporting)
│       ├─ how-to-become-a-data-engineer-in-2026
│       ├─ from-backend-developer-to-data-engineer-a-roadmap
│       ├─ how-to-transition-from-testing-to-data-engineering
│       └─ … 2 more
├── Fundamentals    data-warehouse-explained-concepts-and-architecture   (5 supporting)
│       ├─ data-lake-vs-data-warehouse-vs-lakehouse
│       ├─ oltp-vs-olap-transactional-vs-analytical-systems
│       ├─ medallion-architecture-bronze-silver-and-gold-layers
│       └─ … 2 more
├── Implementation  etl-vs-elt-differences-and-when-to-use-each   (6 supporting)
│       ├─ building-your-first-data-pipeline-a-walkthrough
│       ├─ building-incremental-data-loads-that-scale
│       ├─ cdc-change-data-capture-explained-with-examples
│       └─ … 3 more
├── Fundamentals    data-modeling-star-schema-snowflake-and-data-vault   (2 supporting)
│       ├─ designing-fact-and-dimension-tables
│       └─ slowly-changing-dimensions-scd-types-explained
├── Tools           apache-spark-explained-for-beginners   (10 supporting)
│       ├─ pyspark-tutorial-dataframes-transformations-and-actions
│       ├─ partitioning-and-bucketing-in-spark-explained
│       ├─ spark-performance-tuning-shuffles-joins-and-caching
│       └─ … 7 more
├── Tools           apache-kafka-explained-streaming-data-basics   (4 supporting)
│       ├─ building-a-streaming-pipeline-with-kafka-and-spark
│       ├─ batch-vs-streaming-data-processing-a-clear-comparison
│       ├─ kafka-vs-rabbitmq-vs-pulsar-a-comparison
│       └─ … 1 more
├── Tools           airflow-tutorial-orchestrating-data-pipelines   (1 supporting, 1 duplicate)
│       └─ orchestration-airflow-vs-dagster-vs-prefect
├── Implementation  dbt-tutorial-transformations-in-the-modern-data-stack   (2 supporting)
│       ├─ data-quality-testing-and-validation-in-pipelines
│       └─ data-contracts-reliable-pipelines-between-teams
├── Tools           snowflake-explained-the-cloud-data-warehouse   (2 supporting, 2 duplicates)
│       ├─ bigquery-vs-snowflake-vs-redshift-a-comparison
│       └─ gcp-vs-aws-vs-azure-for-data-engineering
├── Advanced        aws-roadmap-2026-for-data-engineers   (12 supporting, 2 duplicates, + every other article in its category)
│       ├─ amazon-s3-explained-storage-classes-and-best-practices
│       ├─ aws-glue-tutorial-serverless-etl-on-aws
│       ├─ amazon-redshift-explained-the-cloud-data-warehouse
│       └─ … 9 more
├── Advanced        gcp-roadmap-2026-for-data-engineers   (13 supporting, 2 duplicates, + every other article in its category)
│       ├─ bigquery-explained-google-s-serverless-data-warehouse
│       ├─ partitioning-and-clustering-in-bigquery
│       ├─ loading-data-into-bigquery-batch-and-streaming
│       └─ … 10 more
├── Advanced        azure-data-factory-roadmap-2026-a-complete-guide   (13 supporting, 3 duplicates, + every other article in its category)
│       ├─ adf-pipelines-explained-building-your-first-pipeline
│       ├─ copy-activity-in-azure-data-factory-a-practical-guide
│       ├─ triggers-in-adf-schedule-tumbling-window-and-event
│       └─ … 10 more
├── Projects        data-engineering-projects-for-your-portfolio
├── Interview       data-engineering-interview-questions-and-answers   (13 supporting)
│       ├─ etl-interview-questions-for-data-engineers
│       ├─ data-warehouse-interview-questions-and-answers
│       ├─ data-modeling-interview-questions-explained
│       └─ … 10 more
└── Salary          data-engineer-salary-in-hyderabad-2026   (3 duplicates)
```

### MLOps

```text
/courses/mlops   ← commercial pillar (MLOps)
├── Fundamentals    what-is-mlops-devops-for-machine-learning-explained   (3 supporting)
│       ├─ mlops-maturity-levels-where-does-your-team-stand
│       ├─ production-ml-systems-architecture-and-best-practices
│       └─ mlops-vs-devops-vs-dataops-key-differences
├── Roadmap         mlops-roadmap-2026-skills-tools-and-career-path   (2 supporting)
│       ├─ from-data-scientist-to-mlops-engineer-a-roadmap
│       └─ mlops-tools-landscape-2026-what-to-learn
├── Tools           mlflow-tutorial-tracking-experiments-and-models   (5 supporting, 1 duplicate)
│       ├─ experiment-tracking-mlflow-vs-weights-and-biases
│       ├─ model-registry-managing-the-ml-model-lifecycle
│       ├─ model-versioning-with-mlflow-and-dvc
│       └─ … 2 more
├── Tools           docker-for-machine-learning-a-practical-guide   (1 supporting, 1 duplicate)
│       └─ model-packaging-from-pickle-to-production
├── Implementation  serving-ml-models-with-fastapi-and-docker   (8 supporting, 1 duplicate)
│       ├─ batch-vs-real-time-model-inference-tradeoffs
│       ├─ deploying-ml-models-on-aws-azure-and-gcp
│       ├─ blue-green-deployments-for-ml-services
│       └─ … 5 more
├── Tools           kubernetes-for-ml-deploying-models-at-scale   (5 supporting)
│       ├─ kubeflow-pipelines-an-introduction-for-ml-engineers
│       ├─ airflow-for-ml-pipelines-a-practical-guide
│       ├─ pipeline-orchestration-airflow-vs-prefect-vs-dagster
│       └─ … 2 more
├── Implementation  ci-cd-for-machine-learning-pipelines-that-work   (4 supporting)
│       ├─ github-actions-for-ml-automating-workflows
│       ├─ continuous-training-automating-model-retraining
│       ├─ testing-machine-learning-code-and-data
│       └─ … 1 more
├── Troubleshooting monitoring-ml-models-in-production-a-complete-guide   (4 supporting, 1 duplicate)
│       ├─ model-drift-and-data-drift-detection-and-response
│       ├─ prometheus-and-grafana-for-ml-monitoring
│       ├─ logging-and-observability-for-ml-systems
│       └─ … 1 more
├── Advanced        feature-stores-explained-why-teams-need-them   (1 supporting)
│       └─ real-time-feature-engineering-for-online-models
├── Advanced        vertex-ai-and-sagemaker-for-mlops-a-comparison   (3 supporting)
│       ├─ vertex-ai-pipelines-for-mlops-on-gcp
│       ├─ vertex-ai-tutorial-ml-on-google-cloud
│       └─ cost-optimization-for-ml-workloads-in-the-cloud
├── Projects        building-an-end-to-end-mlops-pipeline   (1 supporting)
│       └─ how-to-build-an-mlops-portfolio-that-stands-out
├── Interview       mlops-interview-questions-and-answers   (2 supporting)
│       ├─ docker-and-kubernetes-interview-questions-for-ml
│       └─ git-interview-questions-every-developer-should-know
└── Salary          mlops-engineer-salary-in-india-2026
```

### SQL Server

```text
/courses/sql-server   ← commercial pillar (SQL Server)
├── Roadmap         [gap P1] SQL Server learning path
├── Fundamentals    (no single owner) SQL queries you use every day (SELECT, joins, aggregation)   (3 supporting)
├── Advanced        window-functions-in-sql-for-data-engineers   (2 supporting)
│       ├─ window-functions-sql-interview-questions
│       └─ bigquery-window-functions-and-analytic-sql
├── Troubleshooting sql-optimization-for-data-engineers   (2 supporting)
│       ├─ sql-query-optimization-interview-questions
│       └─ bigquery-sql-tips-tricks-and-optimization
├── Implementation  [gap P2] Stored procedures, functions and T-SQL programming
├── Troubleshooting [gap P2] Indexes and execution plans in SQL Server
├── Fundamentals    [gap P3] Database design: normalisation, keys, constraints
├── Tools           (no single owner) SQL Server in the data stack: SSIS, Power BI, Azure   (4 supporting)
├── Interview       sql-interview-questions-top-50-with-answers   (2 supporting)
│       ├─ sql-joins-interview-questions-explained
│       └─ scenario-based-sql-interview-questions
└── Comparison      /compare/sql-vs-nosql (compare page)
```

## 5. Cannibalisation, duplicates and gaps

### Article against article

The duplicates are listed per course in the matrix. The notable ones:

| Where | What competes | Resolution |
| --- | --- | --- |
| Data Science | Four articles answer "how do I become a data scientist" (roadmap, no-experience, without-degree, career switch) | The roadmap owns it; the two transition roadmaps have distinct audiences; the no-experience and without-degree posts are merge candidates |
| Python | Three answer "how do I learn Python" | The roadmap owns it; merge the 6-month plan; refocus or merge "learn faster" |
| Power BI | The career roadmap is word-for-word the roadmap | Merge candidate |
| Data Engineering | Three platform "become"/"start a career" posts and the AWS data-engineer guide repeat their platform roadmaps; two Airflow introductions; three warehouse comparisons (Phase 3 MERGE) | Platform roadmaps own; merge or refocus |
| Data Science ↔ MLOps | MLflow experiment tracking answered in both categories; model deployment in both | MLOps owns MLflow and serving; DS posts link to it or merge |
| Generative AI | Two interview-question sets | The topic-category copy owns it (the Phase 3 rule) |
| Career layer | 6 groups, 16 duplicates (LinkedIn, behavioural interviews, first job, negotiation, portfolio, resume) | Merge or refocus, pending Search Console |

### Article against course

None. No title uses commercial course wording, and every topic owner is informational. The Phase 3 ownership matrix already gives each course page its commercial query, and no Phase 5 change affects that.

### Gaps: the only new content Phase 5 proposes

| Course | Gap | Priority | Why it has value of its own |
| --- | --- | --- | --- |
| SQL Server | SQL Server learning path | P1 | The cluster has no owner for "what to learn"; the existing SQL articles need a hub to link up to |
| SQL Server | Stored procedures, functions and T-SQL programming | P2 | A syllabus module that no article covers; SQL Server-specific |
| SQL Server | Indexes and execution plans in SQL Server | P2 | The generic optimisation article cannot show SQL Server plans |
| SQL Server | Database design: normalisation, keys, constraints | P3 | Existing modelling articles cover analytical, not transactional, design |
| Agentic AI | AI agent projects for a portfolio | P2 | The course is project-led; the Gen AI projects list answers a different question |
| Agentic AI | Agentic AI vs generative AI (a `/compare` page) | P2 | Helps a reader choose between two overlapping courses, but only as a real syllabus comparison |
| Agentic AI | Evaluating and observing agents | P3 | Agent evaluation (task success, tool calls, cost per task) differs from LLM-output evaluation |

Deliberately **not** proposed: city or locality pages, keyword variants, synonym pages, new comparison pages beyond the one above, a new blog category, or any article for the seven courses whose syllabus already has coverage. For those, the work is to improve the owner (Phase 4 rewrites) and wire the links.

## 6. The preferred authority flow, and how to get there

**The flow**

1. **Category hub → owners → supporting → course.** A category hub lists the owners in its category before the archive. Owners link down to their strongest supporting articles. Supporting articles link up. Owners link to the course once, in context.
2. **Course → owners.** The course page's reading block lists its roadmap, projects, interview and core-topic owners (the matrix names them for each course). Data Engineering lists its three platform roadmaps too. Salary pages are excluded until their figures are sourced.
3. **Related articles → same topic first**, then other owners in the same cluster. Recency only breaks ties.
4. **Articles link to one course at most**, the one whose syllabus they support. Generic career articles link to `/courses` or a roadmap instead. No article is made to link to every course.
5. **Comparisons → `/compare`.** A blog comparison links to the `/compare` page that owns its query.

**Rollout.** Nothing below has been done. Items 1–4 are component or backend changes: the design stays the same but the links change, so they need approval. Items 5–7 continue existing programmes.

| # | Change | Where | Effect |
| ---: | --- | --- | --- |
| 1 | Course reading block reads the curated owners from `COURSE_CLUSTERS` instead of the newest posts of the first category | `app/(site)/courses/[slug]/page.tsx`, `lib/blog/clusters.ts` | Agentic AI and SQL Server gain links; Gen AI stops linking the Agentic roadmap; salary pages drop out; Data Engineering reaches AWS, GCP and Azure |
| 2 | The "Explore course" card uses `courseForArticle`, and generic career articles point at `/courses` | `app/(site)/blog/[slug]/page.tsx` | 54 articles point readers at the right course |
| 3 | Category hub pillars come from the owners in that category | `app/(site)/blog/category/[categorySlug]/page.tsx` | Owners get a stable link from their hub, not only when they happen to be on page 1 |
| 4 | Related posts prefer same-topic articles (`upwardTarget` / cluster siblings) over the newest 12 | `backend/src/routes/public.routes.ts` (post context) | Older articles become reachable; this is the fix Phase 3 identified for the 459 articles with no editorial link |
| 5 | Body links: each rewrite adds its up-link and, for owners, its course sentence | The Phase 4 rewrite programme | Contextual links, written by an editor, where they make sense |
| 6 | Rewrite the 40 owners with no editorial link first, within the Phase 4 queue | `BLOG_REWRITE_QUEUE.csv` | Authority reaches the pages the model depends on |
| 7 | Resolve duplicates once Search Console data exists | The Phase 4 merge procedure | Removes the article-against-article competition in §5 |

Items 1–3 need no new data: `lib/seo/topical.ts` already provides `COURSE_CLUSTERS`, `courseForArticle`, `upwardTarget` and `PLATFORM_SUBPILLARS`, and they are tested.

## 7. Verification

`lib/seo/topical.test.ts` covers the model: 13 tests offline, and 3 more against a backup (16 in all).

- 9 clusters, each with 5–15 topics;
- 12 categories, matching the CMS mapping;
- one owner per topic across the site;
- no redirected article placed, and Phase 3 merges respected;
- every gap and duplicate explained;
- up-link targets defined;
- with `BLOG_AUDIT_BACKUP`: every slug exists and is published, and no owner uses course wording.

Run it with:

```bash
BLOG_AUDIT_BACKUP=../backend/backups/blog/<stamp> npx vitest run lib/seo/topical.test.ts
```

The link measurements in this document and the matrix come from the Phase 3 crawl (`SEO_INTERNAL_LINK_GRAPH.md`). Re-measure after items 1–4 with `SEO_GRAPH_BASE_URL=<site> npm run test:graph`.
