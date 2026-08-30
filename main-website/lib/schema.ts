// ─────────────────────────────────────────────────────────────────────────────
// Site-wide structured data.
//
// These four documents were hardcoded inline in the React app's index.html.
// They are unchanged in content — only the `@id`/`url` values are now derived
// from NEXT_PUBLIC_SITE_URL so staging deployments don't emit production URLs.
// ─────────────────────────────────────────────────────────────────────────────
import { SITE_URL } from './seo';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': `${SITE_URL}/#organization`,
    name: 'GloryTecks',
    alternateName: ['Glory Tecks', 'Glory Technologies Training Institute', 'Glorytecks Hyderabad'],
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/logo.png`,
      width: 256,
      height: 244,
    },
    knowsAbout: [
      'Data Science',
      'Artificial Intelligence',
      'Machine Learning',
      'Generative AI',
      'Python Programming',
      'Power BI',
      'Data Engineering',
      'MLOps',
      'SQL',
      'Data Analytics',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+919908099980',
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: ['English', 'Hindi', 'Telugu'],
    },
    image: `${SITE_URL}/og-image.jpg`,
    description:
      "GloryTecks is Hyderabad's leading IT training institute offering Data Science, Generative AI, Agentic AI, Machine Learning, Python, Power BI, MLOps, Data Analytics, Data Engineering, and SQL Server courses with 100% placement support at Ameerpet and Kukatpally.",
    address: {
      '@type': 'PostalAddress',
      streetAddress: '603, Annapurna Block, Aditya Enclave',
      addressLocality: 'Ameerpet, Hyderabad',
      addressRegion: 'Telangana',
      postalCode: '500038',
      addressCountry: 'IN',
    },
    telephone: '+919908099980',
    email: 'gloryteckss@gmail.com',
    foundingDate: '2020',
    numberOfEmployees: { '@type': 'QuantitativeValue', value: '20' },
    areaServed: [
      { '@type': 'City', name: 'Hyderabad' },
      { '@type': 'City', name: 'Secunderabad' },
      { '@type': 'Place', name: 'Ameerpet' },
      { '@type': 'Place', name: 'Kukatpally' },
      { '@type': 'State', name: 'Telangana' },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'IT Training Courses',
      itemListElement: [
        'Data Science Course Hyderabad',
        'Generative AI Course Hyderabad',
        'Agentic AI Course Hyderabad',
        'Python Programming Course Hyderabad',
        'Power BI Course Hyderabad',
        'MLOps Course Hyderabad',
        'Data Engineering Course Hyderabad',
        'Data Analytics Course Hyderabad',
        'SQL Server Course Hyderabad',
      ].map((name) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Course', name },
      })),
    },
    sameAs: [
      'https://www.facebook.com/profile.php?id=61589860342695',
      'https://www.instagram.com/glorytecks/',
      'https://www.linkedin.com/company/glorytecks/',
      'https://www.youtube.com/@glorytecks',
    ],
  };
}

export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'EducationalOrganization'],
    '@id': `${SITE_URL}/#localbusiness`,
    name: 'GloryTecks IT Training Institute',
    description:
      'Best IT training institute in Hyderabad offering Data Science, AI, Python, Power BI, MLOps, Data Engineering courses with 100% placement support near Ameerpet Metro Station.',
    url: SITE_URL,
    telephone: '+919908099980',
    email: 'gloryteckss@gmail.com',
    priceRange: '₹₹',
    currenciesAccepted: 'INR',
    paymentAccepted: 'Cash, Credit Card, Debit Card, UPI, Net Banking, EMI',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '603, Annapurna Block, Aditya Enclave',
      addressLocality: 'Ameerpet',
      addressRegion: 'Telangana',
      postalCode: '500038',
      addressCountry: 'IN',
    },
    geo: { '@type': 'GeoCoordinates', latitude: 17.4375, longitude: 78.4463 },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '08:00',
        closes: '21:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Sunday',
        opens: '09:00',
        closes: '17:00',
      },
    ],
    hasMap: 'https://www.google.com/maps?q=GloryTecks+Ameerpet+Hyderabad',
    image: `${SITE_URL}/og-image.jpg`,
    sameAs: [
      'https://www.facebook.com/profile.php?id=61589860342695',
      'https://www.instagram.com/glorytecks/',
      'https://www.linkedin.com/company/glorytecks/',
    ],
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: 'GloryTecks',
    url: SITE_URL,
    description:
      'Best IT training institute in Hyderabad for Data Science, AI, Python, Power BI, MLOps, Data Engineering courses',
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-IN',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/courses?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * The homepage FAQPage schema. It pairs with the visible <details> FAQ block at
 * the bottom of the homepage — the answers below are the same copy, which is
 * what keeps the markup eligible for rich results rather than misleading.
 */
export function homeFaqSchema() {
  const faqs: [string, string][] = [
    [
      'What is GloryTecks and where is it located?',
      "GloryTecks is Hyderabad's leading IT training institute located at 603, Annapurna Block, Aditya Enclave, Ameerpet, Hyderabad - 500038. We offer Data Science, Generative AI, Agentic AI, Python, Power BI, MLOps, Data Engineering, Data Analytics, and SQL Server training courses with 100% placement support.",
    ],
    [
      'Which are the best courses offered at GloryTecks Hyderabad?',
      'GloryTecks offers the best Data Science course, Generative AI course, Agentic AI course, Python programming course, Power BI course, MLOps course, Data Engineering course, Data Analytics course, Machine Learning course, and SQL Server course in Hyderabad with placement assistance.',
    ],
    [
      'Does GloryTecks provide 100% placement assistance?',
      'Yes, GloryTecks provides 100% placement assistance with 500+ hiring partners. Our placement support includes dedicated career counselors, resume building, ATS-friendly CV preparation, LinkedIn optimization, mock interview sessions, and exclusive campus placement drives.',
    ],
    [
      'Does GloryTecks offer online training in Hyderabad?',
      'Yes, GloryTecks offers both online and offline (classroom) training. We have live online classes via Zoom/Google Meet, recorded lecture access, and in-person training at our Ameerpet center. Weekend and weekday batches are available for working professionals and students.',
    ],
    [
      'What is the fee structure at GloryTecks?',
      'GloryTecks offers flexible fee structures with EMI starting from ₹1,999/month. Scholarships are available for deserving students. Course fees vary by program — contact us at +91 9908099980 or visit our Ameerpet center for the latest fee structure and available discounts.',
    ],
    [
      'Is GloryTecks the best Data Science training institute in Hyderabad?',
      'GloryTecks is consistently rated among the best Data Science training institutes in Hyderabad with a 4.9/5 rating from 500+ students. Our Data Science program covers Python, Machine Learning, Deep Learning, NLP, Generative AI, and real-world projects with 100% placement support.',
    ],
    [
      'Who can join GloryTecks courses — freshers or experienced professionals?',
      'GloryTecks courses are open to everyone — freshers, graduates, BTech/degree students, and working professionals looking to upskill. We design specialized batches for beginners, career switchers, and experienced professionals wanting to transition into AI, Data Science, or Analytics roles.',
    ],
    [
      'Does GloryTecks offer certification courses in Hyderabad?',
      'Yes, GloryTecks issues industry-recognized completion certificates and helps students earn certifications from AWS, Google, Microsoft, and other global platforms. Our certification courses in Data Science, AI, Python, Power BI, and MLOps are highly valued by Hyderabad employers.',
    ],
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(([name, text]) => ({
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
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
    ],
  };
}
