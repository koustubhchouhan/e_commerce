import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';
import { loadImagesByProduct, pickCover, serializeProduct } from './product-data.js';

export async function listCategories() {
  const { data, error } = await db.from('categories').select('id, name, slug').order('name');
  if (error) throw new AppError(500, `Could not load categories: ${error.message}`);
  return data ?? [];
}

// GET /products — public catalog listing. Filters by search term and/or
// category slug, paginates, and includes each product's cover image + sale price.
export async function listProducts({ search, category, page, limit }) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = db
    .from('products')
    .select('*, categories(id, name, slug), stores(id, name)', { count: 'exact' })
    .eq('status', 'active');

  if (search) {
    const term = search.trim();
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (category) {
    query = query.eq('categories.slug', category);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new AppError(500, `Could not load products: ${error.message}`);

  const ids = (data ?? []).map((p) => p.id);
  const imagesByProduct = await loadImagesByProduct(ids);

  return {
    items: (data ?? []).map((row) =>
      serializeProduct(row, pickCover(imagesByProduct.get(row.id)))
    ),
    page,
    limit,
    total: count ?? 0,
  };
}

// GET /products/:id — full product with images[] and store name.
export async function getProduct(id) {
  const { data: row, error } = await db
    .from('products')
    .select('*, categories(id, name, slug), stores(id, name)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new AppError(500, `Could not load product: ${error.message}`);
  if (!row) throw new AppError(404, 'Product not found');

  const { data: images, error: imgErr } = await db
    .from('product_images')
    .select('id, url, is_cover, position')
    .eq('product_id', id)
    .order('position');

  if (imgErr) throw new AppError(500, `Could not load product images: ${imgErr.message}`);

  return {
    ...serializeProduct(row, pickCover(images ?? [])),
    images: (images ?? []).map((i) => ({
      id: i.id,
      url: i.url,
      isCover: i.is_cover,
      position: i.position,
    })),
  };
}
