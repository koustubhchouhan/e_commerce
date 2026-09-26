import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const salePrice = (price, discountPercent) =>
  round2(Number(price) * (1 - (discountPercent || 0) / 100));

// Loads all product_images for the given product ids in a single query and
// groups them by product_id, so list endpoints avoid an N+1 fetch.
export async function loadImagesByProduct(productIds) {
  const map = new Map();
  if (!productIds.length) return map;

  const { data, error } = await db
    .from('product_images')
    .select('id, product_id, url, is_cover, position')
    .in('product_id', productIds);

  if (error) throw new AppError(500, `Could not load product images: ${error.message}`);

  for (const img of data ?? []) {
    if (!map.has(img.product_id)) map.set(img.product_id, []);
    map.get(img.product_id).push(img);
  }
  return map;
}

// Cover-only variant for list endpoints that render a single thumbnail per
// product. Reads the flagged cover in one query, then fills the gaps with the
// earliest-positioned image, so we never pull every image row just to pick one.
export async function loadCoversByProduct(productIds) {
  const covers = new Map();
  if (!productIds.length) return covers;

  const { data: flagged, error } = await db
    .from('product_images')
    .select('product_id, url')
    .in('product_id', productIds)
    .eq('is_cover', true);

  if (error) throw new AppError(500, `Could not load product images: ${error.message}`);
  for (const img of flagged ?? []) {
    if (!covers.has(img.product_id)) covers.set(img.product_id, img.url);
  }

  const missing = productIds.filter((id) => !covers.has(id));
  if (missing.length > 0) {
    const { data: firsts, error: firstErr } = await db
      .from('product_images')
      .select('product_id, url, position')
      .in('product_id', missing)
      .order('position');
    if (firstErr) throw new AppError(500, `Could not load product images: ${firstErr.message}`);
    for (const img of firsts ?? []) {
      if (!covers.has(img.product_id)) covers.set(img.product_id, img.url);
    }
  }

  return covers;
}

// The display image for a product: the row flagged as cover, else the first.
export function pickCover(images = []) {
  return (images.find((i) => i.is_cover) ?? images[0])?.url ?? null;
}

// Shapes a products row (with embedded categories/stores) into the API shape
// the catalog list consumes: price + computed sale price + cover image.
export function serializeProduct(row, coverUrl) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    discount_percent: row.discount_percent,
    stock: row.stock,
    status: row.status,
    approvalStatus: row.approval_status ?? 'approved',
    rejectionReason: row.rejection_reason ?? null,
    salePrice: salePrice(row.price, row.discount_percent),
    category: row.categories
      ? { id: row.categories.id, name: row.categories.name, slug: row.categories.slug }
      : null,
    storeId: row.store_id ?? null,
    storeName: row.stores?.name ?? null,
    coverImage: coverUrl ?? null,
  };
}
