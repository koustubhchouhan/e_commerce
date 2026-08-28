import { AppError } from './error.js';

// Validates req.body against a zod schema. On success, replaces req.body with
// the parsed (and coerced/defaulted) data. On failure, returns a 422 with a
// tidy list of field errors.
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return next(new AppError(422, 'Validation failed', details));
  }
  req.body = result.data;
  next();
};
