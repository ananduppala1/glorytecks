// ─────────────────────────────────────────────────────────────────────────
// MIGRATION SOURCE — copied verbatim from the public GloryTecks website
// (src/data/...). Used by seed.ts to populate MongoDB. Do not edit here;
// the canonical data now lives in the database and is managed via the CMS.
// ─────────────────────────────────────────────────────────────────────────
// Blog authors. Avatars are rendered as branded initials (no external images),
// keeping the reading experience fast and on-brand.

export type Author = {
  id: string;
  name: string;
  role: string;
  bio: string;
  initials: string;
};

export const authors: Author[] = [
  {
    id: "glorytecks-team",
    name: "GloryTecks Team",
    role: "Training & Placement Faculty",
    bio: "The GloryTecks faculty team mentors learners across Data Science, AI and Data Engineering, with a focus on real-time projects and placement readiness in Hyderabad.",
    initials: "GT",
  },
  {
    id: "ravi-kumar",
    name: "Ravi Kumar",
    role: "Senior Data Scientist & Lead Trainer",
    bio: "Ravi has 10+ years building ML systems and has trained 2,000+ students. He leads the Data Science and Generative AI tracks at GloryTecks.",
    initials: "RK",
  },
  {
    id: "sneha-reddy",
    name: "Sneha Reddy",
    role: "Data Engineering Mentor",
    bio: "Sneha is a cloud data engineer specialising in Spark, Databricks and Azure/AWS pipelines, and mentors GloryTecks' Data Engineering cohorts.",
    initials: "SR",
  },
  {
    id: "arjun-nair",
    name: "Arjun Nair",
    role: "BI & Analytics Lead",
    bio: "Arjun has delivered 100+ enterprise dashboards in Power BI and Tableau and teaches analytics and visualization at GloryTecks.",
    initials: "AN",
  },
  {
    id: "priya-sharma",
    name: "Priya Sharma",
    role: "Career Coach & Placement Lead",
    bio: "Priya has helped 1,500+ freshers and career-switchers land data roles. She runs resume, LinkedIn and interview-prep workshops at GloryTecks.",
    initials: "PS",
  },
];

export const authorById = (id: string) => authors.find((a) => a.id === id) || authors[0];
