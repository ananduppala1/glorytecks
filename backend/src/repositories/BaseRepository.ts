import { PostgrestError } from '@supabase/supabase-js';
import { supabaseAdmin } from '../config/supabase';
import { ApiError } from '../utils/ApiError';
import { isConnectivityFailure, SERVICE_UNAVAILABLE_MESSAGE } from '../utils/errorKind';
import {
  TableDef,
  Row,
  rowToApi,
  rowsToApi,
  apiToRow,
  buildSelect,
  resolveColumn,
} from '../db/mappers';

/**
 * Data-access layer over Supabase PostgreSQL.
 *
 * Everything the application used to express in Mongoose is expressed here in
 * PostgREST terms, and nowhere else — controllers and services never touch the
 * database client directly.
 *
 *   find(filter)                 -> .select() with .eq()/.neq()/… filters
 *   findOne(filter)              -> .limit(1).maybeSingle()
 *   findById(id)                 -> .eq('id', …).maybeSingle()
 *   countDocuments(filter)       -> .select('id', { head: true, count: 'exact' })
 *   .skip(n).limit(n)            -> .range(from, to)
 *   .sort({ field: -1 })         -> .order(column, { ascending: false })
 *   .populate('author')          -> embedded select  author:authors(...)
 *   { field: /term/i } $or       -> or=(field.ilike."%term%", …)
 *   { tags: /term/i }            -> tags_text.ilike."%term%"  (generated column)
 *
 * Values are always passed as parameters through the client — no SQL string is
 * ever assembled from user input, and identifiers are resolved through the
 * table definition's allow-list, so an unknown `?sort=` or filter key is
 * dropped rather than forwarded.
 */

/* ── Filter DSL ───────────────────────────────────────────────────────────── */

export type FilterOperator =
  | { op: 'eq'; value: unknown }
  | { op: 'neq'; value: unknown }
  | { op: 'lt'; value: unknown }
  | { op: 'lte'; value: unknown }
  | { op: 'gt'; value: unknown }
  | { op: 'gte'; value: unknown }
  | { op: 'in'; value: unknown[] }
  | { op: 'is'; value: null | boolean }
  | { op: 'ilike'; value: string }
  /** Case-insensitive membership of a text[] column (former `tags: /^x$/i`). */
  | { op: 'arrayIncludesInsensitive'; value: string };

/** Plain values mean equality, matching Mongo's `{ field: value }`. */
export type Filter = Record<string, unknown | FilterOperator>;

const isOperator = (v: unknown): v is FilterOperator =>
  typeof v === 'object' && v !== null && 'op' in (v as Row) && 'value' in (v as Row);

export interface SortSpec {
  field: string;
  direction: 1 | -1;
}

export interface ListOptions {
  filter?: Filter;
  /** Case-insensitive substring search across these API field names. */
  search?: string;
  searchableFields?: string[];
  sort?: SortSpec[];
  page?: number;
  limit?: number;
  /** Restrict the projection to these API fields. */
  fields?: string[];
  /** Include the relation's detail columns (e.g. author bio). */
  detail?: boolean;
}

export interface FindOneOptions {
  fields?: string[];
  detail?: boolean;
  sort?: SortSpec[];
}

/* ── Search-term escaping ─────────────────────────────────────────────────── */

/**
 * Escape a user-supplied term for use inside an ILIKE pattern.
 * The previous implementation escaped RegExp metacharacters so the term was
 * matched literally; the LIKE equivalent is escaping the LIKE wildcards.
 */
export function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&');
}

/**
 * Quote a value for a PostgREST filter string. Without this, a term containing
 * a comma, parenthesis or dot would be parsed as filter syntax rather than
 * data.
 */
export function quoteFilterValue(value: string): string {
  return `"${value.replace(/["\\]/g, '\\$&')}"`;
}

/* ── Error translation ────────────────────────────────────────────────────── */

