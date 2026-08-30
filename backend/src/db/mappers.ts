/**
 * Row ⇄ API mapping engine.
 *
 * PostgreSQL columns are snake_case and sub-documents are flattened into
 * prefixed columns (`seo_meta_title`, `salary_fresher`, `hero_badge`…).
 * The API contract, however, is the camelCase / nested shape the admin panel
 * and the marketing site have always consumed. Everything that reconciles the
 * two lives here, so no controller or service has to think about it.
 *
 * Two rules preserve the previous Mongoose behaviour exactly:
 *
 *  1. NULL columns are omitted from the output. Mongoose left unset optional
 *     paths off the serialised document entirely; emitting `"avatar": null`
 *     instead of nothing would be a (small) contract change.
 *
 *  2. Partial writes only touch the keys actually present in the payload.
 *     `doc.set({ seo: { metaTitle: 'x' } })` used to update that one leaf and
 *     leave its siblings alone; the codecs below reproduce that leaf-level
 *     merge instead of overwriting the whole sub-document.
 */

export type Row = Record<string, unknown>;

/** A field whose API representation spans several columns. */
export interface FieldCodec {
  /** API field name produced/consumed by this codec. */
  field: string;
  /** Columns owned by this codec (used to build SELECT lists). */
  columns: string[];
  /** Build the API value from a database row. */
  fromRow(row: Row): unknown;
  /** Build a partial column set from an API value. */
  toRow(value: unknown): Row;
}

/** A Mongoose `ref` turned into a foreign key plus a PostgREST embedded read. */
export interface RelationDef {
  /** API field name, e.g. "author". */
  field: string;
  /** Foreign-key column, e.g. "author_id". */
  column: string;
  /** Related table, e.g. "authors". */
  table: string;
  /** Columns selected from the related table on list reads. */
  select: string[];
  /** Extra columns selected on single-document reads (e.g. bio). */
  detailSelect?: string[];
}

export interface TableDef {
  /** PostgreSQL table name. */
  table: string;
  /**
   * Complete API field → column map for plain scalar/array fields.
   * This doubles as the allow-list for sorting and filtering: anything not
   * named here can never reach a query, which is what keeps user-supplied
   * `?sort=` and `?status=` values from touching SQL identifiers.
   */
  columns: Record<string, string>;
  /** Multi-column fields (seo, salary, nested settings objects). */
  codecs?: FieldCodec[];
  /** Foreign-key relations rendered as embedded objects on read. */
  relations?: RelationDef[];
  /** Table carries created_at / updated_at. Default true. */
  timestamps?: boolean;
}

/* ── Value helpers ────────────────────────────────────────────────────────── */

const isNil = (v: unknown): boolean => v === null || v === undefined;

/**
 * Normalise a timestamptz to the exact format Mongoose/JSON produced before
 * ("2024-01-01T00:00:00.000Z"). PostgREST returns "+00:00" offsets, which
 * parse identically but do not stringify identically — and response bodies
 * are compared by at least one consumer, so keep the old shape.
 */
export function toIsoString(value: unknown): string | undefined {
  if (isNil(value)) return undefined;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

const TIMESTAMP_FIELDS = new Set(['createdAt', 'updatedAt', 'lastLoginAt', 'publishedAt']);

/* ── Codec builders ───────────────────────────────────────────────────────── */

/**
 * Build a codec for a fixed-shape sub-document flattened into prefixed columns.
 * `shape` maps the sub-document's own keys to their column names.
 */
export function objectCodec(
  field: string,
  shape: Record<string, string>,
  opts: { alwaysPresent?: string[] } = {},
): FieldCodec {
  const keys = Object.keys(shape);
  const always = new Set(opts.alwaysPresent ?? []);
  return {
    field,
    columns: keys.map((k) => shape[k]),
    fromRow(row) {
      const out: Row = {};
      for (const key of keys) {
        const value = row[shape[key]];
        // Keys with a schema default (keywords, noindex) were always present on
        // the old documents; the rest only appeared once set.
        if (isNil(value) && !always.has(key)) continue;
        out[key] = isNil(value) ? null : value;
      }
      return out;
    },
    toRow(value) {
      if (isNil(value) || typeof value !== 'object') return {};
      const input = value as Row;
      const out: Row = {};
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(input, key)) out[shape[key]] = input[key];
      }
      return out;
    },
  };
}

