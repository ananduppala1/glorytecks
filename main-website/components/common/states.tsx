"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Reusable async-state UI: spinner, error and empty states.
//
// Used everywhere data is fetched so the website shows a proper loading / error /
// empty state instead of silently rendering fallback content.
// ─────────────────────────────────────────────────────────────────────────────
import { AlertTriangle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Centered spinner — mirrors the App-level PageLoader. */
export function LoadingState({
  className = "",
  minHeight = "40vh",
  label = "Loading…",
}: {
  className?: string;
  minHeight?: string;
  label?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ minHeight }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Error panel with an optional retry. */
export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this content right now. Please try again.",
  onRetry,
  className = "",
  minHeight = "40vh",
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  minHeight?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 ${className}`}
      style={{ minHeight }}
      role="alert"
    >
      <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Empty-collection placeholder. */
export function EmptyState({
  title = "Nothing here yet",
  message = "There's no content to show right now. Please check back soon.",
  className = "",
  minHeight = "30vh",
}: {
  title?: string;
  message?: string;
  className?: string;
  minHeight?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 ${className}`}
      style={{ minHeight }}
    >
      <div className="h-14 w-14 rounded-2xl bg-secondary text-muted-foreground flex items-center justify-center mb-4">
        <Inbox className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">{message}</p>
    </div>
  );
}

interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingLabel?: string;
  errorTitle?: string;
  errorMessage?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  minHeight?: string;
  children: React.ReactNode;
}

/**
 * Declarative wrapper: renders the spinner / error / empty state as appropriate,
 * otherwise renders children. Keeps page bodies free of repetitive branching.
 */
export function QueryState({
  isLoading,
  isError,
  isEmpty = false,
  onRetry,
  loadingLabel,
  errorTitle,
  errorMessage,
  emptyTitle,
  emptyMessage,
  minHeight,
  children,
}: QueryStateProps) {
  if (isLoading) return <LoadingState label={loadingLabel} minHeight={minHeight} />;
  if (isError)
    return (
      <ErrorState title={errorTitle} message={errorMessage} onRetry={onRetry} minHeight={minHeight} />
    );
  if (isEmpty)
    return <EmptyState title={emptyTitle} message={emptyMessage} minHeight={minHeight} />;
  return <>{children}</>;
}
