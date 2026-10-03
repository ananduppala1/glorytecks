import Link from 'next/link';
import { ArrowRight, GraduationCap, Compass } from 'lucide-react';
import type { ClusterLink } from '@/lib/blog/clusters';

/**
 * Hub-and-spoke internal linking blocks.
 *
 * The audit found **zero** internal links in article body content — all
 * linking was chrome (breadcrumbs, prev/next, the sidebar course card). These
 * components add the two connections that were missing: a category archive to
 * the course it supports, and a course page back to the articles that support
 * it.
 *
 * Deliberately render-time rather than written into the CMS body text.
 * Published articles are editor-owned; rewriting 597 database rows from a
 * build script would overwrite editor changes and could not be reversed.
 *
 * Anchor text is always the linked page's own title, so anchors vary naturally
 * and are never keyword-stuffed, and every list is capped so no page ends up
 * linking to everything.
 */

/** Course CTA shown on a blog category archive — the spoke → hub link. */
export function CourseHubLink({
  courseSlug,
  courseTitle,
  categoryName,
  tagline,
}: {
  courseSlug: string;
  courseTitle: string;
  categoryName: string;
  tagline?: string;
}) {
  return (
    <aside className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-deep/25 to-primary/5 p-5 sm:p-6">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
        <GraduationCap className="h-4 w-4" /> Learn this properly
      </p>
      <h2 className="text-lg font-bold sm:text-xl">
        {courseTitle} course at GloryTecks
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {tagline
          ? tagline
          : `Structured, project-based training that covers ${categoryName} end to end, in classroom and live online batches.`}
      </p>
      <Link
        href={`/courses/${courseSlug}`}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        See the {courseTitle} curriculum <ArrowRight className="h-4 w-4" />
      </Link>
    </aside>
  );
}

/**
 * A short list of related reading. Used on category archives to surface the
 * differentiated articles, and on course pages to link into the cluster.
 */
export function ClusterReading({
  title,
  intro,
  links,
}: {
  title: string;
  intro?: string;
  links: ClusterLink[];
}) {
  if (links.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5 sm:p-6">
      <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Compass className="h-4 w-4" /> {title}
      </p>
      {intro && <p className="mb-3 text-sm text-muted-foreground">{intro}</p>}
      <ul className="mt-3 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="group flex items-baseline gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              <ArrowRight className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-primary/60 transition-transform group-hover:translate-x-0.5" />
              <span>
                {l.label}
                {l.note && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{l.note}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
