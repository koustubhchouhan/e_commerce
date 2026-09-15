import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';
import { removeImage, uploadImage } from './storage.service.js';

const SLIDE_SELECT =
  'id, eyebrow, title, description, image_url, button_label, button_link, theme, position, is_active, created_at';

function serializeSlide(row) {
  return {
    id: row.id,
    eyebrow: row.eyebrow,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    buttonLabel: row.button_label,
    buttonLink: row.button_link,
    theme: row.theme,
    position: row.position,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

async function loadSlide(id) {
  const { data, error } = await db
    .from('hero_slides')
    .select(SLIDE_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw new AppError(500, `Could not load slide: ${error.message}`);
  if (!data) throw new AppError(404, 'Slide not found');
  return data;
}

// GET /hero-slides — the storefront carousel. Only active slides, in display
// order (explicit `position` first, then oldest first).
export async function listActiveSlides() {
  const { data, error } = await db
    .from('hero_slides')
    .select(SLIDE_SELECT)
    .eq('is_active', true)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new AppError(500, `Could not load slides: ${error.message}`);
  return (data ?? []).map(serializeSlide);
}

// GET /admin/hero-slides — every slide, including hidden ones.
export async function listAllSlides() {
  const { data, error } = await db
    .from('hero_slides')
    .select(SLIDE_SELECT)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new AppError(500, `Could not load slides: ${error.message}`);
  return (data ?? []).map(serializeSlide);
}

// POST /admin/hero-slides — admins may add any number of slides.
export async function createSlide(input) {
  const { data, error } = await db
    .from('hero_slides')
    .insert({
      eyebrow: input.eyebrow,
      title: input.title,
      description: input.description,
      image_url: input.imageUrl,
      button_label: input.buttonLabel,
      button_link: input.buttonLink,
      theme: input.theme,
      position: input.position,
      is_active: input.isActive,
    })
    .select(SLIDE_SELECT)
    .single();

  if (error) throw new AppError(400, `Could not create slide: ${error.message}`);
  return serializeSlide(data);
}

// PATCH /admin/hero-slides/:id — partial update. When the image is replaced,
// the previously stored object is removed afterwards (best effort).
export async function updateSlide(id, patch) {
  const existing = await loadSlide(id);

  const update = {};
  if (patch.eyebrow !== undefined) update.eyebrow = patch.eyebrow;
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.imageUrl !== undefined) update.image_url = patch.imageUrl;
  if (patch.buttonLabel !== undefined) update.button_label = patch.buttonLabel;
  if (patch.buttonLink !== undefined) update.button_link = patch.buttonLink;
  if (patch.theme !== undefined) update.theme = patch.theme;
  if (patch.position !== undefined) update.position = patch.position;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;

  if (Object.keys(update).length === 0) return serializeSlide(existing);

  const { data, error } = await db
    .from('hero_slides')
    .update(update)
    .eq('id', id)
    .select(SLIDE_SELECT)
    .single();

  if (error) throw new AppError(400, `Could not update slide: ${error.message}`);

  if (patch.imageUrl !== undefined && patch.imageUrl !== existing.image_url) {
    await removeImage(existing.image_url);
  }

  return serializeSlide(data);
}

// DELETE /admin/hero-slides/:id — removes the slide and its stored image.
export async function deleteSlide(id) {
  const existing = await loadSlide(id);

  const { error } = await db.from('hero_slides').delete().eq('id', id);
  if (error) throw new AppError(400, `Could not delete slide: ${error.message}`);

  await removeImage(existing.image_url);
}

// POST /admin/hero-slides/image — multipart upload; returns the public URL the
// client then submits as `imageUrl`.
export async function uploadSlideImage(file) {
  if (!file) throw new AppError(400, 'No image file uploaded');
  if (!/^image\//.test(file.mimetype)) {
    throw new AppError(400, 'Image must be a JPG, PNG or WebP file');
  }

  const { url } = await uploadImage({ file, folder: 'hero-slides' });
  return { url };
}