/**
 * Convert a PostgREST/PostgreSQL error into the application's ApiError so the
 * HTTP status codes stay the same as they were under Mongoose, and so raw SQL
 * details never reach a response body.
 */
export function toApiError(error: PostgrestError, context: string): ApiError {
  switch (error.code) {
    // unique_violation — was Mongo duplicate key (11000) → 409
    case '23505':
      return ApiError.conflict(`${context} already exists`);
    // NOTE: `context` is the resource's human label ("Blog", "Course") — the
    // same word the route already exposes. It is safe in the 4xx branches
    // below; it is NOT used in the default branch, which is a server fault.
    // foreign_key_violation → 400 (referenced row missing)
    case '23503':
      return ApiError.badRequest(`${context} references a record that does not exist`);
    // not_null_violation / check_violation → was Mongoose ValidationError → 422
    case '23502':
    case '23514':
      return ApiError.unprocessable(`${context} failed validation`);
    // invalid_text_representation — e.g. a malformed uuid.
    // Mongoose raised CastError here, which the error handler mapped to 400.
    case '22P02':
      return ApiError.badRequest('Invalid identifier format');
    default:
      // An unmapped SQLSTATE is a fault, not a user error. The old wording
      // ("Database error while handling Blog") told a caller both that the
      // database was the failing component and what the internal model is
      // called. Keep that in the log; return nothing but a generic 500.
      {
        const detail = {
          kind: 'postgrest',
          context,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        };
        // supabase-js reports an unreachable database as a PostgrestError with
        // an empty code, so without this check a total outage would be
        // indistinguishable from a bug — and would answer 500 instead of 503.
        if (isConnectivityFailure(error)) {
          return ApiError.serviceUnavailable(SERVICE_UNAVAILABLE_MESSAGE).withLogDetail(detail);
        }
        return ApiError.internal('Internal server error').withLogDetail(detail);
      }
  }
}

/* ── Repository ───────────────────────────────────────────────────────────── */

export class BaseRepository<T> {
  constructor(
    public readonly def: TableDef,
    /** Human label used in error messages, e.g. "Blog". */
    public readonly label: string,
  ) {}

  get table(): string {
    return this.def.table;
  }

  protected client() {
    return supabaseAdmin.from(this.def.table);
  }

  /** Resolve an API field name to a column, or null if it is not allowed. */
  column(field: string): string | null {
    return resolveColumn(this.def, field);
  }

  select(opts: { fields?: string[]; detail?: boolean } = {}): string {
    return buildSelect(this.def, opts);
  }

  /* ── Query construction ─────────────────────────────────────────────────── */

