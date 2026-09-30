import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryStore } from '../src/lib/rateLimitStore.js';

test('counts each key within its own window', async () => {
  const store = createMemoryStore();
  assert.equal((await store.increment('k', 1000, 1000)).count, 1);
  assert.equal((await store.increment('k', 1000, 1050)).count, 2);
  assert.equal((await store.increment('other', 1000, 1050)).count, 1);
});

test('starts a fresh window once the previous one elapses', async () => {
  const store = createMemoryStore();
  await store.increment('k', 100, 1000);
  const rolled = await store.increment('k', 100, 1200);
  assert.equal(rolled.count, 1);
  assert.equal(rolled.resetAt, 1300);
});

test('reset() clears all counters', async () => {
  const store = createMemoryStore();
  await store.increment('k', 1000, 0);
  await store.reset();
  assert.equal((await store.increment('k', 1000, 1)).count, 1);
});

test('caps growth by dropping state at the key ceiling', async () => {
  const store = createMemoryStore({ maxKeys: 2 });
  await store.increment('a', 60_000, 0);
  await store.increment('b', 60_000, 0);
  await store.increment('c', 60_000, 0); // hits the ceiling, clears the map
  assert.equal((await store.increment('a', 60_000, 1)).count, 1);
});
