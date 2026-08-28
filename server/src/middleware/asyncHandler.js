// Wraps an async route handler so any rejected promise is forwarded to
// Express's error handler instead of crashing the process.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
