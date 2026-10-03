import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResourceDetailView } from "@/components/views/ResourcesView";
import { RESOURCE_SLUGS, isResourceSlug, getResource } from "@/config/resources";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata, notFoundMetadata, breadcrumbSchema } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

/** The five resources are a fixed, in-repo set — fully static. */
export function generateStaticParams() {
  return RESOURCE_SLUGS.map((slug) => ({ slug }));
}

/**
 * The set above is the complete set: it comes from config/resources.ts, not
 * from a CMS, so a sixth resource cannot appear without a deploy. Closing the
 * route means an unknown slug is a static 404 served without invoking a
 * serverless function or touching the backend.
 */
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  // Unreachable while dynamicParams is false, but kept correct rather than
  // deleted: no canonical on a 404.
  if (!isResourceSlug(slug)) {
    return notFoundMetadata("Resource Not Found | GloryTecks", "This resource does not exist.");
  }

  const r = getResource(slug);
  // The React app rendered every /resources/:slug page under the parent's SEO
  // tags, so all five shared one title. Each now describes itself, using the
  // resource's own on-page copy rather than invented text.
  return buildMetadata({
    title: `${r.title} | GloryTecks Hyderabad`,
    description: r.desc,
    canonical: `/resources/${slug}`,
  });
}

export default async function ResourceDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  if (!isResourceSlug(slug)) notFound();

  const r = getResource(slug);

  return (
    <>
      <JsonLd
        schema={breadcrumbSchema([
          { name: "Resources", url: "/resources" },
          { name: r.title, url: `/resources/${slug}` },
        ])}
      />
      <ResourceDetailView slug={slug} />
    </>
  );
}
