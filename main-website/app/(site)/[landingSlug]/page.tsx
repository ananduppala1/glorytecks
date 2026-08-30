import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LocationCourseView from '@/components/views/LocationCourseView';
import Breadcrumbs from '@/components/site/Breadcrumbs';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildMetadata, breadcrumbSchema, SITE_URL } from '@/lib/seo';
import { findLanding, locationLandings } from '@/config/locationLandings';
import { safe } from '@/lib/site-data';
import * as api from '@/lib/api/services';
import { ApiError } from '@/lib/api/client';
import type { Course, Locality } from '@/types/content';

type Params = Promise<{ landingSlug: string }>;

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
export async function generateStaticParams() {
  const [courses, localities] = await Promise.all([
    safe(() => api.fetchCourses(), [], 'landing:staticParams:courses'),
    safe(() => api.fetchLocalities(), [], 'landing:staticParams:localities'),
  ]);

  if (!courses.length || !localities.length) return [];

  const courseSlugs = new Set(courses.map((c) => c.slug));
  const localitySlugs = new Set(localities.map((l) => l.slug));

  return locationLandings
    .filter((l) => courseSlugs.has(l.courseSlug) && localitySlugs.has(l.localitySlug))
    .map((l) => ({ landingSlug: l.slug }));
}

async function getCourse(slug: string): Promise<Course | null> {
  try {
    return await api.fetchCourse(slug);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) return null;
    throw err;
  }
}

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
    return buildMetadata({
      title: '404 — Page Not Found | GloryTecks Hyderabad',
      description: 'Page not found.',
      noindex: true,
    });
  }

  const [course, localities] = await Promise.all([
    getCourse(landing.courseSlug),
    safe(() => api.fetchLocalities(), [], 'landing:meta:localities'),
  ]);
  const loc = localities.find((l) => l.slug === landing.localitySlug);

  if (!course || !loc) {
    return buildMetadata({
      title: 'Course in Hyderabad | GloryTecks',
      description: 'GloryTecks course in Hyderabad.',
      canonical: '/courses',
      noindex: true,
    });
  }

  return buildMetadata({
    title: `${course.title} Course in ${loc.name}, Hyderabad | GloryTecks — ${course.duration}`,
    description: describe(course, loc),
    canonical: `/${landing.slug}`,
    keywords: `${course.title.toLowerCase()} course ${loc.name.toLowerCase()}, ${course.title.toLowerCase()} training ${loc.name.toLowerCase()}, ${course.title.toLowerCase()} course hyderabad`,
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
    provider: {
      '@type': 'EducationalOrganization',
      '@id': `${SITE_URL}/#organization`,
      name: 'GloryTecks',
      url: SITE_URL,
      areaServed: { '@type': 'Place', name: `${loc.name}, Hyderabad` },
    },
    hasCourseInstance: [
      {
        '@type': 'CourseInstance',
        courseMode: 'onsite',
        location: {
          '@type': 'Place',
          name: `GloryTecks, Ameerpet, Hyderabad (serving ${loc.name})`,
        },
        courseWorkload: course.duration,
      },
      { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: course.duration },
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
