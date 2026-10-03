// ─────────────────────────────────────────────────────────────────────────────
// Topical authority map: the machine-readable half of
// docs/TOPICAL_AUTHORITY_MAP.md and docs/COURSE_CLUSTER_MATRIX.md.
//
// Each course page is a commercial pillar. Each pillar has 5–15 supporting
// topics, and each topic has ONE owning article that answers it. Other
// articles on the topic either feed into the owner (`supporting`), compete
// with it (`duplicates`: merge or refocus candidates), or do not exist yet
// (`owner: null`, with the reason the topic has value of its own).
//
// This map is a curated editorial decision built from the Phase 3 ownership
// rules (lib/seo/ownership.ts) and the Phase 4 audit (lib/blog/quality.ts).
// It does not come from the CMS category of each article. Two blog categories
// (`interview-questions`, `career-guidance`) are mapped wholesale to Data
// Science in the CMS, yet most of their articles belong to other courses.
//
// Nothing renders from this file yet. Wiring the course page, category hub
// and related-post selection to it changes which articles those blocks link
// to, so it waits for approval (TOPICAL_AUTHORITY_MAP.md §6). topical.test.ts
// keeps the map consistent with the Phase 1 redirects and Phase 3 decisions,
// and checks every slug against a CMS backup when one is supplied.
// ─────────────────────────────────────────────────────────────────────────────

export type CourseSlug =
  | 'data-science'
  | 'gen-ai'
  | 'agentic-ai'
  | 'python-programming'
  | 'power-bi'
  | 'data-analytics'
  | 'data-engineering'
  | 'mlops'
  | 'sql-server';

export type TopicRole =
  | 'roadmap'
  | 'fundamentals'
  | 'tools'
  | 'implementation'
  | 'advanced'
  | 'troubleshooting'
  | 'projects'
  | 'interview'
  | 'career'
  | 'salary'
  | 'certification'
  | 'comparison';

export type Priority = 'P1' | 'P2' | 'P3';

export interface ClusterTopic {
  role: TopicRole;
  /** What the topic answers, in words. */
  topic: string;
  /** The article that owns the topic, or null when no article covers it yet. */
  owner: string | null;
  /** A /compare page that owns the topic instead of an article. */
  compare?: string;
  /** Narrower articles that should link up to the owner (and are linked down from it selectively). */
  supporting?: readonly string[];
  /** Articles competing for the owner's query: merge, refocus or leave, per the note. */
  duplicates?: readonly string[];
  /** For a gap: why the missing topic has value of its own, beyond a keyword variant. */
  gap?: string;
  /** For a gap or a duplicate to resolve. */
  priority?: Priority;
  note?: string;
}

export interface CourseCluster {
  course: CourseSlug;
  title: string;
  pillar: string;
  /** Blog categories whose CMS `courseSlug` points at this course. */
  categories: readonly string[];
  priority: Priority;
  why: string;
  topics: readonly ClusterTopic[];
}

