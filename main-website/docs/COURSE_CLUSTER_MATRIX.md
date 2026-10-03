# Course Cluster Matrix

For each of the nine courses: its commercial pillar, the informational topics that support it, the article that owns each topic, the gaps, the duplicates, the cannibalisation risks, the internal links to add, and a priority. The model behind it, and how links should flow, is in [`TOPICAL_AUTHORITY_MAP.md`](./TOPICAL_AUTHORITY_MAP.md).

**Source of truth:** [`lib/seo/topical.ts`](../lib/seo/topical.ts). Every slug in this document comes from that file, and `lib/seo/topical.test.ts` checks the file against the Phase 1 redirects, the Phase 3 ownership decisions and, with `BLOG_AUDIT_BACKUP` set, the CMS backup. Link measurements ("editorial links in", "click depth", "course page links today") come from the Phase 3 crawl of the current code with live CMS data (2026-09-24; method in [`SEO_INTERNAL_LINK_GRAPH.md`](./SEO_INTERNAL_LINK_GRAPH.md)). No article has been added, edited, merged or redirected in Phase 5.

## Summary

| Course | Priority | Topics | Owners | Supporting | Duplicates | Gaps | Articles in its categories | Course page links today (owners) | Owners with no editorial link | Owners 5+ clicks deep | Articles whose card points at another course |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: |
| [Agentic AI](#agentic-ai-coursesagentic-ai) | **P1** | 10 | 6 | 1 | 1 | 3 | 0 | **0** | 2 | 2 | 6 |
| [Data Engineering](#data-engineering-coursesdata-engineering) | **P1** | 15 | 15 | 88 | 13 | 0 | 197 | 4 (3) | 3 | 3 | 20 |
| [SQL Server](#sql-server-coursessql-server) | **P1** | 10 | 3 | 13 | 0 | 4 | 0 | **0** | 2 | 2 | 11 |
| [Data Science](#data-science-coursesdata-science) | P2 | 14 | 13 | 43 | 3 | 0 | 150 | 4 (4) | 4 | 3 | 1 |
| [Generative AI](#generative-ai-coursesgen-ai) | P2 | 12 | 11 | 32 | 1 | 0 | 50 | 4 (2) | 6 | 4 | 0 |
| [Python Programming](#python-programming-coursespython-programming) | P2 | 12 | 12 | 37 | 5 | 0 | 50 | 4 (3) | 7 | 6 | 4 |
| [Power BI](#power-bi-coursespower-bi) | P2 | 14 | 13 | 37 | 3 | 0 | 50 | 4 (3) | 6 | 5 | 2 |
| [MLOps](#mlops-coursesmlops) | P2 | 13 | 13 | 39 | 4 | 0 | 49 | 4 (4) | 4 | 4 | 6 |
| [Data Analytics](#data-analytics-coursesdata-analytics) | P3 | 13 | 13 | 39 | 0 | 0 | 49 | 4 (2) | 6 | 5 | 4 |
| **Total** | | **113** | **99** | **329** | **30** | **7** | 595 | 28 (21) | **40 of 99** | **34 of 99** | **54** |

**Coverage.** All 595 live articles have a defined place:

- **451** are placed in a course cluster, as a topic owner, a supporting article or a duplicate.
- **94** long-tail AWS, GCP and ADF articles support their platform roadmap (`PLATFORM_SUBPILLARS`).
- **50** form the shared career layer (§ Career support layer).

The five `-2` copies redirected in Phase 1 are excluded.

**Priorities.**

- **P1** is a commercial pillar that receives no support today (Agentic AI, SQL Server), or the largest cluster, whose course page reaches one of its four categories only by recency (Data Engineering).
- **P2** is a working cluster with duplicates or mis-pointed links to resolve.
- **P3** is coherent and needs only link wiring.

## How to read each course section

- **Owner:** the one article that answers the topic. Other articles on the topic link to it; it links to the course.
- **Supporting:** narrower articles that feed the owner. They stay, and link up.
- **Duplicates:** articles competing for the owner's query. Merge or refocus them, pending Search Console (Phase 4 rule: never merge a page that earns clicks).
- **Gap:** a topic the syllabus covers that no article answers, with the reason it has value of its own. Gaps are listed only where that is true: 7 in total, all in the two P1 courses with no articles of their own.
- **Editorial links in · click depth:** from the Phase 3 crawl. An owner with 0 editorial links is reachable only through menus, archives and prev/next.
- **"Component change, awaiting approval":** changes which articles an existing block lists. The design is unchanged, but the links shown change, so it waits for your approval.

---

## Data Science: [`/courses/data-science`](/courses/data-science)

| | |
| --- | --- |
| **Priority** | **P2** |
| **Why** | Strong existing coverage, but four articles answer "how do I become a data scientist". The CMS also maps two generic categories (100 articles) to this course, so Power BI, SQL and MLOps interview posts currently send readers to Data Science. |
| **Supporting categories** | `data-science`, `career-guidance`, `interview-questions` (150 articles) |
| **Placed in the cluster** | 13 topic owners · 43 supporting · 3 duplicates |
| **Course page links today** | [data-science-projects-for-freshers-12-ideas-with-datasets](/blog/data-science-projects-for-freshers-12-ideas-with-datasets)<br>[data-science-roadmap-2026-a-complete-step-by-step-guide](/blog/data-science-roadmap-2026-a-complete-step-by-step-guide)<br>[data-scientist-salary-in-hyderabad-2026-freshers-to-senior](/blog/data-scientist-salary-in-hyderabad-2026-freshers-to-senior)<br>[machine-learning-roadmap-for-beginners-in-2026](/blog/machine-learning-roadmap-for-beginners-in-2026) |
| **Owners with no editorial link in** | 4 of 13 |
| **Owners 5+ clicks from the homepage** | 3 of 13 |

### Supporting topics and existing articles

| Role | Topic | Owner | Editorial links in · click depth | Supporting articles |
| --- | --- | --- | --- | --- |
| Roadmap | Data science roadmap: what to learn, in what order | [data-science-roadmap-2026-a-complete-step-by-step-guide](/blog/data-science-roadmap-2026-a-complete-step-by-step-guide) | 596 · 1 | 2: `from-data-analyst-to-data-scientist-a-transition-roadmap`, `career-switch-to-data-science-a-realistic-roadmap` |
| Roadmap | Machine learning roadmap for beginners | [machine-learning-roadmap-for-beginners-in-2026](/blog/machine-learning-roadmap-for-beginners-in-2026) | 9 · 2 | 1: `natural-language-processing-nlp-roadmap-for-2026` |
| Fundamentals | Machine learning algorithms and concepts | [top-10-machine-learning-algorithms-explained-for-beginners](/blog/top-10-machine-learning-algorithms-explained-for-beginners) | 0 · 5 | 9: `supervised-vs-unsupervised-learning-a-clear-comparison`, `regression-vs-classification-when-to-use-each`, `bias-variance-tradeoff-explained-with-real-examples`, `overfitting-and-underfitting-causes-and-fixes`, `gradient-descent-explained-the-engine-behind-ml`, `clustering-algorithms-k-means-dbscan-and-hierarchical`, `ensemble-learning-bagging-boosting-and-stacking-explained`, `xgboost-explained-why-it-wins-kaggle-competitions`, `dimensionality-reduction-pca-and-t-sne-explained` |
| Fundamentals | Statistics and probability for data science | [statistics-for-data-science-the-20-you-actually-need](/blog/statistics-for-data-science-the-20-you-actually-need) | 3 · 2 | 2: `probability-for-data-science-concepts-you-must-know`, `a-b-testing-for-data-scientists-a-practical-guide` |
| Tools | Python for data science | [python-for-data-science-the-essential-libraries](/blog/python-for-data-science-the-essential-libraries) | 41 · 2 | — |
| Tools | SQL for data science | [sql-for-data-science-queries-every-data-scientist-must-know](/blog/sql-for-data-science-queries-every-data-scientist-must-know) | 1 · 3 | 1: `pandas-vs-sql-for-data-analysis-when-to-use-which` |
| Implementation | The modelling workflow: EDA, preprocessing, feature engineering | [exploratory-data-analysis-eda-a-step-by-step-walkthrough](/blog/exploratory-data-analysis-eda-a-step-by-step-walkthrough) | 0 · 4 | 3: `data-preprocessing-cleaning-data-the-right-way`, `feature-engineering-a-practical-guide-with-examples`, `handling-imbalanced-datasets-techniques-that-work` |
| Implementation | Evaluating and validating models | [evaluation-metrics-accuracy-precision-recall-and-f1-demystified](/blog/evaluation-metrics-accuracy-precision-recall-and-f1-demystified) | 0 · 7 | 3: `confusion-matrix-explained-reading-it-correctly`, `cross-validation-in-machine-learning-a-practical-guide`, `hyperparameter-tuning-grid-search-vs-random-search-vs-bayesian` |
| Advanced | Deep learning and specialisations (NLP, vision, time series, recommenders) | [deep-learning-guide-neural-networks-explained-simply](/blog/deep-learning-guide-neural-networks-explained-simply) | 7 · 3 | 5: `computer-vision-basics-from-pixels-to-predictions`, `time-series-forecasting-a-beginner-friendly-introduction`, `recommendation-systems-how-netflix-and-amazon-suggest-items`, `anomaly-detection-techniques-and-real-world-use-cases`, `how-to-read-a-machine-learning-research-paper` |
| Projects | Data science projects and portfolio | [data-science-projects-for-freshers-12-ideas-with-datasets](/blog/data-science-projects-for-freshers-12-ideas-with-datasets) | 11 · 2 | 4: `end-to-end-machine-learning-project-a-complete-walkthrough`, `best-free-datasets-for-data-science-practice-in-2026`, `kaggle-for-beginners-how-to-start-and-win-medals`, `how-to-build-a-data-science-portfolio-that-gets-interviews` |
| Interview | Data science interview questions | [data-science-interview-questions-and-answers-2026](/blog/data-science-interview-questions-and-answers-2026) | 47 · 2 | 8: `machine-learning-interview-questions-concepts-and-answers`, `statistics-interview-questions-for-data-science`, `probability-interview-questions-for-data-science`, `feature-engineering-interview-questions`, `deep-learning-interview-questions-and-answers`, `nlp-interview-questions-for-data-scientists`, `time-series-interview-questions-for-data-science`, `computer-vision-interview-questions-and-answers` |
| Career | Data science careers: roles, growth and first jobs | [data-science-career-guide-roles-skills-and-growth-path](/blog/data-science-career-guide-roles-skills-and-growth-path) | 0 · 5 | 3: `data-science-internships-in-hyderabad-how-to-land-one`, `top-data-science-companies-hiring-in-hyderabad`, `best-programming-languages-for-data-science-in-2026` |
| Salary | Data scientist salary | [data-scientist-salary-in-hyderabad-2026-freshers-to-senior](/blog/data-scientist-salary-in-hyderabad-2026-freshers-to-senior) | 31 · 2 · **manual review** | — |
| Comparison | Data science vs related fields | [`/compare/data-science-vs-data-analytics`](/compare/data-science-vs-data-analytics) (compare page) | — | 2: `data-science-vs-data-analytics-which-career-is-right-for-you`, `data-science-vs-machine-learning-vs-ai-what-s-the-difference` |

### Missing topic opportunities

_None. Every part of the syllabus has an existing article: improve and link those rather than adding more._

### Duplicate topics

| Topic | Owner | Competing | Priority | Resolution |
| --- | --- | --- | --- | --- |
| Data science roadmap: what to learn, in what order | `data-science-roadmap-2026-a-complete-step-by-step-guide` | `how-to-become-a-data-scientist-in-2026-with-no-experience`<br>`data-science-without-a-degree-is-it-possible-in-2026` | P2 | The two transition roadmaps have distinct audiences (analysts, career switchers) and stay. "How to become … with no experience" and "without a degree" answer the roadmap question again: merge candidates, pending Search Console. |
| Statistics and probability for data science | `statistics-for-data-science-the-20-you-actually-need` | `how-much-math-do-you-really-need-for-data-science` | P3 | "How much maths" overlaps the statistics owner; refocus it on the maths (linear algebra, calculus) or merge. |

### Cannibalisation risks

- The course page links `data-scientist-salary-in-hyderabad-2026-freshers-to-senior`, a salary page whose figures have no source (Phase 4 MANUAL REVIEW).
- 1 article placed here sits in a category the CMS maps to a different course, so their "Explore course" card sends readers elsewhere: `python-for-data-science-the-essential-libraries` → python-programming.
- 3 articles compete with a topic owner (see the table above).
- No title uses commercial course wording (checked by `targetsCourseIntent` in topical.test.ts), so no article competes with the course page for its commercial query.

### Internal-link recommendations

1. **Course page → cluster.** List [data-science-roadmap-2026-a-complete-step-by-step-guide](/blog/data-science-roadmap-2026-a-complete-step-by-step-guide), [data-science-projects-for-freshers-12-ideas-with-datasets](/blog/data-science-projects-for-freshers-12-ideas-with-datasets), [data-science-interview-questions-and-answers-2026](/blog/data-science-interview-questions-and-answers-2026), [top-10-machine-learning-algorithms-explained-for-beginners](/blog/top-10-machine-learning-algorithms-explained-for-beginners), [statistics-for-data-science-the-20-you-actually-need](/blog/statistics-for-data-science-the-20-you-actually-need), [python-for-data-science-the-essential-libraries](/blog/python-for-data-science-the-essential-libraries) in the existing reading block, in that order (the block shows the first four today). It currently shows 4 articles picked by recency from one category. _Component change, awaiting approval._
2. **Owner → course.** One contextual sentence in each owner's body linking `/courses/data-science` where the syllabus covers the topic (the Phase 4 rewrite standard): 13 owners.
3. **Supporting → owner.** Each of the 43 supporting articles links up to its topic owner in the body. Owners link down to their 3–5 strongest supporting articles.
4. **"Explore course" card.** For the 1 article placed here from other categories, point the card at `/courses/data-science` (`courseForArticle` in topical.ts). _Component change, awaiting approval._

---

## Generative AI: [`/courses/gen-ai`](/courses/gen-ai)

| | |
| --- | --- |
| **Priority** | **P2** |
| **Why** | Deep coverage. But the course page currently links the Agentic AI roadmap, which belongs to the Agentic AI course, and two interview-question posts compete with each other. |
| **Supporting categories** | `generative-ai` (50 articles) |
| **Placed in the cluster** | 11 topic owners · 32 supporting · 1 duplicate |
| **Course page links today** | [agentic-ai-roadmap-2026-from-prompts-to-autonomous-systems](/blog/agentic-ai-roadmap-2026-from-prompts-to-autonomous-systems)<br>[chatgpt-complete-guide-features-prompts-and-use-cases](/blog/chatgpt-complete-guide-features-prompts-and-use-cases)<br>[fine-tuning-vs-rag-which-should-you-choose](/blog/fine-tuning-vs-rag-which-should-you-choose)<br>[what-is-generative-ai-a-complete-beginner-s-guide](/blog/what-is-generative-ai-a-complete-beginner-s-guide) |
| **Owners with no editorial link in** | 6 of 11 |
| **Owners 5+ clicks from the homepage** | 4 of 11 |

### Supporting topics and existing articles

| Role | Topic | Owner | Editorial links in · click depth | Supporting articles |
| --- | --- | --- | --- | --- |
| Fundamentals | What generative AI is and how LLMs work | [what-is-generative-ai-a-complete-beginner-s-guide](/blog/what-is-generative-ai-a-complete-beginner-s-guide) | 596 · 1 | 8: `how-large-language-models-llms-work-under-the-hood`, `how-transformers-changed-ai-attention-explained`, `tokenization-in-llms-why-it-matters-more-than-you-think`, `context-windows-explained-tokens-limits-and-costs`, `embeddings-explained-the-foundation-of-modern-ai`, `multimodal-ai-models-that-see-hear-and-speak`, `generative-ai-for-images-diffusion-models-explained`, `speech-to-text-and-text-to-speech-with-modern-ai` |
| Roadmap | Becoming a generative AI engineer: the learning path | [how-to-become-a-generative-ai-engineer-in-2026](/blog/how-to-become-a-generative-ai-engineer-in-2026) | 0 · 7 | — |
| Implementation | Prompt engineering | [prompt-engineering-techniques-that-actually-improve-output](/blog/prompt-engineering-techniques-that-actually-improve-output) | 3 · 4 | 3: `chain-of-thought-prompting-making-llms-reason`, `few-shot-vs-zero-shot-prompting-a-practical-guide`, `prompt-templates-and-versioning-managing-prompts-at-scale` |
| Implementation | Retrieval-augmented generation (RAG) | [rag-architecture-explained-retrieval-augmented-generation](/blog/rag-architecture-explained-retrieval-augmented-generation) | 27 · 2 | 6: `chunking-strategies-for-rag-getting-retrieval-right`, `vector-databases-explained-pinecone-faiss-and-chromadb`, `retrieval-evaluation-measuring-rag-quality`, `building-a-document-q-and-a-chatbot-with-rag`, `knowledge-graphs-and-rag-combining-structure-with-search`, `semantic-search-vs-keyword-search-what-changed-with-ai` |
| Advanced | Fine-tuning, and when to choose it over RAG | [fine-tuning-vs-rag-which-should-you-choose](/blog/fine-tuning-vs-rag-which-should-you-choose) | 8 · 2 | 2: `lora-and-qlora-efficient-fine-tuning-explained`, `synthetic-data-generation-with-llms-a-practical-guide` |
| Tools | LLM frameworks and tools | [langchain-tutorial-build-your-first-llm-app](/blog/langchain-tutorial-build-your-first-llm-app) | 5 · 2 | 7: `llamaindex-vs-langchain-which-framework-to-pick`, `hugging-face-transformers-a-practical-getting-started-guide`, `ollama-tutorial-run-llms-locally-on-your-machine`, `top-generative-ai-tools-every-developer-should-know-in-2026`, `open-source-llms-vs-closed-models-a-2026-comparison`, `ai-coding-assistants-how-to-use-them-effectively`, `chatgpt-complete-guide-features-prompts-and-use-cases` |
| Implementation | Taking an LLM application to production | [deploying-a-gen-ai-app-on-the-cloud-a-walkthrough](/blog/deploying-a-gen-ai-app-on-the-cloud-a-walkthrough) | 0 · 4 | 4: `vllm-and-model-serving-scaling-llm-inference`, `cost-optimization-for-llm-applications-in-production`, `evaluating-llm-outputs-metrics-tools-and-best-practices`, `building-a-customer-support-bot-with-llms` |
| Troubleshooting | Safety and reliability: injection, hallucination, guardrails | [prompt-injection-and-llm-security-what-you-need-to-know](/blog/prompt-injection-and-llm-security-what-you-need-to-know) | 0 · 7 | 2: `how-to-reduce-llm-hallucinations-in-production`, `guardrails-for-llms-keeping-ai-apps-safe-and-on-topic` |
| Projects | Generative AI projects for a portfolio | [top-generative-ai-projects-to-build-for-your-portfolio](/blog/top-generative-ai-projects-to-build-for-your-portfolio) | 0 · 5 | — |
| Interview | Generative AI and LLM interview questions | [generative-ai-interview-questions-and-how-to-answer-them](/blog/generative-ai-interview-questions-and-how-to-answer-them) | 0 · 4 | — |
| Salary | Generative AI salaries | [generative-ai-salary-in-india-2026-roles-and-pay](/blog/generative-ai-salary-in-india-2026-roles-and-pay) | 0 · 7 · **manual review** | — |
| Comparison | Generative AI vs traditional machine learning | [`/compare/generative-ai-vs-machine-learning`](/compare/generative-ai-vs-machine-learning) (compare page) | — | — |

### Missing topic opportunities

_None. Every part of the syllabus has an existing article: improve and link those rather than adding more._

### Duplicate topics

| Topic | Owner | Competing | Priority | Resolution |
| --- | --- | --- | --- | --- |
| Generative AI and LLM interview questions | `generative-ai-interview-questions-and-how-to-answer-them` | `generative-ai-and-llm-interview-questions` | P2 | Same question twice. As in Phase 3, the topic-category copy owns it; the interview-questions copy is a merge candidate once Search Console confirms it earns nothing distinct. |

### Cannibalisation risks

- The course page links `agentic-ai-roadmap-2026-from-prompts-to-autonomous-systems`, which the map places in another course's cluster.
- 1 article competes with a topic owner (see the table above).
- No title uses commercial course wording (checked by `targetsCourseIntent` in topical.test.ts), so no article competes with the course page for its commercial query.

### Internal-link recommendations

1. **Course page → cluster.** List [how-to-become-a-generative-ai-engineer-in-2026](/blog/how-to-become-a-generative-ai-engineer-in-2026), [top-generative-ai-projects-to-build-for-your-portfolio](/blog/top-generative-ai-projects-to-build-for-your-portfolio), [generative-ai-interview-questions-and-how-to-answer-them](/blog/generative-ai-interview-questions-and-how-to-answer-them), [what-is-generative-ai-a-complete-beginner-s-guide](/blog/what-is-generative-ai-a-complete-beginner-s-guide), [prompt-engineering-techniques-that-actually-improve-output](/blog/prompt-engineering-techniques-that-actually-improve-output), [rag-architecture-explained-retrieval-augmented-generation](/blog/rag-architecture-explained-retrieval-augmented-generation) in the existing reading block, in that order (the block shows the first four today). It currently shows 4 articles picked by recency from one category. _Component change, awaiting approval._
2. **Owner → course.** One contextual sentence in each owner's body linking `/courses/gen-ai` where the syllabus covers the topic (the Phase 4 rewrite standard): 11 owners.
3. **Supporting → owner.** Each of the 32 supporting articles links up to its topic owner in the body. Owners link down to their 3–5 strongest supporting articles.

---

## Agentic AI: [`/courses/agentic-ai`](/courses/agentic-ai)

| | |
| --- | --- |
| **Priority** | **P1** |
| **Why** | No blog category maps to it, so the course page links to no articles. Six existing Generative AI articles are about agents, and one is the Agentic AI roadmap, which the Gen AI course page links today. Re-home them through this map; do not create a category. |
| **Supporting categories** | _None: its articles come from other categories through this map_ |
| **Placed in the cluster** | 6 topic owners · 1 supporting · 1 duplicate |
| **Course page links today** | **None** |
| **Owners with no editorial link in** | 2 of 6 |
| **Owners 5+ clicks from the homepage** | 2 of 6 |

### Supporting topics and existing articles

| Role | Topic | Owner | Editorial links in · click depth | Supporting articles |
| --- | --- | --- | --- | --- |
| Roadmap | Agentic AI roadmap: from prompts to autonomous systems | [agentic-ai-roadmap-2026-from-prompts-to-autonomous-systems](/blog/agentic-ai-roadmap-2026-from-prompts-to-autonomous-systems) | 3 · 2 | — |
| Fundamentals | How AI agents work: planning, tools, memory | [ai-agents-guide-how-autonomous-agents-actually-work](/blog/ai-agents-guide-how-autonomous-agents-actually-work) | 3 · 3 | — |
| Implementation | Function calling and tool use | [function-calling-and-tool-use-in-llms-explained](/blog/function-calling-and-tool-use-in-llms-explained) | 0 · 7 | — |
| Tools | Model Context Protocol (MCP) | [model-context-protocol-mcp-explained-for-beginners](/blog/model-context-protocol-mcp-explained-for-beginners) | 2 · 4 | — |
| Tools | Building agents with LangGraph | [langgraph-tutorial-building-stateful-ai-agents](/blog/langgraph-tutorial-building-stateful-ai-agents) | 6 · 3 | — |
| Advanced | Multi-agent systems | [building-a-multi-agent-system-patterns-and-pitfalls](/blog/building-a-multi-agent-system-patterns-and-pitfalls) | 0 · 6 | — |
| Troubleshooting | Agent safety: excessive agency and prompt injection | _no single owner: covered by the supporting articles_ | — | 1: `prompt-injection-and-llm-security-what-you-need-to-know` |
| Projects | AI agent projects for a portfolio | _gap_ | — | — |
| Implementation | Evaluating and observing agents | _gap_ | — | — |
| Comparison | Agentic AI vs generative AI: which course | _gap_ | — | — |

### Missing topic opportunities

- **P2: AI agent projects for a portfolio.** The course is project-led, but the only projects article is about generative AI generally. An agent-projects article (tool-using assistant, research agent, workflow automation) answers a different question from the Gen AI projects list.
- **P3: Evaluating and observing agents.** The course has an evaluation module, and agent evaluation (task success, tool-call accuracy, cost and latency per task) differs from the LLM-output evaluation the Gen AI article covers.
- **P2: Agentic AI vs generative AI: which course.** Two courses with overlapping syllabi. A /compare page explaining the difference helps a reader choose between them. It belongs in the /compare section, not the blog, and only if it compares syllabi and outcomes, not keywords.

### Duplicate topics

| Topic | Owner | Competing | Priority | Resolution |
| --- | --- | --- | --- | --- |
| Building agents with LangGraph | `langgraph-tutorial-building-stateful-ai-agents` | `building-ai-agents-with-langgraph-a-hands-on-tutorial` | P2 | Phase 3 MANUAL REVIEW: two LangGraph agent tutorials. Merge, or give the second a distinct build. |

### Cannibalisation risks

- 6 articles placed here sit in a category the CMS maps to a different course, so their "Explore course" card sends readers elsewhere: `agentic-ai-roadmap-2026-from-prompts-to-autonomous-systems` → gen-ai, `ai-agents-guide-how-autonomous-agents-actually-work` → gen-ai, `function-calling-and-tool-use-in-llms-explained` → gen-ai, `model-context-protocol-mcp-explained-for-beginners` → gen-ai, `langgraph-tutorial-building-stateful-ai-agents` → gen-ai, `building-a-multi-agent-system-patterns-and-pitfalls` → gen-ai.
- 1 article competes with a topic owner (see the table above).
- No title uses commercial course wording (checked by `targetsCourseIntent` in topical.test.ts), so no article competes with the course page for its commercial query.

### Internal-link recommendations

1. **Course page → cluster.** List [agentic-ai-roadmap-2026-from-prompts-to-autonomous-systems](/blog/agentic-ai-roadmap-2026-from-prompts-to-autonomous-systems), [ai-agents-guide-how-autonomous-agents-actually-work](/blog/ai-agents-guide-how-autonomous-agents-actually-work), [function-calling-and-tool-use-in-llms-explained](/blog/function-calling-and-tool-use-in-llms-explained), [model-context-protocol-mcp-explained-for-beginners](/blog/model-context-protocol-mcp-explained-for-beginners), [langgraph-tutorial-building-stateful-ai-agents](/blog/langgraph-tutorial-building-stateful-ai-agents), [building-a-multi-agent-system-patterns-and-pitfalls](/blog/building-a-multi-agent-system-patterns-and-pitfalls) in the existing reading block, in that order (the block shows the first four today). It currently shows nothing. _Component change, awaiting approval._
2. **Owner → course.** One contextual sentence in each owner's body linking `/courses/agentic-ai` where the syllabus covers the topic (the Phase 4 rewrite standard): 6 owners.
3. **Supporting → owner.** The supporting article links up to its topic owner in the body. Owners link down to their 3–5 strongest supporting articles.
4. **"Explore course" card.** For the 6 articles placed here from other categories, point the card at `/courses/agentic-ai` (`courseForArticle` in topical.ts). _Component change, awaiting approval._

---

## Python Programming: [`/courses/python-programming`](/courses/python-programming)

| | |
| --- | --- |
| **Priority** | **P2** |
| **Why** | Broad coverage of the syllabus. Three articles answer "how do I learn Python", and the project-idea and interview-practice topics are each duplicated. |
| **Supporting categories** | `python` (50 articles) |
| **Placed in the cluster** | 12 topic owners · 37 supporting · 5 duplicates |
| **Course page links today** | [learn-python-from-scratch-a-complete-2026-roadmap](/blog/learn-python-from-scratch-a-complete-2026-roadmap)<br>[python-interview-questions-top-50-with-answers](/blog/python-interview-questions-top-50-with-answers)<br>[python-lists-vs-tuples-vs-sets-vs-dictionaries](/blog/python-lists-vs-tuples-vs-sets-vs-dictionaries)<br>[python-projects-for-beginners-15-ideas-to-build](/blog/python-projects-for-beginners-15-ideas-to-build) |
| **Owners with no editorial link in** | 7 of 12 |
| **Owners 5+ clicks from the homepage** | 6 of 12 |

### Supporting topics and existing articles

| Role | Topic | Owner | Editorial links in · click depth | Supporting articles |
| --- | --- | --- | --- | --- |
| Roadmap | How to learn Python: the learning path | [learn-python-from-scratch-a-complete-2026-roadmap](/blog/learn-python-from-scratch-a-complete-2026-roadmap) | 596 · 1 | — |
| Fundamentals | Core Python: data structures, strings, comprehensions | [python-data-structures-a-complete-reference](/blog/python-data-structures-a-complete-reference) | 0 · 6 | 6: `python-lists-vs-tuples-vs-sets-vs-dictionaries`, `list-comprehensions-in-python-a-complete-guide`, `python-string-methods-every-developer-should-know`, `python-f-strings-formatting-done-right`, `lambda-functions-map-filter-and-reduce-in-python`, `python-args-and-kwargs-explained-clearly` |
| Fundamentals | Object-oriented programming in Python | [object-oriented-programming-oop-in-python-explained](/blog/object-oriented-programming-oop-in-python-explained) | 1 · 4 | — |
| Advanced | Advanced Python: iterators, generators, decorators, context managers | [python-generators-and-iterators-made-simple](/blog/python-generators-and-iterators-made-simple) | 0 · 5 | 5: `python-decorators-explained-with-real-examples`, `python-decorators-vs-context-managers-when-to-use-each`, `python-iterators-vs-generators-vs-comprehensions`, `python-memory-management-and-garbage-collection`, `python-type-hints-writing-cleaner-safer-code` |
| Advanced | Concurrency: asyncio, threads and processes | [async-programming-in-python-asyncio-explained](/blog/async-programming-in-python-asyncio-explained) | 0 · 7 | 1: `multithreading-vs-multiprocessing-in-python` |
| Implementation | Files and data formats: CSV, JSON, dates, regex | [python-file-handling-reading-and-writing-files](/blog/python-file-handling-reading-and-writing-files) | 0 · 5 | 4: `reading-and-writing-csv-files-in-python`, `working-with-json-in-python-a-practical-guide`, `datetime-in-python-working-with-dates-and-times`, `regular-expressions-in-python-a-practical-guide` |
| Troubleshooting | Errors, testing and code quality | [error-handling-in-python-try-except-and-best-practices](/blog/error-handling-in-python-try-except-and-best-practices) | 0 · 5 | 6: `unit-testing-in-python-with-pytest-a-beginner-s-guide`, `python-logging-a-practical-setup-for-real-projects`, `python-best-practices-writing-pythonic-code`, `how-to-structure-a-python-project-the-right-way`, `virtual-environments-in-python-venv-pip-and-poetry`, `environment-variables-and-secrets-in-python-apps` |
| Tools | Python for data: NumPy and pandas | [numpy-guide-arrays-broadcasting-and-vectorization](/blog/numpy-guide-arrays-broadcasting-and-vectorization) | 0 · 3 | 4: `pandas-guide-dataframes-cleaning-and-aggregation`, `pandas-performance-making-your-code-10x-faster`, `top-python-libraries-every-developer-should-know`, `python-for-data-science-the-essential-libraries` |
| Implementation | APIs, web development and databases | [building-rest-apis-with-python-a-practical-guide](/blog/building-rest-apis-with-python-a-practical-guide) | 1 · 4 | 6: `fastapi-guide-build-a-production-api-step-by-step`, `flask-vs-fastapi-vs-django-which-to-choose-in-2026`, `pydantic-explained-data-validation-in-python`, `sqlalchemy-tutorial-databases-in-python`, `web-scraping-with-python-beautifulsoup-and-requests`, `building-a-cli-tool-in-python-with-argparse` |
| Projects | Python projects and automation | [python-projects-for-beginners-15-ideas-to-build](/blog/python-projects-for-beginners-15-ideas-to-build) | 5 · 2 | 1: `automate-boring-tasks-with-python-10-scripts` |
| Interview | Python interview questions | [python-interview-questions-top-50-with-answers](/blog/python-interview-questions-top-50-with-answers) | 595 · 2 | 4: `python-interview-questions-for-data-roles`, `python-coding-interview-questions-and-patterns`, `numpy-interview-questions-for-data-roles`, `rest-api-interview-questions-and-answers` |
| Salary | Python developer salaries | [python-salary-in-india-2026-roles-and-expectations](/blog/python-salary-in-india-2026-roles-and-expectations) | 0 · 6 · **manual review** | — |

### Missing topic opportunities

_None. Every part of the syllabus has an existing article: improve and link those rather than adding more._

### Duplicate topics

| Topic | Owner | Competing | Priority | Resolution |
| --- | --- | --- | --- | --- |
| How to learn Python: the learning path | `learn-python-from-scratch-a-complete-2026-roadmap` | `from-python-beginner-to-job-ready-a-6-month-plan`<br>`how-to-learn-python-faster-a-proven-study-plan` | P2 | Three answers to one question. Keep the roadmap; merge the 6-month plan into it (a timeline section) and refocus "learn faster" on study technique, or merge it too, pending Search Console. |
| Python projects and automation | `python-projects-for-beginners-15-ideas-to-build` | `python-mini-projects-to-build-in-a-weekend`<br>`python-for-automation-a-real-world-project-guide` | P3 | Two project-idea lists and two automation guides. Merge the weekend list into the beginner list, and the automation guide into the ten scripts (or the reverse), pending Search Console. |
| Python interview questions | `python-interview-questions-top-50-with-answers` | `python-coding-challenges-to-practice-for-interviews` | P3 | Data-roles post rewritten to standard-library coding tasks (Phase 4 pilot). "Coding challenges to practise" and "coding interview questions and patterns" answer one question: merge candidates. |

### Cannibalisation risks

- 4 articles placed here sit in a category the CMS maps to a different course, so their "Explore course" card sends readers elsewhere: `python-interview-questions-for-data-roles` → data-science, `python-coding-interview-questions-and-patterns` → data-science, `numpy-interview-questions-for-data-roles` → data-science, `rest-api-interview-questions-and-answers` → data-science.
- 5 articles compete with a topic owner (see the table above).
- No title uses commercial course wording (checked by `targetsCourseIntent` in topical.test.ts), so no article competes with the course page for its commercial query.

### Internal-link recommendations

1. **Course page → cluster.** List [learn-python-from-scratch-a-complete-2026-roadmap](/blog/learn-python-from-scratch-a-complete-2026-roadmap), [python-projects-for-beginners-15-ideas-to-build](/blog/python-projects-for-beginners-15-ideas-to-build), [python-interview-questions-top-50-with-answers](/blog/python-interview-questions-top-50-with-answers), [python-data-structures-a-complete-reference](/blog/python-data-structures-a-complete-reference), [object-oriented-programming-oop-in-python-explained](/blog/object-oriented-programming-oop-in-python-explained), [python-generators-and-iterators-made-simple](/blog/python-generators-and-iterators-made-simple) in the existing reading block, in that order (the block shows the first four today). It currently shows 4 articles picked by recency from one category. _Component change, awaiting approval._
2. **Owner → course.** One contextual sentence in each owner's body linking `/courses/python-programming` where the syllabus covers the topic (the Phase 4 rewrite standard): 12 owners.
3. **Supporting → owner.** Each of the 37 supporting articles links up to its topic owner in the body. Owners link down to their 3–5 strongest supporting articles.
4. **"Explore course" card.** For the 4 articles placed here from other categories, point the card at `/courses/python-programming` (`courseForArticle` in topical.ts). _Component change, awaiting approval._

---

## Power BI: [`/courses/power-bi`](/courses/power-bi)

| | |
| --- | --- |
| **Priority** | **P2** |
| **Why** | Covers the whole syllabus. Two roadmaps are word-for-word copies, two posts explain calculated columns vs measures, and an interview-questions duplicate is already a Phase 3 merge. |
| **Supporting categories** | `power-bi` (50 articles) |
| **Placed in the cluster** | 13 topic owners · 37 supporting · 3 duplicates |
| **Course page links today** | [power-bi-interview-questions-top-40-with-answers](/blog/power-bi-interview-questions-top-40-with-answers)<br>[power-bi-projects-to-build-for-your-portfolio](/blog/power-bi-projects-to-build-for-your-portfolio)<br>[power-bi-roadmap-2026-from-beginner-to-job-ready](/blog/power-bi-roadmap-2026-from-beginner-to-job-ready)<br>[power-bi-vs-excel-when-to-use-each-tool](/blog/power-bi-vs-excel-when-to-use-each-tool) |
| **Owners with no editorial link in** | 6 of 13 |
| **Owners 5+ clicks from the homepage** | 5 of 13 |

### Supporting topics and existing articles

| Role | Topic | Owner | Editorial links in · click depth | Supporting articles |
| --- | --- | --- | --- | --- |
| Roadmap | Power BI roadmap: beginner to job-ready | [power-bi-roadmap-2026-from-beginner-to-job-ready](/blog/power-bi-roadmap-2026-from-beginner-to-job-ready) | 595 · 2 | 1: `how-to-learn-power-bi-in-30-days-a-study-plan` |
| Fundamentals | Getting started: your first report | [power-bi-for-beginners-your-first-report-in-1-hour](/blog/power-bi-for-beginners-your-first-report-in-1-hour) | 0 · 5 | — |
| Implementation | Power Query: getting and shaping data | [power-query-tutorial-transforming-data-without-code](/blog/power-query-tutorial-transforming-data-without-code) | 594 · 2 | 3: `power-query-m-language-basics-for-beginners`, `power-bi-error-handling-in-power-query`, `power-bi-dataflows-explained-for-beginners` |
| Fundamentals | Data modelling: star schema and relationships | [data-modeling-in-power-bi-star-schema-explained](/blog/data-modeling-in-power-bi-star-schema-explained) | 2 · 4 | 5: `star-schema-vs-snowflake-schema-in-power-bi`, `power-bi-relationships-one-to-many-and-cardinality`, `handling-many-to-many-relationships-in-power-bi`, `composite-models-and-directquery-in-power-bi`, `aggregations-in-power-bi-for-large-datasets` |
| Implementation | DAX: measures, context and time intelligence | [dax-guide-measures-calculated-columns-and-context](/blog/dax-guide-measures-calculated-columns-and-context) | 7 · 3 | 6: `dax-calculate-function-explained-step-by-step`, `dax-filter-and-all-functions-explained`, `dax-variables-writing-cleaner-faster-measures`, `time-intelligence-in-dax-ytd-mtd-and-comparisons`, `top-20-dax-functions-every-analyst-should-know`, `calculation-groups-in-power-bi-explained` |
| Implementation | Report design and interactivity | [power-bi-dashboard-design-a-practical-guide](/blog/power-bi-dashboard-design-a-practical-guide) | 3 · 3 | 11: `conditional-formatting-in-power-bi-a-practical-guide`, `kpis-and-cards-in-power-bi-designing-scorecards`, `power-bi-bookmarks-and-buttons-for-interactivity`, `power-bi-drillthrough-and-drilldown-explained`, `power-bi-field-parameters-dynamic-reports-made-easy`, `power-bi-filters-visual-page-and-report-level`, `power-bi-slicers-sync-hierarchies-and-best-practices`, `power-bi-tooltips-adding-context-to-visuals`, `power-bi-custom-visuals-when-and-how-to-use-them`, `power-bi-themes-and-branding-for-professional-reports`, `power-bi-mobile-designing-reports-for-phones` |
| Implementation | Power BI Service: publishing, refresh, security | [power-bi-service-publishing-sharing-and-workspaces](/blog/power-bi-service-publishing-sharing-and-workspaces) | 0 · 3 | 5: `power-bi-data-refresh-scheduled-and-incremental`, `power-bi-gateway-explained-connecting-on-prem-data`, `power-bi-deployment-pipelines-for-teams`, `row-level-security-rls-in-power-bi-a-complete-guide`, `power-bi-paginated-reports-vs-interactive-reports` |
| Troubleshooting | Report performance | [power-bi-performance-tuning-make-reports-faster](/blog/power-bi-performance-tuning-make-reports-faster) | 0 · 6 | — |
| Tools | Connecting to SQL Server | [connecting-power-bi-to-sql-server-a-step-by-step-guide](/blog/connecting-power-bi-to-sql-server-a-step-by-step-guide) | 0 · 7 | — |
| Projects | Power BI projects and portfolio dashboards | [power-bi-projects-to-build-for-your-portfolio](/blog/power-bi-projects-to-build-for-your-portfolio) | 36 · 2 | 2: `building-a-sales-dashboard-in-power-bi-from-scratch`, `building-a-finance-dashboard-in-power-bi` |
| Interview | Power BI and DAX interview questions | [power-bi-interview-questions-top-40-with-answers](/blog/power-bi-interview-questions-top-40-with-answers) | 4 · 2 | 1: `dax-interview-questions-for-power-bi-developers` |
| Certification | PL-300 certification | [power-bi-certification-pl-300-how-to-prepare](/blog/power-bi-certification-pl-300-how-to-prepare) | 0 · 7 | — |
| Salary | Power BI developer salary | [power-bi-developer-salary-in-hyderabad-2026](/blog/power-bi-developer-salary-in-hyderabad-2026) | 0 · 6 · **manual review** | — |
| Comparison | Power BI vs Tableau and Excel | [`/compare/power-bi-vs-tableau`](/compare/power-bi-vs-tableau) (compare page) | — | 3: `power-bi-vs-tableau-a-detailed-2026-comparison`, `power-bi-vs-excel-when-to-use-each-tool`, `excel-vs-power-bi-which-should-you-learn-first` |

### Missing topic opportunities

_None. Every part of the syllabus has an existing article: improve and link those rather than adding more._

### Duplicate topics

| Topic | Owner | Competing | Priority | Resolution |
| --- | --- | --- | --- | --- |
| Power BI roadmap: beginner to job-ready | `power-bi-roadmap-2026-from-beginner-to-job-ready` | `from-power-bi-beginner-to-developer-a-career-roadmap` | P2 | The career roadmap has the same body as the roadmap (Phase 4, keyword-swapped) and the same query: merge candidate. The 30-day plan is a time-boxed study plan and can stay if rewritten as one. |
| DAX: measures, context and time intelligence | `dax-guide-measures-calculated-columns-and-context` | `creating-calculated-columns-vs-measures-in-power-bi` | P3 | The DAX guide already covers "measures and calculated columns". Refocus the comparison post on the decision (when to use which, with examples) or merge it. |
| Power BI and DAX interview questions | `power-bi-interview-questions-top-40-with-answers` | `power-bi-interview-questions-with-detailed-answers` | P2 | Phase 3 MERGE (Phase 4: gated on Search Console). |

### Cannibalisation risks

- 2 articles placed here sit in a category the CMS maps to a different course, so their "Explore course" card sends readers elsewhere: `dax-interview-questions-for-power-bi-developers` → data-science, `excel-vs-power-bi-which-should-you-learn-first` → data-analytics.
- 3 articles compete with a topic owner (see the table above).
- No title uses commercial course wording (checked by `targetsCourseIntent` in topical.test.ts), so no article competes with the course page for its commercial query.

### Internal-link recommendations

1. **Course page → cluster.** List [power-bi-roadmap-2026-from-beginner-to-job-ready](/blog/power-bi-roadmap-2026-from-beginner-to-job-ready), [power-bi-projects-to-build-for-your-portfolio](/blog/power-bi-projects-to-build-for-your-portfolio), [power-bi-interview-questions-top-40-with-answers](/blog/power-bi-interview-questions-top-40-with-answers), [power-bi-for-beginners-your-first-report-in-1-hour](/blog/power-bi-for-beginners-your-first-report-in-1-hour), [power-query-tutorial-transforming-data-without-code](/blog/power-query-tutorial-transforming-data-without-code), [data-modeling-in-power-bi-star-schema-explained](/blog/data-modeling-in-power-bi-star-schema-explained) in the existing reading block, in that order (the block shows the first four today). It currently shows 4 articles picked by recency from one category. _Component change, awaiting approval._
2. **Owner → course.** One contextual sentence in each owner's body linking `/courses/power-bi` where the syllabus covers the topic (the Phase 4 rewrite standard): 13 owners.
3. **Supporting → owner.** Each of the 37 supporting articles links up to its topic owner in the body. Owners link down to their 3–5 strongest supporting articles.
4. **"Explore course" card.** For the 2 articles placed here from other categories, point the card at `/courses/power-bi` (`courseForArticle` in topical.ts). _Component change, awaiting approval._

---

## Data Analytics: [`/courses/data-analytics`](/courses/data-analytics)

| | |
| --- | --- |
| **Priority** | **P3** |
| **Why** | The most coherent cluster: one roadmap with distinct audience variants, and clear Excel, SQL, cleaning and dashboard topics. Its interview posts sit in the generic category and point at Data Science. |
| **Supporting categories** | `data-analytics` (49 articles) |
| **Placed in the cluster** | 13 topic owners · 39 supporting · 0 duplicates |
| **Course page links today** | [data-analyst-roadmap-2026-skills-tools-and-timeline](/blog/data-analyst-roadmap-2026-skills-tools-and-timeline)<br>[data-analyst-salary-in-hyderabad-2026](/blog/data-analyst-salary-in-hyderabad-2026)<br>[descriptive-vs-diagnostic-vs-predictive-analytics](/blog/descriptive-vs-diagnostic-vs-predictive-analytics)<br>[excel-vs-power-bi-which-should-you-learn-first](/blog/excel-vs-power-bi-which-should-you-learn-first) |
| **Owners with no editorial link in** | 6 of 13 |
| **Owners 5+ clicks from the homepage** | 5 of 13 |

### Supporting topics and existing articles

| Role | Topic | Owner | Editorial links in · click depth | Supporting articles |
| --- | --- | --- | --- | --- |
| Roadmap | Data analyst roadmap | [data-analyst-roadmap-2026-skills-tools-and-timeline](/blog/data-analyst-roadmap-2026-skills-tools-and-timeline) | 595 · 2 | 3: `data-analytics-roadmap-for-non-tech-backgrounds`, `how-to-become-a-data-analyst-with-no-experience`, `data-analyst-career-path-from-junior-to-lead` |
| Fundamentals | What analytics is: types, stack and statistics | [business-analytics-explained-a-beginner-s-guide](/blog/business-analytics-explained-a-beginner-s-guide) | 6 · 3 | 4: `descriptive-vs-diagnostic-vs-predictive-analytics`, `the-modern-data-analytics-stack-explained`, `statistical-concepts-every-data-analyst-must-know`, `correlation-vs-causation-a-must-know-for-analysts` |
| Tools | Excel for analysis | [excel-for-data-analysis-formulas-that-matter](/blog/excel-for-data-analysis-formulas-that-matter) | 10 · 3 | 4: `pivot-tables-in-excel-a-complete-tutorial`, `forecasting-in-excel-simple-methods-that-work`, `excel-power-query-cleaning-data-without-code`, `google-sheets-for-data-analysis-underrated-power-tools` |
| Tools | SQL for analysts | [sql-for-data-analysts-the-queries-you-need-daily](/blog/sql-for-data-analysts-the-queries-you-need-daily) | 6 · 3 | 1: `from-excel-to-sql-a-smooth-transition-guide` |
| Implementation | Data cleaning and preparation | [data-cleaning-a-practical-step-by-step-guide](/blog/data-cleaning-a-practical-step-by-step-guide) | 29 · 3 | 3: `how-to-handle-missing-data-in-analytics`, `how-to-audit-a-messy-dataset-before-analysis`, `outlier-detection-for-analysts-methods-and-tools` |
| Implementation | Dashboards, visualisation and storytelling | [dashboard-design-principles-for-data-analysts](/blog/dashboard-design-principles-for-data-analysts) | 13 · 3 | 6: `data-visualization-best-practices-and-common-mistakes`, `building-your-first-interactive-dashboard`, `looker-studio-tutorial-free-dashboards-for-beginners`, `how-to-tell-a-story-with-data-a-practical-framework`, `how-to-present-data-to-non-technical-stakeholders`, `how-to-write-a-data-analysis-report-that-gets-read` |
| Advanced | Analysis methods: funnels, cohorts, segmentation | [product-analytics-101-events-funnels-and-retention](/blog/product-analytics-101-events-funnels-and-retention) | 0 · 6 | 6: `funnel-analysis-measuring-conversion-step-by-step`, `cohort-analysis-explained-with-examples`, `customer-segmentation-for-analysts-a-practical-guide`, `marketing-analytics-metrics-and-dashboards-that-matter`, `web-analytics-basics-understanding-user-behavior`, `time-intelligence-in-analytics-trends-and-seasonality` |
| Implementation | KPIs and business metrics | [how-to-create-effective-kpis-for-any-business](/blog/how-to-create-effective-kpis-for-any-business) | 0 · 3 | 3: `building-kpi-scorecards-for-executives`, `metrics-that-matter-vanity-vs-actionable-metrics`, `how-data-analysts-add-real-business-value` |
| Projects | Data analytics projects and portfolio | [data-analytics-projects-for-your-resume](/blog/data-analytics-projects-for-your-resume) | 0 · 5 | 3: `building-a-sales-dashboard-a-hands-on-project`, `how-to-build-a-data-analyst-portfolio-in-2026`, `spreadsheet-to-insight-a-repeatable-analysis-workflow` |
| Interview | Data analyst interview questions | [data-analyst-interview-questions-and-answers](/blog/data-analyst-interview-questions-and-answers) | 0 · 5 | 3: `excel-interview-questions-for-data-analysts`, `pandas-interview-questions-every-analyst-should-know`, `tableau-interview-questions-and-answers` |
| Tools | The analyst toolkit and governance | [top-free-tools-for-data-analysts-in-2026](/blog/top-free-tools-for-data-analysts-in-2026) | 0 · 5 | 2: `self-service-analytics-empowering-business-teams`, `data-governance-basics-every-analyst-should-know` |
| Salary | Data analyst salary | [data-analyst-salary-in-hyderabad-2026](/blog/data-analyst-salary-in-hyderabad-2026) | 9 · 2 · **manual review** | — |
| Comparison | Analyst roles and tools compared | [data-analyst-vs-business-analyst-key-differences](/blog/data-analyst-vs-business-analyst-key-differences) | 0 · 7 | 1: `power-bi-vs-tableau-vs-looker-a-2026-comparison` |

### Missing topic opportunities

_None. Every part of the syllabus has an existing article: improve and link those rather than adding more._

### Duplicate topics

_None found._

### Cannibalisation risks

- The course page links `excel-vs-power-bi-which-should-you-learn-first`, which the map places in another course's cluster.
- The course page links `data-analyst-salary-in-hyderabad-2026`, a salary page whose figures have no source (Phase 4 MANUAL REVIEW).
- 4 articles placed here sit in a category the CMS maps to a different course, so their "Explore course" card sends readers elsewhere: `data-analyst-interview-questions-and-answers` → data-science, `excel-interview-questions-for-data-analysts` → data-science, `pandas-interview-questions-every-analyst-should-know` → data-science, `tableau-interview-questions-and-answers` → data-science.
- No title uses commercial course wording (checked by `targetsCourseIntent` in topical.test.ts), so no article competes with the course page for its commercial query.

### Internal-link recommendations

1. **Course page → cluster.** List [data-analyst-roadmap-2026-skills-tools-and-timeline](/blog/data-analyst-roadmap-2026-skills-tools-and-timeline), [data-analytics-projects-for-your-resume](/blog/data-analytics-projects-for-your-resume), [data-analyst-interview-questions-and-answers](/blog/data-analyst-interview-questions-and-answers), [business-analytics-explained-a-beginner-s-guide](/blog/business-analytics-explained-a-beginner-s-guide), [excel-for-data-analysis-formulas-that-matter](/blog/excel-for-data-analysis-formulas-that-matter), [sql-for-data-analysts-the-queries-you-need-daily](/blog/sql-for-data-analysts-the-queries-you-need-daily) in the existing reading block, in that order (the block shows the first four today). It currently shows 4 articles picked by recency from one category. _Component change, awaiting approval._
2. **Owner → course.** One contextual sentence in each owner's body linking `/courses/data-analytics` where the syllabus covers the topic (the Phase 4 rewrite standard): 13 owners.
3. **Supporting → owner.** Each of the 39 supporting articles links up to its topic owner in the body. Owners link down to their 3–5 strongest supporting articles.
4. **"Explore course" card.** For the 4 articles placed here from other categories, point the card at `/courses/data-analytics` (`courseForArticle` in topical.ts). _Component change, awaiting approval._

---

## Data Engineering: [`/courses/data-engineering`](/courses/data-engineering)

| | |
| --- | --- |
| **Priority** | **P1** |
| **Why** | The largest cluster: 200 articles in four categories. The course page links four articles, all from the data-engineering category, chosen by recency. The three platform roadmaps (AWS, GCP, Azure) act as sub-pillars but the course page links none of them, and each platform has overlapping "become" and roadmap posts. |
| **Supporting categories** | `data-engineering`, `aws`, `gcp`, `azure-data-factory` (197 articles) |
| **Placed in the cluster** | 15 topic owners · 88 supporting · 13 duplicates |
| **Course page links today** | [data-engineering-roadmap-2026-a-complete-guide](/blog/data-engineering-roadmap-2026-a-complete-guide)<br>[data-lake-vs-data-warehouse-vs-lakehouse](/blog/data-lake-vs-data-warehouse-vs-lakehouse)<br>[data-warehouse-explained-concepts-and-architecture](/blog/data-warehouse-explained-concepts-and-architecture)<br>[etl-vs-elt-differences-and-when-to-use-each](/blog/etl-vs-elt-differences-and-when-to-use-each) |
| **Owners with no editorial link in** | 3 of 15 |
| **Owners 5+ clicks from the homepage** | 3 of 15 |

### Supporting topics and existing articles

| Role | Topic | Owner | Editorial links in · click depth | Supporting articles |
| --- | --- | --- | --- | --- |
| Roadmap | Data engineering roadmap | [data-engineering-roadmap-2026-a-complete-guide](/blog/data-engineering-roadmap-2026-a-complete-guide) | 45 · 2 | 5: `how-to-become-a-data-engineer-in-2026`, `from-backend-developer-to-data-engineer-a-roadmap`, `how-to-transition-from-testing-to-data-engineering`, `data-engineering-tools-you-must-learn-in-2026`, `data-engineering-vs-data-science-roles-compared` |
| Fundamentals | Warehouses, lakes and lakehouses | [data-warehouse-explained-concepts-and-architecture](/blog/data-warehouse-explained-concepts-and-architecture) | 34 · 2 | 5: `data-lake-vs-data-warehouse-vs-lakehouse`, `oltp-vs-olap-transactional-vs-analytical-systems`, `medallion-architecture-bronze-silver-and-gold-layers`, `lambda-vs-kappa-architecture-explained`, `building-a-data-warehouse-a-step-by-step-guide` |
| Implementation | ETL/ELT and pipeline design | [etl-vs-elt-differences-and-when-to-use-each](/blog/etl-vs-elt-differences-and-when-to-use-each) | 16 · 2 | 6: `building-your-first-data-pipeline-a-walkthrough`, `building-incremental-data-loads-that-scale`, `cdc-change-data-capture-explained-with-examples`, `idempotency-in-data-pipelines-why-it-matters`, `handling-late-arriving-data-in-pipelines`, `schema-evolution-handling-changing-data-structures` |
| Fundamentals | Data modelling for warehouses | [data-modeling-star-schema-snowflake-and-data-vault](/blog/data-modeling-star-schema-snowflake-and-data-vault) | 1 · 4 | 2: `designing-fact-and-dimension-tables`, `slowly-changing-dimensions-scd-types-explained` |
| Tools | Spark and big-data processing | [apache-spark-explained-for-beginners](/blog/apache-spark-explained-for-beginners) | 5 · 3 | 10: `pyspark-tutorial-dataframes-transformations-and-actions`, `partitioning-and-bucketing-in-spark-explained`, `spark-performance-tuning-shuffles-joins-and-caching`, `spark-vs-hadoop-what-changed-and-why`, `pyspark-vs-pandas-when-to-use-which`, `databricks-tutorial-a-beginner-s-guide`, `delta-lake-explained-reliable-lakes-with-acid`, `apache-iceberg-vs-delta-lake-vs-hudi`, `parquet-vs-orc-vs-avro-file-formats-compared`, `distributed-systems-basics-for-data-engineers` |
| Tools | Streaming with Kafka | [apache-kafka-explained-streaming-data-basics](/blog/apache-kafka-explained-streaming-data-basics) | 7 · 3 | 4: `building-a-streaming-pipeline-with-kafka-and-spark`, `batch-vs-streaming-data-processing-a-clear-comparison`, `kafka-vs-rabbitmq-vs-pulsar-a-comparison`, `real-time-analytics-architecture-and-tools` |
| Tools | Orchestration with Airflow | [airflow-tutorial-orchestrating-data-pipelines](/blog/airflow-tutorial-orchestrating-data-pipelines) | 5 · 4 | 1: `orchestration-airflow-vs-dagster-vs-prefect` |
| Implementation | Transformation and data quality: dbt, tests, contracts | [dbt-tutorial-transformations-in-the-modern-data-stack](/blog/dbt-tutorial-transformations-in-the-modern-data-stack) | 0 · 5 | 2: `data-quality-testing-and-validation-in-pipelines`, `data-contracts-reliable-pipelines-between-teams` |
| Tools | Cloud data warehouses: Snowflake, BigQuery, Redshift | [snowflake-explained-the-cloud-data-warehouse](/blog/snowflake-explained-the-cloud-data-warehouse) | 4 · 3 | 2: `bigquery-vs-snowflake-vs-redshift-a-comparison`, `gcp-vs-aws-vs-azure-for-data-engineering` |
| Advanced | AWS for data engineers (platform sub-pillar) | [aws-roadmap-2026-for-data-engineers](/blog/aws-roadmap-2026-for-data-engineers) | 41 · 3 | 12: `amazon-s3-explained-storage-classes-and-best-practices`, `aws-glue-tutorial-serverless-etl-on-aws`, `amazon-redshift-explained-the-cloud-data-warehouse`, `amazon-athena-querying-s3-with-sql`, `amazon-emr-explained-big-data-on-aws`, `amazon-kinesis-explained-real-time-streaming`, `building-a-data-lake-on-aws-with-s3-and-glue`, `aws-glue-vs-emr-vs-lambda-for-etl`, `aws-certified-data-engineer-associate-exam-guide`, `aws-data-engineering-projects-for-your-portfolio`, `aws-interview-questions-for-data-engineers`, `redshift-interview-questions-and-answers` |
| Advanced | Google Cloud for data engineers (platform sub-pillar) | [gcp-roadmap-2026-for-data-engineers](/blog/gcp-roadmap-2026-for-data-engineers) | 594 · 2 | 13: `bigquery-explained-google-s-serverless-data-warehouse`, `partitioning-and-clustering-in-bigquery`, `loading-data-into-bigquery-batch-and-streaming`, `dataflow-tutorial-stream-and-batch-processing-on-gcp`, `pub-sub-explained-messaging-and-streaming-on-gcp`, `cloud-composer-airflow-on-gcp-explained`, `dataproc-vs-dataflow-which-to-choose`, `google-cloud-storage-buckets-classes-and-best-practices`, `building-a-data-pipeline-on-gcp-end-to-end`, `gcp-professional-data-engineer-certification-guide`, `gcp-data-engineering-projects-for-your-portfolio`, `gcp-interview-questions-for-data-engineers`, `bigquery-interview-questions-and-answers` |
| Advanced | Azure and Data Factory for data engineers (platform sub-pillar) | [azure-data-factory-roadmap-2026-a-complete-guide](/blog/azure-data-factory-roadmap-2026-a-complete-guide) | 32 · 3 | 13: `adf-pipelines-explained-building-your-first-pipeline`, `copy-activity-in-azure-data-factory-a-practical-guide`, `triggers-in-adf-schedule-tumbling-window-and-event`, `linked-services-in-azure-data-factory-explained`, `mapping-data-flows-in-adf-transformations-without-code`, `integration-runtimes-in-adf-azure-self-hosted-and-ssis`, `azure-synapse-analytics-explained-for-beginners`, `azure-data-lake-storage-gen2-explained`, `azure-databricks-with-adf-orchestration-patterns`, `azure-data-engineer-certification-dp-203-guide`, `azure-data-engineering-projects-for-your-portfolio`, `azure-data-factory-interview-questions-and-answers`, `azure-interview-questions-for-data-engineers` |
| Projects | Data engineering projects | [data-engineering-projects-for-your-portfolio](/blog/data-engineering-projects-for-your-portfolio) | 0 · 7 | — |
| Interview | Data engineering interview questions | [data-engineering-interview-questions-and-answers](/blog/data-engineering-interview-questions-and-answers) | 4 · 3 | 13: `etl-interview-questions-for-data-engineers`, `data-warehouse-interview-questions-and-answers`, `data-modeling-interview-questions-explained`, `system-design-interview-questions-for-data-engineers`, `apache-spark-interview-questions-and-answers`, `pyspark-interview-questions-with-examples`, `spark-performance-interview-questions`, `kafka-interview-questions-explained`, `airflow-interview-questions-for-data-engineers`, `databricks-interview-questions-and-answers`, `snowflake-interview-questions-for-data-engineers`, `hadoop-interview-questions-and-answers`, `linux-interview-questions-for-data-engineers` |
| Salary | Data engineer salaries | [data-engineer-salary-in-hyderabad-2026](/blog/data-engineer-salary-in-hyderabad-2026) | 0 · 7 · **manual review** | — |

### Missing topic opportunities

_None. Every part of the syllabus has an existing article: improve and link those rather than adding more._

### Duplicate topics

| Topic | Owner | Competing | Priority | Resolution |
| --- | --- | --- | --- | --- |
| Orchestration with Airflow | `airflow-tutorial-orchestrating-data-pipelines` | `workflow-orchestration-with-apache-airflow-dags` | P2 | Two Airflow introductions. Merge the DAGs post into the tutorial, or refocus it on DAG design patterns. |
| Cloud data warehouses: Snowflake, BigQuery, Redshift | `snowflake-explained-the-cloud-data-warehouse` | `cloud-data-warehouses-compared-snowflake-vs-bigquery-vs-redshift`<br>`redshift-vs-snowflake-vs-bigquery-a-comparison` | P2 | Phase 3 MERGE: three posts compare the same three warehouses. bigquery-vs-snowflake-vs-redshift owns it. |
| AWS for data engineers (platform sub-pillar) | `aws-roadmap-2026-for-data-engineers` | `how-to-start-an-aws-cloud-career-in-2026`<br>`aws-data-engineer-guide-skills-and-services` | P2 | The "start an AWS cloud career" and "AWS data engineer guide" posts answer the roadmap question again: merge candidates. The ~40 other AWS articles support the listed subtopics. |
| Google Cloud for data engineers (platform sub-pillar) | `gcp-roadmap-2026-for-data-engineers` | `how-to-start-a-career-in-google-cloud-in-2026`<br>`streaming-data-into-bigquery-a-practical-guide` | P2 | "Start a career in Google Cloud" repeats the roadmap. "Streaming data into BigQuery" overlaps "loading data into BigQuery: batch and streaming"; keep one owner for BigQuery ingestion. |
| Azure and Data Factory for data engineers (platform sub-pillar) | `azure-data-factory-roadmap-2026-a-complete-guide` | `how-to-become-an-azure-data-engineer-in-2026`<br>`building-an-etl-pipeline-with-adf-step-by-step`<br>`azure-data-factory-adf-interview-questions` | P2 | "How to become an Azure data engineer" repeats the roadmap. The ETL-pipeline post is a Phase 3 MANUAL REVIEW against the first-pipeline post, and the interview-questions copy is a Phase 3 MERGE. |
| Data engineer salaries | `data-engineer-salary-in-hyderabad-2026` | `aws-data-engineer-salary-in-india-2026`<br>`gcp-data-engineer-salary-in-india-2026`<br>`azure-data-engineer-salary-in-hyderabad-2026` | P3 | Four salary pages, all Phase 4 MANUAL REVIEW. With a sourced dataset, one data-engineer salary page with a platform section is likely more useful than four. |

### Cannibalisation risks

- 20 articles placed here sit in a category the CMS maps to a different course, so their "Explore course" card sends readers elsewhere: `how-to-transition-from-testing-to-data-engineering` → data-science, `aws-interview-questions-for-data-engineers` → data-science, `redshift-interview-questions-and-answers` → data-science, `gcp-interview-questions-for-data-engineers` → data-science, `bigquery-interview-questions-and-answers` → data-science, `azure-interview-questions-for-data-engineers` → data-science, `data-engineering-interview-questions-and-answers` → data-science, `etl-interview-questions-for-data-engineers` → data-science, and 12 more.
- 13 articles compete with a topic owner (see the table above).
- No title uses commercial course wording (checked by `targetsCourseIntent` in topical.test.ts), so no article competes with the course page for its commercial query.

### Internal-link recommendations

1. **Course page → cluster.** List [data-engineering-roadmap-2026-a-complete-guide](/blog/data-engineering-roadmap-2026-a-complete-guide), [aws-roadmap-2026-for-data-engineers](/blog/aws-roadmap-2026-for-data-engineers), [gcp-roadmap-2026-for-data-engineers](/blog/gcp-roadmap-2026-for-data-engineers), [azure-data-factory-roadmap-2026-a-complete-guide](/blog/azure-data-factory-roadmap-2026-a-complete-guide), [data-engineering-projects-for-your-portfolio](/blog/data-engineering-projects-for-your-portfolio), [data-engineering-interview-questions-and-answers](/blog/data-engineering-interview-questions-and-answers) in the existing reading block, in that order (the block shows the first four today). It currently shows 4 articles picked by recency from one category. _Component change, awaiting approval._
2. **Owner → course.** One contextual sentence in each owner's body linking `/courses/data-engineering` where the syllabus covers the topic (the Phase 4 rewrite standard): 15 owners.
3. **Supporting → owner.** Each of the 88 supporting articles links up to its topic owner in the body. Every other AWS, GCP or ADF article links up to its platform roadmap (`aws-roadmap-2026-for-data-engineers`, `gcp-roadmap-2026-for-data-engineers`, `azure-data-factory-roadmap-2026-a-complete-guide`). Owners link down to their 3–5 strongest supporting articles.
4. **"Explore course" card.** For the 20 articles placed here from other categories, point the card at `/courses/data-engineering` (`courseForArticle` in topical.ts). _Component change, awaiting approval._

---

## MLOps: [`/courses/mlops`](/courses/mlops)

| | |
| --- | --- |
| **Priority** | **P2** |
| **Why** | Good syllabus coverage. The MLflow and containerisation topics are each answered twice (once in the Data Science category), and prediction-API posts overlap. |
| **Supporting categories** | `mlops` (49 articles) |
| **Placed in the cluster** | 13 topic owners · 39 supporting · 4 duplicates |
| **Course page links today** | [docker-for-machine-learning-a-practical-guide](/blog/docker-for-machine-learning-a-practical-guide)<br>[mlflow-tutorial-tracking-experiments-and-models](/blog/mlflow-tutorial-tracking-experiments-and-models)<br>[mlops-roadmap-2026-skills-tools-and-career-path](/blog/mlops-roadmap-2026-skills-tools-and-career-path)<br>[what-is-mlops-devops-for-machine-learning-explained](/blog/what-is-mlops-devops-for-machine-learning-explained) |
| **Owners with no editorial link in** | 4 of 13 |
| **Owners 5+ clicks from the homepage** | 4 of 13 |

### Supporting topics and existing articles

| Role | Topic | Owner | Editorial links in · click depth | Supporting articles |
| --- | --- | --- | --- | --- |
| Fundamentals | What MLOps is | [what-is-mlops-devops-for-machine-learning-explained](/blog/what-is-mlops-devops-for-machine-learning-explained) | 6 · 2 | 3: `mlops-maturity-levels-where-does-your-team-stand`, `production-ml-systems-architecture-and-best-practices`, `mlops-vs-devops-vs-dataops-key-differences` |
| Roadmap | MLOps roadmap and tools | [mlops-roadmap-2026-skills-tools-and-career-path](/blog/mlops-roadmap-2026-skills-tools-and-career-path) | 43 · 2 | 2: `from-data-scientist-to-mlops-engineer-a-roadmap`, `mlops-tools-landscape-2026-what-to-learn` |
| Tools | Experiment tracking, versioning and the model registry | [mlflow-tutorial-tracking-experiments-and-models](/blog/mlflow-tutorial-tracking-experiments-and-models) | 29 · 2 | 5: `experiment-tracking-mlflow-vs-weights-and-biases`, `model-registry-managing-the-ml-model-lifecycle`, `model-versioning-with-mlflow-and-dvc`, `data-versioning-with-dvc-a-hands-on-guide`, `reproducibility-in-ml-seeds-configs-and-pipelines` |
| Tools | Containerising models with Docker | [docker-for-machine-learning-a-practical-guide](/blog/docker-for-machine-learning-a-practical-guide) | 22 · 2 | 1: `model-packaging-from-pickle-to-production` |
| Implementation | Deploying and serving models | [serving-ml-models-with-fastapi-and-docker](/blog/serving-ml-models-with-fastapi-and-docker) | 5 · 3 | 8: `batch-vs-real-time-model-inference-tradeoffs`, `deploying-ml-models-on-aws-azure-and-gcp`, `blue-green-deployments-for-ml-services`, `shadow-deployment-and-canary-releases-for-ml`, `a-b-testing-ml-models-in-production`, `edge-ml-deployment-running-models-on-devices`, `model-compression-quantization-and-pruning-explained`, `model-deployment-from-notebook-to-production` |
| Tools | Kubernetes and ML pipelines | [kubernetes-for-ml-deploying-models-at-scale](/blog/kubernetes-for-ml-deploying-models-at-scale) | 6 · 3 | 5: `kubeflow-pipelines-an-introduction-for-ml-engineers`, `airflow-for-ml-pipelines-a-practical-guide`, `pipeline-orchestration-airflow-vs-prefect-vs-dagster`, `scaling-model-training-with-distributed-computing`, `gpu-vs-cpu-for-ml-when-you-actually-need-a-gpu` |
| Implementation | CI/CD and continuous training | [ci-cd-for-machine-learning-pipelines-that-work](/blog/ci-cd-for-machine-learning-pipelines-that-work) | 8 · 3 | 4: `github-actions-for-ml-automating-workflows`, `continuous-training-automating-model-retraining`, `testing-machine-learning-code-and-data`, `secrets-management-for-ml-pipelines` |
| Troubleshooting | Monitoring, drift and observability | [monitoring-ml-models-in-production-a-complete-guide](/blog/monitoring-ml-models-in-production-a-complete-guide) | 9 · 3 | 4: `model-drift-and-data-drift-detection-and-response`, `prometheus-and-grafana-for-ml-monitoring`, `logging-and-observability-for-ml-systems`, `model-explainability-in-production-with-shap` |
| Advanced | Feature stores and real-time features | [feature-stores-explained-why-teams-need-them](/blog/feature-stores-explained-why-teams-need-them) | 1 · 4 | 1: `real-time-feature-engineering-for-online-models` |
| Advanced | Cloud MLOps platforms | [vertex-ai-and-sagemaker-for-mlops-a-comparison](/blog/vertex-ai-and-sagemaker-for-mlops-a-comparison) | 0 · 5 | 3: `vertex-ai-pipelines-for-mlops-on-gcp`, `vertex-ai-tutorial-ml-on-google-cloud`, `cost-optimization-for-ml-workloads-in-the-cloud` |
| Projects | End-to-end MLOps projects | [building-an-end-to-end-mlops-pipeline](/blog/building-an-end-to-end-mlops-pipeline) | 0 · 5 | 1: `how-to-build-an-mlops-portfolio-that-stands-out` |
| Interview | MLOps interview questions | [mlops-interview-questions-and-answers](/blog/mlops-interview-questions-and-answers) | 0 · 5 | 2: `docker-and-kubernetes-interview-questions-for-ml`, `git-interview-questions-every-developer-should-know` |
| Salary | MLOps engineer salary | [mlops-engineer-salary-in-india-2026](/blog/mlops-engineer-salary-in-india-2026) | 0 · 6 · **manual review** | — |

### Missing topic opportunities

_None. Every part of the syllabus has an existing article: improve and link those rather than adding more._

### Duplicate topics

| Topic | Owner | Competing | Priority | Resolution |
| --- | --- | --- | --- | --- |
| Experiment tracking, versioning and the model registry | `mlflow-tutorial-tracking-experiments-and-models` | `mlflow-for-data-scientists-tracking-experiments` | P2 | The Data Science category has its own MLflow experiment-tracking post. MLOps owns MLflow; merge the DS post, or refocus it on the notebook workflow and link here. |
| Containerising models with Docker | `docker-for-machine-learning-a-practical-guide` | `containerizing-a-machine-learning-model-step-by-step` | P2 | Rewritten in the Phase 4 pilot. The step-by-step containerising post answers the same question: merge, or make it the worked walkthrough the guide links to. |
| Deploying and serving models | `serving-ml-models-with-fastapi-and-docker` | `building-a-prediction-api-a-complete-walkthrough` | P3 | Both the FastAPI post and "building a prediction API" walk through serving a model over HTTP. "From notebook to production" sits in Data Science and is linked here as the entry point. |
| Monitoring, drift and observability | `monitoring-ml-models-in-production-a-complete-guide` | `handling-concept-drift-in-live-ml-systems` | P3 | Concept drift is covered by the drift article; merge, or keep only if it adds the retraining response. |

### Cannibalisation risks

- 6 articles placed here sit in a category the CMS maps to a different course, so their "Explore course" card sends readers elsewhere: `model-deployment-from-notebook-to-production` → data-science, `vertex-ai-pipelines-for-mlops-on-gcp` → data-engineering, `vertex-ai-tutorial-ml-on-google-cloud` → data-engineering, `mlops-interview-questions-and-answers` → data-science, `docker-and-kubernetes-interview-questions-for-ml` → data-science, `git-interview-questions-every-developer-should-know` → data-science.
- 4 articles compete with a topic owner (see the table above).
- No title uses commercial course wording (checked by `targetsCourseIntent` in topical.test.ts), so no article competes with the course page for its commercial query.

### Internal-link recommendations

1. **Course page → cluster.** List [mlops-roadmap-2026-skills-tools-and-career-path](/blog/mlops-roadmap-2026-skills-tools-and-career-path), [building-an-end-to-end-mlops-pipeline](/blog/building-an-end-to-end-mlops-pipeline), [mlops-interview-questions-and-answers](/blog/mlops-interview-questions-and-answers), [what-is-mlops-devops-for-machine-learning-explained](/blog/what-is-mlops-devops-for-machine-learning-explained), [mlflow-tutorial-tracking-experiments-and-models](/blog/mlflow-tutorial-tracking-experiments-and-models), [docker-for-machine-learning-a-practical-guide](/blog/docker-for-machine-learning-a-practical-guide) in the existing reading block, in that order (the block shows the first four today). It currently shows 4 articles picked by recency from one category. _Component change, awaiting approval._
2. **Owner → course.** One contextual sentence in each owner's body linking `/courses/mlops` where the syllabus covers the topic (the Phase 4 rewrite standard): 13 owners.
3. **Supporting → owner.** Each of the 39 supporting articles links up to its topic owner in the body. Owners link down to their 3–5 strongest supporting articles.
4. **"Explore course" card.** For the 6 articles placed here from other categories, point the card at `/courses/mlops` (`courseForArticle` in topical.ts). _Component change, awaiting approval._

---

## SQL Server: [`/courses/sql-server`](/courses/sql-server)

| | |
| --- | --- |
| **Priority** | **P1** |
| **Why** | No category maps to it, so the course page links to no articles. About 15 SQL articles exist across four other categories, but none is about SQL Server itself: no T-SQL, SSMS, stored procedures or execution plans. This is the one cluster where new articles are justified, and only for the syllabus topics listed as gaps. |
| **Supporting categories** | _None: its articles come from other categories through this map_ |
| **Placed in the cluster** | 3 topic owners · 13 supporting · 0 duplicates |
| **Course page links today** | **None** |
| **Owners with no editorial link in** | 2 of 3 |
| **Owners 5+ clicks from the homepage** | 2 of 3 |

### Supporting topics and existing articles

| Role | Topic | Owner | Editorial links in · click depth | Supporting articles |
| --- | --- | --- | --- | --- |
| Roadmap | SQL Server learning path | _gap_ | — | — |
| Fundamentals | SQL queries you use every day (SELECT, joins, aggregation) | _no single owner: covered by the supporting articles_ | — | 3: `sql-for-data-analysts-the-queries-you-need-daily`, `sql-for-data-science-queries-every-data-scientist-must-know`, `from-excel-to-sql-a-smooth-transition-guide` |
| Advanced | Window functions | [window-functions-in-sql-for-data-engineers](/blog/window-functions-in-sql-for-data-engineers) | 0 · 6 | 2: `window-functions-sql-interview-questions`, `bigquery-window-functions-and-analytic-sql` |
| Troubleshooting | Query optimisation | [sql-optimization-for-data-engineers](/blog/sql-optimization-for-data-engineers) | 0 · 7 | 2: `sql-query-optimization-interview-questions`, `bigquery-sql-tips-tricks-and-optimization` |
| Implementation | Stored procedures, functions and T-SQL programming | _gap_ | — | — |
| Troubleshooting | Indexes and execution plans in SQL Server | _gap_ | — | — |
| Fundamentals | Database design: normalisation, keys, constraints | _gap_ | — | — |
| Tools | SQL Server in the data stack: SSIS, Power BI, Azure | _no single owner: covered by the supporting articles_ | — | 4: `connecting-power-bi-to-sql-server-a-step-by-step-guide`, `adf-vs-ssis-migrating-legacy-etl-to-the-cloud`, `copying-data-from-on-prem-sql-to-azure-with-adf`, `sqlalchemy-tutorial-databases-in-python` |
| Interview | SQL interview questions | [sql-interview-questions-top-50-with-answers](/blog/sql-interview-questions-top-50-with-answers) | 29 · 3 | 2: `sql-joins-interview-questions-explained`, `scenario-based-sql-interview-questions` |
| Comparison | SQL vs NoSQL | [`/compare/sql-vs-nosql`](/compare/sql-vs-nosql) (compare page) | — | — |

### Missing topic opportunities

- **P1: SQL Server learning path.** No article says what to learn for SQL Server, in what order: T-SQL basics, SSMS, database design, procedures, performance, then SSIS or Power BI. It becomes the cluster owner that the SQL articles link up to.
- **P2: Stored procedures, functions and T-SQL programming.** A syllabus module no article covers. It is SQL Server-specific (T-SQL control flow, parameters, error handling), so it is not a variant of any existing post.
- **P2: Indexes and execution plans in SQL Server.** The generic optimisation article cannot show SQL Server execution plans or index design. A SQL Server-specific treatment is a different, practical question.
- **P3: Database design: normalisation, keys, constraints.** A syllabus module with no article. The data-modelling articles cover analytical (star-schema) design, not transactional design.

### Duplicate topics

_None found._

### Cannibalisation risks

- 11 articles placed here sit in a category the CMS maps to a different course, so their "Explore course" card sends readers elsewhere: `window-functions-in-sql-for-data-engineers` → data-engineering, `window-functions-sql-interview-questions` → data-science, `bigquery-window-functions-and-analytic-sql` → data-engineering, `sql-optimization-for-data-engineers` → data-engineering, `sql-query-optimization-interview-questions` → data-science, `bigquery-sql-tips-tricks-and-optimization` → data-engineering, `adf-vs-ssis-migrating-legacy-etl-to-the-cloud` → data-engineering, `copying-data-from-on-prem-sql-to-azure-with-adf` → data-engineering, and 3 more.
- No title uses commercial course wording (checked by `targetsCourseIntent` in topical.test.ts), so no article competes with the course page for its commercial query.

### Internal-link recommendations

1. **Course page → cluster.** List [sql-interview-questions-top-50-with-answers](/blog/sql-interview-questions-top-50-with-answers), [window-functions-in-sql-for-data-engineers](/blog/window-functions-in-sql-for-data-engineers), [sql-optimization-for-data-engineers](/blog/sql-optimization-for-data-engineers), [sql-for-data-analysts-the-queries-you-need-daily](/blog/sql-for-data-analysts-the-queries-you-need-daily), [sql-for-data-science-queries-every-data-scientist-must-know](/blog/sql-for-data-science-queries-every-data-scientist-must-know) in the existing reading block, in that order (the block shows the first four today). It currently shows nothing. _Component change, awaiting approval._
2. **Owner → course.** One contextual sentence in each owner's body linking `/courses/sql-server` where the syllabus covers the topic (the Phase 4 rewrite standard): 3 owners.
3. **Supporting → owner.** Each of the 13 supporting articles links up to its topic owner in the body. Owners link down to their 3–5 strongest supporting articles.
4. **"Explore course" card.** For the 11 articles placed here from other categories, point the card at `/courses/sql-server` (`courseForArticle` in topical.ts). _Component change, awaiting approval._

---

## Career support layer: `/blog/category/career-guidance`

The CMS maps all 50 career-guidance articles to Data Science. Most are not about any one course: resumes, LinkedIn, interviews, negotiation. They support the careers the courses lead to. So they are not placed in a course cluster, and they should not all push readers to Data Science. The rule:

- A **role-specific** career article links to that role's roadmap and course. 2 are placed that way: `career-switch-to-data-science-a-realistic-roadmap` → data-science, `how-to-transition-from-testing-to-data-engineering` → data-engineering.
- A **generic** career article links to the most relevant roadmap only where the text calls for it, and its "Explore course" card should point to [`/courses`](/courses) rather than a single course. _Component change, awaiting approval._

### Duplicate groups in the career layer

| Topic | Owner | Competing | Editorial links in (owner) | Resolution |
| --- | --- | --- | ---: | --- |
| LinkedIn for job seekers | [`linkedin-optimization-for-tech-job-seekers-in-2026`](/blog/linkedin-optimization-for-tech-job-seekers-in-2026) | `building-a-personal-brand-on-linkedin`<br>`how-to-write-linkedin-posts-that-get-you-noticed`<br>`how-to-get-recruiters-to-notice-your-profile` | 32 | Profile, posting and branding are sections of one guide; the post-writing article can stay if it is genuinely about content. |
| Behavioural interviews | [`behavioral-interview-questions-for-data-roles`](/blog/behavioral-interview-questions-for-data-roles) | `cracking-the-behavioral-interview-star-method`<br>`how-to-answer-tell-me-about-yourself-in-interviews`<br>`cracking-hr-round-questions-confidently` | 0 | STAR and "tell me about yourself" are parts of behavioural-interview preparation. Merge or cross-link, pending Search Console. |
| First data job with no experience | [`how-to-get-your-first-data-job-with-no-experience`](/blog/how-to-get-your-first-data-job-with-no-experience) | `how-to-stand-out-in-a-crowded-junior-job-market`<br>`from-college-to-corporate-a-fresher-s-survival-guide`<br>`interview-tips-for-freshers-how-to-stand-out` | 12 | The college-to-corporate post is about the first months in a job, a distinct question; the other two overlap the owner. |
| Negotiating pay | [`salary-negotiation-how-to-get-paid-what-you-re-worth`](/blog/salary-negotiation-how-to-get-paid-what-you-re-worth) | `how-to-negotiate-a-job-offer-email-step-by-step`<br>`asking-for-a-raise-timing-script-and-evidence` | 3 | Offer negotiation and raises are distinct moments; the email post overlaps the owner. The owner itself is a Phase 4 MANUAL REVIEW for its figures. |
| Portfolio for data roles | [`portfolio-building-projects-that-impress-recruiters`](/blog/portfolio-building-projects-that-impress-recruiters) | `personal-projects-that-double-as-interview-stories`<br>`how-to-build-a-data-portfolio-website`<br>`github-profile-tips-to-impress-hiring-managers` | 8 | Phase 4 found the first two word-for-word identical. Website and GitHub posts can stay as how-tos linked from the owner. |
| Resume for data roles | [`resume-building-for-data-roles-a-complete-guide`](/blog/resume-building-for-data-roles-a-complete-guide) | `common-resume-mistakes-that-get-you-rejected`<br>`how-to-quantify-achievements-on-your-resume` | 47 | Mistakes and quantifying achievements are sections of the resume guide or supporting how-tos; keep them only if they go deeper. |

All are merge-or-refocus candidates, gated on Search Console like every other merge. None is changed in Phase 5.
