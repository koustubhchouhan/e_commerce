import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateUploadedImages,
  AVATAR_POLICY,
  PRODUCT_IMAGE_POLICY,
} from '../src/middleware/upload.js';

function png(width, height) {
  const buffer = Buffer.alloc(25);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'latin1');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function fakeFile(buffer, { name = 'upload.png', mimetype = 'image/png' } = {}) {
  return { buffer, originalname: name, mimetype };
}

// Runs a validate middleware with the given (already parsed) request shape.
function run(middleware, req) {
  return new Promise((resolve) => {
    middleware(req, {}, (err) => resolve(err));
  });
}

test('accepts a real PNG and stamps authoritative metadata', async () => {
  const file = fakeFile(png(200, 150), { name: 'weird.EXE', mimetype: 'application/octet-stream' });
  const err = await run(validateUploadedImages(AVATAR_POLICY), { file });

  assert.equal(err, undefined);
  assert.equal(file.detectedType, 'image/png');
  assert.equal(file.mimetype, 'image/png');
  assert.equal(file.safeExtension, 'png');
  assert.equal(file.width, 200);
  assert.equal(file.height, 150);
});

test('rejects an SVG even when it claims to be a PNG', async () => {
  const file = fakeFile(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), {
    name: 'avatar.png',
    mimetype: 'image/png',
  });
  const err = await run(validateUploadedImages(AVATAR_POLICY), { file });
  assert.equal(err?.status, 400);
  assert.match(err.message, /SVG uploads are not allowed/);
});

test('rejects content that is not a recognized image', async () => {
  const file = fakeFile(Buffer.from('%PDF-1.7 not really an image'), { name: 'a.jpg' });
  const err = await run(validateUploadedImages(AVATAR_POLICY), { file });
  assert.equal(err?.status, 400);
  assert.match(err.message, /not a valid image/);
});

test('rejects images below the minimum dimensions', async () => {
  const err = await run(validateUploadedImages(AVATAR_POLICY), { file: fakeFile(png(16, 16)) });
  assert.equal(err?.status, 400);
  assert.match(err.message, /too small/);
});

test('rejects images above the pixel budget', async () => {
  const err = await run(validateUploadedImages(AVATAR_POLICY), { file: fakeFile(png(9000, 9000)) });
  assert.equal(err?.status, 400);
  assert.match(err.message, /too large/);
});

test('rejects a request with no file', async () => {
  const err = await run(validateUploadedImages(AVATAR_POLICY), {});
  assert.equal(err?.status, 400);
  assert.match(err.message, /No avatar uploaded/);
});

test('validates every file in a multi-file upload', async () => {
  const good = fakeFile(png(200, 200));
  const bad = fakeFile(Buffer.from('garbage bytes here'), { name: 'bad.png' });
  const err = await run(validateUploadedImages(PRODUCT_IMAGE_POLICY), { files: [good, bad] });
  assert.equal(err?.status, 400);

  const clean = await run(validateUploadedImages(PRODUCT_IMAGE_POLICY), {
    files: [fakeFile(png(200, 200)), fakeFile(png(300, 300))],
  });
  assert.equal(clean, undefined);
});