/**
 * Codec for a sub-document that itself contains nested objects/arrays
 * (settings.heroSection, aboutPage.hero). `build` reads the row, `flatten`
 * turns a partial API value back into columns — both written explicitly so the
 * nested leaf-merge semantics stay obvious.
 */
export function customCodec(
  field: string,
  columns: string[],
  build: (row: Row) => unknown,
  flatten: (value: Row) => Row,
): FieldCodec {
  return {
    field,
    columns,
    fromRow: build,
    toRow(value) {
      if (isNil(value) || typeof value !== 'object') return {};
      return flatten(value as Row);
    },
  };
}

/** The `seo` sub-document, shared by blogs, courses, settings and about_page. */
export const seoCodec = (): FieldCodec =>
  objectCodec(
    'seo',
    {
      metaTitle: 'seo_meta_title',
      metaDescription: 'seo_meta_description',
      canonicalUrl: 'seo_canonical_url',
      ogTitle: 'seo_og_title',
      ogDescription: 'seo_og_description',
      ogImage: 'seo_og_image',
      keywords: 'seo_keywords',
      noindex: 'seo_noindex',
    },
    // These two had Mongoose defaults, so they were always serialised.
    { alwaysPresent: ['keywords', 'noindex'] },
  );

/** `salary` band on blog categories. */
export const salaryCodec = (): FieldCodec =>
  objectCodec(
    'salary',
    { fresher: 'salary_fresher', mid: 'salary_mid', senior: 'salary_senior' },
    { alwaysPresent: ['fresher', 'mid', 'senior'] },
  );

/* ── Row → API ────────────────────────────────────────────────────────────── */

/** Map an embedded relation row (from a PostgREST join) to the API shape. */
function mapRelated(value: unknown): unknown {
  if (isNil(value)) return undefined;
  if (Array.isArray(value)) {
    // PostgREST returns an array for to-many embeds; these are all to-one.
    return value.length ? mapRelated(value[0]) : undefined;
  }
  const row = value as Row;
  const out: Row = {};
  for (const [key, v] of Object.entries(row)) {
    if (isNil(v)) continue;
    if (key === 'id') {
      out.id = v;
      out._id = v;
      continue;
    }
    out[snakeToCamel(key)] = v;
  }
  return out;
}

export function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
}

/**
 * Convert a database row into the API document shape.
 * Emits both `id` and `_id` (identical values) because list rows previously
 * carried both and at least one client may still read `_id`.
 */
export function rowToApi<T>(def: TableDef, row: Row | null): T | null {
  if (!row) return null;
  const out: Row = {};

  const id = row.id;
  if (!isNil(id)) {
    out.id = id;
    out._id = id;
  }

  for (const [field, column] of Object.entries(def.columns)) {
    if (field === 'id') continue;
    if (!(column in row)) continue; // column not selected — omit rather than null
    const value = row[column];
    if (isNil(value)) continue; // unset path → key absent, as before
    out[field] = TIMESTAMP_FIELDS.has(field) ? toIsoString(value) : value;
  }

  for (const codec of def.codecs ?? []) {
    // Only emit the field when at least one of its columns was selected.
    if (!codec.columns.some((c) => c in row)) continue;
    out[codec.field] = codec.fromRow(row);
  }

  for (const rel of def.relations ?? []) {
    if (rel.field in row) {
      const mapped = mapRelated(row[rel.field]);
      if (mapped !== undefined) out[rel.field] = mapped;
    } else if (rel.column in row && !isNil(row[rel.column])) {
      // Relation not embedded in this query — surface the raw id.
      out[rel.field] = row[rel.column];
    }
  }

  if (def.timestamps !== false) {
    const created = toIsoString(row.created_at);
    const updated = toIsoString(row.updated_at);
    if (created) out.createdAt = created;
    if (updated) out.updatedAt = updated;
  }

  return out as T;
}

