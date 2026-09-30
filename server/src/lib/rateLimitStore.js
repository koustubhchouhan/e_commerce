// Pluggable storage for the rate limiter.
//
// The limiter's counters must be shared across processes once the API runs on
// more than one instance; a per-process Map would let each instance enforce the
// limit independently (effective limit = max × instances) and lose all state on
// restart. This module provides:
//
//   - createMemoryStore(): the default. Dependency-free, single-process.
//   - createRedisStore():  a shared fixed-window counter backed by Redis, used
//                          only when REDIS_URL is configured.
//
// Both stores expose the same tiny async interface so the middleware does not
// care which is in use:
//
//   increment(key, windowMs, now) -> { count, resetAt }

// Guards against unbounded growth when a limiter sees many distinct keys (e.g.
// a bot cycling source IPs). Once the map reaches this size we drop expired
// entries; if it is still full we reset it, preferring availability over
// perfect accounting.
const MAX_KEYS = 10_000;

export function createMemoryStore({ maxKeys = MAX_KEYS } = {}) {
  const hits = new Map();

  const prune = (now) => {
    if (hits.size < maxKeys) return;
    for (const [key, entry] of hits) {
      if (now >= entry.resetAt) hits.delete(key);
    }
    if (hits.size >= maxKeys) hits.clear();
  };

  return {
    kind: 'memory',
    async increment(key, windowMs, now) {
      prune(now);
      let entry = hits.get(key);
      if (!entry || now >= entry.resetAt) {
        entry = { count: 0, resetAt: now + windowMs };
        hits.set(key, entry);
      }
      entry.count += 1;
      return { count: entry.count, resetAt: entry.resetAt };
    },
    async reset() {
      hits.clear();
    },
  };
}

// INCR + expiry + PTTL in one atomic round trip. Doing it server-side avoids
// the race where a process dies between INCR and EXPIRE and leaks a key with no
// TTL. Returns { count, ttlMs }.
const REDIS_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {current, ttl}
`;

// Connects to Redis (redis:// or rediss:// for TLS). The `redis` package is
// imported dynamically so it is only required when REDIS_URL is actually set.
export async function createRedisStore({ url, prefix = 'ratelimit' }) {
  const { createClient } = await import('redis');
  const client = createClient({ url });
  client.on('error', (err) => console.error('[redis] rate-limit store error:', err.message));
  await client.connect();

  return {
    kind: 'redis',
    async increment(key, windowMs, now) {
      const [count, ttl] = await client.eval(REDIS_SCRIPT, {
        keys: [`${prefix}:${key}`],
        arguments: [String(windowMs)],
      });
      return { count: Number(count), resetAt: now + Number(ttl) };
    },
    async reset() {
      // Only used by tests; never call this against a shared/production Redis.
      const keys = await client.keys(`${prefix}:*`);
      if (keys.length) await client.del(keys);
    },
    async close() {
      await client.quit();
    },
    client,
  };
}
