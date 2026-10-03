import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LocationCourseView from '@/components/views/LocationCourseView';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildMetadata, notFoundMetadata, breadcrumbSchema, SITE_URL } from '@/lib/seo';
import { SCHEMA_ID, ref } from '@/lib/schema';
import { findLanding, locationLandings } from '@/config/locationLandings';
import { safe } from '@/lib/site-data';
import * as api from '@/lib/api/services';
import type { Course, Locality } from '@/types/content';

type Params = Promise<{ landingSlug: string }>;

/**
 * ISR window for the landing pages, matching the CONTENT tier the course and
 * locality reads use. Declared explicitly so that a page which rendered as a
 * 404 because the backend was unreachable during the build re-renders on the
 * next revalidation instead of staying a 404 until the next deploy.
 */
export const revalidate = 300;

/**
 * The landing set is a route table in this repository, not CMS content, so it
 * is finite and fully known at build time. Closing the route means every
 * single-segment URL that is not a landing — every bot probe for
 * /wp-login.php, /.env, /xmlrpc.php — is a static 404 served without
 * invoking a serverless function.
 *
 * This is the last route to match a single-segment path, so it is also the
 * catch-all for the whole site.
 */
export const dynamicParams = false;

/**
 * Programmatic local-SEO landing pages, e.g. `/data-science-course-ameerpet`.
 *
 * This is the last route to match a single-segment path, so it also stands in
 * for React Router's `/:landingSlug` catch-all. An unknown slug 404s properly
 * instead of rendering a "Page not found" body with an HTTP 200.
 *
 * Only combos whose course AND locality both exist in the CMS are prerendered.
 * If the backend is unreachable at build time this returns an empty list, and
 * every landing renders on demand instead — a transient backend blip during a
 * deploy degrades to slower first requests, it does not fail the build.
 */
export function generateStaticParams() {
  return locationLandings.map((l) => ({ landingSlug: l.slug }));
}

/**
 * A landing is only a real page while its course AND locality both exist in
 * the CMS, so a missing one still 404s at render time — the route being
 * closed decides which URLs exist, not which ones have content.
 *
 * Failures of any kind (404, network, backend down) collapse to `null` rather
 * than throwing, matching how the locality read already degrades through
 * `safe()`. A backend outage during a build therefore produces a 404 that
 * heals on the next revalidation, instead of failing the build outright.
 */
const getCourse = (slug: string): Promise<Course | null> =>
  safe(() => api.fetchCourse(slug), null, `landing:course:${slug}`);

/**
 * The FAQ copy. Built once here and passed to both the visible <details> list
 * and the FAQPage JSON-LD, so the two can never drift apart — a requirement for
 * FAQ rich results, and something the React version had to duplicate by hand.
 */
function buildFaqs(course: Course, loc: Locality, phone: string): [string, string][] {
  return [
    [
      `Where can I learn ${course.title} in ${loc.name}, Hyderabad?`,
      `GloryTecks offers the ${course.title} course for learners in ${loc.name} through live online batches and classroom training at the Ameerpet centre, near ${loc.nearby}.`,
    ],
    [
      `What is the duration and fee of the ${course.title} course?`,
      `The ${course.title} course runs for ${course.duration} with flexible EMI-based fees.${
        phone ? ` Call ${phone} for the current fee structure and any ${loc.name} batch offers.` : ''
      }`,
    ],
    [`Does GloryTecks provide placement support for ${loc.name} students?`, `Yes. ${course.placement}`],
    [
      `Is the ${course.title} course suitable for beginners and working professionals in ${loc.name}?`,
      `Yes. The ${course.title} course starts from fundamentals and is designed for freshers, students and working professionals, with weekday, weekend and online batches.`,
    ],
  ];
}

const describe = (course: Course, loc: Locality) =>
  `${course.title} training in ${loc.name}, Hyderabad at GloryTecks. ${course.tagline}. ${course.duration}, real-time projects, expert mentors and 100% placement support. Book a free demo.`;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { landingSlug } = await params;
  const landing = findLanding(landingSlug);

  if (!landing) {
    return notFoundMetadata('404 — Page Not Found | GloryTecks Hyderabad', 'Page not found.');
  }

  const [course, localities] = await Promise.all([
    getCourse(landing.courseSlug),
    safe(() => api.fetchLocalities(), [], 'landing:meta:localities'),
  ]);
  const loc = localities.find((l) => l.slug === landing.localitySlug);

  // No canonical on a 404 — see the note in /courses/[slug].
  if (!course || !loc) {
    return notFoundMetadata(
      'Course in Hyderabad | GloryTecks',
      'This course is not currently offered at this location.',
    );
  }

  return buildMetadata({
    title: `${course.title} Course in ${loc.name}, Hyderabad | GloryTecks`,
    description: describe(course, loc),
    canonical: `/${landing.slug}`,
  });
}

export default async function LocationCoursePage({ params }: { params: Params }) {
  const { landingSlug } = await params;

  // Landing existence is a routing concern resolved from config, so an unknown
  // slug 404s without ever touching the backend.
  const landing = findLanding(landingSlug);
  if (!landing) notFound();

  const [course, localities, allCourses, categories, settings] = await Promise.all([
    getCourse(landing.courseSlug),
    safe(() => api.fetchLocalities(), [], 'landing:localities'),
    safe(() => api.fetchCourses(), [], 'landing:courses'),
    safe(() => api.fetchCategories(), [], 'landing:categories'),
    safe(() => api.fetchSettings(), null, 'landing:settings'),
  ]);

  const loc = localities.find((l) => l.slug === landing.localitySlug);

  // A combo pointing at a course or locality that no longer exists in the CMS
  // simply 404s, exactly as the config file documents.
  if (!course || !loc) notFound();

  // Career roles & salary are derived from the matching blog category.
  const career = categories.find((c) => c.courseSlug === course.slug);
  const faqs = buildFaqs(course, loc, settings?.phone ?? '');

  const canonical = `/${landing.slug}`;
  const description = describe(course, loc);
  const crumbs = [
    { name: 'Courses', url: '/courses' },
    { name: `${course.title} in ${loc.name}`, url: canonical },
  ];

  const courseSchema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `${course.title} Course in ${loc.name}, Hyderabad`,
    description,
    url: `${SITE_URL}${canonical}`,
    timeRequired: course.duration,
    inLanguage: 'en-IN',
    teaches: course.modules,
    about: { '@type': 'Thing', name: course.title },
    // Provider and the physical venue are referenced by @id, not re-described.
    // The onsite instance points at the real Ameerpet centre rather than
    // implying a campus in this locality — GloryTecks has one location, and
    // asserting otherwise in structured data would be a false local claim.
    provider: ref(SCHEMA_ID.organization),
    hasCourseInstance: [
      {
        '@type': 'CourseInstance',
        courseMode: 'onsite',
        location: ref(SCHEMA_ID.localBusiness),
        ...(course.duration ? { courseWorkload: course.duration } : {}),
      },
      {
        '@type': 'CourseInstance',
        courseMode: 'online',
        ...(course.duration ? { courseWorkload: course.duration } : {}),
      },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <>
      <JsonLd schema={[courseSchema, faqSchema, breadcrumbSchema(crumbs)]} />
      <Breadcrumbs items={crumbs} />
      <LocationCourseView
        landing={landing}
        course={course}
        loc={loc}
        allCourses={allCourses}
        localities={localities}
        career={career}
        faqs={faqs}
      />
    </>
  );
}
