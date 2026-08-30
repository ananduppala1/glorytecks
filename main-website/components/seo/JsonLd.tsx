// ─────────────────────────────────────────────────────────────────────────────
// Server-rendered structured data.
//
// Replaces the DOM-mutating half of the old `useSEO()` hook: instead of
// appending <script type="application/ld+json"> elements from a useEffect after
// hydration, the same JSON-LD is now part of the server response — so crawlers
// and social scrapers that never run JavaScript can read it.
//
// The payloads themselves are unchanged; only where they are emitted moved.
// ─────────────────────────────────────────────────────────────────────────────

type Schema = Record<string, unknown>;

/**
 * Render one or many JSON-LD documents.
 *
 * `JSON.stringify` output is escaped for `<` so a string containing "</script>"
 * inside CMS content cannot break out of the script element (XSS guard).
 */
export function JsonLd({ schema }: { schema: Schema | Schema[] | null | undefined }) {
  if (!schema) return null;
  const list = Array.isArray(schema) ? schema : [schema];
  if (list.length === 0) return null;

  return (
    <>
      {list.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(s).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  );
}

/**
 * <link rel="prev"> / <link rel="next"> for paginated archives.
 *
 * The Metadata API cannot express these, but React hoists <link> elements
 * rendered anywhere in the tree into <head>, which produces exactly the markup
 * the React app's `useSEO({ prevUrl, nextUrl })` used to inject.
 */
export function PaginationLinks({ prev, next }: { prev?: string; next?: string }) {
  return (
    <>
      {prev ? <link rel="prev" href={prev} /> : null}
      {next ? <link rel="next" href={next} /> : null}
    </>
  );
}

export default JsonLd;
