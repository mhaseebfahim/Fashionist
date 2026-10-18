import { validationResult } from 'express-validator';
import { AppError } from '../utils/AppError.js';

/** Runs an array of express-validator chains and rejects with 422 on failure. */
export const validate = (chains) => [
  ...chains,
  (req, _res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();
    const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
    next(new AppError(errors[0].message, 422, errors));
  },
];
