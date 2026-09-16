import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';

// The name given to the platform's own storefront, created lazily the first
// time an admin manages a product.
export const OFFICIAL_STORE_NAME = 'NovaMarket Official';

// The caller's store row. Sellers must already have an approved store; admins
// do not go through the seller-application flow, so their official store is
// created on first use.
export async function ensureStore(userId, role) {
  const { data: store, error } = await db
    .from('stores')
    .select('id, name, description, is_official, created_at')
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) throw new AppError(500, `Could not load your store: ${error.message}`);
  if (store) return store;

  if (role !== 'admin') {
    throw new AppError(403, 'You need an approved store before managing products');
  }

  const { data: created, error: createErr } = await db
    .from('stores')
    .insert({ owner_id: userId, name: OFFICIAL_STORE_NAME, is_official: true })
    .select('id, name, description, is_official, created_at')
    .single();

  if (!createErr) return created;

  // A concurrent request may have created it between our read and write; the
  // unique(owner_id) constraint wins and we just re-read.
  const { data: existing, error: rereadErr } = await db
    .from('stores')
    .select('id, name, description, is_official, created_at')
    .eq('owner_id', userId)
    .maybeSingle();
  if (rereadErr || !existing) {
    throw new AppError(500, `Could not create the platform store: ${createErr.message}`);
  }
  return existing;
}
