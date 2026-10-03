import type { LegalSection } from '@/types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert the database's canonical sections[] representation
 * into readable HTML for the admin Body textarea.
 */
export function sectionsToHtml(
  sections: LegalSection[] = [],
): string {
  return sections
    .map((section) => {
      const parts: string[] = [];

      if (section.heading?.trim()) {
        parts.push(`<h2>${escapeHtml(section.heading.trim())}</h2>`);
      }

      for (const paragraph of section.paragraphs ?? []) {
        const value = paragraph?.trim();

        if (value) {
          parts.push(`<p>${escapeHtml(value)}</p>`);
        }
      }

      if (section.bullets?.length) {
        const items = section.bullets
          .map((bullet) => bullet?.trim())
          .filter(Boolean)
          .map((bullet) => `<li>${escapeHtml(bullet as string)}</li>`)
          .join('');

        if (items) {
          parts.push(`<ul>${items}</ul>`);
        }
      }

      return parts.join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Convert the HTML entered in the admin Body field back into
 * the sections[] structure used by Supabase/backend/public website.
 *
 * Supported:
 * h1/h2/h3 → section heading
 * p        → paragraph
 * ul/ol    → bullet list
 * aside    → paragraph
 * blockquote → paragraph
 */
export function htmlToSections(
  html: string,
): LegalSection[] {
  if (!html?.trim()) return [];

  const parser = new DOMParser();
  const document = parser.parseFromString(html, 'text/html');

  const sections: LegalSection[] = [];
  let current: LegalSection | null = null;

  const ensureSection = (): LegalSection => {
    if (!current) {
      current = {
        heading: 'General',
        paragraphs: [],
        bullets: [],
      };

      sections.push(current);
    }

    return current;
  };

  const addParagraph = (text: string) => {
    const value = text.replace(/\s+/g, ' ').trim();

    if (!value) return;

    const section = ensureSection();

    section.paragraphs ??= [];
    section.paragraphs.push(value);
  };

  const addList = (element: Element) => {
    const section = ensureSection();

    section.bullets ??= [];

    const items = Array.from(element.children)
      .filter((child) => child.tagName.toLowerCase() === 'li')
      .map((child) => child.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter(Boolean);

    section.bullets.push(...items);
  };

  const walk = (parent: Element) => {
    for (const child of Array.from(parent.children)) {
      const tag = child.tagName.toLowerCase();

      if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
        const heading = child.textContent?.replace(/\s+/g, ' ').trim();

        if (heading) {
          current = {
            heading,
            paragraphs: [],
            bullets: [],
          };

          sections.push(current);
        }

        continue;
      }

      if (tag === 'p' || tag === 'aside' || tag === 'blockquote') {
        addParagraph(child.textContent ?? '');
        continue;
      }

      if (tag === 'ul' || tag === 'ol') {
        addList(child);
        continue;
      }

      walk(child);
    }
  };

  walk(document.body);

  return sections.map((section) => {
    const cleaned: LegalSection = {
      heading: section.heading,
    };

    if (section.paragraphs?.length) {
      cleaned.paragraphs = section.paragraphs;
    }

    if (section.bullets?.length) {
      cleaned.bullets = section.bullets;
    }

    return cleaned;
  });
}