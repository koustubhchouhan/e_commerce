import assert from 'node:assert/strict';
import test from 'node:test';

import { requestId } from '../src/middleware/requestId.js';

function run(headers = {}) {
  const req = {
    get(key) {
      return headers[key.toLowerCase()];
    },
  };
  const res = {
    headers: {},
    set(key, value) {
      this.headers[key] = value;
    },
  };
  requestId(req, res, () => {});
  return { req, res };
}

test('generates an id and echoes it on the response', () => {
  const { req, res } = run();
  assert.ok(req.id);
  assert.equal(res.headers['X-Request-Id'], req.id);
});

test('keeps a safe inbound correlation id', () => {
  const { req } = run({ 'x-request-id': 'abc-123_DEF.4' });
  assert.equal(req.id, 'abc-123_DEF.4');
});

test('replaces unsafe inbound ids instead of trusting them', () => {
  const { req } = run({ 'x-request-id': 'bad id\nwith newline' });
  assert.notEqual(req.id, 'bad id\nwith newline');
  assert.match(req.id, /^[A-Za-z0-9-]{32,}$/);
});

test('replaces an over-long inbound id', () => {
  const { req } = run({ 'x-request-id': 'a'.repeat(200) });
  assert.notEqual(req.id.length, 200);
});
