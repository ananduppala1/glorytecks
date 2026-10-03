import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CourseDetailView from "@/components/views/CourseDetailView";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { CourseFaqSchema } from "@/components/seo/CourseFaqSchema";
import { buildMetadata, notFoundMetadata, breadcrumbSchema, SITE_URL } from "@/lib/seo";
import { SCHEMA_ID, ref, webPageSchema } from "@/lib/schema";
import { safeUrl } from "@/lib/safeUrl";
import { categoriesForCourse, pillarArticles } from "@/lib/blog/clusters";
import { ClusterReading } from "@/components/blog/ClusterLinks";
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

/**
 * Meta description for a course.
 *
 * Rewritten to describe the course rather than sell it. The previous version
 * opened with "Enroll in the best …" and promised "100% placement assistance"
 * on every one of the nine course pages — a superlative the business cannot
 * substantiate and an outcome promise that is a consumer-protection risk, both
 * repeated verbatim nine times.
 */
function describe(course: Course) {
  const tools = course.tools.slice(0, 5).join(", ");
  return `${course.tagline} A ${course.duration} ${course.title} course in Hyderabad covering ${course.modules.length} modules${tools ? ` and tools including ${tools}` : ""}, taught in classroom and live online batches with placement support.`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug);

  // No canonical on a 404. Pointing it at /courses would consolidate a
  // missing page onto a live one, which is the pattern canonicals exist to
  // prevent. `follow` is kept so the 404 body's navigation is still crawled.
  if (!course) {
    return notFoundMetadata("Course Not Found | GloryTecks", "Course not found.");
  }

  return buildMetadata({
    // One intent per page: "<course> course Hyderabad". The previous title
    // bolted the duration and "100% Placement Support" onto every course,
    // which pushed the distinguishing part past the SERP truncation point.
    title: `${course.title} Course in Hyderabad | GloryTecks`,
    description: describe(course),
    canonical: `/courses/${course.slug}`,
    // The CMS banner is a real, course-specific image — a far better social
    // card than the shared site default. Vetted because it is a CMS string.
    ogImage: safeUrl(course.bannerImage),
  });
}

export default async function CourseDetailPage({ params }: { params: Params }) {
  const { slug } = await params;

  // The settings read that used to be here fed the hardcoded FAQ block; the
  // FAQs now come from the course itself, so the request is gone.
  const [course, allCourses, categories] = await Promise.all([
    getCourse(slug),
    safe(() => api.fetchCourses(), [], "course:related"),
    safe(() => api.fetchCategories(), [], "course:categories"),
  ]);

  if (!course) notFound();

  // Articles that support this course, newest and most substantive first.
  const clusterCats = categoriesForCourse(course.slug, categories);
  const clusterPosts = clusterCats.length
    ? await safe(
        async () =>
          (await api.fetchBlogs({ categorySlug: clusterCats[0].slug, limit: 12, sort: "-date" }))
            .items,
        [],
        "course:clusterPosts",
      )
    : [];
  const clusterReading = pillarArticles(clusterPosts);

  const crumbs = [
    { name: "Courses", url: "/courses" },
    { name: `${course.title} Course`, url: `/courses/${course.slug}` },
  ];

  /**
   * Course schema built strictly from CMS fields that exist.
   *
   * Removed, because nothing on the page or in the database supports them:
   *   • `offers` — asserted `category: "Paid"`, `priceCurrency: "INR"` and
   *     `availability: InStock` on every course while no price is published
   *     anywhere on the site. An Offer with a currency but no price is an
   *     incomplete offer, and claiming availability for a course with no
   *     published dates is an assertion the page cannot back.
   *   • `coursePrerequisites: "Basic computer knowledge"` — invented; the CMS
   *     has no prerequisites field.
   *   • `educationalLevel: "Beginner to Advanced"` — invented, and meaningless
   *     as a range.
   *   • The inline provider address block — the provider is now referenced by
   *     @id so there is exactly one organization node in the graph.
   *
   * `name` is the plain course name, not a promotional string.
   */
  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${SITE_URL}/courses/${course.slug}#course`,
    name: `${course.title} Course`,
    description: course.description || course.tagline,
    url: `${SITE_URL}/courses/${course.slug}`,
    inLanguage: "en-IN",
    provider: ref(SCHEMA_ID.organization),
    isPartOf: ref(SCHEMA_ID.website),
    ...(course.modules.length ? { teaches: course.modules } : {}),
    ...(course.bannerImage && safeUrl(course.bannerImage)
      ? { image: safeUrl(course.bannerImage) }
      : {}),
    about: { "@type": "Thing", name: course.title },
    // Both delivery modes are stated on the page and in the FAQ block. Duration
    // is a real CMS field. Nothing else is asserted about an instance.
    hasCourseInstance: [
      {
        "@type": "CourseInstance",
        courseMode: "onsite",
        location: ref(SCHEMA_ID.localBusiness),
        inLanguage: "en-IN",
        ...(course.duration ? { courseWorkload: course.duration } : {}),
      },
      {
        "@type": "CourseInstance",
        courseMode: "online",
        inLanguage: "en-IN",
        ...(course.duration ? { courseWorkload: course.duration } : {}),
      },
    ],
  };

  // The page node every other page type already has: it ties the course page
  // into the website graph and names the Course as what the page is about.
  // Name and description are the visible H1 and the visible CMS description.
  const pageSchema = webPageSchema({
    path: `/courses/${course.slug}`,
    name: `${course.title} Course in Hyderabad`,
    description: course.description || course.tagline,
    mainEntity: courseSchema["@id"],
  });

  return (
    <>
      <JsonLd schema={[pageSchema, courseSchema, breadcrumbSchema(crumbs)]} />
      <CourseFaqSchema faqs={course.faqs} />
      <Breadcrumbs items={crumbs} />
      <CourseDetailView course={course} allCourses={allCourses} />
      {/*
        Hub → spoke. The course page previously linked only to other courses;
        the ~50 articles written to support it received no link from the page
        they support, so the cluster had no return path. Cluster membership
        comes from the CMS's own category.courseSlug field.
      */}
      {clusterReading.length > 0 && (
        <div className="container-px mx-auto max-w-4xl pb-20">
          <ClusterReading
            title={`Free guides on ${course.title}`}
            intro="Written by the same trainers who teach the course."
            links={clusterReading}
          />
        </div>
      )}
    </>
  );
}
