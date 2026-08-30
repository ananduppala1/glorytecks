import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Crumb = { name: string; url: string };

/**
 * Visible breadcrumb trail. Pairs with the BreadcrumbList JSON-LD emitted by
 * each page's <JsonLd schema={breadcrumbSchema(...)} />. "Home" is prepended
 * automatically; pass the rest in order.
 *
 * A pure Server Component — it has no state and no event handlers, so none of
 * its markup costs the browser any JavaScript.
 */
const Breadcrumbs = ({ items }: { items: Crumb[] }) => {
  const all = [{ name: "Home", url: "/" }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="container-px mx-auto max-w-7xl pt-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <li key={c.url} className="flex items-center gap-1.5">
              {last ? (
                <span className="text-foreground/80" aria-current="page">{c.name}</span>
              ) : (
                <Link href={c.url} className="hover:text-primary transition-colors">{c.name}</Link>
              )}
              {!last && <ChevronRight className="h-3 w-3 opacity-60" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
