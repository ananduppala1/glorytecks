// ─────────────────────────────────────────────────────────────────────────
// MIGRATION SOURCE — copied verbatim from the public GloryTecks website
// (src/data/...). Used by seed.ts to populate MongoDB. Do not edit here;
// the canonical data now lives in the database and is managed via the CMS.
// ─────────────────────────────────────────────────────────────────────────
// Local SEO data: target localities with genuinely distinct context, plus
// per-course career/salary info and the curated list of location landing pages.
// Keeping each locality's context unique avoids thin "doorway page" duplication.

export type Locality = {
  slug: string;
  name: string;
  intro: string;
  context: string;
  nearby: string;
};

export const localities: Record<string, Locality> = {
  ameerpet: {
    slug: "ameerpet",
    name: "Ameerpet",
    intro:
      "Ameerpet is the established hub for IT training in Hyderabad, and GloryTecks' centre sits at 603, Annapurna Block, Aditya Enclave — a short walk from Ameerpet Metro Station.",
    context:
      "Being in the heart of Ameerpet means classroom batches, weekend sessions and one-on-one doubt-clearing are all easily accessible by metro and bus from across the city.",
    nearby: "Ameerpet Metro, SR Nagar, Punjagutta, Sanjeeva Reddy Nagar and Begumpet",
  },
  kukatpally: {
    slug: "kukatpally",
    name: "Kukatpally (KPHB)",
    intro:
      "Kukatpally and KPHB are home to a large student and young-professional population, with strong demand for Data Science and analytics skills.",
    context:
      "GloryTecks serves Kukatpally learners with live online batches and easy metro access to the Ameerpet centre via the Red Line, plus weekend classroom options.",
    nearby: "KPHB, Miyapur, Nizampet, Moosapet and JNTU Hyderabad",
  },
  madhapur: {
    slug: "madhapur",
    name: "Madhapur",
    intro:
      "Madhapur, next to HITEC City, is one of Hyderabad's busiest tech employment zones — ideal for working professionals upskilling into AI and Data Science.",
    context:
      "Professionals working in and around Madhapur choose GloryTecks for evening and weekend batches and live online classes that fit around office hours.",
    nearby: "HITEC City, Image Gardens, Ayyappa Society and Kondapur",
  },
  gachibowli: {
    slug: "gachibowli",
    name: "Gachibowli",
    intro:
      "Gachibowli is a major financial and IT district with global capability centres (GCCs) actively hiring data and AI talent.",
    context:
      "GloryTecks helps Gachibowli professionals and students build job-ready Data Science, Python and Power BI skills through flexible online and weekend formats.",
    nearby: "Financial District, Nanakramguda, Kondapur and the University of Hyderabad",
  },
  "hitech-city": {
    slug: "hitech-city",
    name: "HITEC City",
    intro:
      "HITEC City is Hyderabad's flagship IT corridor, packed with product companies and startups that hire Data Scientists, ML Engineers and analysts.",
    context:
      "GloryTecks equips HITEC City professionals with practical, project-based training in Data Science, Generative AI and Power BI, available online and at the Ameerpet centre.",
    nearby: "Madhapur, Cyber Towers, Mindspace and Raidurg Metro",
  },
  dilsukhnagar: {
    slug: "dilsukhnagar",
    name: "Dilsukhnagar",
    intro:
      "Dilsukhnagar is a key education and commercial hub in the eastern part of Hyderabad with a large base of students and freshers.",
    context:
      "Students and freshers from Dilsukhnagar join GloryTecks for affordable, placement-focused Data Science, Python and analytics training via live online and weekend batches.",
    nearby: "Kothapet, LB Nagar, Malakpet and Chaitanyapuri",
  },
};

// Per-course career outcomes + Hyderabad salary ranges (E-E-A-T / decision content).
export const careerInfo: Record<
  string,
  { roles: string[]; fresher: string; mid: string; senior: string }
> = {
  "data-science": {
    roles: ["Data Scientist", "Machine Learning Engineer", "Data Analyst", "AI Engineer"],
    fresher: "₹4–7 LPA",
    mid: "₹10–18 LPA",
    senior: "₹20–40+ LPA",
  },
  "data-analytics": {
    roles: ["Data Analyst", "Business Analyst", "BI Analyst", "Reporting Analyst"],
    fresher: "₹3.5–6 LPA",
    mid: "₹7–14 LPA",
    senior: "₹15–25 LPA",
  },
  "power-bi": {
    roles: ["Power BI Developer", "BI Analyst", "Data Visualization Specialist"],
    fresher: "₹3.5–6 LPA",
    mid: "₹7–13 LPA",
    senior: "₹14–22 LPA",
  },
  "python-programming": {
    roles: ["Python Developer", "Automation Engineer", "Data Analyst", "Backend Developer"],
    fresher: "₹3.5–6 LPA",
    mid: "₹8–15 LPA",
    senior: "₹16–28 LPA",
  },
  "gen-ai": {
    roles: ["Generative AI Engineer", "Prompt Engineer", "LLM Application Developer", "AI Engineer"],
    fresher: "₹6–10 LPA",
    mid: "₹14–25 LPA",
    senior: "₹28–50+ LPA",
  },
  mlops: {
    roles: ["MLOps Engineer", "ML Platform Engineer", "DevOps for ML", "AI Infrastructure Engineer"],
    fresher: "₹6–10 LPA",
    mid: "₹14–24 LPA",
    senior: "₹26–45 LPA",
  },
  "data-engineering": {
    roles: ["Data Engineer", "ETL Developer", "Big Data Engineer", "Analytics Engineer"],
    fresher: "₹5–9 LPA",
    mid: "₹12–22 LPA",
    senior: "₹24–40 LPA",
  },
};

// Nicer URL token per course (e.g. python-programming -> python).
export const urlCourseToken: Record<string, string> = {
  "data-science": "data-science",
  "data-analytics": "data-analytics",
  "power-bi": "power-bi",
  "python-programming": "python",
  "gen-ai": "generative-ai",
  mlops: "mlops",
  "data-engineering": "data-engineering",
};

export type LocationLanding = {
  slug: string; // e.g. data-science-course-ameerpet
  courseSlug: string;
  localitySlug: string;
};

// Curated, quality-first set (flagship course across localities + key courses in
// the prime localities). Expand here to scale — keep content genuinely localized.
const combos: [string, string[]][] = [
  ["data-science", ["ameerpet", "kukatpally", "madhapur", "gachibowli", "hitech-city", "dilsukhnagar"]],
  ["python-programming", ["ameerpet", "kukatpally"]],
  ["power-bi", ["ameerpet", "kukatpally"]],
  ["gen-ai", ["ameerpet", "madhapur"]],
  ["data-analytics", ["ameerpet", "kukatpally"]],
  ["mlops", ["ameerpet"]],
];

export const locationLandings: LocationLanding[] = combos.flatMap(([courseSlug, locs]) =>
  locs.map((localitySlug) => ({
    slug: `${urlCourseToken[courseSlug]}-course-${localitySlug}`,
    courseSlug,
    localitySlug,
  }))
);

export const findLanding = (slug: string) =>
  locationLandings.find((l) => l.slug === slug);
