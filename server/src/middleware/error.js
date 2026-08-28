// A typed error we throw deliberately from controllers/middleware.
// Anything else that bubbles up is treated as an unexpected 500.
export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }
}

// 404 for unmatched routes.
export function notFound(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Central error handler. Must keep all four args so Express recognizes it.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Multer errors (oversized upload, too many files) are client faults.
  if (err.name === 'MulterError') {
    status = 400;
    message = `Upload error: ${err.message}`;
  }

  const payload = { error: message };
  if (err.details) payload.details = err.details;

  // Log the full stack for genuine server faults; client errors stay quiet.
  if (status >= 500) console.error('[error]', err);

  res.status(status).json(payload);
}
