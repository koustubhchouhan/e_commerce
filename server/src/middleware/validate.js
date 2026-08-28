import { AppError } from './error.js';

const parse = (schema, source) => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return next(new AppError(422, 'Validation failed', details));
  }
  req[source] = result.data;
  next();
};

// Validates req.body against a zod schema. On success, replaces req.body with
// the parsed (and coerced/defaulted) data. On failure, returns a 422 with a
// tidy list of field errors.
export const validate = (schema) => parse(schema, 'body');

// Same, but for URL query strings (used by list endpoints).
export const validateQuery = (schema) => parse(schema, 'query');

// Same, but for path params (e.g. a product / order id).
export const validateParams = (schema) => parse(schema, 'params');
