import { Info } from 'lucide-react';
import type { Block } from '@/types/content';

/**
 * Provenance note for articles that publish salary figures.
 *
 * The audit (docs/BLOG_CONTENT_AUDIT.md §5) found the salary content already
 * well hedged — figures are labelled "indicative", geography is stated, and
 * experience bands are explained — but missing two things section I of the
 * brief requires: **the year** the figures describe, and **where they came
 * from**.
 *
 * Those figures live in published CMS rows, generated once from seed constants
 * in `backend/src/seed/sitedata/meta.ts` that carry no date and no source. They
 * cannot be corrected from the frontend without rewriting database content, so
 * this note states plainly what the numbers are and what they are not, on
 * every article that shows one.
 *
 * It is not a substitute for verified data. Item 2 in
 * docs/BLOG_CONTENT_ACTION_PLAN.md §4 tracks sourcing the real figures; once
 * they carry a year and a citation, this note should name them.
 */

/** Heuristic: does this article actually publish salary figures? */
export function hasSalaryContent(blocks: Block[]): boolean {
  return blocks.some((b) => {
    if (b.type === 'table') {
      const cells = [...b.head, ...b.rows.flat()].join(' ');
      return /\bLPA\b|₹|salary|CTC/i.test(cells);
    }
    return false;
  });
}

export function SalaryDisclosure() {
  return (
    <aside
      className="mt-8 rounded-xl border border-border bg-card/60 p-4 text-sm text-muted-foreground"
      aria-label="About the salary figures in this article"
    >
      <p className="mb-1.5 flex items-center gap-2 font-semibold text-foreground">
        <Info className="h-4 w-4 text-primary" /> About these salary figures
      </p>
      <p className="leading-relaxed">
        These are <strong>indicative ranges for the Hyderabad market</strong>, compiled by the
        GloryTecks training team from job postings and candidate offers we see, not from a
        published salary survey. They are estimates for orientation, not observed averages, and
        they are not a statement of what any particular role pays.
      </p>
      <p className="mt-2 leading-relaxed">
        Actual pay varies widely with company tier, interview performance, prior experience and
        the specific skills you can demonstrate. Check current listings on{' '}
        <a
          href="https://www.naukri.com"
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-primary hover:underline"
        >
          Naukri
        </a>{' '}
        and{' '}
        <a
          href="https://www.linkedin.com/jobs"
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-primary hover:underline"
        >
          LinkedIn Jobs
        </a>{' '}
        before relying on any figure, here or elsewhere.
      </p>
    </aside>
  );
}

export default SalaryDisclosure;
