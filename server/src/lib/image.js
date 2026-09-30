// Content-based image inspection. Uploads are authorized by what the bytes
// actually are — never by the client-supplied filename or Content-Type — so a
// mislabelled or hostile file cannot slip into public storage. Dependency-free
// (consistent with the rate limiter and cache metrics) and covers the raster
// formats we accept: JPEG, PNG, WebP and GIF.

// Only these formats are ever written to storage. SVG is deliberately absent:
// it is a scripting-capable XML document, not a raster image, and is rejected.
export const IMAGE_TYPES = {
  'image/jpeg': { ext: 'jpg' },
  'image/png': { ext: 'png' },
  'image/webp': { ext: 'webp' },
  'image/gif': { ext: 'gif' },
};

export const RASTER_MIME_TYPES = Object.keys(IMAGE_TYPES);

// Returns the real MIME type of the buffer, 'image/svg+xml' for SVG-like input,
// or null when the bytes match nothing we recognize.
export function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  // JPEG: SOI marker FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // GIF: "GIF87a" or "GIF89a"
  const header6 = buffer.toString('latin1', 0, 6);
  if (header6 === 'GIF87a' || header6 === 'GIF89a') return 'image/gif';

  // WebP: "RIFF" .... "WEBP"
  if (buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  if (isSvgLike(buffer)) return 'image/svg+xml';

  return null;
}

// Detects XML/SVG documents (with optional BOM, whitespace and XML prolog) so
// they can be reported with a specific message rather than "unknown format".
export function isSvgLike(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return false;
  let head = buffer.subarray(0, 512).toString('latin1');
  if (head.charCodeAt(0) === 0xfeff) head = head.slice(1);
  // Strip leading whitespace and NUL padding without a control-char regex.
  let start = 0;
  while (start < head.length && head.charCodeAt(start) <= 0x20) start += 1;
  head = head.slice(start).toLowerCase();
  return head.startsWith('<?xml') || head.startsWith('<svg') || head.startsWith('<!doctype svg');
}

// Reads the pixel dimensions straight from the container headers. Returns
// { width, height } or null if the header is missing/malformed.
export function imageDimensions(buffer, type) {
  if (!Buffer.isBuffer(buffer)) return null;
  switch (type) {
    case 'image/png':
      return pngDimensions(buffer);
    case 'image/gif':
      return gifDimensions(buffer);
    case 'image/jpeg':
      return jpegDimensions(buffer);
    case 'image/webp':
      return webpDimensions(buffer);
    default:
      return null;
  }
}

function pngDimensions(buffer) {
  // IHDR chunk: length(4) type(4) then width(4) height(4), big-endian.
  if (buffer.length < 24) return null;
  if (buffer.toString('latin1', 12, 16) !== 'IHDR') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function gifDimensions(buffer) {
  // Logical screen descriptor: width(2) height(2), little-endian.
  if (buffer.length < 10) return null;
  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
}

function jpegDimensions(buffer) {
  let offset = 2;
  const length = buffer.length;
  while (offset + 9 <= length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    // Standalone markers carry no length field.
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2) return null;
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    offset += 2 + segmentLength;
  }
  return null;
}

function webpDimensions(buffer) {
  if (buffer.length < 30) return null;
  const format = buffer.toString('latin1', 12, 16);

  if (format === 'VP8 ') {
    // Lossy: 16-bit dimensions at chunk-data offsets 6 and 8.
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (format === 'VP8L') {
    // Lossless: 14 bits width-1 then 14 bits height-1, packed little-endian.
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (format === 'VP8X') {
    // Extended: 24-bit canvas width-1 and height-1.
    return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
  }
  return null;
}
