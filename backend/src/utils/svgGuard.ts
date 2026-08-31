/**
 * SVG admission control.
 *
 * SVG is not an image format in the way JPEG is — it is an XML document that a
 * browser renders with full script, style and external-fetch capability. An
 * uploaded `.svg` served back with `Content-Type: image/svg+xml` and opened in
 * a top-level tab executes its own script in the origin that served it.
 *
 * Two decisions follow from that:
 *
 *  1. SVG uploads are DISABLED by default (`UPLOAD_ALLOW_SVG`, see config/env).
 *     Nothing in the product needs author-supplied SVG; raster formats cover
 *     every current use.
 *
 *  2. When an operator does enable it, this module REJECTS rather than
 *     rewrites. Sanitising by stripping — the usual approach — means shipping
 *     whatever the stripper failed to think of, and the bypass history for
 *     regex-based SVG sanitisers is long. Refusing anything not provably inert
 *     fails closed: the worst outcome is an editor being told to re-export
 *     their file as PNG.
 *
 * This is intentionally stricter than a real-world SVG corpus. It is meant for
 * simple author-produced marks and icons, not for arbitrary artwork.
 */

/** Elements permitted in an accepted SVG. Everything else is a rejection. */
const ALLOWED_ELEMENTS = new Set([
  'svg',
  'g',
  'defs',
  'title',
  'desc',
  'metadata',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'clippath',
  'mask',
  'lineargradient',
  'radialgradient',
  'stop',
  'pattern',
  'symbol',
  'marker',
  'switch',
  'use',
]);

/**
 * Elements whose entire purpose is to pull in, or execute, other content.
 * Listed separately so the rejection message can be specific.
 */
const FORBIDDEN_ELEMENTS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'embed',
  'object',
  'audio',
  'video',
  'image',
  'a',
  'animate',
  'animatetransform',
  'animatemotion',
  'set',
  'handler',
  'listener',
  'style',
  'filter',
  'feimage',
  'font-face-uri',
  'cursor',
]);

/** Attributes carrying a URL, which must therefore be scheme-checked. */
const URL_ATTRIBUTES = new Set([
  'href',
  'xlink:href',
  'src',
  'data',
  'from',
  'to',
  'values',
  'begin',
  'end',
  'attributename',
  'attributetype',
  'filter',
  'mask',
  'clip-path',
  'fill',
  'stroke',
  'style',
  'marker-start',
  'marker-mid',
  'marker-end',
]);

export type SvgVerdict = { ok: true } | { ok: false; reason: string };

/** Max document size we will even attempt to inspect. */
const MAX_SVG_BYTES = 512 * 1024;

/**
 * Decide whether an SVG document is safe to store and serve.
 *
 * The check is textual and deliberately over-broad: it is a gate, not a parser,
 * and every ambiguous construct is treated as hostile.
 */
