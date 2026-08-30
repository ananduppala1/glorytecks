// ─────────────────────────────────────────────────────────────────────────
// MIGRATION SOURCE — data extracted from the website's Home.tsx / Placements.tsx
// (these were hardcoded in the components). Now seeded into MongoDB and managed
// through the CMS.
// ─────────────────────────────────────────────────────────────────────────

export const trainersData = [
  { name: 'Rajesh Kumar', title: 'Lead Data Science Trainer', experience: '12 Years', company: 'Ex-Amazon', skills: ['Python', 'ML', 'Deep Learning'] },
  { name: 'Priya Sharma', title: 'Gen AI & LLM Expert', experience: '9 Years', company: 'Ex-Microsoft', skills: ['LangChain', 'RAG', 'GPT'] },
  { name: 'Arun Reddy', title: 'Data Analytics Trainer', experience: '11 Years', company: 'Ex-Deloitte', skills: ['Power BI', 'SQL', 'Tableau'] },
];

export const testimonialsData = [
  { name: 'Pavan S.', role: 'Data Scientist @ Fintech MNC', salary: '₹18 LPA', stars: 5, quote: 'GloryTecks completely transformed my career. The project-based curriculum and real industry mentors gave me confidence to crack top-company interviews within 3 months.' },
  { name: 'Sreedevi K.', role: 'Gen AI Developer @ AI Startup', salary: '₹22 LPA', stars: 5, quote: 'The Generative AI course was phenomenal. RAG, LangChain, vector databases — all taught with hands-on projects. Got placed at an AI startup with a 22 LPA package!' },
  { name: 'Abiram R.', role: 'Cloud Engineer @ Global MNC', salary: '₹15 LPA', stars: 5, quote: 'Hands-on AWS labs, Docker, Kubernetes — everything was real-world focused. The placement team arranged 8 interviews and I landed an offer within the first week.' },
  { name: 'Krishna M.', role: 'Data Analyst @ E-commerce Giant', salary: '₹12 LPA', stars: 5, quote: 'From zero Excel skills to a Data Analyst job in 4 months — GloryTecks made it possible. The Power BI and SQL training was top-notch.' },
  { name: 'Bhavana P.', role: 'MLOps Engineer @ Tier-1 IT', salary: '₹19 LPA', stars: 5, quote: 'MLOps was exactly what companies wanted but nobody else was teaching. GloryTecks prepared me for exactly the right skills — Docker, Kubernetes, MLflow, CI/CD.' },
  { name: 'Ravi T.', role: 'Python Developer @ Product Startup', salary: '₹14 LPA', stars: 5, quote: 'The trainers are genuinely working professionals. They bring real problems to class. After completing the Python course, I had a portfolio that impressed every interviewer.' },
];

export const companiesData = [
  'Google', 'Amazon', 'Microsoft', 'Infosys', 'TCS', 'Wipro',
  'Accenture', 'IBM', 'Oracle', 'Deloitte', 'Cognizant', 'HCL',
  'Capgemini', 'Tech Mahindra', 'Adobe', 'Salesforce', 'ServiceNow', 'SAP',
  'Flipkart', 'Zomato',
];

export const placementStoriesData = [
  { name: 'Priya S.', role: 'Data Scientist', company: 'Fintech MNC', packageLpa: '18 LPA', previousPackage: '3.5 LPA', course: 'Data Science', stars: 5 },
  { name: 'Arjun M.', role: 'Gen AI Developer', company: 'AI Startup', packageLpa: '22 LPA', previousPackage: '6 LPA', course: 'Gen AI', stars: 5 },
  { name: 'Neha R.', role: 'Cloud Engineer', company: 'Tier-1 IT', packageLpa: '12 LPA', previousPackage: '4 LPA', course: 'MLOps', stars: 5 },
  { name: 'Karthik V.', role: 'MLOps Engineer', company: 'Global Bank', packageLpa: '19 LPA', previousPackage: '5 LPA', course: 'MLOps', stars: 5 },
  { name: 'Sneha K.', role: 'Data Analyst', company: 'E-commerce Giant', packageLpa: '10 LPA', previousPackage: '0 LPA', course: 'Data Analytics', stars: 5 },
  { name: 'Rahul P.', role: 'Python Developer', company: 'Product Startup', packageLpa: '14 LPA', previousPackage: '2 LPA', course: 'Python', stars: 5 },
];

