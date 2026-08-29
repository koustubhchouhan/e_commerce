import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';

const APPLICATION_SELECT =
  'id, store_name, contact_email, status, created_at, reviewed_at, profiles(full_name)';

// GET /admin/seller-applications — optionally filtered by status (default all).
export async function listApplications({ status } = {}) {
  let query = db.from('seller_applications').select(APPLICATION_SELECT);
  if (status) query = query.eq('status', status);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new AppError(500, `Could not load applications: ${error.message}`);

  return (data ?? []).map((a) => ({
    id: a.id,
    storeName: a.store_name,
    contactEmail: a.contact_email,
    status: a.status,
    createdAt: a.created_at,
    reviewedAt: a.reviewed_at,
    applicant: a.profiles?.full_name ?? null,
  }));
}

// PATCH /admin/seller-applications/:id — approve or reject.
// Approve: flips the applicant's role to `seller` and creates their store.
export async function reviewApplication(adminId, applicationId, action) {
  const { data: application, error } = await db
    .from('seller_applications')
    .select('id, user_id, store_name, status')
    .eq('id', applicationId)
    .maybeSingle();

  if (error) throw new AppError(500, `Could not load application: ${error.message}`);
  if (!application) throw new AppError(404, 'Application not found');
  if (application.status !== 'pending') {
    throw new AppError(400, `Application was already ${application.status}`);
  }

  const reviewed_at = new Date().toISOString();

  if (action === 'reject') {
    const { error: rejectErr } = await db
      .from('seller_applications')
      .update({ status: 'rejected', reviewed_at, reviewed_by: adminId })
      .eq('id', applicationId);
    if (rejectErr) throw new AppError(400, `Could not reject application: ${rejectErr.message}`);
    return { status: 'rejected' };
  }

  // Approve. The role flip and store creation are best-effort sequential; a
  // richer transactional guarantee would need a Postgres function (see plan §3).
  const { error: roleErr } = await db
    .from('profiles')
    .update({ role: 'seller' })
    .eq('id', application.user_id);
  if (roleErr) throw new AppError(500, `Could not upgrade user to seller: ${roleErr.message}`);

  const { data: store } = await db
    .from('stores')
    .select('id')
    .eq('owner_id', application.user_id)
    .maybeSingle();

  if (!store) {
    const { error: storeErr } = await db
      .from('stores')
      .insert({ owner_id: application.user_id, name: application.store_name });
    if (storeErr) throw new AppError(500, `Could not create store: ${storeErr.message}`);
  }

  const { error: appErr } = await db
    .from('seller_applications')
    .update({ status: 'approved', reviewed_at, reviewed_by: adminId })
    .eq('id', applicationId);
  if (appErr) throw new AppError(400, `Could not approve application: ${appErr.message}`);

  return { status: 'approved' };
}

// GET /admin/sellers — approved sellers with their store.
export async function listSellers() {
  const { data, error } = await db
    .from('profiles')
    .select('id, full_name, created_at, stores(id, name, description, created_at)')
    .eq('role', 'seller')
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, `Could not load sellers: ${error.message}`);

  return (data ?? []).map((s) => ({
    id: s.id,
    fullName: s.full_name,
    joinedAt: s.created_at,
    store: s.stores
      ? { id: s.stores.id, name: s.stores.name, description: s.stores.description }
      : null,
  }));
}

// GET /admin/categories — every category with its product count.
export async function listCategories() {
  const { data, error } = await db
    .from('categories')
    .select('id, name, slug, products(count)');

  if (error) throw new AppError(500, `Could not load categories: ${error.message}`);

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    productCount: c.products?.[0]?.count ?? 0,
  }));
}

// DELETE /admin/sellers/:id — revoke: demote back to customer and draft their
// products so nothing is immediately delisted from the storefront.
export async function revokeSeller(sellerId) {
  const { data: profile, error } = await db
    .from('profiles')
    .select('id, role')
    .eq('id', sellerId)
    .maybeSingle();

  if (error) throw new AppError(500, `Could not load seller: ${error.message}`);
  if (!profile || profile.role !== 'seller') throw new AppError(404, 'Seller not found');

  const { data: store } = await db
    .from('stores')
    .select('id')
    .eq('owner_id', sellerId)
    .maybeSingle();

  if (store) {
    const { error: draftErr } = await db
      .from('products')
      .update({ status: 'draft' })
      .eq('store_id', store.id);
    if (draftErr) throw new AppError(500, `Could not draft products: ${draftErr.message}`);
  }

  const { error: demoteErr } = await db
    .from('profiles')
    .update({ role: 'customer' })
    .eq('id', sellerId);
  if (demoteErr) throw new AppError(500, `Could not revoke seller role: ${demoteErr.message}`);
}
