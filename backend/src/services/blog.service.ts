import { blogRepo, authorRepo } from '../repositories';
import { IBlog } from '../interfaces/common';
import { CrudService } from './CrudService';
import { ApiError } from '../utils/ApiError';
import { uniqueSlug } from '../utils/slug';
import {
  estimateReadTime,
  normalizeBlocks,
  blocksToHtml,
  tableOfContents,
  collectFaq,
  Block,
} from '../utils/blocks';
import { CONTENT_STATUS, ContentStatus } from '../constants';

/** Matches a UUID in any version — the identifier format after the migration. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Derived blog fields.
 *
 * Mongoose recomputed html/toc/faqs in a `pre('save')` hook whenever `content`
 * changed. PostgreSQL has no equivalent per-document hook and putting the block
 * renderer in a database function would fork the implementation away from
 * `utils/blocks.ts`, which must stay byte-identical to the public website's
 * renderer. So the same logic runs here, in the one service that writes blogs,
 * and produces exactly the same html/toc/faqs values as before.
 */
export function deriveContentFields(content: Block[]): {
  content: Block[];
  html: string;
  toc: ReturnType<typeof tableOfContents>;
  faqs: ReturnType<typeof collectFaq>;
} {
  const blocks = normalizeBlocks(content || []);
  return {
    content: blocks,
    html: blocksToHtml(blocks),
    toc: tableOfContents(blocks),
    faqs: collectFaq(blocks),
  };
}

/**
 * Blog service. Extends the generic CRUD with content-specific behaviour:
 * slug generation, author resolution, read-time, and status transitions.
 */
class BlogService extends CrudService<IBlog> {
  constructor() {
    super(blogRepo, {
      searchableFields: ['title', 'excerpt', 'tags'],
      uniqueField: 'slug',
      withRelations: true,
      defaultSort: { date: -1 },
    });
  }

  private slugExists = async (candidate: string, excludeId?: string): Promise<boolean> => {
    const foundId = await blogRepo.exists({ slug: candidate });
    return Boolean(foundId && foundId !== excludeId);
  };

  /** Resolve an author reference: accepts an id, an author `key`, or none. */
  private async resolveAuthor(input?: string): Promise<{ id?: string; key: string }> {
    if (!input) return { key: '' };
    // Try by id first, then by key — the pre-migration order, with the
    // 24-character ObjectId test replaced by a UUID test.
    const byId = UUID_RE.test(input) ? await authorRepo.findById(input) : null;
    const author = byId ?? (await authorRepo.findOne({ key: input.toLowerCase() }));
    if (!author) return { key: input };
    return { id: String(author.id), key: author.key };
  }

  async createBlog(payload: Partial<IBlog> & { author?: string }): Promise<IBlog> {
    if (!payload.title) throw ApiError.badRequest('Title is required');

    const slug = await uniqueSlug(payload.slug || payload.title, (c) => this.slugExists(c));
    const { id: authorId, key: authorKey } = await this.resolveAuthor(payload.author as string);

    const derived = deriveContentFields((payload.content as Block[]) || []);
    const date = payload.date || new Date().toISOString().slice(0, 10);
    const status = (payload.status as ContentStatus) ?? CONTENT_STATUS.DRAFT;

    const created = await blogRepo.insert({
      ...payload,
      slug,
      author: authorId ?? null,
      authorKey,
      ...derived,
      status,
      date,
      updated: payload.updated || date,
      readTime: payload.readTime || estimateReadTime(derived.content),
      // Mirrors the hook: publishing for the first time stamps publishedAt.
      publishedAt:
        status === CONTENT_STATUS.PUBLISHED
          ? (payload.publishedAt ?? new Date().toISOString())
          : (payload.publishedAt ?? null),
    });

    return this.getById(String(created.id));
  }

  async updateBlog(id: string, payload: Partial<IBlog> & { author?: string }): Promise<IBlog> {
    const doc = await blogRepo.findById(id);
    if (!doc) throw ApiError.notFound('Blog not found');

    const update: Record<string, unknown> = {};

    if (payload.slug && payload.slug !== doc.slug) {
      update.slug = await uniqueSlug(payload.slug, (c) => this.slugExists(c, id));
    }

    if (payload.author !== undefined) {
      const { id: authorId, key } = await this.resolveAuthor(payload.author as string);
      update.author = authorId ?? null;
      update.authorKey = key;
    }

    // The exact assignable allow-list the previous implementation used.
    const assignable: (keyof IBlog)[] = [
      'title',
      'category',
      'categorySlug',
      'kind',
      'excerpt',
      'status',
      'featured',
      'trending',
      'popular',
      'tags',
      'featuredImage',
      'date',
      'updated',
      'seo',
    ];
    for (const key of assignable) {
      if (payload[key] !== undefined) update[key] = payload[key];
    }

    if (payload.content !== undefined) {
      const derived = deriveContentFields((payload.content as Block[]) || []);
      Object.assign(update, derived);
      // Refresh read time when content changes unless explicitly provided.
      update.readTime = payload.readTime || estimateReadTime(derived.content);
    } else if (payload.readTime) {
      update.readTime = payload.readTime;
    }

    // Hook parity: first transition to `published` stamps publishedAt.
    if (
      payload.status !== undefined &&
      payload.status === CONTENT_STATUS.PUBLISHED &&
      !doc.publishedAt
    ) {
      update.publishedAt = new Date().toISOString();
    }

    // Hook parity: `updated` defaults to `date` when left empty.
    const nextUpdated = (update.updated as string) ?? doc.updated;
    if (!nextUpdated) update.updated = (update.date as string) ?? doc.date;

    const saved = await blogRepo.updateById(id, update);
    if (!saved) throw ApiError.notFound('Blog not found');
    return this.getById(id);
  }

  /** Change publish status (draft/published/archived). */
  async setStatus(id: string, status: ContentStatus): Promise<IBlog> {
    const doc = await blogRepo.findById(id);
    if (!doc) throw ApiError.notFound('Blog not found');

    const update: Record<string, unknown> = { status };
    if (status === CONTENT_STATUS.PUBLISHED && !doc.publishedAt) {
      update.publishedAt = new Date().toISOString();
    }

    const saved = await blogRepo.updateById(id, update);
    if (!saved) throw ApiError.notFound('Blog not found');
    return this.getById(id);
  }

  /** Duplicate a post as a fresh draft with a new slug. */
  async duplicate(id: string): Promise<IBlog> {
    const source = await blogRepo.findById(id);
    if (!source) throw ApiError.notFound('Blog not found');

    const baseSlug = `${source.slug}-copy`;
    const slug = await uniqueSlug(baseSlug, (c) => this.slugExists(c));
    const today = new Date().toISOString().slice(0, 10);

    // `author` comes back from findById as a populated object; the repository
    // accepts either that or a bare id, so it round-trips unchanged.
    const clone = await blogRepo.insert({
      ...source,
      id: undefined,
      _id: undefined,
      slug,
      title: `${source.title} (Copy)`,
      status: CONTENT_STATUS.DRAFT,
      featured: false,
      trending: false,
      popular: false,
      publishedAt: null,
      date: today,
      updated: today,
      createdAt: undefined,
      updatedAt: undefined,
    });

    return this.getById(String(clone.id));
  }

  /** Distinct tag list for filter UIs — replaces Blog.distinct('tags'). */
  async distinctTags(): Promise<string[]> {
    return blogRepo.distinctTags();
  }
}

export const blogService = new BlogService();
