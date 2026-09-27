import './helpers/env.js';

import assert from 'node:assert/strict';
import test from 'node:test';

import { rateLimit, userKey } from '../src/middleware/rateLimit.js';

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

test('allows requests up to the limit and rejects the next one', async () => {
  const limiter = rateLimit({ windowMs: 1000, max: 3 });
  for (let i = 0; i < 3; i += 1) {
    const err = await run(limiter, makeReq(), makeRes());
    assert.equal(err, undefined, `request ${i + 1} should pass`);
  }
  const err = await run(limiter, makeReq(), makeRes());
  assert.equal(err?.status, 429);
});

test('sets RateLimit headers and a Retry-After on rejection', async () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 1 });
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
  const limiter = rateLimit({ windowMs: 60_000, max: 1 });
  assert.equal(await run(limiter, makeReq({ ip: '10.0.0.1' }), makeRes()), undefined);
  assert.equal(await run(limiter, makeReq({ ip: '10.0.0.2' }), makeRes()), undefined);
  assert.equal((await run(limiter, makeReq({ ip: '10.0.0.1' }), makeRes()))?.status, 429);
});

test('the window resets after it elapses', async () => {
  const limiter = rateLimit({ windowMs: 40, max: 1 });
  assert.equal(await run(limiter, makeReq(), makeRes()), undefined);
  assert.equal((await run(limiter, makeReq(), makeRes()))?.status, 429);
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(await run(limiter, makeReq(), makeRes()), undefined);
});

test('userKey prefers the account id over the client address', () => {
  assert.equal(userKey(makeReq({ user: { id: 'user-1' } })), 'user-1');
  assert.equal(userKey(makeReq()), '203.0.113.5');
});
