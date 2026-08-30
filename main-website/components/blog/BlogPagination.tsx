// ─────────────────────────────────────────────────────────────────────────────
// BlogPagination — accessible numbered pagination (Prev · 1 … n · Next).
//
// • Page numbers render as real <Link>s (crawlable, SEO-friendly URLs).
// • Keyboard accessible, aria-current on the active page.
// • Ellipsis-collapses long ranges so the control never overflows on mobile.
//
// Migration note: the React version called preventDefault() and asked the parent
// to swap client state. Each page is now server-rendered from `?page=`, so the
// links navigate for real — every page of the archive is a complete HTML
// document that a crawler can read without executing JavaScript.
//
// With the click handler gone this has no state and no events, so it is a plain
// Server Component: it ships zero JavaScript, and it can accept the
// `buildPageUrl` callback that a client component would have rejected as an
// unserialisable prop.
// ─────────────────────────────────────────────────────────────────────────────
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPageTokens } from "@/lib/blog/pagination";

interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
  /** Builds the target URL (path + query string) for a given page number. */
  buildPageUrl: (page: number) => string;
}

const baseBtn =
  "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg border px-2.5 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

export function BlogPagination({
  currentPage,
  totalPages,
  buildPageUrl,
}: BlogPaginationProps) {
  if (totalPages <= 1) return null;

  const tokens = getPageTokens(currentPage, totalPages);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      className="mt-10 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
      role="navigation"
      aria-label="Blog pagination"
    >
      {/* Previous */}
      {hasPrev ? (
        <Link
          href={buildPageUrl(currentPage - 1)}
          rel="prev"
          aria-label="Go to previous page"
          className={`${baseBtn} border-border bg-card text-foreground hover:border-primary/50 hover:text-primary`}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${baseBtn} cursor-not-allowed border-border bg-card text-muted-foreground/40`}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </span>
      )}

      {/* Numbers */}
      {tokens.map((token, i) =>
        token === "ellipsis" ? (
          <span
            key={`e-${i}`}
            aria-hidden="true"
            className="px-1 text-sm text-muted-foreground select-none"
          >
            …
          </span>
        ) : token === currentPage ? (
          <span
            key={token}
            aria-current="page"
            className={`${baseBtn} border-primary bg-primary text-primary-foreground shadow-glow`}
          >
            {token}
          </span>
        ) : (
          <Link
            key={token}
            href={buildPageUrl(token)}
            aria-label={`Go to page ${token}`}
            className={`${baseBtn} border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-primary`}
          >
            {token}
          </Link>
        ),
      )}

      {/* Next */}
      {hasNext ? (
        <Link
          href={buildPageUrl(currentPage + 1)}
          rel="next"
          aria-label="Go to next page"
          className={`${baseBtn} border-border bg-card text-foreground hover:border-primary/50 hover:text-primary`}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${baseBtn} cursor-not-allowed border-border bg-card text-muted-foreground/40`}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}

export default BlogPagination;
