import type { Metadata } from "next";
import { notFound } from "next/navigation";

import LegalPageView from "@/components/views/LegalPageView";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, buildMetadata } from "@/lib/seo";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";
import { ApiError } from "@/lib/api/client";

const SLUG = "editorial-policy";

async function getLegalDoc() {
  try {
    return await api.fetchLegalDoc(SLUG);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      return null;
    }
    throw error;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const document = await safe(
    () => api.fetchLegalDoc(SLUG),
    null,
    "legal:editorial-policy:metadata",
  );

  return buildMetadata({
    title:
      document?.metaTitle ||
      document?.title ||
      "Editorial Policy | GloryTecks",
    description:
      document?.metaDescription ||
      document?.intro ||
      "Editorial Policy for GloryTecks.",
    canonical: "/editorial-policy",
  });
}

export default async function EditorialPolicyPage() {
  const document = await getLegalDoc();

  if (!document) {
    notFound();
  }

  return (
    <>
      <JsonLd
        schema={[
          breadcrumbSchema([
            {
              name: "Editorial Policy",
              url: "/editorial-policy",
            },
          ]),
        ]}
      />

      <LegalPageView document={document} />
    </>
  );
}