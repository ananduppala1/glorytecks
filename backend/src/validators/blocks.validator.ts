import { LIMITS } from './common';

/**
 * Structural validation for blog content blocks.
 *
 * These are the most dangerous objects the API accepts. They are authored by
 * an administrator, stored, rendered to HTML server-side by `utils/blocks`,
 * and that HTML is served by the PUBLIC api to every anonymous visitor. So the
 * threat model is not "a hostile stranger" — it is a compromised or malicious
 * authenticated account, which is exactly the case the brief says must still be
 * contained.
 *
 * Escaping is handled at render time (`blocksToHtml` escapes every
 * interpolation and passes every URL through a scheme guard). This file covers
 * what escaping cannot: shape and size. An escaped 50 MB paragraph is still 50
 * MB, and a `table` whose `rows` is `[[[[…]]]]` still has to be walked.
 *
 * Anything not matching a known block shape is REJECTED rather than dropped.
 * Silently discarding part of a post loses an author's work without telling
 * them; refusing the save tells them immediately.
 */

type Problem = string | null;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** A bounded string field on a block. */
function text(value: unknown, field: string, max: number, required = false): Problem {
  if (value === undefined || value === null) {
    return required ? `${field} is required` : null;
  }
  if (typeof value !== 'string') return `${field} must be text`;
  if (value.length > max) return `${field} must be at most ${max} characters`;
  return null;
}

/** A bounded array of bounded strings. */
function textList(value: unknown, field: string, maxItems: number, maxLength: number): Problem {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return `${field} must be a list`;
  if (value.length > maxItems) return `${field} may contain at most ${maxItems} items`;
  for (const entry of value) {
    const problem = text(entry, `each ${field} item`, maxLength);
    if (problem) return problem;
  }
  return null;
}

const CALLOUT_VARIANTS = new Set(['info', 'tip', 'warning', 'success']);

/** Validate one block. Returns a message, or null when the block is fine. */
function validateBlock(block: unknown, index: number): Problem {
  const at = `Block ${index + 1}`;
  if (!isPlainObject(block)) return `${at} must be an object`;

  const type = block.type;
  if (typeof type !== 'string') return `${at} is missing a type`;

  switch (type) {
    case 'heading':
    case 'subheading':
      return (
        text(block.text, `${at} text`, LIMITS.TITLE, true) ??
        // The id is interpolated into an HTML attribute. It is escaped at
        // render time; constraining it here means it also stays a usable
        // anchor rather than becoming an escaped wall of markup.
        text(block.id, `${at} id`, LIMITS.SLUG)
      );

    case 'paragraph':
      return text(block.text, `${at} text`, LIMITS.BLOCK_TEXT, true);

    case 'list':
      if (block.ordered !== undefined && typeof block.ordered !== 'boolean') {
        return `${at} "ordered" must be true or false`;
      }
      if (!Array.isArray(block.items)) return `${at} must have a list of items`;
      return textList(block.items, `${at} items`, LIMITS.LIST_ITEMS, LIMITS.SUMMARY);

    case 'table': {
      const headProblem = textList(block.head, `${at} header`, LIMITS.TABLE_COLS, LIMITS.LABEL);
      if (headProblem) return headProblem;
      if (!Array.isArray(block.rows)) return `${at} must have rows`;
      if (block.rows.length > LIMITS.TABLE_ROWS) {
        return `${at} may contain at most ${LIMITS.TABLE_ROWS} rows`;
      }
      for (const row of block.rows) {
        // Exactly two levels of nesting, no more: `rows` is string[][], and
        // without this check a deeper structure reaches the renderer.
        if (!Array.isArray(row)) return `${at} rows must each be a list of cells`;
        const cellProblem = textList(row, `${at} cells`, LIMITS.TABLE_COLS, LIMITS.SUMMARY);
        if (cellProblem) return cellProblem;
      }
      return null;
    }

    case 'code':
      return (
        text(block.code, `${at} code`, LIMITS.BLOCK_TEXT, true) ??
        // Rendered into `class="language-…"`. Escaped at render time; kept to
        // a language-identifier shape here so it stays meaningful.
        (block.lang !== undefined && !/^[A-Za-z0-9_+#-]{0,30}$/.test(String(block.lang))
          ? `${at} language is not a valid identifier`
          : null)
      );

    case 'callout':
      if (block.variant !== undefined && !CALLOUT_VARIANTS.has(String(block.variant))) {
        return `${at} variant must be one of: ${[...CALLOUT_VARIANTS].join(', ')}`;
      }
      return (
        text(block.title, `${at} title`, LIMITS.TITLE) ??
        text(block.text, `${at} text`, LIMITS.BLOCK_TEXT, true)
      );

    case 'quote':
      return (
        text(block.text, `${at} text`, LIMITS.SUMMARY, true) ??
        text(block.cite, `${at} citation`, LIMITS.LABEL)
      );

    case 'image':
      // The URL's scheme and host are enforced separately, for every mutating
      // request, by `guardMediaUrls` — including this one, which reaches it as
      // `content[n].url`. Only the shape is checked here.
      return (
        text(block.url, `${at} image URL`, LIMITS.URL, true) ??
        text(block.alt, `${at} alt text`, LIMITS.LABEL) ??
        text(block.caption, `${at} caption`, LIMITS.SUMMARY)
      );

    case 'faq': {
      if (!Array.isArray(block.items)) return `${at} must have a list of questions`;
      if (block.items.length > LIMITS.FAQS) {
        return `${at} may contain at most ${LIMITS.FAQS} questions`;
      }
      for (const item of block.items) {
        if (!isPlainObject(item)) return `${at} questions must be objects`;
        const problem =
          text(item.q, `${at} question`, LIMITS.TITLE, true) ??
          text(item.a, `${at} answer`, LIMITS.TEXT, true);
        if (problem) return problem;
      }
      return null;
    }

    default:
      return `${at} has an unsupported type: ${String(type).slice(0, 40)}`;
  }
}

/**
 * Validate a whole `content` array.
 *
 * Exposed as a plain function so it can be used both from an express-validator
 * chain and directly from a test, and so the blog service can reuse it if a
 * future code path builds blocks without going through a route.
 */
export function validateBlocks(value: unknown): Problem {
  if (value === undefined) return null;
  if (!Array.isArray(value)) return 'Content must be a list of blocks';
  if (value.length > LIMITS.BLOCKS) {
    return `A post may contain at most ${LIMITS.BLOCKS} blocks`;
  }
  for (let i = 0; i < value.length; i += 1) {
    const problem = validateBlock(value[i], i);
    if (problem) return problem;
  }
  return null;
}

/** express-validator `.custom()` adaptor. */
export const blocksCustomValidator = (value: unknown): boolean => {
  const problem = validateBlocks(value);
  if (problem) throw new Error(problem);
  return true;
};
