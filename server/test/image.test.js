import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IMAGE_TYPES,
  detectImageType,
  imageDimensions,
  isSvgLike,
} from '../src/lib/image.js';

function png(width, height) {
  const buffer = Buffer.alloc(25);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'latin1');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function gif(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.write('GIF89a', 0, 'latin1');
  buffer.writeUInt16LE(width, 6);
  buffer.writeUInt16LE(height, 8);
  return buffer;
}

function jpeg(width, height) {
  const sof = Buffer.alloc(19);
  sof[0] = 0xff;
  sof[1] = 0xc0;
  sof.writeUInt16BE(17, 2);
  sof[4] = 8;
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  sof[9] = 3;
  return Buffer.concat([Buffer.from([0xff, 0xd8]), sof, Buffer.from([0xff, 0xd9])]);
}

function webpVp8x(width, height) {
  const buffer = Buffer.alloc(30);
  buffer.write('RIFF', 0, 'latin1');
  buffer.writeUInt32LE(22, 4);
  buffer.write('WEBP', 8, 'latin1');
  buffer.write('VP8X', 12, 'latin1');
  buffer.writeUInt32LE(10, 16);
  buffer.writeUIntLE(width - 1, 24, 3);
  buffer.writeUIntLE(height - 1, 27, 3);
  return buffer;
}

test('detects raster formats from their magic bytes', () => {
  assert.equal(detectImageType(png(10, 10)), 'image/png');
  assert.equal(detectImageType(gif(10, 10)), 'image/gif');
  assert.equal(detectImageType(jpeg(10, 10)), 'image/jpeg');
  assert.equal(detectImageType(webpVp8x(10, 10)), 'image/webp');
});

test('flags SVG-like payloads that masquerade as images', () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
  assert.equal(detectImageType(svg), 'image/svg+xml');
  assert.equal(isSvgLike(svg), true);
  const prolog = Buffer.from('<?xml version="1.0"?>\n<svg></svg>');
  assert.equal(detectImageType(prolog), 'image/svg+xml');
});

test('returns null for unknown or truncated content', () => {
  assert.equal(detectImageType(Buffer.from('not an image at all')), null);
  assert.equal(detectImageType(Buffer.alloc(24)), null);
  assert.equal(detectImageType(null), null);
});

test('reads dimensions from each raster header', () => {
  assert.deepEqual(imageDimensions(png(640, 480), 'image/png'), { width: 640, height: 480 });
  assert.deepEqual(imageDimensions(gif(12, 34), 'image/gif'), { width: 12, height: 34 });
  assert.deepEqual(imageDimensions(jpeg(800, 600), 'image/jpeg'), { width: 800, height: 600 });
  assert.deepEqual(imageDimensions(webpVp8x(1024, 768), 'image/webp'), {
    width: 1024,
    height: 768,
  });
});

test('every advertised MIME type maps to a normalized extension', () => {
  assert.equal(IMAGE_TYPES['image/jpeg'].ext, 'jpg');
  assert.equal(IMAGE_TYPES['image/png'].ext, 'png');
  assert.equal(IMAGE_TYPES['image/webp'].ext, 'webp');
  assert.equal(IMAGE_TYPES['image/gif'].ext, 'gif');
  assert.equal(IMAGE_TYPES['image/svg+xml'], undefined);
});
