import { CrudService } from './CrudService';
import {
  blogCategoryRepo,
  authorRepo,
  trainerRepo,
  testimonialRepo,
  placementRepo,
  companyRepo,
  roadmapRepo,
  faqRepo,
  comparisonRepo,
  localityRepo,
  legalDocRepo,
  galleryRepo,
  brochureRepo,
  batchRepo,
} from '../repositories';
import {
  IBlogCategory,
  IAuthor,
  ITrainer,
  ITestimonial,
  IPlacement,
  ICompany,
  IRoadmap,
  IFaq,
  IComparison,
  ILocality,
  ILegalDoc,
  IGalleryItem,
  IBrochure,
  IBatch,
} from '../interfaces/common';
import { CrudControllerConfig } from '../controllers/crud.factory';
import { ROLES, Role, CONTENT_ROLES } from '../constants';

// Everything outside the content team's remit (site-wide content) is admin-only.
const ADMIN_ONLY: Role[] = [ROLES.ADMIN];

export interface ResourceDef<T> {
  path: string; // route segment, e.g. "trainers"
  service: CrudService<T>;
  controller: CrudControllerConfig;
  /** Public read access (mounted on /public) — true for site-facing content. */
  publicRead: boolean;
  /** Roles allowed to use the admin CRUD for this resource. Defaults to admin-only. */
  roles?: Role[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const resources: ResourceDef<any>[] = [
  {
    path: 'categories',
    roles: CONTENT_ROLES,
    service: new CrudService<IBlogCategory>(blogCategoryRepo, {
      searchableFields: ['name', 'slug', 'description'],
      uniqueField: 'slug',
      defaultSort: { order: 1, name: 1 },
    }),
    controller: { label: 'Category', allowedFilters: [] },
    publicRead: true,
  },
  {
    path: 'authors',
    roles: CONTENT_ROLES,
    service: new CrudService<IAuthor>(authorRepo, {
      searchableFields: ['name', 'role', 'key'],
      uniqueField: 'key',
      defaultSort: { name: 1 },
    }),
    controller: { label: 'Author', allowedFilters: [] },
    publicRead: true,
  },
  {
    path: 'trainers',
    roles: CONTENT_ROLES,
    service: new CrudService<ITrainer>(trainerRepo, {
      searchableFields: ['name', 'title', 'company'],
      defaultSort: { order: 1, createdAt: -1 },
    }),
    controller: { label: 'Trainer', allowedFilters: ['featured', 'isActive'] },
    publicRead: true,
  },
  {
    path: 'testimonials',
    roles: CONTENT_ROLES,
    service: new CrudService<ITestimonial>(testimonialRepo, {
      searchableFields: ['name', 'role', 'quote'],
      defaultSort: { order: 1, createdAt: -1 },
    }),
    controller: { label: 'Testimonial', allowedFilters: ['featured', 'isActive', 'course'] },
    publicRead: true,
  },
  {
    path: 'placements',
    roles: CONTENT_ROLES,
    service: new CrudService<IPlacement>(placementRepo, {
      searchableFields: ['name', 'role', 'company'],
      defaultSort: { order: 1, createdAt: -1 },
    }),
    controller: { label: 'Placement', allowedFilters: ['featured', 'isActive', 'course'] },
    publicRead: true,
  },
  {
    path: 'companies',
    roles: CONTENT_ROLES,
    service: new CrudService<ICompany>(companyRepo, {
      searchableFields: ['name'],
      uniqueField: 'name',
      defaultSort: { order: 1, name: 1 },
    }),
    controller: { label: 'Company', allowedFilters: ['isActive'] },
    publicRead: true,
  },
  {
    path: 'roadmaps',
    roles: ADMIN_ONLY,
    service: new CrudService<IRoadmap>(roadmapRepo, {
      searchableFields: ['course'],
      defaultSort: { order: 1, createdAt: -1 },
    }),
    controller: { label: 'Roadmap', allowedFilters: ['isActive'] },
    publicRead: true,
  },
  {
    path: 'faqs',
    roles: ADMIN_ONLY,
    service: new CrudService<IFaq>(faqRepo, {
      searchableFields: ['question', 'answer'],
      defaultSort: { scope: 1, order: 1 },
    }),
    controller: { label: 'FAQ', allowedFilters: ['scope', 'isActive'] },
    publicRead: true,
  },
  {
    path: 'comparisons',
    roles: ADMIN_ONLY,
    service: new CrudService<IComparison>(comparisonRepo, {
      searchableFields: ['title', 'itemA', 'itemB', 'slug'],
      uniqueField: 'slug',
      defaultSort: { order: 1, createdAt: -1 },
    }),
    controller: {
      label: 'Comparison',
      allowedFilters: ['status'],
      // Normalise admin-form shapes to the stored schema so create/update stay
      // consistent: rows use `factor` (older clients sent `label`), and
      // relatedCourses are stored as { label, slug } objects even though the
      // form may submit bare slug strings.
      transformBody: (body) => {
        const out = { ...body };
        if (Array.isArray(out.rows)) {
          out.rows = (out.rows as Array<Record<string, unknown>>).map((r) => ({
            factor: (r.factor ?? r.label ?? '') as string,
            a: (r.a ?? '') as string,
            b: (r.b ?? '') as string,
          }));
        }
        if (Array.isArray(out.relatedCourses)) {
          out.relatedCourses = (out.relatedCourses as unknown[]).map((rc) =>
            typeof rc === 'string' ? { label: rc, slug: rc } : rc,
          );
        }
        return out;
      },
    },
    publicRead: true,
  },
  {
    path: 'localities',
    roles: ADMIN_ONLY,
    service: new CrudService<ILocality>(localityRepo, {
      searchableFields: ['name', 'slug'],
      uniqueField: 'slug',
      defaultSort: { order: 1, name: 1 },
    }),
    controller: { label: 'Locality', allowedFilters: ['isActive'] },
    publicRead: true,
  },
  {
    path: 'legal',
    roles: ADMIN_ONLY,
    service: new CrudService<ILegalDoc>(legalDocRepo, {
      searchableFields: ['title', 'slug'],
      uniqueField: 'slug',
      defaultSort: { title: 1 },
    }),
    controller: {
      label: 'Legal document',
      allowedFilters: ['status'],

      transformBody: (body, req) => {
        const out = { ...body };

        // Slug may be supplied when creating a document,
        // but it must never be changed after creation.
        if (req.method !== 'POST') {
          delete out.slug;
        }

        return out;
      },
    },
    publicRead: true,
  },
  {
    path: 'gallery',
    roles: ADMIN_ONLY,
    service: new CrudService<IGalleryItem>(galleryRepo, {
      searchableFields: ['title', 'category'],
      defaultSort: { order: 1, createdAt: -1 },
    }),
    controller: { label: 'Gallery item', allowedFilters: ['isActive', 'category'] },
    publicRead: true,
  },
  {
    path: 'brochures',
    roles: ADMIN_ONLY,
    service: new CrudService<IBrochure>(brochureRepo, {
      searchableFields: ['title', 'courseSlug'],
      defaultSort: { createdAt: -1 },
    }),
    controller: { label: 'Brochure', allowedFilters: ['isActive', 'courseSlug'] },
    publicRead: true,
  },
  {
    path: 'batches',
    roles: ADMIN_ONLY,
    service: new CrudService<IBatch>(batchRepo, {
      searchableFields: ['course'],
      defaultSort: { order: 1, createdAt: -1 },
    }),
    controller: { label: 'Batch', allowedFilters: ['isActive', 'mode'] },
    publicRead: true,
  },
];
/* eslint-enable @typescript-eslint/no-explicit-any */
