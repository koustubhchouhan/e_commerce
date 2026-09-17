import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';
import { loadImagesByProduct, pickCover, serializeProduct } from './product-data.js';

export async function listCategories() {
  const { data, error } = await db.from('categories').select('id, name, slug').order('name');
  if (error) throw new AppError(500, `Could not load categories: ${error.message}`);
  return data ?? [];
}

// Escapes a user-supplied search term for safe use inside a PostgREST `.or()`
// filter. The value is wrapped in double quotes so reserved filter characters
// (`,`, `(`, `)`, `.`, `:` ...) are treated literally; embedded backslashes and
// double quotes are escaped and control characters stripped so the term cannot
// break or manipulate the filter expression.
function stripControlChars(value) {
  let out = '';
  for (const ch of value) {
    const code = ch.codePointAt(0);
    out += code < 32 || code === 127 ? ' ' : ch;
  }
  return out;
}

function escapePostgrestTerm(term) {
  return stripControlChars(term)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

// GET /products — public catalog listing. Filters by search term and/or
// category slug, paginates, and includes each product's cover image + sale price.
export async function listProducts({ search, category, page, limit }) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = db
    .from('products')
    .select('*, categories(id, name, slug), stores(id, name)', { count: 'exact' })
    .eq('status', 'active')
    .eq('approval_status', 'approved');

  if (search) {
    const term = escapePostgrestTerm(search.trim());
    if (term) {
      query = query.or(`name.ilike."%${term}%",description.ilike."%${term}%"`);
    }
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

// GET /products/:id — full product with images[] and store name. Listings that
// are not live (unapproved or non-active) are hidden from the public; their
// owner and admins may still fetch them.
export async function getProduct(id, viewer) {
  const { data: row, error } = await db
    .from('products')
    .select('*, categories(id, name, slug), stores(id, name, owner_id)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new AppError(500, `Could not load product: ${error.message}`);
  if (!row) throw new AppError(404, 'Product not found');

  const live = row.status === 'active' && (row.approval_status ?? 'approved') === 'approved';
  if (!live) {
    const isAdmin = viewer?.role === 'admin';
    const isOwner = Boolean(viewer?.id && row.stores?.owner_id === viewer.id);
    if (!isAdmin && !isOwner) throw new AppError(404, 'Product not found');
  }

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
