import './helpers/env.js';

import assert from 'node:assert/strict';
import test from 'node:test';

import { rateLimit, userKey, getRateLimitStore } from '../src/middleware/rateLimit.js';
import { createMemoryStore } from '../src/lib/rateLimitStore.js';

function makeReq(overrides = {}) {
  return { ip: '203.0.113.5', socket: {}, headers: {}, ...overrides };
}

function makeRes() {
  const headers = {};
  return {
    headers,
    set(key, value) {
      headers[key] = value;
      return this;
    },
  };
}

// Runs the middleware and resolves with whatever it passed to next() — an
// undefined result means the request was allowed through.
function run(middleware, req, res) {
  return new Promise((resolve) => {
    middleware(req, res, (err) => resolve(err));
  });
}

// Each limiter under test gets its own store so cases stay independent.
const isolated = (options) => rateLimit({ ...options, store: createMemoryStore() });

test('allows requests up to the limit and rejects the next one', async () => {
  const limiter = isolated({ windowMs: 1000, max: 3 });
  for (let i = 0; i < 3; i += 1) {
    const err = await run(limiter, makeReq(), makeRes());
    assert.equal(err, undefined, `request ${i + 1} should pass`);
  }
  const err = await run(limiter, makeReq(), makeRes());
  assert.equal(err?.status, 429);
});

test('sets RateLimit headers and a Retry-After on rejection', async () => {
  const limiter = isolated({ windowMs: 60_000, max: 1 });
  const allowed = makeRes();
  await run(limiter, makeReq(), allowed);
  assert.equal(allowed.headers['RateLimit-Limit'], '1');
  assert.equal(allowed.headers['RateLimit-Remaining'], '0');

  const blocked = makeRes();
  const err = await run(limiter, makeReq(), blocked);
  assert.equal(err?.status, 429);
  assert.ok(Number(blocked.headers['Retry-After']) >= 1);
  assert.equal(blocked.headers['RateLimit-Remaining'], '0');
});

test('counts each key separately', async () => {
  const limiter = isolated({ windowMs: 60_000, max: 1 });
  assert.equal(await run(limiter, makeReq({ ip: '10.0.0.1' }), makeRes()), undefined);
  assert.equal(await run(limiter, makeReq({ ip: '10.0.0.2' }), makeRes()), undefined);
  assert.equal((await run(limiter, makeReq({ ip: '10.0.0.1' }), makeRes()))?.status, 429);
});

test('the window resets after it elapses', async () => {
  const limiter = isolated({ windowMs: 40, max: 1 });
  assert.equal(await run(limiter, makeReq(), makeRes()), undefined);
  assert.equal((await run(limiter, makeReq(), makeRes()))?.status, 429);
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(await run(limiter, makeReq(), makeRes()), undefined);
});

test('two limiters on the same store do not share counters', async () => {
  const store = createMemoryStore();
  const a = rateLimit({ windowMs: 60_000, max: 1, name: 'limit:a', store });
  const b = rateLimit({ windowMs: 60_000, max: 1, name: 'limit:b', store });
  assert.equal(await run(a, makeReq(), makeRes()), undefined);
  assert.equal((await run(a, makeReq(), makeRes()))?.status, 429);
  // Same key/ip, different namespace → independent budget.
  assert.equal(await run(b, makeReq(), makeRes()), undefined);
});

test('works against an async (shared-store style) implementation', async () => {
  const counts = new Map();
  const asyncStore = {
    async increment(key, windowMs, now) {
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return { count, resetAt: now + windowMs };
    },
  };
  const limiter = rateLimit({ windowMs: 60_000, max: 2, store: asyncStore });
  assert.equal(await run(limiter, makeReq(), makeRes()), undefined);
  assert.equal(await run(limiter, makeReq(), makeRes()), undefined);
  assert.equal((await run(limiter, makeReq(), makeRes()))?.status, 429);
});

test('fails open when the store throws', async () => {
  const brokenStore = {
    async increment() {
      throw new Error('redis is down');
    },
  };
  const limiter = rateLimit({ windowMs: 60_000, max: 1, store: brokenStore });
  assert.equal(await run(limiter, makeReq(), makeRes()), undefined);
  assert.equal(await run(limiter, makeReq(), makeRes()), undefined);
});

test('defaults to the in-memory store when REDIS_URL is unset', async () => {
  assert.equal(process.env.REDIS_URL, undefined);
  const store = await getRateLimitStore();
  assert.equal(store.kind, 'memory');
});

test('userKey prefers the account id over the client address', () => {
  assert.equal(userKey(makeReq({ user: { id: 'user-1' } })), 'user-1');
  assert.equal(userKey(makeReq()), '203.0.113.5');
});