export const roadmapsData = [
  { course: 'Data Science', steps: ['Python & Statistics', 'ML Algorithms', 'Deep Learning', 'NLP & Gen AI', 'Projects & Placement'], color: 'from-blue-500/20 to-blue-600/5' },
  { course: 'Generative AI', steps: ['Python Basics', 'LLM Fundamentals', 'Prompt Engineering', 'RAG & Agents', 'Deployment'], color: 'from-purple-500/20 to-purple-600/5' },
  { course: 'Agentic AI', steps: ['Python & LLMs', 'Agent Frameworks', 'Tool Use & Memory', 'Multi-Agent Systems', 'Production Deploy'], color: 'from-pink-500/20 to-pink-600/5' },
  { course: 'Data Analytics', steps: ['Excel & SQL', 'Power BI', 'Python Basics', 'Dashboards', 'Placement Ready'], color: 'from-green-500/20 to-green-600/5' },
  { course: 'Data Engineering', steps: ['SQL & Python', 'ETL Pipelines', 'Apache Spark', 'Cloud (AWS/Azure)', 'Projects & Placement'], color: 'from-orange-500/20 to-orange-600/5' },
  { course: 'MLOps', steps: ['ML Basics', 'Docker & Kubernetes', 'CI/CD for ML', 'MLflow & Monitoring', 'Cloud Deployment'], color: 'from-cyan-500/20 to-cyan-600/5' },
  { course: 'Power BI', steps: ['Excel Basics', 'Data Modeling', 'DAX Formulas', 'Reports & Dashboards', 'Placement Ready'], color: 'from-yellow-500/20 to-yellow-600/5' },
  { course: 'SQL Server', steps: ['SQL Basics', 'Joins & Subqueries', 'Stored Procedures', 'Performance Tuning', 'Projects & Placement'], color: 'from-red-500/20 to-red-600/5' },
  { course: 'Python Programming', steps: ['Python Basics', 'OOP Concepts', 'Libraries (NumPy/Pandas)', 'Web Scraping & APIs', 'Projects & Placement'], color: 'from-teal-500/20 to-teal-600/5' },
];

export const faqsData = [
  { question: 'Who can join GloryTecks courses?', answer: 'Anyone from freshers to working professionals can join. We have batches designed for beginners, career switchers, and experienced professionals looking to upskill.' },
  { question: 'Do you provide placement assistance?', answer: 'Yes — 100% placement assistance. We have dedicated placement coordinators, conduct mock interviews, arrange company drives, and have 500+ hiring partners across India.' },
  { question: 'Are classes online or offline?', answer: 'Both! We offer live online classes via Zoom/Google Meet and in-person training at our Ameerpet, Hyderabad center. Recorded sessions are provided for all students.' },
  { question: 'What is the duration of the courses?', answer: 'Course durations range from 3 months (SQL Server, Power BI) to 6 months (Data Science). Flexible weekend and weekday batches are available.' },
  { question: 'Do I get a certificate after completion?', answer: 'Yes. You receive an industry-recognized GloryTecks completion certificate plus assistance in getting certifications from AWS, Google, Microsoft, and other platforms.' },
  { question: 'How much does it cost?', answer: 'Fee varies by course. We offer flexible EMI options starting from ₹1999/month, scholarship programs for deserving students, and corporate group discounts.' },
];

export const batchesData = [
  { course: 'Data Science', startDate: 'Jun 10, 2026', mode: 'Online', seats: 3 },
  { course: 'Generative AI', startDate: 'Jun 12, 2026', mode: 'Hybrid', seats: 5 },
  { course: 'Agentic AI', startDate: 'Jun 13, 2026', mode: 'Online', seats: 4 },
  { course: 'Data Analytics', startDate: 'Jun 15, 2026', mode: 'Online', seats: 8 },
  { course: 'Data Engineering', startDate: 'Jun 16, 2026', mode: 'Hybrid', seats: 6 },
  { course: 'MLOps', startDate: 'Jun 17, 2026', mode: 'Online', seats: 5 },
  { course: 'Power BI', startDate: 'Jun 18, 2026', mode: 'Offline', seats: 7 },
  { course: 'SQL Server', startDate: 'Jun 20, 2026', mode: 'Online', seats: 9 },
  { course: 'Python Programming', startDate: 'Jun 22, 2026', mode: 'Hybrid', seats: 6 },
];

export const settingsData = {
  siteName: 'GloryTecks',
  tagline: "Hyderabad's #1 IT Training Institute",
  phone: '+91 9908099980',
  whatsapp: '919908099980',
  email: 'gloryteckss@gmail.com',
  address: '603, Annapurna Block, Aditya Enclave, Ameerpet, Hyderabad – 500038, Telangana, India',
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=61589860342695',
    instagram: 'https://www.instagram.com/glorytecks/',
    linkedin: 'https://www.linkedin.com/company/glorytecks/',
    youtube: 'https://www.youtube.com/@glorytecks',
    twitter: '',
  },
  stats: {
    studentsTrained: '3000+',
    placementRate: '95%',
    hiringPartners: '500+',
    coursesOffered: '12+',
  },
};
