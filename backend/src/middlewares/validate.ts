import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ApiError } from '../utils/ApiError';

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
