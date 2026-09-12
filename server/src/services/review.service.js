import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';

const REVIEW_SELECT =
  'id, product_id, user_id, rating, comment, is_hidden, seller_reply, seller_replied_at, created_at, profiles(full_name)';

// Shared shape for a review row, used by the public, admin and seller listings.
export function serializeReview(r) {
  return {
    id: r.id,
    productId: r.product_id,
    userId: r.user_id,
    author: r.profiles?.full_name ?? 'Anonymous',
    rating: r.rating,
    comment: r.comment,
    isHidden: r.is_hidden ?? false,
    sellerReply: r.seller_reply ?? null,
    sellerRepliedAt: r.seller_replied_at ?? null,
    createdAt: r.created_at,
  };
}

// Only customers with a delivered order containing this product may review it.
export async function canUserReview(userId, productId) {
  const { data: orders, error: orderErr } = await db
    .from('orders')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'delivered');

  if (orderErr) throw new AppError(500, `Could not verify your purchase: ${orderErr.message}`);

  const orderIds = (orders ?? []).map((o) => o.id);
  if (orderIds.length === 0) return false;

  const { data: items, error: itemErr } = await db
    .from('order_items')
    .select('id')
    .eq('product_id', productId)
    .in('order_id', orderIds)
    .limit(1);

  if (itemErr) throw new AppError(500, `Could not verify your purchase: ${itemErr.message}`);
  return (items ?? []).length > 0;
}

// GET /products/:id/reviews — a product's visible reviews, newest first, with
// the author's display name and any seller reply. Hidden reviews are excluded
// from both the list and the average.
export async function listReviews(productId) {
  const { data, error } = await db
    .from('reviews')
    .select(REVIEW_SELECT)
    .eq('product_id', productId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, `Could not load reviews: ${error.message}`);

  const items = (data ?? []).map(serializeReview);

  const average = items.length
    ? items.reduce((sum, r) => sum + r.rating, 0) / items.length
    : 0;

  return { items, average, count: items.length };
}

// POST /products/:id/reviews — one review per user per product (unique
// constraint). Upserts so a repeat submission updates the earlier review.
// Restricted to verified buyers (a delivered order that included the product).
export async function createReview(userId, productId, { rating, comment }) {
  const { data: product, error: prodErr } = await db
    .from('products')
    .select('id')
    .eq('id', productId)
    .maybeSingle();
  if (prodErr) throw new AppError(500, `Could not load product: ${prodErr.message}`);
  if (!product) throw new AppError(404, 'Product not found');

  if (!(await canUserReview(userId, productId))) {
    throw new AppError(403, 'Only verified buyers can review this product');
  }

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

  return serializeReview(data);
}
