import './helpers/env.js';

import assert from 'node:assert/strict';
import test from 'node:test';

import { cacheMetrics, cacheStats, resetCacheStats } from '../src/middleware/cacheMetrics.js';

function makeRes({ statusCode = 200, control } = {}) {
  let finish;
  return {
    statusCode,
    getHeader(name) {
      return name === 'Cache-Control' ? control : undefined;
    },
    on(event, cb) {
      if (event === 'finish') finish = cb;
    },
    finish: () => finish?.(),
  };
}

function run(req, res) {
  return new Promise((resolve) => {
    cacheMetrics(req, res, () => resolve());
  });
}

test('counts a fresh 200 with a cache policy as served', async () => {
  resetCacheStats();
  const res = makeRes({ statusCode: 200, control: 'public, max-age=60' });
  await run({ method: 'GET' }, res);
  res.finish();
  assert.deepEqual(cacheStats(), { served: 1, revalidated: 0, revalidationRate: 0 });
});

test('counts a 304 as revalidated and reports the rate', async () => {
  resetCacheStats();
  const fresh = makeRes({ statusCode: 200, control: 'private, max-age=30' });
  await run({ method: 'GET' }, fresh);
  fresh.finish();

  const revalidated = makeRes({ statusCode: 304, control: 'private, max-age=30' });
  await run({ method: 'GET' }, revalidated);
  revalidated.finish();

  assert.deepEqual(cacheStats(), { served: 1, revalidated: 1, revalidationRate: 0.5 });
});

test('ignores no-store responses', async () => {
  resetCacheStats();
  const res = makeRes({ statusCode: 200, control: 'no-store' });
  await run({ method: 'GET' }, res);
  res.finish();
  assert.deepEqual(cacheStats(), { served: 0, revalidated: 0, revalidationRate: 0 });
});

test('ignores non-GET requests', async () => {
  resetCacheStats();
  const res = makeRes({ statusCode: 200, control: 'public, max-age=60' });
  await run({ method: 'POST' }, res);
  res.finish();
  assert.deepEqual(cacheStats(), { served: 0, revalidated: 0, revalidationRate: 0 });
});
