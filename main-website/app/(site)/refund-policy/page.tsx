import type { Metadata } from "next";
import { notFound } from "next/navigation";

import LegalPageView from "@/components/views/LegalPageView";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, buildMetadata } from "@/lib/seo";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";
import { ApiError } from "@/lib/api/client";

const SLUG = "refund-policy";

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
    "legal:refund-policy:metadata",
  );

  return buildMetadata({
    title: document?.metaTitle || document?.title || "Refund Policy | GloryTecks",
    description:
      document?.metaDescription ||
      document?.intro ||
      "Refund Policy for GloryTecks.",
    canonical: "/refund-policy",
  });
}

export default async function RefundPolicyPage() {
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
              name: "Refund Policy",
              url: "/refund-policy",
            },
          ]),
        ]}
      />

      <LegalPageView document={document} />
    </>
  );
}