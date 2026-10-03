import type { Metadata } from "next";
import { notFound } from "next/navigation";

import LegalPageView from "@/components/views/LegalPageView";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, buildMetadata } from "@/lib/seo";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";
import { ApiError } from "@/lib/api/client";

const SLUG = "disclaimer";

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
    "legal:disclaimer:metadata",
  );

  return buildMetadata({
    title: document?.metaTitle || document?.title || "Disclaimer | GloryTecks",
    description:
      document?.metaDescription ||
      document?.intro ||
      "Disclaimer for GloryTecks.",
    canonical: "/disclaimer",
  });
}

export default async function DisclaimerPage() {
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
              name: "Disclaimer",
              url: "/disclaimer",
            },
          ]),
        ]}
      />

      <LegalPageView document={document} />
    </>
  );
}