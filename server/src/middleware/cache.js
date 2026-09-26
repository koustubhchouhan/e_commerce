// HTTP cache policy helpers.
//
// Express already emits a weak ETag for JSON responses, so once a policy is
// set browsers can revalidate cheaply with `If-None-Match` and get a 304.
// These helpers only decide *who* may cache a response and for how long.

// Public, non-personalised reads (catalog, categories, slides, reviews). Safe
// for browsers and shared caches; revalidated in the background after maxAge.
export function publicCache(maxAge = 60, staleWhileRevalidate = 300) {
  return (req, res, next) => {
    res.set(
      'Cache-Control',
      `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    );
    next();
  };
}

// Responses that depend on the caller (auth/role aware). The payload may vary
// per user, so only the caller's own browser may keep a copy.
export function privateCache(maxAge = 30, staleWhileRevalidate = 120) {
  return (req, res, next) => {
    res.set(
      'Cache-Control',
      `private, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    );
    next();
  };
}

// Authenticated or otherwise sensitive responses: never written to disk by any
// cache. Used for every signed-in API surface.
export function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}
