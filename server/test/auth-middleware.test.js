import './helpers/env.js';

import assert from 'node:assert/strict';
import test from 'node:test';

import { requireAuth, optionalAuth, requireRole } from '../src/middleware/auth.js';

function makeReq(overrides = {}) {
  return {
    method: 'GET',
    headers: {},
    cookies: {},
    get() {
      return undefined;
    },
    ...overrides,
  };
}

// Runs a middleware and resolves with whatever it passed to next() (undefined
// means it allowed the request through).
function run(middleware, req) {
  return new Promise((resolve) => {
    middleware(req, {}, (err) => resolve(err));
  });
}

test('requireAuth rejects a request with no credentials', async () => {
  const err = await run(requireAuth, makeReq());
  assert.ok(err, 'expected an error');
  assert.equal(err.status, 401);
});

test('optionalAuth lets an anonymous request through', async () => {
  const err = await run(optionalAuth, makeReq());
  assert.equal(err, undefined);
});

test('requireRole rejects an unauthenticated request', async () => {
  const err = await run(requireRole('admin'), makeReq());
  assert.equal(err?.status, 401);
});

test('requireRole rejects a signed-in user with the wrong role', async () => {
  const err = await run(requireRole('admin'), makeReq({ user: { role: 'seller' } }));
  assert.equal(err?.status, 403);
});

test('requireRole admits a user whose role is allowed', async () => {
  const err = await run(
    requireRole('seller', 'admin'),
    makeReq({ user: { role: 'admin' } })
  );
  assert.equal(err, undefined);
});

test('requireRole exposes its allowed roles for the route audit', () => {
  assert.deepEqual(requireRole('seller', 'admin').roles, ['seller', 'admin']);
});