export function rowsToApi<T>(def: TableDef, rows: Row[] | null): T[] {
  return (rows ?? []).map((r) => rowToApi<T>(def, r) as T);
}

/* ── API → Row ────────────────────────────────────────────────────────────── */

/**
 * Convert an API payload into a partial database row.
 * Only keys actually present in the payload produce columns, so PATCH-style
 * partial updates never blank out fields the caller did not mention.
 * Unknown keys are dropped — a client cannot write a column that is not in the
 * table definition (this is what stops `role`/`id` injection through a body).
 */
export function apiToRow(def: TableDef, payload: Record<string, unknown>): Row {
  const out: Row = {};
  if (!payload || typeof payload !== 'object') return out;

  for (const [field, column] of Object.entries(def.columns)) {
    // id and the timestamps are database-managed.
    if (field === 'id' || field === 'createdAt' || field === 'updatedAt') continue;
    if (!Object.prototype.hasOwnProperty.call(payload, field)) continue;
    out[column] = payload[field];
  }

  for (const codec of def.codecs ?? []) {
    if (!Object.prototype.hasOwnProperty.call(payload, codec.field)) continue;
    Object.assign(out, codec.toRow(payload[codec.field]));
  }

  for (const rel of def.relations ?? []) {
    if (!Object.prototype.hasOwnProperty.call(payload, rel.field)) continue;
    const value = payload[rel.field];
    if (isNil(value) || value === '') {
      out[rel.column] = null;
    } else if (typeof value === 'string') {
      out[rel.column] = value;
    } else if (typeof value === 'object' && !isNil((value as Row).id)) {
      // Tolerate a populated object being sent back unchanged by the client.
      out[rel.column] = (value as Row).id;
    }
  }

  return out;
}

/* ── SELECT list construction ─────────────────────────────────────────────── */

/**
 * Build a PostgREST `select` string.
 * `fields` restricts the projection to specific API fields (used by the public
 * blog list, which deliberately excludes the heavy body columns).
 */
export function buildSelect(
  def: TableDef,
  opts: { fields?: string[]; detail?: boolean } = {},
): string {
  const parts: string[] = ['id'];
  const wanted = opts.fields ? new Set(opts.fields) : null;

  for (const [field, column] of Object.entries(def.columns)) {
    if (field === 'id') continue;
    if (field === 'createdAt' || field === 'updatedAt') continue;
    if (wanted && !wanted.has(field)) continue;
    parts.push(column);
  }

  for (const codec of def.codecs ?? []) {
    if (wanted && !wanted.has(codec.field)) continue;
    parts.push(...codec.columns);
  }

  for (const rel of def.relations ?? []) {
    if (wanted && !wanted.has(rel.field)) continue;
    const cols = opts.detail ? [...rel.select, ...(rel.detailSelect ?? [])] : rel.select;
    parts.push(`${rel.field}:${rel.table}(${['id', ...cols].join(',')})`);
  }

  if (def.timestamps !== false) {
    if (!wanted || wanted.has('createdAt')) parts.push('created_at');
    if (!wanted || wanted.has('updatedAt')) parts.push('updated_at');
  }

  return parts.join(',');
}

/**
 * Resolve an API field name to its column, or null when it is not part of the
 * table. Used by the sort/filter translators; returning null makes the caller
 * ignore unknown input instead of forwarding it to the database.
 */
export function resolveColumn(def: TableDef, field: string): string | null {
  if (field === 'id') return 'id';
  if (def.columns[field]) return def.columns[field];
  const rel = (def.relations ?? []).find((r) => r.field === field);
  if (rel) return rel.column;
  // Allow sorting/filtering on a flattened leaf, e.g. "seo.metaTitle".
  if (field.includes('.')) {
    const [head, leaf] = field.split('.');
    const codec = (def.codecs ?? []).find((c) => c.field === head);
    if (codec) {
      const guess = codec.columns.find((c) => snakeToCamel(c).endsWith(leaf.replace(/^./, (m) => m.toUpperCase())));
      if (guess) return guess;
    }
  }
  if (def.timestamps !== false) {
    if (field === 'createdAt') return 'created_at';
    if (field === 'updatedAt') return 'updated_at';
  }
  return null;
}
