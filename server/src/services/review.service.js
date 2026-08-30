import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';

const REVIEW_SELECT = 'id, product_id, user_id, rating, comment, created_at, profiles(full_name)';

// GET /products/:id/reviews — a product's reviews, newest first, with the
// author's display name.
export async function listReviews(productId) {
  const { data, error } = await db
    .from('reviews')
    .select(REVIEW_SELECT)
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, `Could not load reviews: ${error.message}`);

  const items = (data ?? []).map((r) => ({
    id: r.id,
    productId: r.product_id,
    userId: r.user_id,
    author: r.profiles?.full_name ?? 'Anonymous',
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
  }));

  const average = items.length
    ? items.reduce((sum, r) => sum + r.rating, 0) / items.length
    : 0;

  return { items, average, count: items.length };
}

// POST /products/:id/reviews — one review per user per product (unique
// constraint). Upserts so a repeat submission updates the earlier review.
export async function createReview(userId, productId, { rating, comment }) {
  const { data: product, error: prodErr } = await db
    .from('products')
    .select('id')
    .eq('id', productId)
    .maybeSingle();
  if (prodErr) throw new AppError(500, `Could not load product: ${prodErr.message}`);
  if (!product) throw new AppError(404, 'Product not found');

  const { data, error } = await db
    .from('reviews')
    .upsert(
      {
        product_id: productId,
        user_id: userId,
        rating,
        comment: comment || null,
      },
      { onConflict: 'product_id,user_id' }
    )
    .select(REVIEW_SELECT)
    .single();

  if (error) throw new AppError(400, `Could not save review: ${error.message}`);

  return {
    id: data.id,
    productId: data.product_id,
    userId: data.user_id,
    author: data.profiles?.full_name ?? 'Anonymous',
    rating: data.rating,
    comment: data.comment,
    createdAt: data.created_at,
  };
}
