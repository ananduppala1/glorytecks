import type { Metadata } from "next";
import { notFound } from "next/navigation";

import LegalPageView from "@/components/views/LegalPageView";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, buildMetadata } from "@/lib/seo";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";
import { ApiError } from "@/lib/api/client";

const SLUG = "privacy-policy";

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
    "legal:privacy-policy:metadata",
  );

  if (!document) {
    return {
      title: "Privacy Policy | GloryTecks",
      description: "Privacy Policy for GloryTecks.",
    };
  }

  return buildMetadata({
    title: document.metaTitle || document.title,
    description:
      document.metaDescription ||
      document.intro ||
      "Privacy Policy for GloryTecks.",
    canonical: "/privacy-policy",
  });
}

export default async function PrivacyPolicyPage() {
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
              name: "Privacy Policy",
              url: "/privacy-policy",
            },
          ]),
        ]}
      />

      <LegalPageView document={document} />
    </>
  );
}