export function validateSvg(buf: Buffer): SvgVerdict {
  if (buf.length > MAX_SVG_BYTES) {
    return { ok: false, reason: 'SVG document is too large to validate' };
  }

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return { ok: false, reason: 'SVG is not valid UTF-8' };
  }

  // Encoded payloads: an SVG that needs entities, CDATA or a DOCTYPE is not
  // the kind of simple asset this gate exists to admit.
  if (/<!DOCTYPE/i.test(text)) return { ok: false, reason: 'SVG must not declare a DOCTYPE' };
  if (/<!ENTITY/i.test(text)) return { ok: false, reason: 'SVG must not declare entities' };
  if (/<!\[CDATA\[/i.test(text)) return { ok: false, reason: 'SVG must not contain CDATA' };
  if (/<\?xml-stylesheet/i.test(text)) {
    return { ok: false, reason: 'SVG must not reference a stylesheet' };
  }
  // Numeric/hex character references are the standard way to smuggle a
  // forbidden keyword past a textual check.
  if (/&#/.test(text)) {
    return { ok: false, reason: 'SVG must not use character references' };
  }

  // Comments can hide markup from a naive scan; strip them, then re-check that
  // stripping did not splice new markup together.
  const withoutComments = text.replace(/<!--[\s\S]*?-->/g, '');

  const scan = scanTags(withoutComments);
  if ('reason' in scan) return { ok: false, reason: scan.reason };

  let sawSvgRoot = false;

  for (const tag of scan.tags) {
    const name = tag.name.toLowerCase();
    const local = name.includes(':') ? name.slice(name.indexOf(':') + 1) : name;
    const attrs = tag.attrs;

    if (FORBIDDEN_ELEMENTS.has(local)) {
      return { ok: false, reason: `SVG contains a disallowed element: <${local}>` };
    }
    if (!ALLOWED_ELEMENTS.has(local)) {
      return { ok: false, reason: `SVG contains an unrecognised element: <${local}>` };
    }
    if (local === 'svg') sawSvgRoot = true;

    // Any namespace other than SVG and xlink lets a document smuggle in XHTML.
    if (name.includes(':') && !name.startsWith('svg:')) {
      return { ok: false, reason: 'SVG must not use foreign namespace prefixes' };
    }

    const verdict = checkAttributes(attrs, local);
    if (!verdict.ok) return verdict;
  }

  if (!sawSvgRoot) return { ok: false, reason: 'SVG has no root element' };
  return { ok: true };
}

interface ScannedTag {
  /** Element name as written, including any namespace prefix. */
  name: string;
  /** Everything between the element name and the closing `>`. */
  attrs: string;
}

/**
 * Split a document into its tags, tracking quotes.
 *
 * A regex of the form `<name([^>]*)>` cannot do this: `>` is legal inside a
 * quoted attribute value, so `<rect fill="x>" onload="alert(1)"/>` ends the
 * match at the `>` inside `fill`, leaving `onload` outside every group the
 * attribute checks ever see. The remainder then contains no `<`, so the scan
 * simply ends and the handler is admitted. That is a full bypass of every
 * per-attribute rule below, so the tag boundary has to be found by walking the
 * text and honouring quotes rather than by a character class.
 *
 * Anything that cannot be tokenised — an unterminated tag, an unbalanced quote,
 * a stray `<` inside a tag — is an ERROR rather than a skip. A construct this
 * cannot parse is one whose meaning in a browser it cannot predict, and the
 * module's contract is to refuse those rather than pass them through.
 */
function scanTags(text: string): { tags: ScannedTag[] } | { reason: string } {
  const tags: ScannedTag[] = [];
  const isNameChar = (c: string) => /[-A-Za-z0-9_:.]/.test(c);
  let i = 0;

  while (i < text.length) {
    const lt = text.indexOf('<', i);
    if (lt < 0) break;

    // Comments are stripped before this runs; a surviving `<!--` means the
    // stripper found no terminator.
    if (text.startsWith('<!--', lt)) {
      return { reason: 'SVG contains an unterminated comment' };
    }
    // `<?xml version="1.0"?>` is the one processing instruction that reaches
    // here — `<?xml-stylesheet` is rejected above.
    if (text.startsWith('<?', lt)) {
      const end = text.indexOf('?>', lt + 2);
      if (end < 0) return { reason: 'SVG contains an unterminated processing instruction' };
      i = end + 2;
      continue;
    }
    // DOCTYPE, ENTITY and CDATA are all rejected above, so any other `<!` is
    // a markup declaration this gate does not model.
    if (text.startsWith('<!', lt)) {
      return { reason: 'SVG contains an unrecognised markup declaration' };
    }

    let j = lt + 1;
    if (text[j] === '/') j += 1;

    const nameStart = j;
    while (j < text.length && isNameChar(text[j])) j += 1;
    const name = text.slice(nameStart, j);
    if (!name) return { reason: 'SVG contains a malformed tag' };

    // Walk to the `>` that actually closes the tag, treating quoted regions as
    // opaque so a `>` inside a value does not end it early.
    const attrStart = j;
    let quote: string | null = null;
    let closed = false;
    while (j < text.length) {
      const c = text[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '>') {
        closed = true;
        break;
      } else if (c === '<') {
        // A `<` before the tag closed means the previous one never did.
        return { reason: 'SVG contains a malformed tag' };
      }
      j += 1;
    }
    if (!closed) {
      return { reason: quote ? 'SVG contains an unbalanced quote' : 'SVG contains an unterminated tag' };
    }

    tags.push({ name, attrs: text.slice(attrStart, j) });
    i = j + 1;
  }

  return { tags };
}

const ATTR_PATTERN = /([-A-Za-z0-9_:.]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>=`]+))/g;

function checkAttributes(attrs: string, element: string): SvgVerdict {
  // Any `on*` handler is script, whatever its value.
  if (/(^|[\s/])on[a-z]+\s*=/i.test(attrs)) {
    return { ok: false, reason: 'SVG must not define event handlers' };
  }
  // Namespace declarations pointing anywhere but SVG/xlink re-open the door to
  // XHTML content inside an otherwise-allowed element.
  const nsMatches = attrs.match(/xmlns(:[A-Za-z0-9_-]+)?\s*=\s*["']([^"']*)["']/gi) ?? [];
  for (const ns of nsMatches) {
    const value = ns.replace(/^[^=]*=\s*["']/, '').replace(/["']$/, '');
    if (
      value !== 'http://www.w3.org/2000/svg' &&
      value !== 'http://www.w3.org/1999/xlink' &&
      value !== ''
    ) {
      return { ok: false, reason: 'SVG declares a disallowed XML namespace' };
    }
  }

  let m: RegExpExecArray | null;
  ATTR_PATTERN.lastIndex = 0;
  while ((m = ATTR_PATTERN.exec(attrs)) !== null) {
    const name = m[1].toLowerCase();
    const value = (m[3] ?? m[4] ?? m[5] ?? '').trim();

    if (name.startsWith('on')) {
      return { ok: false, reason: 'SVG must not define event handlers' };
    }
    if (name === 'style' || URL_ATTRIBUTES.has(name)) {
      const verdict = checkValue(name, value, element);
      if (!verdict.ok) return verdict;
    }
  }
  return { ok: true };
}

/** Schemes and CSS constructs that can fetch or execute. */
const DANGEROUS_VALUE = /(javascript|vbscript|livescript|mocha|data|blob|file|about)\s*:/i;

function checkValue(name: string, value: string, element: string): SvgVerdict {
  // Strip whitespace and control characters before scheme matching: a newline or
  // tab spliced into the middle of a scheme name is the classic way past a
  // naive substring check, and browsers ignore it.
  const collapsed = value.replace(/[\s\u0000-\u0020\u007f-\u009f]/g, '');

  if (DANGEROUS_VALUE.test(collapsed)) {
    return { ok: false, reason: `SVG attribute "${name}" uses a disallowed URL scheme` };
  }

  // `url(#gradient)` is how a fill references a <lineargradient> in the same
  // document and is safe; any other url() reaches off-document.
  const externalUrl = /url\s*\(\s*['\"]?\s*(?!#)/i;
  if (externalUrl.test(collapsed) || /@import|expression\s*\(|behavior\s*:|-moz-binding/i.test(collapsed)) {
    return { ok: false, reason: `SVG attribute "${name}" must not fetch external resources` };
  }

  if ((name === 'href' || name === 'xlink:href') && value) {
    // Only same-document references (`#id`) are ever needed by <use>.
    if (!collapsed.startsWith('#')) {
      return { ok: false, reason: 'SVG may only reference elements within the same document' };
    }
    if (element !== 'use' && element !== 'lineargradient' && element !== 'radialgradient') {
      return { ok: false, reason: `SVG element <${element}> must not carry a reference` };
    }
  }
  return { ok: true };
}
