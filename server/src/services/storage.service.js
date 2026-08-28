import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';

const BUCKET = 'product-images';

// Uploads one file to Supabase Storage and returns the public URL. The bucket
// is public (see BACKEND_PLAN §3.4) so browsers can hot-link the returned URL.
export async function uploadProductImage({ file, folder }) {
  const ext = file.originalname.includes('.') ? file.originalname.split('.').pop() : 'bin';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await db.storage.from(BUCKET).upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) throw new AppError(400, `Image upload failed: ${error.message}`);

  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

// Best-effort cleanup of an uploaded object. Never throws — orphaned objects
// are a storage-cost nuisance, not a reason to fail a request.
export async function removeProductImage(url) {
  if (!url) return;
  const key = url.split(`/object/public/${BUCKET}/`)[1];
  if (!key) return;
  const { error } = await db.storage.from(BUCKET).remove([key]);
  if (error) console.warn('[storage] could not remove image:', error.message);
}
