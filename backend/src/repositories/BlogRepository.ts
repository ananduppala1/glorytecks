import { supabaseAdmin } from '../config/supabase';
import { BaseRepository, toApiError } from './BaseRepository';
import { blogsTable } from '../db/schema';
import { IBlog } from '../interfaces/common';

/**
 * Blog repository — the generic repository plus the one Mongo collection
 * operator that has no PostgREST equivalent.
 */
export class BlogRepository extends BaseRepository<IBlog> {
  constructor() {
    super(blogsTable, 'Blog');
  }

  /**
   * Replaces `Blog.distinct('tags')`.
   *
   * PostgREST cannot express `SELECT DISTINCT unnest(tags)`, so the query lives
   * in the `distinct_blog_tags()` database function. It returns rows unsorted
   * on purpose: the controller applies JavaScript's `Array.prototype.sort()`,
   * exactly as before, rather than adopting the database collation's ordering.
   */
  async distinctTags(): Promise<string[]> {
    const { data, error } = await supabaseAdmin.rpc('distinct_blog_tags');
    if (error) throw toApiError(error, this.label);
    return ((data ?? []) as Array<{ tag: string }>)
      .map((r) => r.tag)
      .filter((t): t is string => typeof t === 'string' && t.length > 0);
  }
}
