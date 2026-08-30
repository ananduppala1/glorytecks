import { supabaseAdmin } from '../config/supabase';
import { ApiError } from '../utils/ApiError';
import { TableDef, Row, rowToApi, apiToRow, buildSelect } from '../db/mappers';
import { settingsTable, aboutPageTable } from '../db/schema';
import { toApiError } from './BaseRepository';
import { ISettings, IAboutPage } from '../interfaces/common';

/**
 * Repository for the two single-row tables (settings, about_page).
 *
 * Replaces the Mongoose `getSingleton()` statics, which did "findOne, else
 * create({})". That read-then-write pair was racy; here the whole thing is one
 * `INSERT … ON CONFLICT DO NOTHING; SELECT` inside a database function, so two
 * simultaneous first requests cannot both try to create the row.
 *
 * Updates keep the old `doc.set(body)` semantics: only the leaves present in
 * the payload are written, so `PUT /settings` with a partial body updates those
 * fields and leaves every sibling alone.
 */
export class SingletonRepository<T> {
  constructor(
    private readonly def: TableDef,
    private readonly rpcName: string,
    private readonly label: string,
  ) {}

  /** Fetch the row, creating it with schema defaults if it does not exist. */
  async get(): Promise<T> {
    const { data, error } = await supabaseAdmin.rpc(this.rpcName).single();
    if (error) throw toApiError(error, this.label);
    if (!data) throw ApiError.internal(`${this.label} could not be initialised`);
    return rowToApi<T>(this.def, data as unknown as Row) as T;
  }

  /** Partial, leaf-level update. Returns the full updated document. */
  async update(payload: Record<string, unknown>): Promise<T> {
    const current = (await this.get()) as unknown as Row;
    const row = apiToRow(this.def, payload);

    if (Object.keys(row).length === 0) return current as unknown as T;

    const { data, error } = await supabaseAdmin
      .from(this.def.table)
      .update(row)
      .eq('id', current.id as string)
      .select(buildSelect(this.def))
      .single();

    if (error) throw toApiError(error, this.label);
    return rowToApi<T>(this.def, data as unknown as Row) as T;
  }
}

export const settingsRepo = new SingletonRepository<ISettings>(
  settingsTable,
  'get_or_create_settings',
  'Settings',
);

export const aboutPageRepo = new SingletonRepository<IAboutPage>(
  aboutPageTable,
  'get_or_create_about_page',
  'AboutPage',
);

/** Convenience re-export so callers can name the pattern. */
export const singletonRepo = { settings: settingsRepo, about: aboutPageRepo };
