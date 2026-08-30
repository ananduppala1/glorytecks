// ─────────────────────────────────────────────────────────────────────────
// MIGRATION SOURCE — copied verbatim from the public GloryTecks website
// (src/data/...). Used by seed.ts to populate MongoDB. Do not edit here;
// the canonical data now lives in the database and is managed via the CMS.
// ─────────────────────────────────────────────────────────────────────────
// Policy / trust pages (privacy, terms, refund, cookie, disclaimer, editorial).
// Real, business-appropriate content for an IT training institute — wired into
// routes, prerender, sitemap and the footer. No fabricated guarantees: placement
// is described as "assistance", refunds follow clear, conditional rules.

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDoc = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  updated: string; // ISO date
  intro: string;
  sections: LegalSection[];
};

const ADDRESS = "603, Annapurna Block, Aditya Enclave, Ameerpet, Hyderabad – 500038, Telangana, India";
const PHONE = "+91 99080 99980";
const EMAIL = "gloryteckss@gmail.com";
const UPDATED = "2026-06-01";

const contactSection: LegalSection = {
  heading: "Contact Us",
  paragraphs: [
    `If you have any questions about this document, please reach out to GloryTecks: by email at ${EMAIL}, by phone at ${PHONE}, or in person at ${ADDRESS}.`,
  ],
};

