import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';
import { IMAGE_TYPES, detectImageType } from '../lib/image.js';

const BUCKET = 'product-images';

// Uploads one file to Supabase Storage and returns the public URL. The bucket
// is public (see BACKEND_PLAN §3.4) so browsers can hot-link the returned URL.
// Generic across product images and hero slides; the caller supplies the folder.
//
// The stored extension and Content-Type come from the file's actual bytes, never
// from the client-supplied filename — the upload middleware already validated
// the content, and re-detecting here keeps this layer safe on its own.
export async function uploadImage({ file, folder }) {
  const type = file.detectedType || detectImageType(file.buffer);
  const meta = IMAGE_TYPES[type];
  if (!meta) throw new AppError(400, 'Unsupported image file');
  const ext = meta.ext;
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await db.storage.from(BUCKET).upload(path, file.buffer, {
    contentType: type,
    upsert: false,
  });
  if (error) throw new AppError(400, 'Image upload failed', { cause: error });

  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

// Best-effort cleanup of an uploaded object. Never throws — orphaned objects
// are a storage-cost nuisance, not a reason to fail a request.
export async function removeImage(url) {
  if (!url) return;
  const key = url.split(`/object/public/${BUCKET}/`)[1];
  if (!key) return;
  const { error } = await db.storage.from(BUCKET).remove([key]);
  if (error) console.warn('[storage] could not remove image:', error.message);
}
