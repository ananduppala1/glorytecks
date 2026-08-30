import type { Metadata } from 'next';
import HomeView from '@/components/views/HomeView';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildMetadata, SITE_URL } from '@/lib/seo';
import { homeBreadcrumbSchema } from '@/lib/schema';
import { safe } from '@/lib/site-data';
import * as api from '@/lib/api/services';

export const metadata: Metadata = buildMetadata({
  title:
    'GloryTecks — Best IT Training Institute in Hyderabad | Data Science, AI, Python, Power BI Courses',
  description:
    "GloryTecks is Hyderabad's #1 IT training institute at Ameerpet. Enroll in Data Science, Generative AI, Agentic AI, Python, Power BI, MLOps, SQL Server & Data Engineering courses with 100% placement support. Real-time projects, expert mentors, free demo available!",
  canonical: '/',
  keywords:
    'best IT training institute Hyderabad, data science course Hyderabad, generative AI course Hyderabad, agentic AI course Hyderabad, python training Hyderabad, power BI training Hyderabad, MLOps course Hyderabad, data engineering Hyderabad, SQL server training Hyderabad, machine learning Hyderabad, Glorytecks, Glory Tecks, Glorytecks Ameerpet, top training institute Hyderabad, placement training Hyderabad, job oriented courses Hyderabad, courses for freshers Hyderabad',
});

const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${SITE_URL}/#webpage`,
  url: `${SITE_URL}/`,
  name: 'GloryTecks — Best IT Training Institute in Hyderabad',
  description:
    "GloryTecks Hyderabad's top IT training institute offering Data Science, Generative AI, Agentic AI, Python, Power BI, MLOps, Data Engineering, Data Analytics, SQL Server courses with 100% placement.",
  isPartOf: { '@id': `${SITE_URL}/#website` },
  about: { '@id': `${SITE_URL}/#organization` },
  breadcrumb: { '@id': `${SITE_URL}/#breadcrumb` },
};

export default async function HomePage() {
  // Nine collections fetched in parallel on the server. The React app issued
  // the same nine requests from the browser after hydration, one per hook.
  const [courses, latestBlogs, testimonials, companies, trainers, roadmaps, faqs, batches, settings] =
    await Promise.all([
      safe(() => api.fetchCourses(), [], 'home:courses'),
      safe(async () => (await api.fetchBlogs({ limit: 3, sort: '-date' })).items, [], 'home:blogs'),
      safe(() => api.fetchTestimonials(), [], 'home:testimonials'),
      safe(() => api.fetchCompanies(), [], 'home:companies'),
      safe(() => api.fetchTrainers(), [], 'home:trainers'),
      safe(() => api.fetchRoadmaps(), [], 'home:roadmaps'),
      safe(() => api.fetchFaqs(), [], 'home:faqs'),
      safe(() => api.fetchBatches(), [], 'home:batches'),
      safe(() => api.fetchSettings(), null, 'home:settings'),
    ]);

  return (
    <>
      <JsonLd schema={[webPageSchema, homeBreadcrumbSchema()]} />
      <HomeView
        courses={courses}
        latestBlogs={latestBlogs}
        testimonials={testimonials}
        companies={companies}
        trainers={trainers}
        roadmaps={roadmaps}
        faqs={faqs}
        batches={batches}
        settings={settings}
      />
    </>
  );
}
