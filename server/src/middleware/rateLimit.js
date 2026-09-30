// Fixed-window rate limiting.
//
// Counters live in a store (see lib/rateLimitStore.js): an in-process Map by
// default, or Redis when REDIS_URL is set. The default is correct for the
// single-instance deployment this API runs on; configuring Redis makes the
// limits shared and restart-proof when the API scales horizontally.
//
// Dependency-free by itself: it delegates storage and only sets the standard
// RateLimit-* response headers (draft-ietf-httpapi-ratelimit-headers).
import { AppError } from './error.js';
import { env } from '../config/env.js';
import { createMemoryStore, createRedisStore } from '../lib/rateLimitStore.js';

const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX = 60;

// A single store is shared by every limiter in the process — that is what
// makes the counters shared. Keys are namespaced per limiter (see `name`) so
// distinct limiters never collide in the shared store.
let sharedStorePromise;

export function getRateLimitStore() {
  if (!sharedStorePromise) {
    sharedStorePromise = env.redisUrl
      ? createRedisStore({ url: env.redisUrl }).catch((err) => {
          // A shared store that cannot be reached at boot must not take the
          // whole API down; keep serving with per-process limits and say so.
          console.error(
            '[rateLimit] Redis store unavailable, falling back to in-memory:',
            err.message
          );
          return createMemoryStore();
        })
      : Promise.resolve(createMemoryStore());
  }
  return sharedStorePromise;
}

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

// Distinguishes one limiter's counters from another's in a shared store. A
// stable default is derived from the configuration so every instance (and
// every restart) maps the same limiter to the same namespace.
function defaultName({ windowMs, max }) {
  return `${windowMs}:${max}`;
}

export function rateLimit({
  windowMs = DEFAULT_WINDOW_MS,
  max = DEFAULT_MAX,
  keyGenerator = ipKey,
  message = 'Too many requests, please try again later',
  name,
  store,
} = {}) {
  const namespace = name || defaultName({ windowMs, max });
  // `store` is injectable for tests; production uses the shared store.
  const storePromise = store ? Promise.resolve(store) : getRateLimitStore();

  const middleware = async (req, res, next) => {
    const now = Date.now();
    const key = `${namespace}:${keyGenerator(req) || 'unknown'}`;

    let entry;
    try {
      const resolved = await storePromise;
      entry = await resolved.increment(key, windowMs, now);
    } catch (err) {
      // Availability over strict accounting: if the shared store is
      // unreachable mid-flight, allow the request rather than lock everyone
      // out. Redis being down is not a reason to reject all traffic.
      console.warn('[rateLimit] store unavailable, allowing request:', err.message);
      return next();
    }

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
  middleware.reset = async () => {
    const resolved = await storePromise;
    await resolved.reset?.();
  };
  middleware.limit = { windowMs, max };
  middleware.namespace = namespace;
  return middleware;
}
