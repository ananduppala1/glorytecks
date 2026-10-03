// ─────────────────────────────────────────────────────────────────────────────
// Site-wide structured data — one coherent @id-linked graph.
//
// Previously three independent top-level nodes (EducationalOrganization,
// LocalBusiness, WebSite) each restated the business's name, address, phone and
// description, and a fourth LocalBusiness lived on the training-in-hyderabad
// page. Four nodes describing one business, none of them referencing the
// others, is how a knowledge graph ends up with duplicate entities.
//
// Now there is ONE organization node (`#organization`), ONE place node
// (`#localbusiness`) that declares itself a branch of it, and ONE website node
// (`#website`) published by it. Page-level nodes (WebPage, Course, BlogPosting,
// BreadcrumbList) reference those by @id instead of re-describing them.
//
// Every factual property is traceable to config/business.ts or to visible page
// content. Properties that were previously asserted without evidence —
// foundingDate, numberOfEmployees, aggregateRating — are gone; see the notes
// below each.
// ─────────────────────────────────────────────────────────────────────────────
import {
  BUSINESS,
  openingHoursSchema,
  postalAddressSchema,
  sameAsProfiles,
} from '@/config/business';
import { SITE_URL } from './seo';

/** Stable @id values. Every node in the graph points at these, never at copies. */
export const SCHEMA_ID = {
  organization: `${SITE_URL}/#organization`,
  localBusiness: `${SITE_URL}/#localbusiness`,
  website: `${SITE_URL}/#website`,
} as const;

/** Reference an existing node rather than repeating it. */
export const ref = (id: string) => ({ '@id': id });

