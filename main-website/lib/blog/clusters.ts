// ─────────────────────────────────────────────────────────────────────────────
// Topical clusters — the hub-and-spoke map.
//
// A cluster is one course page (the commercial hub) plus the blog category
// that supports it (the informational spokes):
//
//     /courses/data-science            ← hub
//        └── /blog/category/data-science
//               ├── Data Science Roadmap        ┐
//               ├── Data Scientist Interview Qs │ pillars
//               ├── Data Science Projects       │
//               └── Data Scientist Salary       ┘
//
// The mapping is NOT invented here: every blog category already carries a
// `courseSlug` in the CMS (`CategoryKnowledge.courseSlug`), which is the
// editors' own statement of which course a topic supports. This module reads
// that field — it does not second-guess it.
//
// Pure and dependency-free so the SEO tests can exercise the selection rules
// without a backend.
// ─────────────────────────────────────────────────────────────────────────────
import { blogPath } from '@/lib/blog/merged';
import type { BlogPost, CategoryKnowledge, Course } from '@/types/content';

/**
 * Which article kinds make good pillars, best first.
 *
 * This ordering is a content judgement backed by the audit: `roadmap`,
 * `interview`, `projects`, `salary` and `certification` articles are the
 * cohorts that carry genuinely topic-specific substance. The 417 `guide`
 * articles are 92–97% near-identical within a category
 * (docs/BLOG_CONTENT_AUDIT.md §2), so they are deliberately ranked last —
 * featuring them would spend internal links on the weakest pages.
 */
const PILLAR_KIND_PRIORITY = [
  'roadmap',
  'interview',
  'projects',
  'salary',
  'certification',
  'comparison',
  'whatis',
  'guide',
] as const;

const kindRank = (kind?: string): number => {
  const i = PILLAR_KIND_PRIORITY.indexOf((kind ?? 'guide') as (typeof PILLAR_KIND_PRIORITY)[number]);
  return i === -1 ? PILLAR_KIND_PRIORITY.length : i;
};

/** Cap on links emitted per block, so no page links to everything. */
export const MAX_CLUSTER_LINKS = 4;

export interface ClusterLink {
  href: string;
  /** Anchor text — the article's own title, so anchors vary naturally. */
  label: string;
  /** Short qualifier shown beside the link, never inside the anchor. */
  note?: string;
}

/**
 * Pick the pillar articles for a cluster.
 *
 * Ranked by kind first (differentiated cohorts before generic guides), then by
 * recency, so the links point at the most useful and most current articles.
 * Returns at most {@link MAX_CLUSTER_LINKS}.
 */
export function pillarArticles(posts: BlogPost[], limit = MAX_CLUSTER_LINKS): ClusterLink[] {
  return [...posts]
    .sort((a, b) => {
      const byKind = kindRank(a.kind) - kindRank(b.kind);
      if (byKind !== 0) return byKind;
      return (b.updated || b.date || '').localeCompare(a.updated || a.date || '');
    })
    .slice(0, limit)
    .map((p) => ({
      href: blogPath(p.slug),
      label: p.title,
      note: p.readTime,
    }));
}

/**
 * The course a blog category supports, if that course is published.
 *
 * Returns null when the category names no course, or names one that is no
 * longer in the catalogue — a link is only worth emitting when it resolves.
 */
export function courseForCategory(
  category: Pick<CategoryKnowledge, 'courseSlug'> | undefined,
  courses: Course[],
): Course | null {
  if (!category?.courseSlug) return null;
  return courses.find((c) => c.slug === category.courseSlug) ?? null;
}

/**
 * The blog categories that support a given course — the reverse lookup, used
 * to link a course page back into its supporting articles.
 */
export function categoriesForCourse(
  courseSlug: string,
  categories: CategoryKnowledge[],
): CategoryKnowledge[] {
  return categories.filter((c) => c.courseSlug === courseSlug);
}

/**
 * Sibling categories inside the same cluster, for lateral navigation.
 * Excludes the current one and anything pointing at a different course.
 */
export function siblingCategories(
  current: CategoryKnowledge,
  categories: CategoryKnowledge[],
  limit = MAX_CLUSTER_LINKS,
): ClusterLink[] {
  return categories
    .filter((c) => c.slug !== current.slug && c.courseSlug === current.courseSlug)
    .slice(0, limit)
    .map((c) => ({ href: `/blog/category/${c.slug}`, label: c.name, note: c.short }));
}