export const COURSE_CLUSTERS: readonly CourseCluster[] = [
  /* ── Data Science ─────────────────────────────────────────────────────── */
  {
    course: 'data-science',
    title: 'Data Science',
    pillar: '/courses/data-science',
    categories: ['data-science', 'career-guidance', 'interview-questions'],
    priority: 'P2',
    why: 'Strong existing coverage, but four articles answer "how do I become a data scientist". The CMS also maps two generic categories (100 articles) to this course, so Power BI, SQL and MLOps interview posts currently send readers to Data Science.',
    topics: [
      {
        role: 'roadmap',
        topic: 'Data science roadmap: what to learn, in what order',
        owner: 'data-science-roadmap-2026-a-complete-step-by-step-guide',
        supporting: ['from-data-analyst-to-data-scientist-a-transition-roadmap', 'career-switch-to-data-science-a-realistic-roadmap'],
        duplicates: ['how-to-become-a-data-scientist-in-2026-with-no-experience', 'data-science-without-a-degree-is-it-possible-in-2026'],
        priority: 'P2',
        note: 'The two transition roadmaps have distinct audiences (analysts, career switchers) and stay. "How to become … with no experience" and "without a degree" answer the roadmap question again: merge candidates, pending Search Console.',
      },
      {
        role: 'roadmap',
        topic: 'Machine learning roadmap for beginners',
        owner: 'machine-learning-roadmap-for-beginners-in-2026',
        supporting: ['natural-language-processing-nlp-roadmap-for-2026'],
        note: 'Keyword-swapped copy of the data-science roadmap today (Phase 4). The rewrite must be ML-specific: models, maths, projects.',
      },
      {
        role: 'fundamentals',
        topic: 'Machine learning algorithms and concepts',
        owner: 'top-10-machine-learning-algorithms-explained-for-beginners',
        supporting: [
          'supervised-vs-unsupervised-learning-a-clear-comparison',
          'regression-vs-classification-when-to-use-each',
          'bias-variance-tradeoff-explained-with-real-examples',
          'overfitting-and-underfitting-causes-and-fixes',
          'gradient-descent-explained-the-engine-behind-ml',
          'clustering-algorithms-k-means-dbscan-and-hierarchical',
          'ensemble-learning-bagging-boosting-and-stacking-explained',
          'xgboost-explained-why-it-wins-kaggle-competitions',
          'dimensionality-reduction-pca-and-t-sne-explained',
        ],
      },
      {
        role: 'fundamentals',
        topic: 'Statistics and probability for data science',
        owner: 'statistics-for-data-science-the-20-you-actually-need',
        supporting: ['probability-for-data-science-concepts-you-must-know', 'a-b-testing-for-data-scientists-a-practical-guide'],
        duplicates: ['how-much-math-do-you-really-need-for-data-science'],
        priority: 'P3',
        note: '"How much maths" overlaps the statistics owner; refocus it on the maths (linear algebra, calculus) or merge.',
      },
      {
        role: 'tools',
        topic: 'Python for data science',
        owner: 'python-for-data-science-the-essential-libraries',
        note: 'In the Python category; owned here because its reader is heading into data science. The Python cluster links to it.',
      },
      {
        role: 'tools',
        topic: 'SQL for data science',
        owner: 'sql-for-data-science-queries-every-data-scientist-must-know',
        supporting: ['pandas-vs-sql-for-data-analysis-when-to-use-which'],
      },
      {
        role: 'implementation',
        topic: 'The modelling workflow: EDA, preprocessing, feature engineering',
        owner: 'exploratory-data-analysis-eda-a-step-by-step-walkthrough',
        supporting: ['data-preprocessing-cleaning-data-the-right-way', 'feature-engineering-a-practical-guide-with-examples', 'handling-imbalanced-datasets-techniques-that-work'],
      },
      {
        role: 'implementation',
        topic: 'Evaluating and validating models',
        owner: 'evaluation-metrics-accuracy-precision-recall-and-f1-demystified',
        supporting: [
          'confusion-matrix-explained-reading-it-correctly',
          'cross-validation-in-machine-learning-a-practical-guide',
          'hyperparameter-tuning-grid-search-vs-random-search-vs-bayesian',
        ],
      },
      {
        role: 'advanced',
        topic: 'Deep learning and specialisations (NLP, vision, time series, recommenders)',
        owner: 'deep-learning-guide-neural-networks-explained-simply',
        supporting: [
          'computer-vision-basics-from-pixels-to-predictions',
          'time-series-forecasting-a-beginner-friendly-introduction',
          'recommendation-systems-how-netflix-and-amazon-suggest-items',
          'anomaly-detection-techniques-and-real-world-use-cases',
          'how-to-read-a-machine-learning-research-paper',
        ],
      },
      {
        role: 'projects',
        topic: 'Data science projects and portfolio',
        owner: 'data-science-projects-for-freshers-12-ideas-with-datasets',
        supporting: [
          'end-to-end-machine-learning-project-a-complete-walkthrough',
          'best-free-datasets-for-data-science-practice-in-2026',
          'kaggle-for-beginners-how-to-start-and-win-medals',
          'how-to-build-a-data-science-portfolio-that-gets-interviews',
        ],
      },
      {
        role: 'interview',
        topic: 'Data science interview questions',
        owner: 'data-science-interview-questions-and-answers-2026',
        supporting: [
          'machine-learning-interview-questions-concepts-and-answers',
          'statistics-interview-questions-for-data-science',
          'probability-interview-questions-for-data-science',
          'feature-engineering-interview-questions',
          'deep-learning-interview-questions-and-answers',
          'nlp-interview-questions-for-data-scientists',
          'time-series-interview-questions-for-data-science',
          'computer-vision-interview-questions-and-answers',
        ],
      },
      {
        role: 'career',
        topic: 'Data science careers: roles, growth and first jobs',
        owner: 'data-science-career-guide-roles-skills-and-growth-path',
        supporting: ['data-science-internships-in-hyderabad-how-to-land-one', 'top-data-science-companies-hiring-in-hyderabad', 'best-programming-languages-for-data-science-in-2026'],
        note: '"Companies hiring in Hyderabad" makes market claims that go stale; it needs a dated, sourced list or a different angle when rewritten.',
      },
      {
        role: 'salary',
        topic: 'Data scientist salary',
        owner: 'data-scientist-salary-in-hyderabad-2026-freshers-to-senior',
        note: 'Phase 4 MANUAL REVIEW: link it only once its figures are sourced.',
      },
      {
        role: 'comparison',
        topic: 'Data science vs related fields',
        owner: null,
        compare: '/compare/data-science-vs-data-analytics',
        supporting: ['data-science-vs-data-analytics-which-career-is-right-for-you', 'data-science-vs-machine-learning-vs-ai-what-s-the-difference'],
        note: '/compare pages own the two-way comparisons (Phase 3). The three-way blog post (DS vs ML vs AI) is a different query and supports /compare/data-science-vs-machine-learning.',
      },
    ],
  },

  /* ── Generative AI ────────────────────────────────────────────────────── */
  {
    course: 'gen-ai',
    title: 'Generative AI',
    pillar: '/courses/gen-ai',
    categories: ['generative-ai'],
    priority: 'P2',
    why: 'Deep coverage. But the course page currently links the Agentic AI roadmap, which belongs to the Agentic AI course, and two interview-question posts compete with each other.',
    topics: [
      {
        role: 'fundamentals',
        topic: 'What generative AI is and how LLMs work',
        owner: 'what-is-generative-ai-a-complete-beginner-s-guide',
        supporting: [
          'how-large-language-models-llms-work-under-the-hood',
          'how-transformers-changed-ai-attention-explained',
          'tokenization-in-llms-why-it-matters-more-than-you-think',
          'context-windows-explained-tokens-limits-and-costs',
          'embeddings-explained-the-foundation-of-modern-ai',
          'multimodal-ai-models-that-see-hear-and-speak',
          'generative-ai-for-images-diffusion-models-explained',
          'speech-to-text-and-text-to-speech-with-modern-ai',
        ],
      },
      {
        role: 'roadmap',
        topic: 'Becoming a generative AI engineer: the learning path',
        owner: 'how-to-become-a-generative-ai-engineer-in-2026',
        note: 'The only Gen AI learning-path article. Its rewrite should carry the roadmap intent: there is no separate Gen AI roadmap, and none is needed.',
      },
      {
        role: 'implementation',
        topic: 'Prompt engineering',
        owner: 'prompt-engineering-techniques-that-actually-improve-output',
        supporting: ['chain-of-thought-prompting-making-llms-reason', 'few-shot-vs-zero-shot-prompting-a-practical-guide', 'prompt-templates-and-versioning-managing-prompts-at-scale'],
      },
      {
        role: 'implementation',
        topic: 'Retrieval-augmented generation (RAG)',
        owner: 'rag-architecture-explained-retrieval-augmented-generation',
        supporting: [
          'chunking-strategies-for-rag-getting-retrieval-right',
          'vector-databases-explained-pinecone-faiss-and-chromadb',
          'retrieval-evaluation-measuring-rag-quality',
          'building-a-document-q-and-a-chatbot-with-rag',
          'knowledge-graphs-and-rag-combining-structure-with-search',
          'semantic-search-vs-keyword-search-what-changed-with-ai',
        ],
      },
      {
        role: 'advanced',
        topic: 'Fine-tuning, and when to choose it over RAG',
        owner: 'fine-tuning-vs-rag-which-should-you-choose',
        supporting: ['lora-and-qlora-efficient-fine-tuning-explained', 'synthetic-data-generation-with-llms-a-practical-guide'],
      },
      {
        role: 'tools',
        topic: 'LLM frameworks and tools',
        owner: 'langchain-tutorial-build-your-first-llm-app',
        supporting: [
          'llamaindex-vs-langchain-which-framework-to-pick',
          'hugging-face-transformers-a-practical-getting-started-guide',
          'ollama-tutorial-run-llms-locally-on-your-machine',
          'top-generative-ai-tools-every-developer-should-know-in-2026',
          'open-source-llms-vs-closed-models-a-2026-comparison',
          'ai-coding-assistants-how-to-use-them-effectively',
          'chatgpt-complete-guide-features-prompts-and-use-cases',
        ],
      },
      {
        role: 'implementation',
        topic: 'Taking an LLM application to production',
        owner: 'deploying-a-gen-ai-app-on-the-cloud-a-walkthrough',
        supporting: [
          'vllm-and-model-serving-scaling-llm-inference',
          'cost-optimization-for-llm-applications-in-production',
          'evaluating-llm-outputs-metrics-tools-and-best-practices',
          'building-a-customer-support-bot-with-llms',
        ],
      },
      {
        role: 'troubleshooting',
        topic: 'Safety and reliability: injection, hallucination, guardrails',
        owner: 'prompt-injection-and-llm-security-what-you-need-to-know',
        supporting: ['how-to-reduce-llm-hallucinations-in-production', 'guardrails-for-llms-keeping-ai-apps-safe-and-on-topic'],
      },
      {
        role: 'projects',
        topic: 'Generative AI projects for a portfolio',
        owner: 'top-generative-ai-projects-to-build-for-your-portfolio',
      },
      {
        role: 'interview',
        topic: 'Generative AI and LLM interview questions',
        owner: 'generative-ai-interview-questions-and-how-to-answer-them',
        duplicates: ['generative-ai-and-llm-interview-questions'],
        priority: 'P2',
        note: 'Same question twice. As in Phase 3, the topic-category copy owns it; the interview-questions copy is a merge candidate once Search Console confirms it earns nothing distinct.',
      },
      {
        role: 'salary',
        topic: 'Generative AI salaries',
        owner: 'generative-ai-salary-in-india-2026-roles-and-pay',
        note: 'Phase 4 MANUAL REVIEW: link it only once its figures are sourced.',
      },
      {
        role: 'comparison',
        topic: 'Generative AI vs traditional machine learning',
        owner: null,
        compare: '/compare/generative-ai-vs-machine-learning',
      },
    ],
  },

  /* ── Agentic AI ───────────────────────────────────────────────────────── */
  {
    course: 'agentic-ai',
    title: 'Agentic AI',
    pillar: '/courses/agentic-ai',
    categories: [],
    priority: 'P1',
    why: 'No blog category maps to it, so the course page links to no articles. Six existing Generative AI articles are about agents, and one is the Agentic AI roadmap, which the Gen AI course page links today. Re-home them through this map; do not create a category.',
    topics: [
      {
        role: 'roadmap',
        topic: 'Agentic AI roadmap: from prompts to autonomous systems',
        owner: 'agentic-ai-roadmap-2026-from-prompts-to-autonomous-systems',
      },
      {
        role: 'fundamentals',
        topic: 'How AI agents work: planning, tools, memory',
        owner: 'ai-agents-guide-how-autonomous-agents-actually-work',
      },
      {
        role: 'implementation',
        topic: 'Function calling and tool use',
        owner: 'function-calling-and-tool-use-in-llms-explained',
      },
      {
        role: 'tools',
        topic: 'Model Context Protocol (MCP)',
        owner: 'model-context-protocol-mcp-explained-for-beginners',
      },
      {
        role: 'tools',
        topic: 'Building agents with LangGraph',
        owner: 'langgraph-tutorial-building-stateful-ai-agents',
        duplicates: ['building-ai-agents-with-langgraph-a-hands-on-tutorial'],
        priority: 'P2',
        note: 'Phase 3 MANUAL REVIEW: two LangGraph agent tutorials. Merge, or give the second a distinct build.',
      },
      {
        role: 'advanced',
        topic: 'Multi-agent systems',
        owner: 'building-a-multi-agent-system-patterns-and-pitfalls',
      },
      {
        role: 'troubleshooting',
        topic: 'Agent safety: excessive agency and prompt injection',
        owner: null,
        supporting: ['prompt-injection-and-llm-security-what-you-need-to-know'],
        note: 'Covered by the Gen AI-owned prompt-injection article, whose rewrite addresses excessive agency. Link to it; no new article.',
      },
      {
        role: 'projects',
        topic: 'AI agent projects for a portfolio',
        owner: null,
        gap: 'The course is project-led, but the only projects article is about generative AI generally. An agent-projects article (tool-using assistant, research agent, workflow automation) answers a different question from the Gen AI projects list.',
        priority: 'P2',
      },
      {
        role: 'implementation',
        topic: 'Evaluating and observing agents',
        owner: null,
        gap: 'The course has an evaluation module, and agent evaluation (task success, tool-call accuracy, cost and latency per task) differs from the LLM-output evaluation the Gen AI article covers.',
        priority: 'P3',
      },
      {
        role: 'comparison',
        topic: 'Agentic AI vs generative AI: which course',
        owner: null,
        gap: 'Two courses with overlapping syllabi. A /compare page explaining the difference helps a reader choose between them. It belongs in the /compare section, not the blog, and only if it compares syllabi and outcomes, not keywords.',
        priority: 'P2',
      },
    ],
  },

  /* ── Python ───────────────────────────────────────────────────────────── */
  {
    course: 'python-programming',
    title: 'Python Programming',
    pillar: '/courses/python-programming',
    categories: ['python'],
    priority: 'P2',
    why: 'Broad coverage of the syllabus. Three articles answer "how do I learn Python", and the project-idea and interview-practice topics are each duplicated.',
    topics: [
      {
        role: 'roadmap',
        topic: 'How to learn Python: the learning path',
        owner: 'learn-python-from-scratch-a-complete-2026-roadmap',
        duplicates: ['from-python-beginner-to-job-ready-a-6-month-plan', 'how-to-learn-python-faster-a-proven-study-plan'],
        priority: 'P2',
        note: 'Three answers to one question. Keep the roadmap; merge the 6-month plan into it (a timeline section) and refocus "learn faster" on study technique, or merge it too, pending Search Console.',
      },
      {
        role: 'fundamentals',
        topic: 'Core Python: data structures, strings, comprehensions',
        owner: 'python-data-structures-a-complete-reference',
        supporting: [
          'python-lists-vs-tuples-vs-sets-vs-dictionaries',
          'list-comprehensions-in-python-a-complete-guide',
          'python-string-methods-every-developer-should-know',
          'python-f-strings-formatting-done-right',
          'lambda-functions-map-filter-and-reduce-in-python',
          'python-args-and-kwargs-explained-clearly',
        ],
      },
      {
        role: 'fundamentals',
        topic: 'Object-oriented programming in Python',
        owner: 'object-oriented-programming-oop-in-python-explained',
      },
      {
        role: 'advanced',
        topic: 'Advanced Python: iterators, generators, decorators, context managers',
        owner: 'python-generators-and-iterators-made-simple',
        supporting: [
          'python-decorators-explained-with-real-examples',
          'python-decorators-vs-context-managers-when-to-use-each',
          'python-iterators-vs-generators-vs-comprehensions',
          'python-memory-management-and-garbage-collection',
          'python-type-hints-writing-cleaner-safer-code',
        ],
      },
      {
        role: 'advanced',
        topic: 'Concurrency: asyncio, threads and processes',
        owner: 'async-programming-in-python-asyncio-explained',
        supporting: ['multithreading-vs-multiprocessing-in-python'],
      },
      {
        role: 'implementation',
        topic: 'Files and data formats: CSV, JSON, dates, regex',
        owner: 'python-file-handling-reading-and-writing-files',
        supporting: [
          'reading-and-writing-csv-files-in-python',
          'working-with-json-in-python-a-practical-guide',
          'datetime-in-python-working-with-dates-and-times',
          'regular-expressions-in-python-a-practical-guide',
        ],
      },
      {
        role: 'troubleshooting',
        topic: 'Errors, testing and code quality',
        owner: 'error-handling-in-python-try-except-and-best-practices',
        supporting: [
          'unit-testing-in-python-with-pytest-a-beginner-s-guide',
          'python-logging-a-practical-setup-for-real-projects',
          'python-best-practices-writing-pythonic-code',
          'how-to-structure-a-python-project-the-right-way',
          'virtual-environments-in-python-venv-pip-and-poetry',
          'environment-variables-and-secrets-in-python-apps',
        ],
      },
      {
        role: 'tools',
        topic: 'Python for data: NumPy and pandas',
        owner: 'numpy-guide-arrays-broadcasting-and-vectorization',
        supporting: [
          'pandas-guide-dataframes-cleaning-and-aggregation',
          'pandas-performance-making-your-code-10x-faster',
          'top-python-libraries-every-developer-should-know',
          'python-for-data-science-the-essential-libraries',
        ],
        note: 'python-for-data-science is owned by the Data Science cluster and linked from here.',
      },
      {
        role: 'implementation',
        topic: 'APIs, web development and databases',
        owner: 'building-rest-apis-with-python-a-practical-guide',
        supporting: [
          'fastapi-guide-build-a-production-api-step-by-step',
          'flask-vs-fastapi-vs-django-which-to-choose-in-2026',
          'pydantic-explained-data-validation-in-python',
          'sqlalchemy-tutorial-databases-in-python',
          'web-scraping-with-python-beautifulsoup-and-requests',
          'building-a-cli-tool-in-python-with-argparse',
        ],
      },
      {
        role: 'projects',
        topic: 'Python projects and automation',
        owner: 'python-projects-for-beginners-15-ideas-to-build',
        supporting: ['automate-boring-tasks-with-python-10-scripts'],
        duplicates: ['python-mini-projects-to-build-in-a-weekend', 'python-for-automation-a-real-world-project-guide'],
        priority: 'P3',
        note: 'Two project-idea lists and two automation guides. Merge the weekend list into the beginner list, and the automation guide into the ten scripts (or the reverse), pending Search Console.',
      },
      {
        role: 'interview',
        topic: 'Python interview questions',
        owner: 'python-interview-questions-top-50-with-answers',
        supporting: [
          'python-interview-questions-for-data-roles',
          'python-coding-interview-questions-and-patterns',
          'numpy-interview-questions-for-data-roles',
          'rest-api-interview-questions-and-answers',
        ],
        duplicates: ['python-coding-challenges-to-practice-for-interviews'],
        priority: 'P3',
        note: 'Data-roles post rewritten to standard-library coding tasks (Phase 4 pilot). "Coding challenges to practise" and "coding interview questions and patterns" answer one question: merge candidates.',
      },
      {
        role: 'salary',
        topic: 'Python developer salaries',
        owner: 'python-salary-in-india-2026-roles-and-expectations',
        note: 'Phase 4 MANUAL REVIEW: link it only once its figures are sourced.',
      },
    ],
  },

  /* ── Power BI ─────────────────────────────────────────────────────────── */
  {
    course: 'power-bi',
    title: 'Power BI',
    pillar: '/courses/power-bi',
    categories: ['power-bi'],
    priority: 'P2',
    why: 'Covers the whole syllabus. Two roadmaps are word-for-word copies, two posts explain calculated columns vs measures, and an interview-questions duplicate is already a Phase 3 merge.',
    topics: [
      {
        role: 'roadmap',
        topic: 'Power BI roadmap: beginner to job-ready',
        owner: 'power-bi-roadmap-2026-from-beginner-to-job-ready',
        supporting: ['how-to-learn-power-bi-in-30-days-a-study-plan'],
        duplicates: ['from-power-bi-beginner-to-developer-a-career-roadmap'],
        priority: 'P2',
        note: 'The career roadmap has the same body as the roadmap (Phase 4, keyword-swapped) and the same query: merge candidate. The 30-day plan is a time-boxed study plan and can stay if rewritten as one.',
      },
      {
        role: 'fundamentals',
        topic: 'Getting started: your first report',
        owner: 'power-bi-for-beginners-your-first-report-in-1-hour',
      },
      {
        role: 'implementation',
        topic: 'Power Query: getting and shaping data',
        owner: 'power-query-tutorial-transforming-data-without-code',
        supporting: ['power-query-m-language-basics-for-beginners', 'power-bi-error-handling-in-power-query', 'power-bi-dataflows-explained-for-beginners'],
      },
      {
        role: 'fundamentals',
        topic: 'Data modelling: star schema and relationships',
        owner: 'data-modeling-in-power-bi-star-schema-explained',
        supporting: [
          'star-schema-vs-snowflake-schema-in-power-bi',
          'power-bi-relationships-one-to-many-and-cardinality',
          'handling-many-to-many-relationships-in-power-bi',
          'composite-models-and-directquery-in-power-bi',
          'aggregations-in-power-bi-for-large-datasets',
        ],
      },
      {
        role: 'implementation',
        topic: 'DAX: measures, context and time intelligence',
        owner: 'dax-guide-measures-calculated-columns-and-context',
        supporting: [
          'dax-calculate-function-explained-step-by-step',
          'dax-filter-and-all-functions-explained',
          'dax-variables-writing-cleaner-faster-measures',
          'time-intelligence-in-dax-ytd-mtd-and-comparisons',
          'top-20-dax-functions-every-analyst-should-know',
          'calculation-groups-in-power-bi-explained',
        ],
        duplicates: ['creating-calculated-columns-vs-measures-in-power-bi'],
        priority: 'P3',
        note: 'The DAX guide already covers "measures and calculated columns". Refocus the comparison post on the decision (when to use which, with examples) or merge it.',
      },
      {
        role: 'implementation',
        topic: 'Report design and interactivity',
        owner: 'power-bi-dashboard-design-a-practical-guide',
        supporting: [
          'conditional-formatting-in-power-bi-a-practical-guide',
          'kpis-and-cards-in-power-bi-designing-scorecards',
          'power-bi-bookmarks-and-buttons-for-interactivity',
          'power-bi-drillthrough-and-drilldown-explained',
          'power-bi-field-parameters-dynamic-reports-made-easy',
          'power-bi-filters-visual-page-and-report-level',
          'power-bi-slicers-sync-hierarchies-and-best-practices',
          'power-bi-tooltips-adding-context-to-visuals',
          'power-bi-custom-visuals-when-and-how-to-use-them',
          'power-bi-themes-and-branding-for-professional-reports',
          'power-bi-mobile-designing-reports-for-phones',
        ],
      },
      {
        role: 'implementation',
        topic: 'Power BI Service: publishing, refresh, security',
        owner: 'power-bi-service-publishing-sharing-and-workspaces',
        supporting: [
          'power-bi-data-refresh-scheduled-and-incremental',
          'power-bi-gateway-explained-connecting-on-prem-data',
          'power-bi-deployment-pipelines-for-teams',
          'row-level-security-rls-in-power-bi-a-complete-guide',
          'power-bi-paginated-reports-vs-interactive-reports',
        ],
      },
      {
        role: 'troubleshooting',
        topic: 'Report performance',
        owner: 'power-bi-performance-tuning-make-reports-faster',
      },
      {
        role: 'tools',
        topic: 'Connecting to SQL Server',
        owner: 'connecting-power-bi-to-sql-server-a-step-by-step-guide',
        note: 'Bridges to the SQL Server cluster, which links to it.',
      },
      {
        role: 'projects',
        topic: 'Power BI projects and portfolio dashboards',
        owner: 'power-bi-projects-to-build-for-your-portfolio',
        supporting: ['building-a-sales-dashboard-in-power-bi-from-scratch', 'building-a-finance-dashboard-in-power-bi'],
      },
      {
        role: 'interview',
        topic: 'Power BI and DAX interview questions',
        owner: 'power-bi-interview-questions-top-40-with-answers',
        supporting: ['dax-interview-questions-for-power-bi-developers'],
        duplicates: ['power-bi-interview-questions-with-detailed-answers'],
        priority: 'P2',
        note: 'Phase 3 MERGE (Phase 4: gated on Search Console).',
      },
      {
        role: 'certification',
        topic: 'PL-300 certification',
        owner: 'power-bi-certification-pl-300-how-to-prepare',
      },
      {
        role: 'salary',
        topic: 'Power BI developer salary',
        owner: 'power-bi-developer-salary-in-hyderabad-2026',
        note: 'Phase 4 MANUAL REVIEW: link it only once its figures are sourced.',
      },
      {
        role: 'comparison',
        topic: 'Power BI vs Tableau and Excel',
        owner: null,
        compare: '/compare/power-bi-vs-tableau',
        supporting: ['power-bi-vs-tableau-a-detailed-2026-comparison', 'power-bi-vs-excel-when-to-use-each-tool', 'excel-vs-power-bi-which-should-you-learn-first'],
        note: '/compare/power-bi-vs-tableau and /compare/power-bi-vs-excel own these queries (Phase 3); the blog posts link to them.',
      },
    ],
  },

  /* ── Data Analytics ───────────────────────────────────────────────────── */
  {
    course: 'data-analytics',
    title: 'Data Analytics',
    pillar: '/courses/data-analytics',
    categories: ['data-analytics'],
    priority: 'P3',
    why: 'The most coherent cluster: one roadmap with distinct audience variants, and clear Excel, SQL, cleaning and dashboard topics. Its interview posts sit in the generic category and point at Data Science.',
    topics: [
      {
        role: 'roadmap',
        topic: 'Data analyst roadmap',
        owner: 'data-analyst-roadmap-2026-skills-tools-and-timeline',
        supporting: ['data-analytics-roadmap-for-non-tech-backgrounds', 'how-to-become-a-data-analyst-with-no-experience', 'data-analyst-career-path-from-junior-to-lead'],
        note: 'Phase 3 KEEP BOTH for "how to become". Each variant must answer for its audience (non-tech background, no experience, career progression), not repeat the roadmap.',
      },
      {
        role: 'fundamentals',
        topic: 'What analytics is: types, stack and statistics',
        owner: 'business-analytics-explained-a-beginner-s-guide',
        supporting: [
          'descriptive-vs-diagnostic-vs-predictive-analytics',
          'the-modern-data-analytics-stack-explained',
          'statistical-concepts-every-data-analyst-must-know',
          'correlation-vs-causation-a-must-know-for-analysts',
        ],
      },
      {
        role: 'tools',
        topic: 'Excel for analysis',
        owner: 'excel-for-data-analysis-formulas-that-matter',
        supporting: [
          'pivot-tables-in-excel-a-complete-tutorial',
          'forecasting-in-excel-simple-methods-that-work',
          'excel-power-query-cleaning-data-without-code',
          'google-sheets-for-data-analysis-underrated-power-tools',
        ],
      },
      {
        role: 'tools',
        topic: 'SQL for analysts',
        owner: 'sql-for-data-analysts-the-queries-you-need-daily',
        supporting: ['from-excel-to-sql-a-smooth-transition-guide'],
      },
      {
        role: 'implementation',
        topic: 'Data cleaning and preparation',
        owner: 'data-cleaning-a-practical-step-by-step-guide',
        supporting: ['how-to-handle-missing-data-in-analytics', 'how-to-audit-a-messy-dataset-before-analysis', 'outlier-detection-for-analysts-methods-and-tools'],
      },
      {
        role: 'implementation',
        topic: 'Dashboards, visualisation and storytelling',
        owner: 'dashboard-design-principles-for-data-analysts',
        supporting: [
          'data-visualization-best-practices-and-common-mistakes',
          'building-your-first-interactive-dashboard',
          'looker-studio-tutorial-free-dashboards-for-beginners',
          'how-to-tell-a-story-with-data-a-practical-framework',
          'how-to-present-data-to-non-technical-stakeholders',
          'how-to-write-a-data-analysis-report-that-gets-read',
        ],
      },
      {
        role: 'advanced',
        topic: 'Analysis methods: funnels, cohorts, segmentation',
        owner: 'product-analytics-101-events-funnels-and-retention',
        supporting: [
          'funnel-analysis-measuring-conversion-step-by-step',
          'cohort-analysis-explained-with-examples',
          'customer-segmentation-for-analysts-a-practical-guide',
          'marketing-analytics-metrics-and-dashboards-that-matter',
          'web-analytics-basics-understanding-user-behavior',
          'time-intelligence-in-analytics-trends-and-seasonality',
        ],
      },
      {
        role: 'implementation',
        topic: 'KPIs and business metrics',
        owner: 'how-to-create-effective-kpis-for-any-business',
        supporting: ['building-kpi-scorecards-for-executives', 'metrics-that-matter-vanity-vs-actionable-metrics', 'how-data-analysts-add-real-business-value'],
      },
      {
        role: 'projects',
        topic: 'Data analytics projects and portfolio',
        owner: 'data-analytics-projects-for-your-resume',
        supporting: ['building-a-sales-dashboard-a-hands-on-project', 'how-to-build-a-data-analyst-portfolio-in-2026', 'spreadsheet-to-insight-a-repeatable-analysis-workflow'],
      },
      {
        role: 'interview',
        topic: 'Data analyst interview questions',
        owner: 'data-analyst-interview-questions-and-answers',
        supporting: ['excel-interview-questions-for-data-analysts', 'pandas-interview-questions-every-analyst-should-know', 'tableau-interview-questions-and-answers'],
      },
      {
        role: 'tools',
        topic: 'The analyst toolkit and governance',
        owner: 'top-free-tools-for-data-analysts-in-2026',
        supporting: ['self-service-analytics-empowering-business-teams', 'data-governance-basics-every-analyst-should-know'],
      },
      {
        role: 'salary',
        topic: 'Data analyst salary',
        owner: 'data-analyst-salary-in-hyderabad-2026',
        note: 'Phase 4 MANUAL REVIEW: link it only once its figures are sourced.',
      },
      {
        role: 'comparison',
        topic: 'Analyst roles and tools compared',
        owner: 'data-analyst-vs-business-analyst-key-differences',
        supporting: ['power-bi-vs-tableau-vs-looker-a-2026-comparison'],
        note: '/compare/data-analyst-vs-data-scientist owns that comparison (Phase 3). Analyst vs business analyst has no /compare page and is owned here.',
      },
    ],
  },

  /* ── Data Engineering ─────────────────────────────────────────────────── */
  {
    course: 'data-engineering',
    title: 'Data Engineering',
    pillar: '/courses/data-engineering',
    categories: ['data-engineering', 'aws', 'gcp', 'azure-data-factory'],
    priority: 'P1',
    why: 'The largest cluster: 200 articles in four categories. The course page links four articles, all from the data-engineering category, chosen by recency. The three platform roadmaps (AWS, GCP, Azure) act as sub-pillars but the course page links none of them, and each platform has overlapping "become" and roadmap posts.',
    topics: [
      {
        role: 'roadmap',
        topic: 'Data engineering roadmap',
        owner: 'data-engineering-roadmap-2026-a-complete-guide',
        supporting: [
          'how-to-become-a-data-engineer-in-2026',
          'from-backend-developer-to-data-engineer-a-roadmap',
          'how-to-transition-from-testing-to-data-engineering',
          'data-engineering-tools-you-must-learn-in-2026',
          'data-engineering-vs-data-science-roles-compared',
        ],
        note: 'Phase 3 KEEP BOTH for "how to become". The backend-developer and tester transitions are distinct audiences. Each must be rewritten for its audience; today the backend roadmap is a word-for-word copy of this roadmap. The DE-vs-DS post supports /compare/data-engineering-vs-data-science (Phase 3), which owns that comparison.',
      },
      {
        role: 'fundamentals',
        topic: 'Warehouses, lakes and lakehouses',
        owner: 'data-warehouse-explained-concepts-and-architecture',
        supporting: [
          'data-lake-vs-data-warehouse-vs-lakehouse',
          'oltp-vs-olap-transactional-vs-analytical-systems',
          'medallion-architecture-bronze-silver-and-gold-layers',
          'lambda-vs-kappa-architecture-explained',
          'building-a-data-warehouse-a-step-by-step-guide',
        ],
      },
      {
        role: 'implementation',
        topic: 'ETL/ELT and pipeline design',
        owner: 'etl-vs-elt-differences-and-when-to-use-each',
        supporting: [
          'building-your-first-data-pipeline-a-walkthrough',
          'building-incremental-data-loads-that-scale',
          'cdc-change-data-capture-explained-with-examples',
          'idempotency-in-data-pipelines-why-it-matters',
          'handling-late-arriving-data-in-pipelines',
          'schema-evolution-handling-changing-data-structures',
        ],
      },
      {
        role: 'fundamentals',
        topic: 'Data modelling for warehouses',
        owner: 'data-modeling-star-schema-snowflake-and-data-vault',
        supporting: ['designing-fact-and-dimension-tables', 'slowly-changing-dimensions-scd-types-explained'],
      },
      {
        role: 'tools',
        topic: 'Spark and big-data processing',
        owner: 'apache-spark-explained-for-beginners',
        supporting: [
          'pyspark-tutorial-dataframes-transformations-and-actions',
          'partitioning-and-bucketing-in-spark-explained',
          'spark-performance-tuning-shuffles-joins-and-caching',
          'spark-vs-hadoop-what-changed-and-why',
          'pyspark-vs-pandas-when-to-use-which',
          'databricks-tutorial-a-beginner-s-guide',
          'delta-lake-explained-reliable-lakes-with-acid',
          'apache-iceberg-vs-delta-lake-vs-hudi',
          'parquet-vs-orc-vs-avro-file-formats-compared',
          'distributed-systems-basics-for-data-engineers',
        ],
      },
      {
        role: 'tools',
        topic: 'Streaming with Kafka',
        owner: 'apache-kafka-explained-streaming-data-basics',
        supporting: [
          'building-a-streaming-pipeline-with-kafka-and-spark',
          'batch-vs-streaming-data-processing-a-clear-comparison',
          'kafka-vs-rabbitmq-vs-pulsar-a-comparison',
          'real-time-analytics-architecture-and-tools',
        ],
      },
      {
        role: 'tools',
        topic: 'Orchestration with Airflow',
        owner: 'airflow-tutorial-orchestrating-data-pipelines',
        supporting: ['orchestration-airflow-vs-dagster-vs-prefect'],
        duplicates: ['workflow-orchestration-with-apache-airflow-dags'],
        priority: 'P2',
        note: 'Two Airflow introductions. Merge the DAGs post into the tutorial, or refocus it on DAG design patterns.',
      },
      {
        role: 'implementation',
        topic: 'Transformation and data quality: dbt, tests, contracts',
        owner: 'dbt-tutorial-transformations-in-the-modern-data-stack',
        supporting: ['data-quality-testing-and-validation-in-pipelines', 'data-contracts-reliable-pipelines-between-teams'],
      },
      {
        role: 'tools',
        topic: 'Cloud data warehouses: Snowflake, BigQuery, Redshift',
        owner: 'snowflake-explained-the-cloud-data-warehouse',
        supporting: ['bigquery-vs-snowflake-vs-redshift-a-comparison', 'gcp-vs-aws-vs-azure-for-data-engineering'],
        duplicates: ['cloud-data-warehouses-compared-snowflake-vs-bigquery-vs-redshift', 'redshift-vs-snowflake-vs-bigquery-a-comparison'],
        priority: 'P2',
        note: 'Phase 3 MERGE: three posts compare the same three warehouses. bigquery-vs-snowflake-vs-redshift owns it.',
      },
      {
        role: 'advanced',
        topic: 'AWS for data engineers (platform sub-pillar)',
        owner: 'aws-roadmap-2026-for-data-engineers',
        supporting: [
          'amazon-s3-explained-storage-classes-and-best-practices',
          'aws-glue-tutorial-serverless-etl-on-aws',
          'amazon-redshift-explained-the-cloud-data-warehouse',
          'amazon-athena-querying-s3-with-sql',
          'amazon-emr-explained-big-data-on-aws',
          'amazon-kinesis-explained-real-time-streaming',
          'building-a-data-lake-on-aws-with-s3-and-glue',
          'aws-glue-vs-emr-vs-lambda-for-etl',
          'aws-certified-data-engineer-associate-exam-guide',
          'aws-data-engineering-projects-for-your-portfolio',
          'aws-interview-questions-for-data-engineers',
          'redshift-interview-questions-and-answers',
        ],
        duplicates: ['how-to-start-an-aws-cloud-career-in-2026', 'aws-data-engineer-guide-skills-and-services'],
        priority: 'P2',
        note: 'The "start an AWS cloud career" and "AWS data engineer guide" posts answer the roadmap question again: merge candidates. The ~40 other AWS articles support the listed subtopics.',
      },
      {
        role: 'advanced',
        topic: 'Google Cloud for data engineers (platform sub-pillar)',
        owner: 'gcp-roadmap-2026-for-data-engineers',
        supporting: [
          'bigquery-explained-google-s-serverless-data-warehouse',
          'partitioning-and-clustering-in-bigquery',
          'loading-data-into-bigquery-batch-and-streaming',
          'dataflow-tutorial-stream-and-batch-processing-on-gcp',
          'pub-sub-explained-messaging-and-streaming-on-gcp',
          'cloud-composer-airflow-on-gcp-explained',
          'dataproc-vs-dataflow-which-to-choose',
          'google-cloud-storage-buckets-classes-and-best-practices',
          'building-a-data-pipeline-on-gcp-end-to-end',
          'gcp-professional-data-engineer-certification-guide',
          'gcp-data-engineering-projects-for-your-portfolio',
          'gcp-interview-questions-for-data-engineers',
          'bigquery-interview-questions-and-answers',
        ],
        duplicates: ['how-to-start-a-career-in-google-cloud-in-2026', 'streaming-data-into-bigquery-a-practical-guide'],
        priority: 'P2',
        note: '"Start a career in Google Cloud" repeats the roadmap. "Streaming data into BigQuery" overlaps "loading data into BigQuery: batch and streaming"; keep one owner for BigQuery ingestion.',
      },
      {
        role: 'advanced',
        topic: 'Azure and Data Factory for data engineers (platform sub-pillar)',
        owner: 'azure-data-factory-roadmap-2026-a-complete-guide',
        supporting: [
          'adf-pipelines-explained-building-your-first-pipeline',
          'copy-activity-in-azure-data-factory-a-practical-guide',
          'triggers-in-adf-schedule-tumbling-window-and-event',
          'linked-services-in-azure-data-factory-explained',
          'mapping-data-flows-in-adf-transformations-without-code',
          'integration-runtimes-in-adf-azure-self-hosted-and-ssis',
          'azure-synapse-analytics-explained-for-beginners',
          'azure-data-lake-storage-gen2-explained',
          'azure-databricks-with-adf-orchestration-patterns',
          'azure-data-engineer-certification-dp-203-guide',
          'azure-data-engineering-projects-for-your-portfolio',
          'azure-data-factory-interview-questions-and-answers',
          'azure-interview-questions-for-data-engineers',
        ],
        duplicates: ['how-to-become-an-azure-data-engineer-in-2026', 'building-an-etl-pipeline-with-adf-step-by-step', 'azure-data-factory-adf-interview-questions'],
        priority: 'P2',
        note: '"How to become an Azure data engineer" repeats the roadmap. The ETL-pipeline post is a Phase 3 MANUAL REVIEW against the first-pipeline post, and the interview-questions copy is a Phase 3 MERGE.',
      },
      {
        role: 'projects',
        topic: 'Data engineering projects',
        owner: 'data-engineering-projects-for-your-portfolio',
      },
      {
        role: 'interview',
        topic: 'Data engineering interview questions',
        owner: 'data-engineering-interview-questions-and-answers',
        supporting: [
          'etl-interview-questions-for-data-engineers',
          'data-warehouse-interview-questions-and-answers',
          'data-modeling-interview-questions-explained',
          'system-design-interview-questions-for-data-engineers',
          'apache-spark-interview-questions-and-answers',
          'pyspark-interview-questions-with-examples',
          'spark-performance-interview-questions',
          'kafka-interview-questions-explained',
          'airflow-interview-questions-for-data-engineers',
          'databricks-interview-questions-and-answers',
          'snowflake-interview-questions-for-data-engineers',
          'hadoop-interview-questions-and-answers',
          'linux-interview-questions-for-data-engineers',
        ],
      },
      {
        role: 'salary',
        topic: 'Data engineer salaries',
        owner: 'data-engineer-salary-in-hyderabad-2026',
        duplicates: ['aws-data-engineer-salary-in-india-2026', 'gcp-data-engineer-salary-in-india-2026', 'azure-data-engineer-salary-in-hyderabad-2026'],
        priority: 'P3',
        note: 'Four salary pages, all Phase 4 MANUAL REVIEW. With a sourced dataset, one data-engineer salary page with a platform section is likely more useful than four.',
      },
    ],
  },

  /* ── MLOps ────────────────────────────────────────────────────────────── */
  {
    course: 'mlops',
    title: 'MLOps',
    pillar: '/courses/mlops',
    categories: ['mlops'],
    priority: 'P2',
    why: 'Good syllabus coverage. The MLflow and containerisation topics are each answered twice (once in the Data Science category), and prediction-API posts overlap.',
    topics: [
      {
        role: 'fundamentals',
        topic: 'What MLOps is',
        owner: 'what-is-mlops-devops-for-machine-learning-explained',
        supporting: ['mlops-maturity-levels-where-does-your-team-stand', 'production-ml-systems-architecture-and-best-practices', 'mlops-vs-devops-vs-dataops-key-differences'],
        note: '/compare/mlops-vs-devops owns the two-way comparison; the three-way post supports it.',
      },
      {
        role: 'roadmap',
        topic: 'MLOps roadmap and tools',
        owner: 'mlops-roadmap-2026-skills-tools-and-career-path',
        supporting: ['from-data-scientist-to-mlops-engineer-a-roadmap', 'mlops-tools-landscape-2026-what-to-learn'],
        note: 'The data-scientist transition roadmap is a word-for-word copy of the DE roadmap today (Phase 4); rewrite it for its audience.',
      },
      {
        role: 'tools',
        topic: 'Experiment tracking, versioning and the model registry',
        owner: 'mlflow-tutorial-tracking-experiments-and-models',
        supporting: [
          'experiment-tracking-mlflow-vs-weights-and-biases',
          'model-registry-managing-the-ml-model-lifecycle',
          'model-versioning-with-mlflow-and-dvc',
          'data-versioning-with-dvc-a-hands-on-guide',
          'reproducibility-in-ml-seeds-configs-and-pipelines',
        ],
        duplicates: ['mlflow-for-data-scientists-tracking-experiments'],
        priority: 'P2',
        note: 'The Data Science category has its own MLflow experiment-tracking post. MLOps owns MLflow; merge the DS post, or refocus it on the notebook workflow and link here.',
      },
      {
        role: 'tools',
        topic: 'Containerising models with Docker',
        owner: 'docker-for-machine-learning-a-practical-guide',
        supporting: ['model-packaging-from-pickle-to-production'],
        duplicates: ['containerizing-a-machine-learning-model-step-by-step'],
        priority: 'P2',
        note: 'Rewritten in the Phase 4 pilot. The step-by-step containerising post answers the same question: merge, or make it the worked walkthrough the guide links to.',
      },
      {
        role: 'implementation',
        topic: 'Deploying and serving models',
        owner: 'serving-ml-models-with-fastapi-and-docker',
        supporting: [
          'batch-vs-real-time-model-inference-tradeoffs',
          'deploying-ml-models-on-aws-azure-and-gcp',
          'blue-green-deployments-for-ml-services',
          'shadow-deployment-and-canary-releases-for-ml',
          'a-b-testing-ml-models-in-production',
          'edge-ml-deployment-running-models-on-devices',
          'model-compression-quantization-and-pruning-explained',
          'model-deployment-from-notebook-to-production',
        ],
        duplicates: ['building-a-prediction-api-a-complete-walkthrough'],
        priority: 'P3',
        note: 'Both the FastAPI post and "building a prediction API" walk through serving a model over HTTP. "From notebook to production" sits in Data Science and is linked here as the entry point.',
      },
      {
        role: 'tools',
        topic: 'Kubernetes and ML pipelines',
        owner: 'kubernetes-for-ml-deploying-models-at-scale',
        supporting: [
          'kubeflow-pipelines-an-introduction-for-ml-engineers',
          'airflow-for-ml-pipelines-a-practical-guide',
          'pipeline-orchestration-airflow-vs-prefect-vs-dagster',
          'scaling-model-training-with-distributed-computing',
          'gpu-vs-cpu-for-ml-when-you-actually-need-a-gpu',
        ],
      },
      {
        role: 'implementation',
        topic: 'CI/CD and continuous training',
        owner: 'ci-cd-for-machine-learning-pipelines-that-work',
        supporting: ['github-actions-for-ml-automating-workflows', 'continuous-training-automating-model-retraining', 'testing-machine-learning-code-and-data', 'secrets-management-for-ml-pipelines'],
      },
      {
        role: 'troubleshooting',
        topic: 'Monitoring, drift and observability',
        owner: 'monitoring-ml-models-in-production-a-complete-guide',
        supporting: ['model-drift-and-data-drift-detection-and-response', 'prometheus-and-grafana-for-ml-monitoring', 'logging-and-observability-for-ml-systems', 'model-explainability-in-production-with-shap'],
        duplicates: ['handling-concept-drift-in-live-ml-systems'],
        priority: 'P3',
        note: 'Concept drift is covered by the drift article; merge, or keep only if it adds the retraining response.',
      },
      {
        role: 'advanced',
        topic: 'Feature stores and real-time features',
        owner: 'feature-stores-explained-why-teams-need-them',
        supporting: ['real-time-feature-engineering-for-online-models'],
      },
      {
        role: 'advanced',
        topic: 'Cloud MLOps platforms',
        owner: 'vertex-ai-and-sagemaker-for-mlops-a-comparison',
        supporting: ['vertex-ai-pipelines-for-mlops-on-gcp', 'vertex-ai-tutorial-ml-on-google-cloud', 'cost-optimization-for-ml-workloads-in-the-cloud'],
      },
      {
        role: 'projects',
        topic: 'End-to-end MLOps projects',
        owner: 'building-an-end-to-end-mlops-pipeline',
        supporting: ['how-to-build-an-mlops-portfolio-that-stands-out'],
      },
      {
        role: 'interview',
        topic: 'MLOps interview questions',
        owner: 'mlops-interview-questions-and-answers',
        supporting: ['docker-and-kubernetes-interview-questions-for-ml', 'git-interview-questions-every-developer-should-know'],
      },
      {
        role: 'salary',
        topic: 'MLOps engineer salary',
        owner: 'mlops-engineer-salary-in-india-2026',
        note: 'Phase 4 MANUAL REVIEW: link it only once its figures are sourced.',
      },
    ],
  },

  /* ── SQL Server ───────────────────────────────────────────────────────── */
  {
    course: 'sql-server',
    title: 'SQL Server',
    pillar: '/courses/sql-server',
    categories: [],
    priority: 'P1',
    why: 'No category maps to it, so the course page links to no articles. About 15 SQL articles exist across four other categories, but none is about SQL Server itself: no T-SQL, SSMS, stored procedures or execution plans. This is the one cluster where new articles are justified, and only for the syllabus topics listed as gaps.',
    topics: [
      {
        role: 'roadmap',
        topic: 'SQL Server learning path',
        owner: null,
        gap: 'No article says what to learn for SQL Server, in what order: T-SQL basics, SSMS, database design, procedures, performance, then SSIS or Power BI. It becomes the cluster owner that the SQL articles link up to.',
        priority: 'P1',
      },
      {
        role: 'fundamentals',
        topic: 'SQL queries you use every day (SELECT, joins, aggregation)',
        owner: null,
        supporting: ['sql-for-data-analysts-the-queries-you-need-daily', 'sql-for-data-science-queries-every-data-scientist-must-know', 'from-excel-to-sql-a-smooth-transition-guide'],
        note: 'Covered for analysts and data scientists by articles those clusters own. The SQL Server roadmap links to them; no duplicate beginner article.',
      },
      {
        role: 'advanced',
        topic: 'Window functions',
        owner: 'window-functions-in-sql-for-data-engineers',
        supporting: ['window-functions-sql-interview-questions', 'bigquery-window-functions-and-analytic-sql'],
        note: 'Owned here: window functions are a syllabus module, and the DE cluster links in. The BigQuery post stays platform-specific.',
      },
      {
        role: 'troubleshooting',
        topic: 'Query optimisation',
        owner: 'sql-optimization-for-data-engineers',
        supporting: ['sql-query-optimization-interview-questions', 'bigquery-sql-tips-tricks-and-optimization'],
      },
      {
        role: 'implementation',
        topic: 'Stored procedures, functions and T-SQL programming',
        owner: null,
        gap: 'A syllabus module no article covers. It is SQL Server-specific (T-SQL control flow, parameters, error handling), so it is not a variant of any existing post.',
        priority: 'P2',
      },
      {
        role: 'troubleshooting',
        topic: 'Indexes and execution plans in SQL Server',
        owner: null,
        gap: 'The generic optimisation article cannot show SQL Server execution plans or index design. A SQL Server-specific treatment is a different, practical question.',
        priority: 'P2',
      },
      {
        role: 'fundamentals',
        topic: 'Database design: normalisation, keys, constraints',
        owner: null,
        gap: 'A syllabus module with no article. The data-modelling articles cover analytical (star-schema) design, not transactional design.',
        priority: 'P3',
      },
      {
        role: 'tools',
        topic: 'SQL Server in the data stack: SSIS, Power BI, Azure',
        owner: null,
        supporting: ['connecting-power-bi-to-sql-server-a-step-by-step-guide', 'adf-vs-ssis-migrating-legacy-etl-to-the-cloud', 'copying-data-from-on-prem-sql-to-azure-with-adf', 'sqlalchemy-tutorial-databases-in-python'],
        note: 'Existing articles in other clusters already cover the integrations; link them from the SQL Server roadmap.',
      },
      {
        role: 'interview',
        topic: 'SQL interview questions',
        owner: 'sql-interview-questions-top-50-with-answers',
        supporting: ['sql-joins-interview-questions-explained', 'scenario-based-sql-interview-questions'],
        note: 'The generic interview-questions category maps it to Data Science in the CMS, so its "Explore course" card points there. SQL Server is its course.',
      },
      {
        role: 'comparison',
        topic: 'SQL vs NoSQL',
        owner: null,
        compare: '/compare/sql-vs-nosql',
      },
    ],
  },
];

