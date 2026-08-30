import { BaseRepository } from './BaseRepository';
import { BlogRepository } from './BlogRepository';
import * as schema from '../db/schema';
import {
  IAdminUser,
  IAuthor,
  IBlogCategory,
  IBatch,
  IBrochure,
  ICompany,
  IComparison,
  IContactEnquiry,
  ICourse,
  IDemoRequest,
  IFaq,
  IGalleryItem,
  ILegalDoc,
  ILocality,
  IPlacement,
  IRoadmap,
  ITestimonial,
  ITrainer,
} from '../interfaces/common';

/**
 * One repository per table — the direct replacement for `src/models/*`.
 *
 * The labels match the `modelName` values the old services used in their
 * "<Model> not found" / "<Model> with this slug already exists" messages, so
 * error strings returned to the frontend are unchanged.
 */

export const adminUserRepo = new BaseRepository<IAdminUser>(schema.adminUsersTable, 'AdminUser');
export const authorRepo = new BaseRepository<IAuthor>(schema.authorsTable, 'Author');
export const blogRepo = new BlogRepository();
export const blogCategoryRepo = new BaseRepository<IBlogCategory>(
  schema.blogCategoriesTable,
  'BlogCategory',
);
export const courseRepo = new BaseRepository<ICourse>(schema.coursesTable, 'Course');
export const trainerRepo = new BaseRepository<ITrainer>(schema.trainersTable, 'Trainer');
export const testimonialRepo = new BaseRepository<ITestimonial>(
  schema.testimonialsTable,
  'Testimonial',
);
export const placementRepo = new BaseRepository<IPlacement>(schema.placementsTable, 'Placement');
export const companyRepo = new BaseRepository<ICompany>(schema.companiesTable, 'Company');
export const roadmapRepo = new BaseRepository<IRoadmap>(schema.roadmapsTable, 'Roadmap');
export const faqRepo = new BaseRepository<IFaq>(schema.faqsTable, 'Faq');
export const demoRequestRepo = new BaseRepository<IDemoRequest>(
  schema.demoRequestsTable,
  'DemoRequest',
);
export const contactEnquiryRepo = new BaseRepository<IContactEnquiry>(
  schema.contactEnquiriesTable,
  'ContactEnquiry',
);
export const comparisonRepo = new BaseRepository<IComparison>(schema.comparisonsTable, 'Comparison');
export const localityRepo = new BaseRepository<ILocality>(schema.localitiesTable, 'Locality');
export const legalDocRepo = new BaseRepository<ILegalDoc>(schema.legalDocsTable, 'LegalDoc');
export const galleryRepo = new BaseRepository<IGalleryItem>(schema.galleryTable, 'Gallery');
export const brochureRepo = new BaseRepository<IBrochure>(schema.brochuresTable, 'Brochure');
export const batchRepo = new BaseRepository<IBatch>(schema.batchesTable, 'Batch');

export { BaseRepository } from './BaseRepository';
export { BlogRepository } from './BlogRepository';
export type { Filter, FilterOperator, ListOptions, SortSpec } from './BaseRepository';
export { singletonRepo, settingsRepo, aboutPageRepo } from './SingletonRepository';
