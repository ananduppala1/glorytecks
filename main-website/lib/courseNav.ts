// ─────────────────────────────────────────────────────────────────────────────
// Derives the course navigation grouping (formerly the static `courseCategories`)
// from the live courses list. The backend already returns courses ordered by
// `order` then `title`, so the header dropdown and the Courses page keep the same
// ordering — driven entirely by the CMS now.
// ─────────────────────────────────────────────────────────────────────────────
import type { Course } from "@/types/content";

export interface CourseNavGroup {
  label: string;
  items: { label: string; slug: string }[];
}

/** Each course becomes its own labelled group (preserving the original layout). */
export function buildCourseNav(courses: Course[] | undefined): CourseNavGroup[] {
  if (!courses?.length) return [];
  return courses.map((c) => ({
    label: c.title,
    items: [{ label: c.title, slug: c.slug }],
  }));
}
