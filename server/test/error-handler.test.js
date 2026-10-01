import './helpers/env.js';

import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError, errorHandler } from '../src/middleware/error.js';

function makeRes() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    set(key, value) {
      this.headers[key] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function invoke(err) {
  const req = { id: 'req-123', method: 'GET', originalUrl: '/x' };
  const res = makeRes();
  errorHandler(err, req, res, (e) => {
    throw e;
  });
  return res;
}

// Runs the handler while capturing anything written to console.error.
function invokeCapturing(err) {
  const original = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args.join(' '));
  try {
    return { res: invoke(err), logs: logs.join('\n') };
  } finally {
    console.error = original;
  }
}

test('returns the stable AppError message and hides the upstream cause', () => {
  const raw = { message: 'relation "secret_table" does not exist', code: '42P01' };
  const { res, logs } = invokeCapturing(new AppError(500, 'Could not load products', { cause: raw }));

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'Could not load products');
  assert.equal(res.body.requestId, 'req-123');
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.ok(!JSON.stringify(res.body).includes('secret_table'), 'cause must not leak');
  // ...but it is logged server-side, tied to the request id.
  assert.match(logs, /secret_table/);
  assert.match(logs, /req-123/);
});

test('never surfaces the message of an unexpected error', () => {
  const { res, logs } = invokeCapturing(new Error('SECRET_INTERNAL_DETAIL'));
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'Something went wrong. Please try again.');
  assert.ok(!JSON.stringify(res.body).includes('SECRET_INTERNAL_DETAIL'));
  assert.match(logs, /SECRET_INTERNAL_DETAIL/);
});

test('maps multer parse failures to friendly text', () => {
  const err = new Error('File too large');
  err.name = 'MulterError';
  err.code = 'LIMIT_FILE_SIZE';
  const res = invoke(err);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'File is too large');
});

test('maps malformed JSON bodies to a stable message', () => {
  const err = new SyntaxError('Unexpected token < in JSON');
  err.type = 'entity.parse.failed';
  err.status = 400; // body-parser sets this on real parse failures
  const res = invoke(err);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'Invalid request body');
  assert.ok(!JSON.stringify(res.body).includes('Unexpected token'));
});

test('passes validation details through and exposes a request id', () => {
  const details = [{ path: 'email', message: 'Invalid email' }];
  const res = invoke(new AppError(422, 'Validation failed', { details }));
  assert.equal(res.statusCode, 422);
  assert.deepEqual(res.body.details, details);
  assert.equal(res.body.requestId, 'req-123');
});

test('honours expose:false on an AppError', () => {
  const res = invoke(new AppError(500, 'raw internal detail', { expose: false }));
  assert.equal(res.body.error, 'Request could not be processed');
  assert.ok(!JSON.stringify(res.body).includes('raw internal detail'));
});
