import type { Metadata } from "next";
import { notFound } from "next/navigation";

import LegalPageView from "@/components/views/LegalPageView";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, buildMetadata } from "@/lib/seo";
import { safe } from "@/lib/site-data";
import * as api from "@/lib/api/services";
import { ApiError } from "@/lib/api/client";

const SLUG = "cookie-policy";

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
    "legal:cookie-policy:metadata",
  );

  return buildMetadata({
    title: document?.metaTitle || document?.title || "Cookie Policy | GloryTecks",
    description:
      document?.metaDescription ||
      document?.intro ||
      "Cookie Policy for GloryTecks.",
    canonical: "/cookie-policy",
  });
}

export default async function CookiePolicyPage() {
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
              name: "Cookie Policy",
              url: "/cookie-policy",
            },
          ]),
        ]}
      />

      <LegalPageView document={document} />
    </>
  );
}