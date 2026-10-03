import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BrochureDownloadView from "@/components/views/BrochureDownloadView";
import { buildMetadata } from "@/lib/seo";
import { knownSlugStatus } from "@/lib/seo/slugs";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";

type Params = Promise<{ slug: string }>;

/**
 * Brochure hand-off page, mounted outside the site chrome exactly as the React
 * route was (it rendered without header/footer).
 *
 * The PDF still streams from the backend's Cloudinary proxy, so the visitor
 * never sees a Cloudinary URL and the image/file infrastructure is untouched.
 * Fetching stays client-side on purpose: the browser must receive the blob to
 * open it, and proxying a multi-megabyte PDF through the Next.js server would
 * add a hop for no benefit.
 */
/**
 * `noindex` because this is a file hand-off, not a document — there is
 * nothing here for a search result to show. `follow` because it is linked from
 * every course page, and dropping the links on it throws away equity for no
 * reason. No canonical: a utility route must not consolidate itself onto a
 * content page.
 *
 * Deliberately NOT blocked in robots.txt — a crawler has to be able to
 * fetch this URL to see the directive.
 */
export const metadata: Metadata = buildMetadata({
  title: "Downloading brochure… | GloryTecks",
  description: "Your GloryTecks course brochure is being prepared for download.",
  index: false,
  follow: true,
});

export default async function BrochureDownloadPage({ params }: { params: Params }) {
  const { slug } = await params;

  // Every slug used to get a 200 — the spinner, then a client-side bounce to
  // /courses — so /brochures/anything/download was a soft 404. A slug that is
  // not a published course is now a real 404. The course list is the cached,
  // tagged read the course pages already share; if it cannot be read, the
  // page renders as before rather than 404ing every brochure.
  const courses = await safe(() => api.fetchCourses(), [], "brochure:courses");
  if (knownSlugStatus(slug, courses.map((c) => c.slug)) === 404) notFound();

  return <BrochureDownloadView slug={slug} />;
}