/**
 * The organization. An IT training institute is an EducationalOrganization —
 * the specific subtype carries more meaning than a bare Organization.
 *
 * Deliberately absent:
 *   • `foundingDate` — was '2020'. Nothing in the repository, the CMS seed or
 *     any visible page states a founding year.
 *   • `numberOfEmployees` — was 20. Same: unsupported.
 *   • `aggregateRating` — see the note on `localBusinessSchema`.
 *   • `legalName` — omitted while config/business.ts has none confirmed.
 */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': SCHEMA_ID.organization,
    name: BUSINESS.name,
    ...(BUSINESS.legalName ? { legalName: BUSINESS.legalName } : {}),
    alternateName: BUSINESS.alternateNames,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/logo.png`,
      width: 256,
      height: 244,
    },
    image: `${SITE_URL}/og-image.jpg`,
    description:
      'GloryTecks is an IT training institute in Ameerpet, Hyderabad, offering classroom and live online courses in Data Science, Generative AI, Agentic AI, Python, Power BI, MLOps, Data Analytics, Data Engineering and SQL Server, with placement support.',
    // Topical expertise. These map to courses that actually exist in the CMS.
    knowsAbout: [
      'Data Science',
      'Generative AI',
      'Agentic AI',
      'Machine Learning',
      'Python Programming',
      'Power BI',
      'Data Analytics',
      'Data Engineering',
      'MLOps',
      'SQL Server',
    ],
    address: postalAddressSchema(),
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: BUSINESS.telephone,
      contactType: 'admissions',
      areaServed: 'IN',
      availableLanguage: ['English', 'Hindi', 'Telugu'],
    },
    areaServed: [
      { '@type': 'City', name: 'Hyderabad' },
      { '@type': 'City', name: 'Secunderabad' },
      { '@type': 'State', name: 'Telangana' },
    ],
    sameAs: sameAsProfiles(),
  };
}

/**
 * The physical training centre, as a Place-type node distinct from the
 * organization and explicitly linked to it via `parentOrganization`.
 *
 * Deliberately absent: `aggregateRating`. The previous graph asserted
 * 4.9 from 500 reviews on the training-in-hyderabad page. That is
 * self-serving review markup — a rating about the business, supplied by the
 * business, on its own site — which Google's structured-data policy does not
 * allow and which risks a manual action. Genuine reviews still render as
 * visible testimonials from the CMS; they are simply not re-asserted as
 * machine-readable ratings.
 */
export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': SCHEMA_ID.localBusiness,
    name: `${BUSINESS.name} — Ameerpet Centre`,
    parentOrganization: ref(SCHEMA_ID.organization),
    url: `${SITE_URL}/training-in-hyderabad`,
    description:
      'The GloryTecks training centre in Ameerpet, Hyderabad — classroom batches, weekend sessions and in-person doubt-clearing, a short walk from Ameerpet Metro Station.',
    address: postalAddressSchema(),
    geo: {
      '@type': 'GeoCoordinates',
      latitude: BUSINESS.geo.latitude,
      longitude: BUSINESS.geo.longitude,
    },
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    openingHoursSpecification: openingHoursSchema(),
    hasMap: BUSINESS.mapUrl,
    image: `${SITE_URL}/og-image.jpg`,
    // A price range with no prices anywhere on the site would be unsupported,
    // so it is omitted rather than guessed.
    areaServed: [
      { '@type': 'Place', name: 'Ameerpet' },
      { '@type': 'Place', name: 'Kukatpally' },
      { '@type': 'Place', name: 'Madhapur' },
      { '@type': 'Place', name: 'Gachibowli' },
      { '@type': 'Place', name: 'HITEC City' },
      { '@type': 'Place', name: 'Dilsukhnagar' },
    ],
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': SCHEMA_ID.website,
    name: BUSINESS.name,
    url: SITE_URL,
    description:
      'IT training courses in Data Science, AI, Python, Power BI, MLOps and Data Engineering from GloryTecks, Hyderabad.',
    publisher: ref(SCHEMA_ID.organization),
    inLanguage: 'en-IN',
    // Points at the site's only real server-side search. `/courses` was the
    // previous target, but that page never reads `?q=` — course filtering
    // is client-side (docs/MIGRATION.md §9) — so the template described a
    // search that silently ignored the term.
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/blog?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * A WebPage node for a specific page, wired into the graph.
 *
 * Replaces the hand-written WebPage/CollectionPage/AboutPage/ContactPage
 * objects that each page declared separately, none of which referenced the
 * website or organization node.
 */
export function webPageSchema({
  path,
  name,
  description,
  type = 'WebPage',
  primaryImage,
  mainEntity,
}: {
  path: string;
  name: string;
  description: string;
  type?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage';
  primaryImage?: string;
  /** `@id` of the thing the page is about, such as a course page's Course node. */
  mainEntity?: string;
}) {
  const url = path === '/' ? SITE_URL : `${SITE_URL}${path}`;
  return {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: ref(SCHEMA_ID.website),
    about: ref(SCHEMA_ID.organization),
    inLanguage: 'en-IN',
    ...(primaryImage ? { primaryImageOfPage: primaryImage } : {}),
    ...(mainEntity ? { mainEntity: ref(mainEntity) } : {}),
  };
}

/**
 * The /courses summary page's ItemList.
 *
 * Google's course list rich result pairs Course markup on each detail page
 * with an ItemList on a summary page that points at them
 * (developers.google.com/search/docs/appearance/structured-data/course).
 * The detail pages already carry Course markup; without this list, no course
 * was eligible. It names exactly the courses the page renders, in the same
 * order, each by its canonical URL, and asserts nothing else about them.
 */
export function courseListSchema(courses: readonly { slug: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${SITE_URL}/courses#courses`,
    numberOfItems: courses.length,
    itemListElement: courses.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/courses/${c.slug}`,
    })),
  };
}

/**
 * The homepage FAQ block's schema.
 *
 * It pairs with the visible <details> list at the bottom of the homepage — the
 * answers here are the same copy, which is what keeps the markup honest rather
 * than misleading. `components/views/HomeView.tsx` renders `HOME_FAQS` from
 * this module, so the two cannot drift.
 *
 * Every answer was reviewed for unsupported claims. Removed in this pass:
 * a "4.9/5 rating from 500+ students" claim (no verifiable source, and a
 * rating assertion the business cannot self-certify), "consistently rated
 * among the best" (unverifiable superlative), and a specific EMI figure
 * (₹1,999/month) that appears nowhere else on the site or in the CMS.
 */
export const HOME_FAQS: readonly [string, string][] = [
  [
    'What is GloryTecks and where is it located?',
    `GloryTecks is an IT training institute in Ameerpet, Hyderabad. The centre is at ${BUSINESS.address.streetAddress}, ${BUSINESS.address.locality} – ${BUSINESS.address.postalCode}, a short walk from Ameerpet Metro Station. Courses cover Data Science, Generative AI, Agentic AI, Python, Power BI, MLOps, Data Engineering, Data Analytics and SQL Server.`,
  ],
  [
    'Which courses does GloryTecks offer?',
    'GloryTecks runs courses in Data Science, Generative AI, Agentic AI, Python Programming, Power BI, MLOps, Data Engineering, Data Analytics and SQL Server. Each programme is project-based and taught by working practitioners.',
  ],
  [
    'What placement support does GloryTecks provide?',
    'Placement support includes dedicated career counselling, resume and ATS-friendly CV preparation, LinkedIn profile review, mock interview sessions and introductions to hiring partners. Support is provided to every enrolled learner; it is assistance with the job search, not a guarantee of employment.',
  ],
  [
    'Does GloryTecks offer online training?',
    'Yes. GloryTecks runs both live online classes and in-person classroom training at the Ameerpet centre, with recorded session access. Weekday and weekend batches are available for students and working professionals.',
  ],
  [
    'What does a GloryTecks course cost?',
    `Course fees vary by programme and by batch, and instalment options are available. Call ${BUSINESS.telephone.replace('+91', '+91 ')} or visit the Ameerpet centre for the current fee structure.`,
  ],
  [
    'What does the Data Science course cover?',
    'The Data Science programme covers Python, statistics, machine learning, deep learning, NLP and Generative AI, built around real-world projects. Full module-by-module details are on the Data Science course page.',
  ],
  [
    'Who are GloryTecks courses designed for?',
    'Courses are open to freshers, graduates, BTech and degree students, and working professionals upskilling or moving into AI, Data Science or Analytics roles. Batches are structured so beginners and career switchers can start from fundamentals.',
  ],
  [
    'Does GloryTecks provide a certificate?',
    'Yes. GloryTecks issues a course completion certificate, and the curriculum is aligned to the syllabi of external certifications from providers such as AWS, Google and Microsoft, which learners sit with those providers directly.',
  ],
];

export function homeFaqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/#faq`,
    mainEntity: HOME_FAQS.map(([name, text]) => ({
      '@type': 'Question',
      name,
      acceptedAnswer: { '@type': 'Answer', text },
    })),
  };
}

/** Homepage BreadcrumbList — position 1 only, as in the original index.html. */
export function homeBreadcrumbSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${SITE_URL}/#breadcrumb`,
    itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }],
  };
}
