import { ApiError } from '../utils/ApiError';
import { ListParams, buildPaginationMeta, toSortSpecs } from '../utils/queryFeatures';
import { PaginationMeta } from '../utils/ApiResponse';
import { BaseRepository, Filter, SortSpec } from '../repositories/BaseRepository';

export interface CrudOptions {
  /** Fields included in the case-insensitive search across list endpoints. */
  searchableFields?: string[];
  /** Field used to enforce uniqueness on create/update (e.g. "slug"). */
  uniqueField?: string;
  /**
   * Whether reads should include the related record's detail columns.
   * Replaces the old `populate` option — the relation itself is declared on the
   * table definition, so services only choose the projection depth.
   */
  withRelations?: boolean;
  /** Default sort if none supplied. */
  defaultSort?: Record<string, 1 | -1>;
}

export interface ListResult<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Reusable CRUD service over any repository.
 *
 * The public surface (list / getById / getOne / create / update / remove /
 * count) is unchanged from the Mongoose version, so every controller and the
 * resource registry keep working without edits. Only the internals moved from
 * Mongoose to Supabase PostgreSQL.
 */
export class CrudService<T> {
  constructor(
    protected readonly repo: BaseRepository<T>,
    protected readonly options: CrudOptions = {},
  ) {}

  /** Model name used in messages — matches the old `model.modelName`. */
  protected get label(): string {
    return this.repo.def.table;
  }

  protected get searchable(): string[] {
    return this.options.searchableFields ?? [];
  }

  protected get detail(): boolean {
    return this.options.withRelations === true;
  }

  protected resolveSort(params: ListParams): SortSpec[] {
    const sort = Object.keys(params.sort).length
      ? params.sort
      : this.options.defaultSort ?? { createdAt: -1 };
    return toSortSpecs(sort);
  }

  async list(params: ListParams, extraFilter: Filter = {}): Promise<ListResult<T>> {
    const { items, total } = await this.repo.list({
      filter: { ...extraFilter, ...(params.filters as Filter) },
      search: params.search,
      searchableFields: this.searchable,
      sort: this.resolveSort(params),
      page: params.page,
      limit: params.limit,
    });

    return { items, meta: buildPaginationMeta(total, params.page, params.limit) };
  }

  async getById(id: string): Promise<T> {
    const doc = await this.repo.findById(id, { detail: this.detail });
    if (!doc) throw ApiError.notFound(`${this.modelName} not found`);
    return doc;
  }

  async getOne(filter: Filter): Promise<T | null> {
    return this.repo.findOne(filter, { detail: this.detail });
  }

  async create(payload: Partial<T>): Promise<T> {
    await this.assertUnique(payload as Record<string, unknown>);
    const created = await this.repo.insert(payload as Record<string, unknown>, {
      detail: this.detail,
    });
    return this.getById((created as { id: string }).id);
  }

  async update(id: string, payload: Partial<T>): Promise<T> {
    await this.assertUnique(payload as Record<string, unknown>, id);
    const updated = await this.repo.updateById(id, payload as Record<string, unknown>, {
      detail: this.detail,
    });
    if (!updated) throw ApiError.notFound(`${this.modelName} not found`);
    return this.getById(id);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.repo.deleteById(id);
    if (!deleted) throw ApiError.notFound(`${this.modelName} not found`);
  }

  async count(filter: Filter = {}): Promise<number> {
    return this.repo.count(filter);
  }

  /* ── helpers ──────────────────────────────────────────────────────────── */

  /**
   * The human-facing name used in error messages. The Mongoose version used
   * `model.modelName` ("Blog", "Course", …); the repository carries the same
   * label so messages such as "Course not found" are byte-identical.
   */
  protected get modelName(): string {
    return this.repo.label;
  }

  /**
   * Pre-flight uniqueness check, kept so the API returns the same 409 with the
   * same wording as before. The database's UNIQUE constraint is the real
   * guarantee — a concurrent insert that slips past this check still fails and
   * is translated to the same 409 by the repository's error mapper.
   */
  protected async assertUnique(
    payload: Record<string, unknown>,
    excludeId?: string,
  ): Promise<void> {
    const field = this.options.uniqueField;
    if (!field) return;
    const value = payload[field];
    if (value === undefined || value === null || value === '') return;

    const existingId = await this.repo.exists({ [field]: value });
    if (existingId && existingId !== excludeId) {
      throw ApiError.conflict(`${this.modelName} with this ${field} already exists`);
    }
  }
}
