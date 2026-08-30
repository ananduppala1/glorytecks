import slugify from 'slugify';

/** Generate a URL slug consistent with the public site (lowercase, hyphenated). */
export function toSlug(input: string): string {
  return slugify(input, { lower: true, strict: true, trim: true });
}

/**
 * Ensure a slug is unique within a collection by appending -2, -3, … if needed.
 * `exists` checks whether a candidate already exists (excluding the current doc).
 */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const root = toSlug(base) || 'item';
  let candidate = root;
  let n = 2;
   
  while (await exists(candidate)) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  return candidate;
}
