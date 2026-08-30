"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary.
 *
 * Renders the same visual language as the app-level ErrorBoundary. The raw
 * error is logged to the server console only — no stack trace, backend message
 * or digest is ever shown to a visitor.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
      <div className="max-w-md text-center">
        <div className="text-6xl font-bold gradient-text mb-4">Oops</div>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-6">
          We&rsquo;re sorry for the inconvenience. Please try again in a moment.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
          <a
            href="tel:+919908099980"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-6 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            Call Us
          </a>
        </div>
      </div>
    </div>
  );
}
