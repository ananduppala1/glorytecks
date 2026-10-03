import type { Metadata } from 'next';
import HomeView from '@/components/views/HomeView';
import { JsonLd } from '@/components/seo/JsonLd';
import { staticPageMetadata, staticRoute } from '@/lib/seo';
import {
  homeBreadcrumbSchema,
  webPageSchema,
  localBusinessSchema,
  homeFaqSchema,
} from '@/lib/schema';
import { safe } from '@/lib/site-data';
import * as api from '@/lib/api/services';

// Title, description, canonical and indexability all come from the
// route registry in lib/seo/routes.ts, which is also what the sitemap and the
// indexability matrix read — so the three cannot drift apart.
export const metadata: Metadata = staticPageMetadata("/");

const route = staticRoute("/");


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
      {/*
        The homepage carries the LocalBusiness node and the FAQPage, because
        this is the page that shows the address block and the visible FAQ list.
        Both used to be emitted site-wide from the root layout.
      */}
      <JsonLd
        schema={[
          webPageSchema({
            path: route.path,
            name: route.title,
            description: route.description,
          }),
          localBusinessSchema(),
          homeFaqSchema(),
          homeBreadcrumbSchema(),
        ]}
      />
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
