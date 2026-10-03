import { JsonLd } from './JsonLd';
import type { FaqItem } from '@/types/content';

/**
 * Course-page FAQPage JSON-LD, built from the FAQs the page actually shows.
 *
 * It previously emitted five hardcoded questions — about beginners, placement,
 * duration, online batches and fees — that appeared nowhere on the page. The
 * page renders `course.faqs` from the CMS instead, so the structured data
 * described a different set of questions than the visitor could see. FAQ markup
 * has to correspond to visible content; a mismatch is a rich-results violation
 * and the kind of thing that earns a manual action rather than a rich result.
 *
 * Two of those hardcoded answers also asserted "100% placement assistance" and
 * "500+ hiring partners" as machine-readable facts on every course page. Those
 * numbers are business-supplied marketing copy from the CMS Settings record;
 * they can appear in visible page copy, but re-stating them as structured data
 * is a claim the site should not be making for itself.
 *
 * Emits nothing when a course has no FAQs, rather than inventing filler.
 */
export function CourseFaqSchema({ faqs }: { faqs?: FaqItem[] }) {
  const items = (faqs ?? []).filter((f) => f?.q && f?.a);
  if (items.length === 0) return null;

  return (
    <JsonLd
      schema={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      }}
    />
  );
}

export default CourseFaqSchema;
