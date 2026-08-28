import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';

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
