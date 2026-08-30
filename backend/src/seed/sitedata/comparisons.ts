// ─────────────────────────────────────────────────────────────────────────
// MIGRATION SOURCE — copied verbatim from the public GloryTecks website
// (src/data/...). Used by seed.ts to populate MongoDB. Do not edit here;
// the canonical data now lives in the database and is managed via the CMS.
// ─────────────────────────────────────────────────────────────────────────
// Comparison landing pages (consideration-intent SEO). Each compares two skills
// or tools and links to the relevant GloryTecks courses. Served under /compare/:slug
// to avoid collision with the top-level /:landingSlug location route.

export type Comparison = {
  slug: string;
  title: string;
  metaTitle: string;
  itemA: string;
  itemB: string;
  intro: string;
  rows: { factor: string; a: string; b: string }[];
  verdict: string;
  relatedCourses: { label: string; slug: string }[];
  faqs: [string, string][];
};

export const comparisons: Comparison[] = [
  {
    slug: "power-bi-vs-tableau",
    title: "Power BI vs Tableau: Which to Learn in Hyderabad (2026)",
    metaTitle: "Power BI vs Tableau 2026 | Which Is Better for Jobs in Hyderabad | GloryTecks",
    itemA: "Power BI",
    itemB: "Tableau",
    intro:
      "Power BI and Tableau are the two leading business-intelligence tools. For most freshers and job-seekers in Hyderabad, Power BI is the better first tool to learn — it is more affordable, integrates tightly with Excel and Azure, and appears in the majority of local job postings. Tableau remains excellent for advanced, design-heavy visualization roles.",
    rows: [
      { factor: "Cost", a: "Lower (Microsoft ecosystem)", b: "Higher licensing" },
      { factor: "Learning curve", a: "Easier for Excel users", b: "Slightly steeper" },
      { factor: "Visualization depth", a: "Strong", b: "Best-in-class" },
      { factor: "Data integration", a: "Excellent with Azure / SQL", b: "Excellent" },
      { factor: "Job demand in Hyderabad", a: "Very high", b: "High" },
    ],
    verdict:
      "Start with Power BI if your goal is to land a Data Analyst or BI Developer job in Hyderabad quickly, then add Tableau to become a versatile analyst.",
    relatedCourses: [
      { label: "Power BI Course in Hyderabad", slug: "power-bi" },
      { label: "Data Analytics Course in Hyderabad", slug: "data-analytics" },
    ],
    faqs: [
      ["Is Power BI easier than Tableau?", "For most beginners, yes — especially if you already use Excel. Power BI's interface and DAX feel familiar to spreadsheet users."],
      ["Which has more jobs in Hyderabad?", "Power BI appears in more Hyderabad job listings overall, while Tableau is common in larger enterprises and design-focused roles."],
    ],
  },
  {
    slug: "data-science-vs-data-analytics",
    title: "Data Science vs Data Analytics: Which Career to Choose",
    metaTitle: "Data Science vs Data Analytics 2026 | Career, Salary & Skills | GloryTecks Hyderabad",
    itemA: "Data Science",
    itemB: "Data Analytics",
    intro:
      "Data Analytics focuses on interpreting existing data to answer business questions, while Data Science builds predictive models and machine-learning systems. Analytics is faster to enter; Data Science is more technical and higher paid.",
    rows: [
      { factor: "Core focus", a: "Prediction & ML models", b: "Insights from existing data" },
      { factor: "Key skills", a: "Python, ML, statistics", b: "Excel, SQL, Power BI" },
      { factor: "Time to job-ready", a: "5–6 months", b: "3–4 months" },
      { factor: "Hyderabad fresher salary", a: "₹4–7 LPA", b: "₹3.5–6 LPA" },
      { factor: "Best for", a: "Strong maths/coding interest", b: "Faster entry into data roles" },
    ],
    verdict:
      "Choose Data Analytics for a faster entry into data roles, and Data Science if you enjoy maths and coding and want higher long-term earning potential. Many students start with analytics and progress to data science.",
    relatedCourses: [
      { label: "Data Science Course in Hyderabad", slug: "data-science" },
      { label: "Data Analytics Course in Hyderabad", slug: "data-analytics" },
    ],
    faqs: [
      ["Can I move from Data Analytics to Data Science?", "Yes. Analytics builds the SQL, Python and statistics base; adding machine learning and deep learning bridges into Data Science."],
      ["Which pays more in Hyderabad?", "Data Science roles generally pay more, but skilled analysts in senior BI roles also earn well."],
    ],
  },
  {
    slug: "data-science-vs-machine-learning",
    title: "Data Science vs Machine Learning: What's the Difference?",
    metaTitle: "Data Science vs Machine Learning | Differences, Skills & Careers | GloryTecks",
    itemA: "Data Science",
    itemB: "Machine Learning",
    intro:
      "Data Science is the broad field of extracting insight and value from data; Machine Learning is a subset focused specifically on algorithms that learn patterns to make predictions. Every ML engineer uses data science skills, but not every data scientist specializes in ML engineering.",
    rows: [
      { factor: "Scope", a: "Broad (data → decisions)", b: "Narrow (predictive algorithms)" },
      { factor: "Typical tasks", a: "EDA, visualization, modeling, storytelling", b: "Model building, tuning, deployment" },
      { factor: "Key tools", a: "Python, SQL, Power BI, ML", b: "Scikit-learn, TensorFlow, PyTorch" },
      { factor: "Role", a: "Data Scientist", b: "ML Engineer" },
    ],
    verdict:
      "Learn Data Science first for the broad foundation; specialize into Machine Learning engineering if you enjoy building and deploying models.",
    relatedCourses: [
      { label: "Data Science Course in Hyderabad", slug: "data-science" },
      { label: "MLOps Course in Hyderabad", slug: "mlops" },
    ],
    faqs: [
      ["Is machine learning part of data science?", "Yes — ML is one component of data science, alongside statistics, data engineering and visualization."],
    ],
  },
  {
    slug: "python-vs-r-for-data-science",
    title: "Python vs R for Data Science: Which Should You Learn?",
    metaTitle: "Python vs R for Data Science 2026 | Which Is Better | GloryTecks Hyderabad",
    itemA: "Python",
    itemB: "R",
    intro:
      "Python and R are both popular for data science. Python is the more versatile, in-demand choice in Hyderabad's job market — it covers data science, automation, web and production deployment — while R remains strong in academic statistics and research.",
    rows: [
      { factor: "Versatility", a: "Very high (general-purpose)", b: "Focused on statistics" },
      { factor: "Job demand in Hyderabad", a: "Very high", b: "Moderate" },
      { factor: "Learning curve", a: "Beginner-friendly", b: "Steeper for non-statisticians" },
      { factor: "Production / deployment", a: "Excellent", b: "Limited" },
      { factor: "Best for", a: "Most data & AI careers", b: "Academic / research stats" },
    ],
    verdict:
      "For almost every Hyderabad job-seeker, Python is the better choice. Learn R only if you are targeting research or specialized statistical roles.",
    relatedCourses: [
      { label: "Python Course in Hyderabad", slug: "python-programming" },
      { label: "Data Science Course in Hyderabad", slug: "data-science" },
    ],
    faqs: [
      ["Do I need both Python and R?", "No. Most professionals use Python. Learning R as well is optional and mainly useful in research-heavy roles."],
    ],
  },
  {
    slug: "data-analyst-vs-data-scientist",
    title: "Data Analyst vs Data Scientist: Roles, Skills & Salary",
    metaTitle: "Data Analyst vs Data Scientist | Roles, Skills, Salary in Hyderabad | GloryTecks",
    itemA: "Data Analyst",
    itemB: "Data Scientist",
    intro:
      "A Data Analyst interprets data to answer business questions using SQL, Excel and BI tools. A Data Scientist goes further, building machine-learning models and working with bigger, messier data. The analyst role is the more common entry point.",
    rows: [
      { factor: "Primary skills", a: "SQL, Excel, Power BI", b: "Python, ML, statistics" },
      { factor: "Coding depth", a: "Light to moderate", b: "Heavy" },
      { factor: "Hyderabad fresher salary", a: "₹3.5–6 LPA", b: "₹4–7 LPA" },
      { factor: "Entry difficulty", a: "Easier", b: "Harder" },
    ],
    verdict:
      "Start as a Data Analyst for a faster entry, then upskill into Data Science with Python and machine learning to increase your earning potential.",
    relatedCourses: [
      { label: "Data Analytics Course in Hyderabad", slug: "data-analytics" },
      { label: "Data Science Course in Hyderabad", slug: "data-science" },
    ],
    faqs: [
      ["Which role should a fresher target first?", "Data Analyst roles are usually easier to land first, then you can transition to Data Scientist."],
    ],
  },
  {
    slug: "generative-ai-vs-machine-learning",
    title: "Generative AI vs Machine Learning: Key Differences",
    metaTitle: "Generative AI vs Machine Learning 2026 | Differences & Careers | GloryTecks",
    itemA: "Generative AI",
    itemB: "Traditional ML",
    intro:
      "Traditional Machine Learning predicts or classifies based on patterns in data. Generative AI creates new content — text, code, images — using large language models. Generative AI is the fastest-growing AI specialization in Hyderabad.",
    rows: [
      { factor: "Output", a: "New content (text, code, images)", b: "Predictions / classifications" },
      { factor: "Core tech", a: "LLMs, transformers, RAG", b: "Regression, trees, neural nets" },
      { factor: "Hyderabad demand", a: "Surging", b: "Steady & strong" },
      { factor: "Fresher salary", a: "₹6–10 LPA", b: "₹4–7 LPA" },
    ],
    verdict:
      "Build a solid machine-learning and Python foundation first, then specialize in Generative AI to access the highest-growth AI roles.",
    relatedCourses: [
      { label: "Generative AI Course in Hyderabad", slug: "gen-ai" },
      { label: "Data Science Course in Hyderabad", slug: "data-science" },
    ],
    faqs: [
      ["Do I need machine learning before Generative AI?", "Basic ML and Python help a lot. They make concepts like embeddings, fine-tuning and evaluation much easier to grasp."],
    ],
  },
  {
    slug: "mlops-vs-devops",
    title: "MLOps vs DevOps: How They Differ",
    metaTitle: "MLOps vs DevOps 2026 | Differences, Skills & Careers | GloryTecks Hyderabad",
    itemA: "MLOps",
    itemB: "DevOps",
    intro:
      "DevOps automates building, testing and deploying software. MLOps applies the same discipline to machine-learning systems, adding data versioning, model monitoring and retraining. MLOps engineers need ML knowledge that DevOps roles do not.",
    rows: [
      { factor: "Focus", a: "ML model lifecycle", b: "Software delivery lifecycle" },
      { factor: "Extra concerns", a: "Data/model drift, retraining", b: "Infra, CI/CD, releases" },
      { factor: "Shared tools", a: "Docker, Kubernetes, CI/CD", b: "Docker, Kubernetes, CI/CD" },
      { factor: "Fresher salary (Hyderabad)", a: "₹6–10 LPA", b: "₹4–8 LPA" },
    ],
    verdict:
      "If you enjoy infrastructure and want to work with AI teams, MLOps offers higher pay and strong growth — but expect to learn ML fundamentals alongside DevOps skills.",
    relatedCourses: [
      { label: "MLOps Course in Hyderabad", slug: "mlops" },
      { label: "Data Science Course in Hyderabad", slug: "data-science" },
    ],
    faqs: [
      ["Can a DevOps engineer move into MLOps?", "Yes. DevOps skills transfer directly; adding ML and model-monitoring knowledge completes the move."],
    ],
  },
  {
    slug: "sql-vs-nosql",
    title: "SQL vs NoSQL: Which Database to Learn",
    metaTitle: "SQL vs NoSQL 2026 | Differences & Which to Learn | GloryTecks Hyderabad",
    itemA: "SQL",
    itemB: "NoSQL",
    intro:
      "SQL databases store structured data in tables with fixed schemas and are essential for almost every data role. NoSQL databases handle flexible, large-scale or unstructured data. For data analysts and data scientists in Hyderabad, SQL comes first.",
    rows: [
      { factor: "Data structure", a: "Structured (tables)", b: "Flexible (documents, key-value)" },
      { factor: "Schema", a: "Fixed", b: "Dynamic" },
      { factor: "Best for", a: "Analytics, reporting, joins", b: "Scale, unstructured data" },
      { factor: "Priority for data roles", a: "Learn first", b: "Learn later" },
    ],
    verdict:
      "Master SQL first — it is required for nearly every data analyst, data scientist and data engineer job. Add NoSQL later if you move into big-data or backend engineering.",
    relatedCourses: [
      { label: "Data Analytics Course in Hyderabad", slug: "data-analytics" },
      { label: "Data Engineering Course in Hyderabad", slug: "data-engineering" },
    ],
    faqs: [
      ["Is SQL still relevant in 2026?", "Absolutely. SQL is the most-tested data skill in Hyderabad interviews and underpins analytics and data engineering."],
    ],
  },
  {
    slug: "power-bi-vs-excel",
    title: "Power BI vs Excel: When to Upgrade Your Analytics",
    metaTitle: "Power BI vs Excel 2026 | Which for Data Analytics | GloryTecks Hyderabad",
    itemA: "Power BI",
    itemB: "Excel",
    intro:
      "Excel is perfect for small datasets and quick calculations. Power BI is built for interactive dashboards, larger data and automated refresh. Most Hyderabad analytics jobs now expect Power BI on top of strong Excel skills.",
    rows: [
      { factor: "Data volume", a: "Large / refreshable", b: "Small to medium" },
      { factor: "Dashboards", a: "Interactive & shareable", b: "Static" },
      { factor: "Automation", a: "Scheduled refresh", b: "Manual" },
      { factor: "Job expectation", a: "Increasingly required", b: "Baseline skill" },
    ],
    verdict:
      "Keep your Excel skills sharp, but learn Power BI to meet what most Hyderabad data analyst roles now require.",
    relatedCourses: [
      { label: "Power BI Course in Hyderabad", slug: "power-bi" },
      { label: "Data Analytics Course in Hyderabad", slug: "data-analytics" },
    ],
    faqs: [
      ["Does Power BI replace Excel?", "No — they complement each other. Excel is great for ad-hoc analysis; Power BI is better for dashboards and large, refreshable data."],
    ],
  },
  {
    slug: "data-engineering-vs-data-science",
    title: "Data Engineering vs Data Science: Which Path Fits You?",
    metaTitle: "Data Engineering vs Data Science 2026 | Roles & Salary | GloryTecks Hyderabad",
    itemA: "Data Engineering",
    itemB: "Data Science",
    intro:
      "Data Engineers build the pipelines and infrastructure that deliver clean, reliable data. Data Scientists use that data to model and predict. Engineering is more software-focused; science is more statistics and ML-focused.",
    rows: [
      { factor: "Focus", a: "Pipelines & infrastructure", b: "Modeling & prediction" },
      { factor: "Key skills", a: "SQL, Python, Spark, cloud", b: "Python, ML, statistics" },
      { factor: "Hyderabad fresher salary", a: "₹5–9 LPA", b: "₹4–7 LPA" },
      { factor: "Best for", a: "Software/systems mindset", b: "Maths/analysis mindset" },
    ],
    verdict:
      "Choose Data Engineering if you prefer building robust systems and pipelines; choose Data Science if you prefer analysis, statistics and modeling.",
    relatedCourses: [
      { label: "Data Engineering Course in Hyderabad", slug: "data-engineering" },
      { label: "Data Science Course in Hyderabad", slug: "data-science" },
    ],
    faqs: [
      ["Which is in higher demand in Hyderabad?", "Both are in strong demand. Data engineering has grown rapidly as companies invest in modern data platforms."],
    ],
  },
];

export const findComparison = (slug: string) => comparisons.find((c) => c.slug === slug);
