import type { Metadata } from "next";
import CoursesView from "@/components/views/CoursesView";
import { JsonLd } from "@/components/seo/JsonLd";
import { staticPageMetadata, breadcrumbSchema, staticRoute } from "@/lib/seo";
import { courseListSchema, webPageSchema } from "@/lib/schema";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";

// Title, description, canonical and indexability all come from the
// route registry in lib/seo/routes.ts, which is also what the sitemap and the
// indexability matrix read — so the three cannot drift apart.
export const metadata: Metadata = staticPageMetadata("/courses");

const route = staticRoute("/courses");


export default async function CoursesPage() {
  const courses = await safe(() => api.fetchCourses(), [], "courses:list");

  return (
    <>
      <JsonLd schema={[webPageSchema({
          path: route.path,
          name: route.title,
          description: route.description,
          type: "CollectionPage",
        }), breadcrumbSchema([{ name: "Courses", url: "/courses" }]),
        // The list the page renders (all courses, before any client-side
        // filter), for the course list rich result. Omitted if the API failed.
        ...(courses.length ? [courseListSchema(courses)] : [])]} />
      <CoursesView courses={courses} />
    </>
  );
}
