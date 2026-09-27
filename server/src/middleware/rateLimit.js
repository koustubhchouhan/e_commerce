// A tiny in-process rate limiter.
//
// Fixed-window counters keyed by client IP or account id. State lives in a Map
// inside this process, which fits the single-instance deployment this API runs
// on. A multi-instance setup would need a shared store (e.g. Redis); otherwise
// each instance would enforce the limit independently and the effective limit
// would scale with the number of instances.
//
// Deliberately dependency-free: a Map of counters plus the standard
// RateLimit-* response headers (draft-ietf-httpapi-ratelimit-headers).
import { AppError } from './error.js';

const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX = 60;

// Guards against unbounded growth when a limiter sees many distinct keys (e.g.
// a bot cycling source IPs). Once the map reaches this size we drop expired
// entries; if it is still full we reset it, preferring availability over
// perfect accounting.
const MAX_KEYS = 10_000;

// Prefer the authenticated account so one user cannot escape its budget by
// changing IP; fall back to the client IP for anonymous callers.
export function userKey(req) {
  return req.user?.id || req.ip || req.socket?.remoteAddress || 'unknown';
}

// Always key by client IP — for anonymous endpoints where there is no account
// to attribute the request to.
export function ipKey(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function prune(hits, now) {
  if (hits.size < MAX_KEYS) return;
  for (const [key, entry] of hits) {
    if (now >= entry.resetAt) hits.delete(key);
  }
  if (hits.size >= MAX_KEYS) hits.clear();
}

export function rateLimit({
  windowMs = DEFAULT_WINDOW_MS,
  max = DEFAULT_MAX,
  keyGenerator = ipKey,
  message = 'Too many requests, please try again later',
} = {}) {
  const hits = new Map();

  const middleware = (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator(req) || 'unknown';

    prune(hits, now);

    let entry = hits.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    // Seconds until the current window rolls over; at least 1 so clients never
    // read a Retry-After of zero.
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.set('RateLimit-Reset', String(retryAfter));

    if (entry.count > max) {
      res.set('Retry-After', String(retryAfter));
      return next(new AppError(429, message));
    }
    next();
  };

  // Exposed for tests; carries no runtime behaviour.
  middleware.reset = () => hits.clear();
  middleware.limit = { windowMs, max };
  return middleware;
}
