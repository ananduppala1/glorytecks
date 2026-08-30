import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CourseDetailView from "@/components/views/CourseDetailView";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { CourseFaqSchema } from "@/components/seo/CourseFaqSchema";
import { buildMetadata, breadcrumbSchema, SITE_URL } from "@/lib/seo";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";
import { ApiError } from "@/lib/api/client";
import type { Course } from "@/types/content";

type Params = Promise<{ slug: string }>;

/**
 * Fetch one published course. A 404 from the backend becomes `null` so the
 * route can render Next's not-found page with a real 404 status — the React
 * app could only ever return HTTP 200 with a "Course not found" body, which
 * search engines index as a soft 404.
 */
async function getCourse(slug: string): Promise<Course | null> {
  try {
    return await api.fetchCourse(slug);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) return null;
    throw err;
  }
}

/**
 * Pre-render every published course at build time. The catalogue is small and
 * fully enumerable from `/public/courses`, so this costs one request and makes
 * every course page a static document that revalidates on the content tier.
 */
export async function generateStaticParams() {
  const courses = await safe(() => api.fetchCourses(), [], "courses:staticParams");
  return courses.map((c) => ({ slug: c.slug }));
}

function describe(course: Course) {
  return `Enroll in the best ${course.title} course in Hyderabad at GloryTecks Ameerpet. ${course.tagline}. ${course.duration} program with ${course.modules.length}+ modules, real-time projects, expert mentors & 100% placement assistance. Tools: ${course.tools.slice(0, 6).join(", ")}.`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug);

  if (!course) {
    return buildMetadata({
      title: "Course Not Found | GloryTecks",
      description: "Course not found.",
      canonical: "/courses",
      noindex: true,
    });
  }

  return buildMetadata({
    title: `${course.title} Course in Hyderabad | GloryTecks — ${course.duration} | 100% Placement Support`,
    description: describe(course),
    canonical: `/courses/${course.slug}`,
    keywords: `${course.title} course Hyderabad, ${course.title} training Hyderabad, best ${course.title} course Hyderabad, ${course.title} institute Hyderabad, ${course.title} certification Hyderabad, ${course.title} with placement Hyderabad, learn ${course.title} Hyderabad, ${course.title} near me, Glorytecks ${course.title}, ${course.tools.slice(0, 4).join(", ")} training Hyderabad`,
    ogImage: course.bannerImage,
  });
}

export default async function CourseDetailPage({ params }: { params: Params }) {
  const { slug } = await params;

  const [course, allCourses, settings] = await Promise.all([
    getCourse(slug),
    safe(() => api.fetchCourses(), [], "course:related"),
    safe(() => api.fetchSettings(), null, "course:settings"),
  ]);

  if (!course) notFound();

  const crumbs = [
    { name: "Courses", url: "/courses" },
    { name: `${course.title} Course`, url: `/courses/${course.slug}` },
  ];

  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${SITE_URL}/courses/${course.slug}#course`,
    name: `${course.title} Course in Hyderabad`,
    description: describe(course),
    url: `${SITE_URL}/courses/${course.slug}`,
    timeRequired: course.duration,
    inLanguage: "en-IN",
    teaches: course.modules,
    coursePrerequisites: "Basic computer knowledge",
    educationalLevel: "Beginner to Advanced",
    about: { "@type": "Thing", name: course.title },
    provider: {
      "@type": "EducationalOrganization",
      "@id": `${SITE_URL}/#organization`,
      name: "GloryTecks",
      url: SITE_URL,
      address: {
        "@type": "PostalAddress",
        streetAddress: "603, Annapurna Block, Aditya Enclave",
        addressLocality: "Ameerpet, Hyderabad",
        addressRegion: "Telangana",
        postalCode: "500038",
        addressCountry: "IN",
      },
    },
    hasCourseInstance: [
      {
        "@type": "CourseInstance",
        courseMode: "onsite",
        location: { "@type": "Place", name: "GloryTecks, Ameerpet, Hyderabad" },
        inLanguage: "en-IN",
        courseWorkload: course.duration,
        offers: {
          "@type": "Offer",
          category: "Paid",
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
        },
      },
      {
        "@type": "CourseInstance",
        courseMode: "online",
        inLanguage: "en-IN",
        courseWorkload: course.duration,
        offers: {
          "@type": "Offer",
          category: "Paid",
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
        },
      },
    ],
  };

  return (
    <>
      <JsonLd schema={[courseSchema, breadcrumbSchema(crumbs)]} />
      <CourseFaqSchema
        courseTitle={course.title}
        duration={course.duration}
        phone={settings?.phone}
      />
      <Breadcrumbs items={crumbs} />
      <CourseDetailView course={course} allCourses={allCourses} />
    </>
  );
}
