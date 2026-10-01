// A typed error we throw deliberately from controllers/middleware.
// Anything else that bubbles up is treated as an unexpected 500.
//
// `message` is always the *public* text: it must be stable and must never embed
// raw upstream diagnostics. Wrap the underlying Supabase/Razorpay error object
// in `options.cause` instead — it is logged server-side (correlated by request
// id) but never serialized to the client.
export class AppError extends Error {
  constructor(status, message, options = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.status = status;
    this.details = options.details;
    this.expose = options.expose ?? true;
  }
}

// Postgres maps a bare `RAISE EXCEPTION` to SQLSTATE P0001. Our migrations use
// those for deliberate, user-facing business rules (e.g. "Insufficient stock
// ..."), so they are safe to surface. Every other database failure — missing
// table/function, constraint internals, connection detail — stays hidden.
export const BUSINESS_RULE_SQLSTATE = 'P0001';

export function isBusinessRuleError(err) {
  return err?.code === BUSINESS_RULE_SQLSTATE;
}

// 404 for unmatched routes.
export function notFound(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Friendly, non-leaking text for multer's parse failures.
const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: 'File is too large',
  LIMIT_FILE_COUNT: 'Too many files were uploaded',
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
};

// The message safe to return for any error. AppError carries its own stable
// text; everything else (unexpected exceptions, body-parser, multer) maps to a
// fixed message so upstream/internal detail never reaches the client.
function publicMessage(err, status) {
  if (err instanceof AppError && err.expose !== false) return err.message;
  if (err instanceof AppError) return 'Request could not be processed';
  if (err.name === 'MulterError') return MULTER_MESSAGES[err.code] ?? 'Upload failed';
  if (err.type === 'entity.too.large') return 'Request body is too large';
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return 'Invalid request body';
  }
  return status >= 500 ? 'Something went wrong. Please try again.' : 'Request could not be processed';
}

// Compact, log-only rendering of an upstream error object.
function describeCause(cause) {
  if (!cause) return '';
  if (cause instanceof Error) return cause.stack || cause.message;
  try {
    return JSON.stringify(cause);
  } catch {
    return String(cause);
  }
}

// Central error handler. Must keep all four args so Express recognizes it.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  if (err.name === 'MulterError') status = 400;

  const requestId = req.id || 'unknown';
  const message = publicMessage(err, status);

  // Log detailed diagnostics (including the wrapped upstream cause) server-side,
  // correlated by request id. Client errors with no upstream cause stay quiet.
  if (status >= 500 || err.cause) {
    const cause = describeCause(err.cause);
    console.error(
      `[error] id=${requestId} status=${status} ${err.message}${cause ? ` | cause: ${cause}` : ''}`
    );
  }

  const payload = { error: message, requestId };
  if (err.details) payload.details = err.details;

  // Errors are not a stable representation of the resource; never cache them.
  res.set('Cache-Control', 'no-store');
  res.status(status).json(payload);
}
