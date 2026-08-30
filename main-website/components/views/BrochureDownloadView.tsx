"use client";

import { useEffect, useRef } from "react";
import { brochureDownloadUrl } from "@/lib/api/services";

/**
 * Lightweight page mounted at `/brochures/:slug/download`.
 *
 * It fetches the PDF from the backend proxy endpoint in the background
 * (using the existing `brochureDownloadUrl` helper) and opens it in the
 * current tab via an Object URL. This keeps the browser address bar on
 * the frontend domain — the backend URL is never visible to the user.
 */
const BrochureDownloadView = ({ slug }: { slug: string }) => {
  const initiated = useRef(false);

  useEffect(() => {
    if (!slug || initiated.current) return;
    initiated.current = true;

    const url = brochureDownloadUrl(slug);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch brochure (${res.status})`);
        return res.blob();
      })
      .then((blob) => {
        // Ensure the blob is treated as a PDF regardless of the response type.
        const pdfBlob = new Blob([blob], { type: "application/pdf" });
        const objectUrl = URL.createObjectURL(pdfBlob);
        // /brochures/gen-ai/download

        // Replace the current page with the PDF so the address bar stays on
        // the frontend domain while the user views/downloads the file.
        window.location.replace(objectUrl);
        window.open(objectUrl, "_blank");

        // The object URL is revoked after a generous delay to give the
        // browser time to load the PDF viewer / start the download.
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      })
      .catch(() => {
        // On failure, fall back to the course list so the user isn't stranded.
        window.location.replace("/courses");
      });
  }, [slug]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Preparing brochure…</p>
      </div>
    </div>
  );
};

export default BrochureDownloadView;