export const legalDocs: LegalDoc[] = [
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    metaTitle: "Privacy Policy | GloryTecks IT Training Institute Hyderabad",
    metaDescription:
      "How GloryTecks collects, uses, stores and protects your personal information when you use our website or enquire about our courses in Hyderabad.",
    updated: UPDATED,
    intro:
      "GloryTecks (\"we\", \"us\", \"our\") respects your privacy. This Privacy Policy explains what information we collect through our website and enquiry channels, how we use it, and the choices you have.",
    sections: [
      {
        heading: "Information We Collect",
        paragraphs: ["We only collect information that helps us respond to you and improve our courses:"],
        bullets: [
          "Contact details you provide voluntarily — name, phone number, email and the course you are interested in — via our enquiry forms, demo bookings, WhatsApp or phone calls.",
          "Usage information collected automatically through cookies and analytics — pages viewed, approximate location, device and browser type, and how you reached our site.",
        ],
      },
      {
        heading: "How We Use Your Information",
        bullets: [
          "To respond to course enquiries, schedule demo classes and provide counselling.",
          "To share batch schedules, fee details and learning resources you request.",
          "To improve our website, content and course offerings using aggregated analytics.",
          "To send relevant updates about courses — only where you have opted in, and you can opt out at any time.",
        ],
      },
      {
        heading: "Cookies & Analytics",
        paragraphs: [
          "We use Google Analytics 4 and Google Tag Manager to understand how visitors use our site. Advertising and analytics cookies are governed by Google Consent Mode v2 and are disabled until you accept them via our cookie banner. See our Cookie Policy for details and controls.",
        ],
      },
      {
        heading: "How We Share Information",
        paragraphs: [
          "We do not sell your personal information. We share it only with trusted service providers who help us operate (for example, analytics and communication tools), and only as required by law. Hiring partners are contacted on your behalf only as part of placement assistance, with your consent.",
        ],
      },
      {
        heading: "Data Security",
        paragraphs: [
          "We apply reasonable technical and organisational safeguards to protect your information. The site is served over HTTPS with modern security headers. No method of transmission over the internet is completely secure, so we cannot guarantee absolute security.",
        ],
      },
      {
        heading: "Your Rights & Choices",
        bullets: [
          "Request access to, correction of, or deletion of the personal information we hold about you.",
          "Withdraw marketing consent or analytics consent at any time.",
          "Contact us using the details below to exercise any of these rights.",
        ],
      },
      {
        heading: "Third-Party Links",
        paragraphs: [
          "Our website may link to external sites (for example LinkedIn, YouTube or partner platforms). We are not responsible for the privacy practices of those sites; please review their policies separately.",
        ],
      },
      {
        heading: "Children's Privacy",
        paragraphs: [
          "Our courses and website are intended for individuals aged 16 and above. We do not knowingly collect personal information from children under 16.",
        ],
      },
      {
        heading: "Changes to This Policy",
        paragraphs: [
          "We may update this Privacy Policy from time to time. The \"Last updated\" date above reflects the latest revision. Material changes will be highlighted on this page.",
        ],
      },
      contactSection,
    ],
  },
  {
    slug: "terms",
    title: "Terms of Service",
    metaTitle: "Terms of Service | GloryTecks IT Training Institute Hyderabad",
    metaDescription:
      "The terms and conditions that govern your use of the GloryTecks website and enrolment in our IT training courses in Hyderabad.",
    updated: UPDATED,
    intro:
      "These Terms of Service govern your use of the GloryTecks website and your enrolment in our courses. By using our site or enrolling in a programme, you agree to these terms.",
    sections: [
      {
        heading: "Courses & Enrolment",
        paragraphs: [
          "Course content, duration, curriculum and batch timings are described on the relevant course pages and may be updated to keep pace with industry changes. Enrolment is confirmed once the applicable fee (or first instalment) is received.",
        ],
      },
      {
        heading: "Fees & Payments",
        bullets: [
          "Fees are payable as communicated at the time of enrolment and may be paid in full or via available EMI options.",
          "Discounts and scholarships, where offered, are at our discretion and subject to eligibility.",
          "Refunds are governed by our Refund Policy.",
        ],
      },
      {
        heading: "Placement Assistance",
        paragraphs: [
          "GloryTecks provides placement assistance — including resume building, mock interviews, portfolio guidance and referrals to hiring partners. Placement assistance is a support service and is not a guarantee of employment, which depends on your performance, the interview process and market conditions.",
        ],
      },
      {
        heading: "Intellectual Property",
        paragraphs: [
          "All course materials, recordings, website content and branding are the property of GloryTecks or its licensors and are provided for your personal learning only. They may not be copied, redistributed or resold without written permission.",
        ],
      },
      {
        heading: "Acceptable Use",
        bullets: [
          "Use the website and learning materials lawfully and for their intended purpose.",
          "Do not attempt to disrupt, reverse-engineer or gain unauthorised access to our systems.",
          "Do not share your account or course access with third parties.",
        ],
      },
      {
        heading: "Limitation of Liability",
        paragraphs: [
          "To the maximum extent permitted by law, GloryTecks is not liable for indirect or consequential losses arising from the use of our website or courses. Our total liability for any claim is limited to the fees you paid for the relevant course.",
        ],
      },
      {
        heading: "Governing Law",
        paragraphs: [
          "These terms are governed by the laws of India, and any disputes are subject to the exclusive jurisdiction of the courts of Hyderabad, Telangana.",
        ],
      },
      {
        heading: "Changes to These Terms",
        paragraphs: [
          "We may revise these terms from time to time. Continued use of the website or courses after changes are posted constitutes acceptance of the updated terms.",
        ],
      },
      contactSection,
    ],
  },
  {
    slug: "refund-policy",
    title: "Refund Policy",
    metaTitle: "Refund Policy | GloryTecks IT Training Institute Hyderabad",
    metaDescription:
      "GloryTecks refund and cancellation policy — eligibility, timelines and conditions for refunds on our IT training courses in Hyderabad.",
    updated: UPDATED,
    intro:
      "We want you to be confident about enrolling. This Refund Policy explains when refunds are available, what is non-refundable, and how the process works.",
    sections: [
      {
        heading: "Free Demo First",
        paragraphs: [
          "We encourage every learner to attend a free demo class before enrolling so you can evaluate the trainer, curriculum and teaching style. This helps ensure the course is the right fit before any payment.",
        ],
      },
      {
        heading: "Refund Eligibility",
        bullets: [
          "Requests made before the batch start date are eligible for a refund, less any non-refundable registration/processing charges.",
          "Requests made within the first few sessions of a batch may be eligible for a partial refund, calculated on a pro-rata basis. Please confirm the exact window with our team at the time of enrolment.",
        ],
      },
      {
        heading: "Non-Refundable Items",
        bullets: [
          "Registration or administrative processing charges.",
          "Discounted, promotional or scholarship-based enrolments where stated as non-refundable at purchase.",
          "Requests made after a substantial portion of the course has been delivered or materials/certificates have been issued.",
        ],
      },
      {
        heading: "Batch Transfer & Rescheduling",
        paragraphs: [
          "If you cannot continue with your current batch, you may request a one-time transfer to a later batch of the same course, subject to availability, instead of a refund.",
        ],
      },
      {
        heading: "How to Request a Refund",
        paragraphs: [
          `To request a refund, contact us at ${EMAIL} or ${PHONE} with your name, course and enrolment details. Approved refunds are processed to the original payment method, typically within 7–10 business days.`,
        ],
      },
      contactSection,
    ],
  },
  {
    slug: "cookie-policy",
    title: "Cookie Policy",
    metaTitle: "Cookie Policy | GloryTecks IT Training Institute Hyderabad",
    metaDescription:
      "How GloryTecks uses cookies and similar technologies, the categories of cookies we set, and how you can control them via Consent Mode v2.",
    updated: UPDATED,
    intro:
      "This Cookie Policy explains how GloryTecks uses cookies and similar technologies on our website, and how you can control them.",
    sections: [
      {
        heading: "What Are Cookies?",
        paragraphs: [
          "Cookies are small text files stored on your device when you visit a website. They help the site work, remember your preferences and understand how it is used.",
        ],
      },
      {
        heading: "Cookies We Use",
        bullets: [
          "Essential cookies — required for core site functionality and security. These are always active.",
          "Analytics cookies — Google Analytics 4 / Google Tag Manager, used to measure traffic and improve the site. These load only after you accept them.",
        ],
      },
      {
        heading: "Consent & Control",
        paragraphs: [
          "We implement Google Consent Mode v2. Advertising and analytics storage are denied by default until you choose \"Accept\" on our cookie banner. You can change your choice at any time by clearing your browser's site data, which will make the banner reappear. You can also manage cookies through your browser settings.",
        ],
      },
      {
        heading: "Third-Party Cookies",
        paragraphs: [
          "Some cookies are set by Google for analytics. Embedded content (such as YouTube videos or Google Maps) may also set cookies governed by Google's own policies.",
        ],
      },
      contactSection,
    ],
  },
  {
    slug: "disclaimer",
    title: "Disclaimer",
    metaTitle: "Disclaimer | GloryTecks IT Training Institute Hyderabad",
    metaDescription:
      "Important disclaimers regarding GloryTecks course outcomes, employment, external links and the educational information on this website.",
    updated: UPDATED,
    intro:
      "The information on this website is provided for general educational and informational purposes. Please read the following disclaimers carefully.",
    sections: [
      {
        heading: "No Guarantee of Employment",
        paragraphs: [
          "GloryTecks provides training and placement assistance. While many learners secure roles after our programmes, we do not and cannot guarantee employment, a specific salary, or a specific company. Outcomes depend on individual effort, skills, interview performance and prevailing market conditions.",
        ],
      },
      {
        heading: "Educational Information Only",
        paragraphs: [
          "Salary figures, job-market trends and career timelines shared on this site and our blog are indicative estimates compiled from public sources and our experience. They should be treated as guidance, not as a promise of results.",
        ],
      },
      {
        heading: "External Links",
        paragraphs: [
          "Our website and blog may link to third-party websites and tools for your convenience. We do not control and are not responsible for their content, accuracy or availability.",
        ],
      },
      {
        heading: "Trademarks",
        paragraphs: [
          "Technology names, logos and brands referenced on this site (for example Python, Power BI, AWS, Azure, GCP) are the property of their respective owners and are mentioned only for descriptive, educational purposes.",
        ],
      },
      contactSection,
    ],
  },
  {
    slug: "editorial-policy",
    title: "Editorial & Content Policy",
    metaTitle: "Editorial Policy | GloryTecks IT Training Institute Hyderabad",
    metaDescription:
      "How GloryTecks researches, writes, reviews and updates the educational content and career guides published on our blog.",
    updated: UPDATED,
    intro:
      "GloryTecks publishes learning guides, roadmaps, interview questions and career advice for the Hyderabad tech community. This policy explains how that content is created, reviewed and kept current.",
    sections: [
      {
        heading: "Who Writes Our Content",
        paragraphs: [
          "Our articles are written and reviewed by GloryTecks trainers and mentors who work with these technologies in real projects and in the classroom. Each post lists an author and publication date.",
        ],
      },
      {
        heading: "Accuracy & Sources",
        bullets: [
          "We aim for technically accurate, practical content based on hands-on experience and reputable sources.",
          "Salary and market data are presented as indicative ranges, not guarantees.",
          "Where a topic evolves quickly (for example Generative AI tooling), we note that details may change.",
        ],
      },
      {
        heading: "Content Update Policy",
        paragraphs: [
          "We review and refresh key guides periodically so curricula, tools and roadmaps stay relevant. Updated articles show a \"last updated\" date, and our sitemaps report accurate modification dates to search engines.",
        ],
      },
      {
        heading: "Corrections",
        paragraphs: [
          `If you spot an error in any article, please let us know at ${EMAIL} and we will review and correct it promptly.`,
        ],
      },
      contactSection,
    ],
  },
];

export const legalSlugs = legalDocs.map((d) => d.slug);
export const findLegalDoc = (slug?: string) => legalDocs.find((d) => d.slug === slug);
