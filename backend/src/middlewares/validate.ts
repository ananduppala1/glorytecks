import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ApiError } from '../utils/ApiError';
import { collectMediaUrlErrors } from '../utils/mediaUrl';

/**
 * Run a set of express-validator chains then collect errors into a 422 response.
 */
export const validate =
  (validations: ValidationChain[]) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map((v) => v.run(req)));
    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const details = result.array().map((e) => ({
      field: 'path' in e ? e.path : undefined,
      message: e.msg,
    }));
    next(ApiError.unprocessable('Validation failed', details));
  };

/**
 * Reject any write that puts an unsafe URL in a media field.
 *
 * Mounted once, in front of every mutating API route, rather than added to
 * each resource's validator chain. The upload endpoints are only one way a URL
 * reaches `blogs.featured_image` or `courses.brochure_url`; ordinary CRUD is
 * the other, and it accepts arbitrary strings. A per-resource rule would have
 * to be remembered for all ~18 registry resources plus every future one, and
 * the one that got forgotten would be the hole. A choke point cannot be
 * forgotten.
 *
 * GET/HEAD/OPTIONS are skipped: there is no body to check.
 */
export function guardMediaUrls(req: Request, _res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  if (!req.body || typeof req.body !== 'object') return next();

  const errors = collectMediaUrlErrors(req.body);
  if (errors.length === 0) return next();

  next(ApiError.unprocessable('Validation failed', errors));
}