  // The PostgREST builder type is deeply generic; `any` here keeps the chain
  // readable without weakening anything visible outside this class.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  protected applyFilter(query: any, filter: Filter = {}): any {
    let q = query;
    for (const [field, raw] of Object.entries(filter)) {
      const column = this.column(field);
      if (!column) continue; // unknown field — never reaches the database
      if (raw === undefined) continue;

      if (!isOperator(raw)) {
        q = raw === null ? q.is(column, null) : q.eq(column, raw);
        continue;
      }

      switch (raw.op) {
        case 'eq':
          q = q.eq(column, raw.value);
          break;
        case 'neq':
          q = q.neq(column, raw.value);
          break;
        case 'lt':
          q = q.lt(column, raw.value);
          break;
        case 'lte':
          q = q.lte(column, raw.value);
          break;
        case 'gt':
          q = q.gt(column, raw.value);
          break;
        case 'gte':
          q = q.gte(column, raw.value);
          break;
        case 'in':
          q = q.in(column, raw.value);
          break;
        case 'is':
          q = q.is(column, raw.value);
          break;
        case 'ilike':
          q = q.ilike(column, `%${escapeLikeTerm(String(raw.value))}%`);
          break;
        case 'arrayIncludesInsensitive': {
          // Mongo used /^tag$/i against the array: "any element equals this
          // value, ignoring case". The companion column stores the elements
          // pipe-delimited ("|a|b|"), so bracketing the term with delimiters
          // gives an exact element match that ILIKE handles case-insensitively.
          const companion = ARRAY_SEARCH_COLUMNS[`${this.def.table}.${column}`];
          const value = escapeLikeTerm(String(raw.value));
          if (companion) {
            q = q.ilike(companion, `%|${value}|%`);
          } else {
            q = q.contains(column, [String(raw.value)]);
          }
          break;
        }
        default:
          break;
      }
    }
    return q;
  }

  /**
   * Case-insensitive substring search across several columns — the PostgREST
   * form of the old `{ $or: [{ field: /term/i }, …] }`.
   * text[] columns are searched through their generated `*_text` companion.
   */
  protected applySearch(query: any, search: string | undefined, fields: string[]): any {
    if (!search || fields.length === 0) return query;
    const term = escapeLikeTerm(search.trim());
    if (!term) return query;

    const clauses: string[] = [];
    for (const field of fields) {
      const column = this.column(field);
      if (!column) continue;
      const target = ARRAY_SEARCH_COLUMNS[`${this.def.table}.${column}`] ?? column;
      clauses.push(`${target}.ilike.${quoteFilterValue(`%${term}%`)}`);
    }
    if (clauses.length === 0) return query;
    return query.or(clauses.join(','));
  }

  protected applySort(query: any, sort: SortSpec[] = []): any {
    let q = query;
    for (const { field, direction } of sort) {
      const column = this.column(field);
      if (!column) continue; // unknown sort key — ignored, as Mongo ignored it
      // MongoDB orders missing/null values before all others when ascending;
      // PostgreSQL defaults to NULLS LAST. Pin the behaviour to match.
      q = q.order(column, { ascending: direction === 1, nullsFirst: direction === 1 });
    }
    return q;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  /* ── Reads ──────────────────────────────────────────────────────────────── */

  /** Paginated list plus an exact total — the old find()+countDocuments() pair. */
  async list(opts: ListOptions = {}): Promise<{ items: T[]; total: number }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.max(1, opts.limit ?? 20);
    const from = (page - 1) * limit;

    let query = this.client().select(this.select({ fields: opts.fields, detail: opts.detail }), {
      count: 'exact',
    });
    query = this.applyFilter(query, opts.filter);
    query = this.applySearch(query, opts.search, opts.searchableFields ?? []);
    query = this.applySort(query, opts.sort);
    query = query.range(from, from + limit - 1);

    const { data, error, count } = await query;
    if (error) throw toApiError(error, this.label);

    return {
      items: rowsToApi<T>(this.def, (data ?? []) as unknown as Row[]),
      total: count ?? 0,
    };
  }

  /** Unpaginated read — used by the public "all active, ordered" endpoints. */
  async findMany(opts: Omit<ListOptions, 'page'> = {}): Promise<T[]> {
    let query = this.client().select(this.select({ fields: opts.fields, detail: opts.detail }));
    query = this.applyFilter(query, opts.filter);
    query = this.applySearch(query, opts.search, opts.searchableFields ?? []);
    query = this.applySort(query, opts.sort);
    if (opts.limit) query = query.limit(opts.limit);

    const { data, error } = await query;
    if (error) throw toApiError(error, this.label);
    return rowsToApi<T>(this.def, (data ?? []) as unknown as Row[]);
  }

  async findById(id: string, opts: FindOneOptions = {}): Promise<T | null> {
    const { data, error } = await this.client()
      .select(this.select({ fields: opts.fields, detail: opts.detail }))
      .eq('id', id)
      .maybeSingle();
    if (error) throw toApiError(error, this.label);
    return rowToApi<T>(this.def, (data ?? null) as unknown as Row | null);
  }

  async findOne(filter: Filter, opts: FindOneOptions = {}): Promise<T | null> {
    let query = this.client().select(this.select({ fields: opts.fields, detail: opts.detail }));
    query = this.applyFilter(query, filter);
    query = this.applySort(query, opts.sort);
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw toApiError(error, this.label);
    return rowToApi<T>(this.def, (data ?? null) as unknown as Row | null);
  }

  /** Existence check that reads a single column — the old `.select('_id')`. */
  async exists(filter: Filter): Promise<string | null> {
    let query = this.client().select('id');
    query = this.applyFilter(query, filter);
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw toApiError(error, this.label);
    return data ? String((data as unknown as Row).id) : null;
  }

  async count(filter: Filter = {}): Promise<number> {
    let query = this.client().select('id', { count: 'exact', head: true });
    query = this.applyFilter(query, filter);
    const { error, count } = await query;
    if (error) throw toApiError(error, this.label);
    return count ?? 0;
  }

  /* ── Writes ─────────────────────────────────────────────────────────────── */

  /** Translate an API payload to columns without writing (used by services). */
  toRow(payload: Record<string, unknown>): Row {
    return apiToRow(this.def, payload);
  }

  async insert(payload: Record<string, unknown>, opts: FindOneOptions = {}): Promise<T> {
    const row = this.toRow(payload);
    const { data, error } = await this.client()
      .insert(row)
      .select(this.select(opts))
      .single();
    if (error) throw toApiError(error, this.label);
    return rowToApi<T>(this.def, data as unknown as Row) as T;
  }

  /** Insert pre-built columns (migration/seed paths that bypass the API shape). */
  async insertRaw(row: Row, opts: FindOneOptions = {}): Promise<T> {
    const { data, error } = await this.client().insert(row).select(this.select(opts)).single();
    if (error) throw toApiError(error, this.label);
    return rowToApi<T>(this.def, data as unknown as Row) as T;
  }

  /**
   * Partial update. Returns null when no row matched, so callers can raise the
   * same 404 the old `findById` → notFound path produced.
   */
  async updateById(
    id: string,
    payload: Record<string, unknown>,
    opts: FindOneOptions = {},
  ): Promise<T | null> {
    const row = this.toRow(payload);
    if (Object.keys(row).length === 0) return this.findById(id, opts);
    const { data, error } = await this.client()
      .update(row)
      .eq('id', id)
      .select(this.select(opts))
      .maybeSingle();
    if (error) throw toApiError(error, this.label);
    return rowToApi<T>(this.def, (data ?? null) as unknown as Row | null);
  }

  async updateRawById(id: string, row: Row, opts: FindOneOptions = {}): Promise<T | null> {
    if (Object.keys(row).length === 0) return this.findById(id, opts);
    const { data, error } = await this.client()
      .update(row)
      .eq('id', id)
      .select(this.select(opts))
      .maybeSingle();
    if (error) throw toApiError(error, this.label);
    return rowToApi<T>(this.def, (data ?? null) as unknown as Row | null);
  }

  /** Delete by id. Returns false when nothing matched (→ 404 at the caller). */
  async deleteById(id: string): Promise<boolean> {
    const { data, error } = await this.client().delete().eq('id', id).select('id').maybeSingle();
    if (error) throw toApiError(error, this.label);
    return Boolean(data);
  }

  /** Insert-or-update on a unique column — the old findOneAndUpdate(upsert). */
  async upsertOn(
    conflictColumn: string,
    payload: Record<string, unknown>,
    opts: FindOneOptions = {},
  ): Promise<T> {
    const row = this.toRow(payload);
    const { data, error } = await this.client()
      .upsert(row, { onConflict: conflictColumn })
      .select(this.select(opts))
      .single();
    if (error) throw toApiError(error, this.label);
    return rowToApi<T>(this.def, data as unknown as Row) as T;
  }
}

/**
 * text[] columns that carry a generated `*_text` companion for substring
 * search. Mongo matched a RegExp against every element of the array; the
 * generated column joins the elements so a single ILIKE reproduces that.
 */
const ARRAY_SEARCH_COLUMNS: Record<string, string> = {
  'blogs.tags': 'tags_text',
};
