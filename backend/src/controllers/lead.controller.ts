import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/ApiResponse';
import { parseListParams, buildPaginationMeta, toSortSpecs } from '../utils/queryFeatures';
import { ApiError } from '../utils/ApiError';
import { ALL_LEAD_STATUS, LeadStatus } from '../constants';
import { demoRequestRepo, contactEnquiryRepo, BaseRepository } from '../repositories';
import { IDemoRequest, IContactEnquiry } from '../interfaces/common';
import { invalidateDashboard } from '../lib/cacheInvalidation';

/** Factory producing handlers for a lead-style resource (demo / contact). */
function leadHandlers<T>(repo: BaseRepository<T>, label: string, searchable: string[]) {
  return {
    list: asyncHandler(async (req: Request, res: Response) => {
      const params = parseListParams(req.query as Record<string, unknown>, ['status', 'course']);
      const { items, total } = await repo.list({
        filter: params.filters,
        search: params.search,
        searchableFields: searchable,
        sort: toSortSpecs(params.sort),
        page: params.page,
        limit: params.limit,
      });
      const meta = buildPaginationMeta(total, params.page, params.limit);
      return sendSuccess(res, items, `${label} fetched`, 200, meta);
    }),

    getById: asyncHandler(async (req: Request, res: Response) => {
      const doc = await repo.findById(req.params.id);
      if (!doc) throw ApiError.notFound(`${label} not found`);
      return sendSuccess(res, doc, `${label} fetched`);
    }),

    updateStatus: asyncHandler(async (req: Request, res: Response) => {
      const { status, notes } = req.body as { status?: LeadStatus; notes?: string };
      if (status && !ALL_LEAD_STATUS.includes(status)) throw ApiError.badRequest('Invalid status');
      const update: Record<string, unknown> = {};
      if (status) update.status = status;
      if (notes !== undefined) update.notes = notes;

      const doc = await repo.updateById(req.params.id, update);
      if (!doc) throw ApiError.notFound(`${label} not found`);
      void invalidateDashboard();
      return sendSuccess(res, doc, `${label} updated`);
    }),

    remove: asyncHandler(async (req: Request, res: Response) => {
      const deleted = await repo.deleteById(req.params.id);
      if (!deleted) throw ApiError.notFound(`${label} not found`);
      void invalidateDashboard();
      return sendNoContent(res);
    }),
  };
}

export const demoRequestController = {
  ...leadHandlers<IDemoRequest>(demoRequestRepo, 'Demo request', ['name', 'phone', 'course']),
  /** Public endpoint: the website posts new demo bookings here. */
  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, phone, course, source } = req.body as Record<string, string>;
    const doc = await demoRequestRepo.insert({ name, phone, course, source });
    void invalidateDashboard();
    return sendCreated(res, { id: doc.id }, 'Demo request received');
  }),
};

export const contactEnquiryController = {
  ...leadHandlers<IContactEnquiry>(contactEnquiryRepo, 'Enquiry', [
    'name',
    'email',
    'course',
    'message',
  ]),
  /** Public endpoint: the website posts contact form submissions here. */
  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, email, phone, course, message, subject } = req.body as Record<string, string>;
    const doc = await contactEnquiryRepo.insert({
      name,
      // The column carries a `email = lower(email)` CHECK, matching the old
      // Mongoose `lowercase: true`.
      email: String(email ?? '').toLowerCase(),
      phone,
      course,
      message,
      subject,
    });
    void invalidateDashboard();
    return sendCreated(res, { id: doc.id }, 'Enquiry received');
  }),
};
