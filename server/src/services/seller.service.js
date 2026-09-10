import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';
import { serializeReview } from './review.service.js';

// POST /seller-applications — a customer asks to become a seller.
// Rule: at most one active application per user (a rejected one may re-apply).
export async function createApplication(userId, { store_name, contact_email }) {
  const { data: existing, error } = await db
    .from('seller_applications')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'approved'])
    .maybeSingle();

  if (error) throw new AppError(500, `Could not check existing applications: ${error.message}`);
  if (existing) {
    const verb = existing.status === 'pending' ? 'under review' : 'already approved';
    throw new AppError(400, `You already have an application that is ${verb}`);
  }

  const { data, error: insertErr } = await db
    .from('seller_applications')
    .insert({ user_id: userId, store_name, contact_email })
    .select('id, store_name, contact_email, status, created_at')
    .single();

  if (insertErr) throw new AppError(400, `Could not submit application: ${insertErr.message}`);
  return data;
}

// GET /seller-applications/me — the caller's own application(s), newest first.
export async function getMyApplications(userId) {
  const { data, error } = await db
    .from('seller_applications')
    .select('id, store_name, contact_email, status, created_at, reviewed_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, `Could not load your applications: ${error.message}`);
  return data ?? [];
}

// GET /seller/store — the caller's storefront (seller + admin only).
export async function getStore(userId) {
  const { data, error } = await db
    .from('stores')
    .select('id, name, description, created_at')
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) throw new AppError(500, `Could not load your store: ${error.message}`);
  if (!data) throw new AppError(404, 'No store found for this account');

  return {
    id: data.id,
    name: data.name,
    description: data.description ?? '',
    createdAt: data.created_at,
  };
}

// PATCH /seller/store — update the storefront name/description.
export async function updateStore(userId, patch) {
  const { data, error } = await db
    .from('stores')
    .update(patch)
    .eq('owner_id', userId)
    .select('id, name, description, created_at')
    .single();

  if (error) throw new AppError(400, `Could not update store: ${error.message}`);
  if (!data) throw new AppError(404, 'No store found for this account');

  return {
    id: data.id,
    name: data.name,
    description: data.description ?? '',
    createdAt: data.created_at,
  };
}

// The caller's store row, required before managing reviews.
async function requireOwnStore(userId) {
  const { data, error } = await db
    .from('stores')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) throw new AppError(500, `Could not load your store: ${error.message}`);
  if (!data) throw new AppError(403, 'You need an approved store to manage reviews');
  return data;
}

const SELLER_REVIEW_SELECT =
  'id, product_id, user_id, rating, comment, is_hidden, seller_reply, seller_replied_at, created_at, profiles(full_name), products(name, store_id)';

// GET /seller/reviews — every review left on the caller's products, newest
// first. Hidden reviews are included so a seller can see moderation state.
export async function listStoreReviews(userId) {
  const store = await requireOwnStore(userId);

  const { data, error } = await db
    .from('reviews')
    .select(SELLER_REVIEW_SELECT)
    .eq('products.store_id', store.id)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, `Could not load reviews: ${error.message}`);

  return (data ?? []).map((r) => ({
    ...serializeReview(r),
    productName: r.products?.name ?? null,
  }));
}

// PATCH /seller/reviews/:id/reply — publish (or clear) a seller's public reply.
// Only the owner of the store that sells the reviewed product may reply.
export async function replyToReview(userId, reviewId, reply) {
  const store = await requireOwnStore(userId);

  const { data: review, error } = await db
    .from('reviews')
    .select('id, product_id, products(store_id)')
    .eq('id', reviewId)
    .maybeSingle();

  if (error) throw new AppError(500, `Could not load review: ${error.message}`);
  if (!review) throw new AppError(404, 'Review not found');
  if (review.products?.store_id !== store.id) {
    throw new AppError(403, 'You can only reply to reviews of your own products');
  }

  const trimmed = (reply ?? '').trim();
  const now = new Date().toISOString();

  const { error: updateErr } = await db
    .from('reviews')
    .update({
      seller_reply: trimmed || null,
      seller_replied_at: trimmed ? now : null,
    })
    .eq('id', reviewId);

  if (updateErr) throw new AppError(400, `Could not save reply: ${updateErr.message}`);

  return { id: reviewId, sellerReply: trimmed || null, sellerRepliedAt: trimmed ? now : null };
}
