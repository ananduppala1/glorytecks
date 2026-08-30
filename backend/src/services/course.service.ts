import { courseRepo } from '../repositories';
import { ICourse } from '../interfaces/common';
import { CrudService } from './CrudService';
import { uniqueSlug } from '../utils/slug';
import { ApiError } from '../utils/ApiError';

/** Course service — generic CRUD plus slug generation and the trainer join. */
class CourseService extends CrudService<ICourse> {
  constructor() {
    super(courseRepo, {
      searchableFields: ['title', 'tagline', 'description', 'category'],
      uniqueField: 'slug',
      withRelations: true,
      defaultSort: { order: 1, title: 1 },
    });
  }

  private slugExists = async (candidate: string, excludeId?: string): Promise<boolean> => {
    const foundId = await courseRepo.exists({ slug: candidate });
    return Boolean(foundId && foundId !== excludeId);
  };

  async createCourse(payload: Partial<ICourse>): Promise<ICourse> {
    if (!payload.title) throw ApiError.badRequest('Title is required');
    const slug = await uniqueSlug(payload.slug || payload.title, (c) => this.slugExists(c));
    const created = await courseRepo.insert({ ...payload, slug });
    return this.getById(String(created.id));
  }

  async updateCourse(id: string, payload: Partial<ICourse>): Promise<ICourse> {
    const doc = await courseRepo.findById(id);
    if (!doc) throw ApiError.notFound('Course not found');

    const update: Record<string, unknown> = { ...payload };
    if (payload.slug && payload.slug !== doc.slug) {
      update.slug = await uniqueSlug(payload.slug, (c) => this.slugExists(c, id));
    }

    const saved = await courseRepo.updateById(id, update);
    if (!saved) throw ApiError.notFound('Course not found');
    return this.getById(id);
  }
}

export const courseService = new CourseService();
