// ─────────────────────────────────────────────────────────────────────────
// MIGRATION SOURCE — copied verbatim from the public GloryTecks website
// (src/data/...). Used by seed.ts to populate MongoDB. Do not edit here;
// the canonical data now lives in the database and is managed via the CMS.
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Blog category knowledge base.
//
// Each category carries a small, accurate "domain knowledge" record (tools,
// roles, Hyderabad salary bands, core skills, certifications, prerequisites and
// a recommended course slug). The content engine in ./content.ts uses these to
// produce topic-aware, factually-grounded articles instead of generic filler.
// ─────────────────────────────────────────────────────────────────────────────

export type CategoryKnowledge = {
  slug: string;
  name: string;
  short: string;            // short label for chips
  description: string;      // listing/category page description
  color: string;            // hsl triplet used by the SVG cover generator
  icon: string;             // lucide-react icon name
  courseSlug: string;       // recommended GloryTecks course
  courseTitle: string;
  tools: string[];
  roles: string[];
  skills: string[];
  certifications: string[];
  prerequisites: string[];
  salary: { fresher: string; mid: string; senior: string };
  blurb: string;            // one-line intro the engine can weave in
};

export const categories: CategoryKnowledge[] = [
  {
    slug: "data-science",
    name: "Data Science",
    short: "Data Science",
    description:
      "Roadmaps, salaries, projects and interview prep for aspiring data scientists — from statistics and machine learning to model deployment.",
    color: "145 80% 55%",
    icon: "Brain",
    courseSlug: "data-science",
    courseTitle: "Data Science",
    tools: ["Python", "Pandas", "NumPy", "Scikit-learn", "TensorFlow", "PyTorch", "SQL", "Jupyter", "Matplotlib", "Seaborn"],
    roles: ["Data Scientist", "Machine Learning Engineer", "Applied Scientist", "Research Engineer", "AI Engineer"],
    skills: ["Statistics & probability", "Machine learning", "Python programming", "SQL & data wrangling", "Data visualization", "Model evaluation"],
    certifications: ["Microsoft Azure Data Scientist Associate (DP-100)", "Google Professional ML Engineer", "AWS Certified Machine Learning"],
    prerequisites: ["Basic mathematics", "Logical thinking", "Curiosity about data"],
    salary: { fresher: "₹5–9 LPA", mid: "₹12–22 LPA", senior: "₹25–45 LPA" },
    blurb: "Data science blends statistics, programming and business sense to turn raw data into decisions.",
  },
  {
    slug: "generative-ai",
    name: "Generative AI",
    short: "Gen AI",
    description:
      "Practical guides to LLMs, RAG, agents, prompt engineering and the modern Gen AI stack used in production today.",
    color: "270 80% 65%",
    icon: "Sparkles",
    courseSlug: "gen-ai",
    courseTitle: "Generative AI",
    tools: ["LangChain", "LangGraph", "OpenAI API", "Hugging Face", "Pinecone", "ChromaDB", "FAISS", "LlamaIndex", "Ollama", "vLLM"],
    roles: ["Gen AI Engineer", "LLM Engineer", "AI Application Developer", "Prompt Engineer", "AI Solutions Architect"],
    skills: ["LLM fundamentals", "Prompt engineering", "RAG pipelines", "Vector databases", "Agent orchestration", "Evaluation & guardrails"],
    certifications: ["Microsoft Azure AI Engineer (AI-102)", "NVIDIA Generative AI", "Google Cloud Generative AI"],
    prerequisites: ["Python basics", "API familiarity", "Comfort with the command line"],
    salary: { fresher: "₹6–11 LPA", mid: "₹15–28 LPA", senior: "₹30–55 LPA" },
    blurb: "Generative AI lets applications reason over private data, call tools and produce content on demand.",
  },
  {
    slug: "python",
    name: "Python",
    short: "Python",
    description:
      "Learn Python the right way — syntax, data structures, OOP, libraries, APIs and project ideas that build a hire-ready portfolio.",
    color: "210 90% 60%",
    icon: "Code2",
    courseSlug: "python-programming",
    courseTitle: "Python Programming",
    tools: ["Python", "Pandas", "NumPy", "FastAPI", "Flask", "Requests", "Pytest", "Poetry", "Jupyter", "VS Code"],
    roles: ["Python Developer", "Backend Engineer", "Automation Engineer", "Data Engineer", "SDET"],
    skills: ["Core syntax", "Data structures", "OOP", "File & error handling", "APIs & web", "Testing & packaging"],
    certifications: ["PCEP – Certified Entry-Level Python Programmer", "PCAP – Certified Associate in Python", "Microsoft Python certification"],
    prerequisites: ["No prior coding required", "Basic computer literacy"],
    salary: { fresher: "₹3.5–6 LPA", mid: "₹8–16 LPA", senior: "₹18–32 LPA" },
    blurb: "Python is the most in-demand first language for data, AI, automation and backend roles.",
  },
  {
    slug: "data-analytics",
    name: "Data Analytics",
    short: "Analytics",
    description:
      "From Excel to dashboards — roadmaps, tool comparisons, data cleaning, KPIs and business analytics for the modern data analyst.",
    color: "32 95% 58%",
    icon: "BarChart3",
    courseSlug: "data-analytics",
    courseTitle: "Data Analytics",
    tools: ["Excel", "SQL", "Power BI", "Tableau", "Python", "Google Sheets", "Looker Studio", "DAX", "Power Query"],
    roles: ["Data Analyst", "Business Analyst", "BI Analyst", "Product Analyst", "Reporting Analyst"],
    skills: ["Excel & spreadsheets", "SQL querying", "Data cleaning", "Dashboard design", "Storytelling with data", "Basic statistics"],
    certifications: ["Microsoft Power BI Data Analyst (PL-300)", "Google Data Analytics Certificate", "Tableau Desktop Specialist"],
    prerequisites: ["Comfort with numbers", "Basic Excel", "Attention to detail"],
    salary: { fresher: "₹3.5–7 LPA", mid: "₹8–15 LPA", senior: "₹16–28 LPA" },
    blurb: "Data analytics turns messy spreadsheets and tables into dashboards that drive business decisions.",
  },
  {
    slug: "power-bi",
    name: "Power BI",
    short: "Power BI",
    description:
      "Master Power BI — DAX, Power Query, data modeling, dashboard design, deployment and the interview questions employers ask.",
    color: "48 100% 55%",
    icon: "PieChart",
    courseSlug: "power-bi",
    courseTitle: "Power BI",
    tools: ["Power BI Desktop", "DAX", "Power Query (M)", "Power BI Service", "SQL", "Excel", "Dataflows", "Azure"],
    roles: ["Power BI Developer", "BI Developer", "Data Analyst", "Reporting Specialist", "Analytics Consultant"],
    skills: ["Data modeling", "DAX measures", "Power Query (ETL)", "Visualization design", "Row-level security", "Report publishing"],
    certifications: ["Microsoft Power BI Data Analyst (PL-300)", "Microsoft Fabric Analytics Engineer (DP-600)"],
    prerequisites: ["Basic Excel", "Some SQL helps", "Eye for layout"],
    salary: { fresher: "₹3.5–6.5 LPA", mid: "₹8–14 LPA", senior: "₹15–26 LPA" },
    blurb: "Power BI is Microsoft's leading BI tool — and one of the fastest skills to convert into a job.",
  },
  {
    slug: "mlops",
    name: "MLOps",
    short: "MLOps",
    description:
      "Operationalise machine learning — MLflow, Docker, Kubernetes, CI/CD, monitoring and production ML system design.",
    color: "190 85% 50%",
    icon: "Workflow",
    courseSlug: "mlops",
    courseTitle: "MLOps",
    tools: ["MLflow", "Docker", "Kubernetes", "GitHub Actions", "Airflow", "Kubeflow", "DVC", "Prometheus", "Grafana", "FastAPI"],
    roles: ["MLOps Engineer", "ML Platform Engineer", "ML Infrastructure Engineer", "DevOps for ML", "Production ML Engineer"],
    skills: ["ML lifecycle", "Containers & orchestration", "CI/CD pipelines", "Experiment tracking", "Model monitoring", "Cloud deployment"],
    certifications: ["AWS Certified Machine Learning", "Google Professional ML Engineer", "Certified Kubernetes Administrator (CKA)"],
    prerequisites: ["Python", "Basic ML", "Comfort with Linux & Git"],
    salary: { fresher: "₹6–10 LPA", mid: "₹14–24 LPA", senior: "₹26–48 LPA" },
    blurb: "MLOps brings DevOps discipline to machine learning so models ship, scale and stay reliable.",
  },
  {
    slug: "data-engineering",
    name: "Data Engineering",
    short: "Data Eng",
    description:
      "Build the data backbone — ETL/ELT, warehouses, lakes, Spark, Kafka, Airflow, Databricks and the medallion architecture.",
    color: "12 85% 58%",
    icon: "Database",
    courseSlug: "data-engineering",
    courseTitle: "Data Engineering",
    tools: ["Apache Spark", "PySpark", "Airflow", "Kafka", "Snowflake", "Databricks", "dbt", "SQL", "Python", "Delta Lake"],
    roles: ["Data Engineer", "Big Data Engineer", "Analytics Engineer", "Platform Engineer", "ETL Developer"],
    skills: ["SQL & modeling", "Python", "Distributed processing", "Pipeline orchestration", "Streaming", "Cloud warehousing"],
    certifications: ["Databricks Certified Data Engineer Associate", "Google Professional Data Engineer", "Azure Data Engineer Associate (DP-203)"],
    prerequisites: ["SQL", "Python basics", "Understanding of databases"],
    salary: { fresher: "₹5–9 LPA", mid: "₹12–22 LPA", senior: "₹25–45 LPA" },
    blurb: "Data engineers build the pipelines and warehouses every analytics and ML team depends on.",
  },
  {
    slug: "gcp",
    name: "GCP",
    short: "GCP",
    description:
      "Google Cloud for data — BigQuery, Dataflow, Pub/Sub, Vertex AI, Cloud Storage and the Professional Data Engineer path.",
    color: "220 90% 62%",
    icon: "Cloud",
    courseSlug: "data-engineering",
    courseTitle: "Data Engineering",
    tools: ["BigQuery", "Dataflow", "Pub/Sub", "Cloud Storage", "Vertex AI", "Dataproc", "Cloud Composer", "Looker", "Cloud Functions"],
    roles: ["GCP Data Engineer", "Cloud Engineer", "Analytics Engineer", "ML Engineer (GCP)", "Cloud Architect"],
    skills: ["BigQuery SQL", "Streaming pipelines", "Serverless data", "IAM & security", "Cost optimization", "Vertex AI"],
    certifications: ["Google Professional Data Engineer", "Google Associate Cloud Engineer", "Google Professional ML Engineer"],
    prerequisites: ["SQL", "Cloud basics", "Python helps"],
    salary: { fresher: "₹6–10 LPA", mid: "₹14–24 LPA", senior: "₹26–48 LPA" },
    blurb: "Google Cloud's data stack — led by BigQuery — powers analytics at companies of every size.",
  },
  {
    slug: "azure-data-factory",
    name: "Azure Data Factory",
    short: "ADF",
    description:
      "Azure Data Factory end to end — pipelines, linked services, triggers, copy activity, mapping data flows and Synapse.",
    color: "205 95% 55%",
    icon: "GitBranch",
    courseSlug: "data-engineering",
    courseTitle: "Data Engineering",
    tools: ["Azure Data Factory", "Azure Synapse", "Azure Data Lake", "Databricks", "Azure SQL", "Logic Apps", "Key Vault", "DevOps"],
    roles: ["Azure Data Engineer", "ADF Developer", "ETL Developer", "Cloud Data Engineer", "Analytics Engineer"],
    skills: ["Pipeline design", "Linked services", "Mapping data flows", "Triggers & scheduling", "Integration runtimes", "CI/CD for ADF"],
    certifications: ["Azure Data Engineer Associate (DP-203)", "Azure Fundamentals (AZ-900)", "Microsoft Fabric (DP-600)"],
    prerequisites: ["SQL", "Azure basics", "Understanding of ETL"],
    salary: { fresher: "₹5–9 LPA", mid: "₹12–22 LPA", senior: "₹24–42 LPA" },
    blurb: "Azure Data Factory is Microsoft's cloud ETL service for orchestrating data movement at scale.",
  },
  {
    slug: "aws",
    name: "AWS",
    short: "AWS",
    description:
      "AWS for data engineers — S3, EC2, Lambda, Glue, Redshift, Athena, EMR and the certification roadmap that gets you hired.",
    color: "28 90% 55%",
    icon: "Server",
    courseSlug: "data-engineering",
    courseTitle: "Data Engineering",
    tools: ["Amazon S3", "AWS Glue", "Amazon Redshift", "Amazon Athena", "AWS Lambda", "Amazon EMR", "Kinesis", "EC2", "Step Functions"],
    roles: ["AWS Data Engineer", "Cloud Engineer", "Big Data Engineer", "Solutions Architect", "DevOps Engineer"],
    skills: ["S3 & storage", "Serverless ETL (Glue)", "Warehousing (Redshift)", "Querying (Athena)", "Streaming (Kinesis)", "IAM & security"],
    certifications: ["AWS Certified Data Engineer Associate", "AWS Solutions Architect Associate", "AWS Certified Cloud Practitioner"],
    prerequisites: ["SQL", "Python basics", "Cloud fundamentals"],
    salary: { fresher: "₹6–10 LPA", mid: "₹14–25 LPA", senior: "₹28–50 LPA" },
    blurb: "AWS is the most widely-adopted cloud — and its data services are a reliable path to a high-paying role.",
  },
  {
    slug: "career-guidance",
    name: "Career Guidance",
    short: "Career",
    description:
      "Resumes, LinkedIn, portfolios, salary negotiation, career switches and freelancing — the non-technical skills that get you hired.",
    color: "150 60% 50%",
    icon: "Compass",
    courseSlug: "data-science",
    courseTitle: "Data Science",
    tools: ["LinkedIn", "GitHub", "Notion", "Canva", "Naukri", "Resume builders", "Portfolio sites"],
    roles: ["Data Analyst", "Data Scientist", "Data Engineer", "BI Developer", "ML Engineer"],
    skills: ["Resume writing", "Personal branding", "Networking", "Interview communication", "Salary negotiation", "Portfolio building"],
    certifications: ["Any role-aligned certification strengthens your profile"],
    prerequisites: ["Willingness to put yourself out there", "Consistency"],
    salary: { fresher: "₹3.5–7 LPA", mid: "₹9–18 LPA", senior: "₹20–40 LPA" },
    blurb: "Skills get you the interview; communication, positioning and a strong portfolio get you the offer.",
  },
  {
    slug: "interview-questions",
    name: "Interview Questions",
    short: "Interviews",
    description:
      "Curated interview question banks with answers — SQL, Python, data science, Spark, Power BI, AWS, ADF and more.",
    color: "0 75% 60%",
    icon: "MessageSquareQuote",
    courseSlug: "data-science",
    courseTitle: "Data Science",
    tools: ["SQL", "Python", "Power BI", "Spark", "AWS", "Azure", "Pandas", "Scikit-learn"],
    roles: ["Data Analyst", "Data Scientist", "Data Engineer", "BI Developer", "ML Engineer"],
    skills: ["Problem solving", "Clear communication", "Fundamentals depth", "Project storytelling", "Whiteboarding"],
    certifications: ["Role-specific certifications help pass screening"],
    prerequisites: ["Solid fundamentals", "Hands-on projects", "Mock practice"],
    salary: { fresher: "₹3.5–9 LPA", mid: "₹10–22 LPA", senior: "₹24–48 LPA" },
    blurb: "Interview success is pattern recognition — practise the questions companies actually ask, out loud.",
  },
];

export const categoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);
export const categoryByName = (name: string) => categories.find((c) => c.name === name);
export const categoryNames = categories.map((c) => c.name);
export const categorySlugs = categories.map((c) => c.slug);