/* ── Platform sub-pillars ─────────────────────────────────────────────── */

/**
 * The AWS, GCP and Azure Data Factory categories hold about 150 articles.
 * The map lists the dozen that matter most for each platform; every other
 * article in those categories is a subtopic of its platform, and links up to
 * the platform roadmap, which links up to the Data Engineering course.
 */
export const PLATFORM_SUBPILLARS: Readonly<Record<'aws' | 'gcp' | 'azure-data-factory', string>> = {
  aws: 'aws-roadmap-2026-for-data-engineers',
  gcp: 'gcp-roadmap-2026-for-data-engineers',
  'azure-data-factory': 'azure-data-factory-roadmap-2026-a-complete-guide',
};

/**
 * Where an article sends its "up" link: the owner of the topic it supports,
 * else its platform roadmap, else nothing (the course link applies).
 */
export function upwardTarget(slug: string, categorySlug?: string): string | null {
  for (const c of COURSE_CLUSTERS)
    for (const t of c.topics) if (t.owner && t.owner !== slug && ((t.supporting ?? []).includes(slug) || (t.duplicates ?? []).includes(slug))) return t.owner;
  const platform = PLATFORM_SUBPILLARS[categorySlug as keyof typeof PLATFORM_SUBPILLARS];
  return platform && platform !== slug ? platform : null;
}

