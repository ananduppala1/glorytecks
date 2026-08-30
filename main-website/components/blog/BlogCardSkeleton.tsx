// ─────────────────────────────────────────────────────────────────────────────
// BlogCardSkeleton — layout-accurate placeholder shown while blog posts load.
//
// Mirrors the exact dimensions of <BlogCard /> so there is zero layout shift
// (CLS) when real content arrives.
// ─────────────────────────────────────────────────────────────────────────────
import { Skeleton } from "@/components/ui/skeleton";

export function BlogCardSkeleton() {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card"
      aria-hidden="true"
    >
      {/* Cover */}
      <Skeleton className="aspect-[16/9] w-full rounded-none" />

      <div className="flex flex-1 flex-col p-5">
        {/* Meta row */}
        <div className="mb-3 flex items-center gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-14" />
        </div>

        {/* Title */}
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-3 h-4 w-3/4" />

        {/* Excerpt */}
        <Skeleton className="mb-1.5 h-3 w-full" />
        <Skeleton className="mb-4 h-3 w-5/6" />

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}

/** A responsive grid of skeleton cards (defaults to one full page = 6). */
export function BlogGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading articles…</span>
      {Array.from({ length: count }).map((_, i) => (
        <BlogCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default BlogCardSkeleton;
