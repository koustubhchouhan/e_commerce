import multer from 'multer';
import { AppError } from './error.js';
import {
  IMAGE_TYPES,
  RASTER_MIME_TYPES,
  detectImageType,
  imageDimensions,
} from '../lib/image.js';

const MB = 1024 * 1024;

// Per-route policies. Bytes are authorized by content (see lib/image.js); these
// bounds additionally cap decompression bombs and reject junk/stub uploads.
export const PRODUCT_IMAGE_POLICY = {
  label: 'product image',
  allowed: RASTER_MIME_TYPES,
  maxBytes: 5 * MB,
  minWidth: 32,
  minHeight: 32,
  maxWidth: 10000,
  maxHeight: 10000,
  maxPixels: 50_000_000,
};

export const AVATAR_POLICY = {
  label: 'avatar',
  allowed: RASTER_MIME_TYPES,
  maxBytes: 3 * MB,
  minWidth: 32,
  minHeight: 32,
  maxWidth: 6000,
  maxHeight: 6000,
  maxPixels: 24_000_000,
};

export const CATEGORY_IMAGE_POLICY = {
  label: 'category image',
  allowed: RASTER_MIME_TYPES,
  maxBytes: 4 * MB,
  minWidth: 64,
  minHeight: 64,
  maxWidth: 8000,
  maxHeight: 8000,
  maxPixels: 36_000_000,
};

export const SLIDE_IMAGE_POLICY = {
  label: 'slide image',
  allowed: RASTER_MIME_TYPES,
  maxBytes: 5 * MB,
  minWidth: 320,
  minHeight: 120,
  maxWidth: 10000,
  maxHeight: 10000,
  maxPixels: 50_000_000,
};

const SVG_MESSAGE = 'SVG uploads are not allowed; use a PNG, JPEG, WebP or GIF image.';
const TYPE_MESSAGE = 'This file is not a valid image. Allowed formats are PNG, JPEG, WebP and GIF.';

// Multer parses into memory; the declared Content-Type is checked here only as
// a cheap early reject. The authoritative check happens on the parsed bytes.
function createParser({ maxBytes, maxFiles }) {
  const limits = { fileSize: maxBytes };
  if (maxFiles) limits.files = maxFiles;
  return multer({
    storage: multer.memoryStorage(),
    limits,
    fileFilter: (req, file, cb) => {
      const declared = String(file.mimetype || '').toLowerCase();
      if (declared === 'image/svg+xml') return cb(new AppError(400, SVG_MESSAGE));
      if (!RASTER_MIME_TYPES.includes(declared)) return cb(new AppError(400, TYPE_MESSAGE));
      cb(null, true);
    },
  });
}

// Inspects every parsed file against the policy and stamps the authoritative
// MIME type, normalized extension and dimensions onto the file object so the
// storage layer never trusts client-provided metadata. Exported for tests.
export function validateUploadedImages(policy) {
  return (req, res, next) => {
    try {
      const files = req.files
        ? Object.values(req.files).flat()
        : req.file
          ? [req.file]
          : [];
      if (!files.length) throw new AppError(400, `No ${policy.label} uploaded`);

      for (const file of files) {
        const detected = detectImageType(file.buffer);
        if (detected === 'image/svg+xml') throw new AppError(400, SVG_MESSAGE);
        if (!detected || !policy.allowed.includes(detected)) {
          throw new AppError(400, TYPE_MESSAGE);
        }

        const dims = imageDimensions(file.buffer, detected);
        if (!dims || !dims.width || !dims.height) {
          throw new AppError(400, 'Could not read the image dimensions; the file may be corrupt.');
        }
        if (dims.width < policy.minWidth || dims.height < policy.minHeight) {
          throw new AppError(
            400,
            `Image is too small; the minimum is ${policy.minWidth}x${policy.minHeight}px.`
          );
        }
        if (
          dims.width > policy.maxWidth ||
          dims.height > policy.maxHeight ||
          dims.width * dims.height > policy.maxPixels
        ) {
          throw new AppError(
            400,
            `Image is too large; the maximum is ${policy.maxWidth}x${policy.maxHeight}px.`
          );
        }

        file.mimetype = detected;
        file.detectedType = detected;
        file.safeExtension = IMAGE_TYPES[detected].ext;
        file.width = dims.width;
        file.height = dims.height;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Spreadable middleware bundles: [...imageUploadSingle('avatar', AVATAR_POLICY)].
export function imageUploadSingle(field, policy) {
  return [createParser({ maxBytes: policy.maxBytes }).single(field), validateUploadedImages(policy)];
}

export function imageUploadArray(field, maxFiles, policy) {
  return [
    createParser({ maxBytes: policy.maxBytes, maxFiles }).array(field, maxFiles),
    validateUploadedImages(policy),
  ];
}