/* ── Career support layer ─────────────────────────────────────────────── */

/**
 * `career-guidance` is mapped to Data Science in the CMS, but its 50 articles
 * serve every course: resumes, LinkedIn, interviews, negotiation. They support
 * the careers, not one course, so they should link to the relevant roadmap or
 * course only when an article is about a specific role. Groups below answer one
 * question more than once.
 */
export const CAREER_DUPLICATE_GROUPS: readonly { topic: string; owner: string; duplicates: readonly string[]; note: string }[] = [
  {
    topic: 'LinkedIn for job seekers',
    owner: 'linkedin-optimization-for-tech-job-seekers-in-2026',
    duplicates: ['building-a-personal-brand-on-linkedin', 'how-to-write-linkedin-posts-that-get-you-noticed', 'how-to-get-recruiters-to-notice-your-profile'],
    note: 'Profile, posting and branding are sections of one guide; the post-writing article can stay if it is genuinely about content.',
  },
  {
    topic: 'Behavioural interviews',
    owner: 'behavioral-interview-questions-for-data-roles',
    duplicates: ['cracking-the-behavioral-interview-star-method', 'how-to-answer-tell-me-about-yourself-in-interviews', 'cracking-hr-round-questions-confidently'],
    note: 'STAR and "tell me about yourself" are parts of behavioural-interview preparation. Merge or cross-link, pending Search Console.',
  },
  {
    topic: 'First data job with no experience',
    owner: 'how-to-get-your-first-data-job-with-no-experience',
    duplicates: ['how-to-stand-out-in-a-crowded-junior-job-market', 'from-college-to-corporate-a-fresher-s-survival-guide', 'interview-tips-for-freshers-how-to-stand-out'],
    note: 'The college-to-corporate post is about the first months in a job, a distinct question; the other two overlap the owner.',
  },
  {
    topic: 'Negotiating pay',
    owner: 'salary-negotiation-how-to-get-paid-what-you-re-worth',
    duplicates: ['how-to-negotiate-a-job-offer-email-step-by-step', 'asking-for-a-raise-timing-script-and-evidence'],
    note: 'Offer negotiation and raises are distinct moments; the email post overlaps the owner. The owner itself is a Phase 4 MANUAL REVIEW for its figures.',
  },
  {
    topic: 'Portfolio for data roles',
    owner: 'portfolio-building-projects-that-impress-recruiters',
    duplicates: ['personal-projects-that-double-as-interview-stories', 'how-to-build-a-data-portfolio-website', 'github-profile-tips-to-impress-hiring-managers'],
    note: 'Phase 4 found the first two word-for-word identical. Website and GitHub posts can stay as how-tos linked from the owner.',
  },
  {
    topic: 'Resume for data roles',
    owner: 'resume-building-for-data-roles-a-complete-guide',
    duplicates: ['common-resume-mistakes-that-get-you-rejected', 'how-to-quantify-achievements-on-your-resume'],
    note: 'Mistakes and quantifying achievements are sections of the resume guide or supporting how-tos; keep them only if they go deeper.',
  },
];

/* ── Lookups ──────────────────────────────────────────────────────────── */

export const clusterFor = (course: CourseSlug): CourseCluster => COURSE_CLUSTERS.find((c) => c.course === course)!;

/** Every article the map places in a course cluster, with its relation. */
export function clusterArticles(cluster: CourseCluster): { slug: string; relation: 'owner' | 'supporting' | 'duplicate'; topic: string }[] {
  return cluster.topics.flatMap((t) => [
    ...(t.owner ? [{ slug: t.owner, relation: 'owner' as const, topic: t.topic }] : []),
    ...(t.supporting ?? []).map((slug) => ({ slug, relation: 'supporting' as const, topic: t.topic })),
    ...(t.duplicates ?? []).map((slug) => ({ slug, relation: 'duplicate' as const, topic: t.topic })),
  ]);
}

/**
 * The course an article supports: the cluster that owns it, else the first
 * cluster that lists it. Null when the map does not place it, in which case
 * the CMS category mapping still applies.
 */
export function courseForArticle(slug: string): CourseSlug | null {
  for (const c of COURSE_CLUSTERS) if (c.topics.some((t) => t.owner === slug)) return c.course;
  for (const c of COURSE_CLUSTERS) if (clusterArticles(c).some((a) => a.slug === slug)) return c.course;
  return null;
}

/** Topics with no article yet, across all clusters. */
export const topicGaps = () =>
  COURSE_CLUSTERS.flatMap((c) => c.topics.filter((t) => t.gap).map((t) => ({ course: c.course, ...t })));
