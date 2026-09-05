import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';
import { removeProductImage } from './storage.service.js';

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

// POST /admin/categories — create a category. The slug is auto-derived from
// the name so it stays unique and URL-safe.
export async function createCategory({ name }) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  if (!slug) throw new AppError(400, 'Category name must contain letters or numbers');

  const { data, error } = await db
    .from('categories')
    .insert({ name: name.trim(), slug })
    .select('id, name, slug')
    .single();

  if (error) {
    if (error.code === '23505') throw new AppError(409, 'A category with this name already exists');
    throw new AppError(400, `Could not create category: ${error.message}`);
  }

  return { ...data, productCount: 0 };
}

// DELETE /admin/categories/:id — products keep existing with category null
// (schema: category_id on delete set null).
export async function deleteCategory(categoryId) {
  const { data: existing, error: existErr } = await db
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .maybeSingle();
  if (existErr) throw new AppError(500, `Could not load category: ${existErr.message}`);
  if (!existing) throw new AppError(404, 'Category not found');

  const { error } = await db.from('categories').delete().eq('id', categoryId);
  if (error) throw new AppError(400, `Could not delete category: ${error.message}`);
}

// DELETE /admin/products/:id — admins may remove any product on the platform,
// including its stored images.
export async function deleteAnyProduct(productId) {
  const { data: product, error: prodErr } = await db
    .from('products')
    .select('id')
    .eq('id', productId)
    .maybeSingle();
  if (prodErr) throw new AppError(500, `Could not load product: ${prodErr.message}`);
  if (!product) throw new AppError(404, 'Product not found');

  const { data: images, error: imgErr } = await db
    .from('product_images')
    .select('url')
    .eq('product_id', productId);
  if (imgErr) throw new AppError(500, `Could not load product images: ${imgErr.message}`);

  const { error } = await db.from('products').delete().eq('id', productId);
  if (error) throw new AppError(400, `Could not delete product: ${error.message}`);

  await Promise.all((images ?? []).map((i) => removeProductImage(i.url)));
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

// =====================================================================
// Payments & Ledger
// =====================================================================

// Flat commission the platform keeps on every settled order.
export const PLATFORM_FEE_RATE = 0.1;
// Only orders that were actually paid for count as revenue. "pending" is a
// cart that was never paid, and "cancelled" money never settles.
const REVENUE_STATUSES = ['paid', 'shipped', 'delivered'];
const round2 = (n) => Math.round(n * 100) / 100;

// GET /admin/ledger — gross sales, platform fees and net payouts derived
// entirely from live order data. Totals are summed at order level; the
// per-seller split attributes each line item back to its store via product_id.
export async function getPlatformLedger() {
  const { data: orders, error } = await db
    .from('orders')
    .select('id, status, total, created_at, profiles(full_name)')
    .order('created_at', { ascending: false });
  if (error) throw new AppError(500, `Could not load orders: ${error.message}`);

  const all = orders ?? [];
  const revenueOrders = all.filter((o) => REVENUE_STATUSES.includes(o.status));
  const revenueIds = revenueOrders.map((o) => o.id);

  let unitsSold = 0;
  let sellers = [];
  let unattributedGross = 0;

  if (revenueIds.length > 0) {
    const { data: items, error: itemErr } = await db
      .from('order_items')
      .select('order_id, product_id, quantity, line_total')
      .in('order_id', revenueIds);
    if (itemErr) throw new AppError(500, `Could not load order items: ${itemErr.message}`);

    const productIds = [...new Set((items ?? []).map((i) => i.product_id).filter(Boolean))];
    const storeByProduct = new Map();
    const pendingSellers = new Map(); // storeId -> { name, sellerName }

    if (productIds.length > 0) {
      const { data: products, error: prodErr } = await db
        .from('products')
        .select('id, store_id')
        .in('id', productIds);
      if (prodErr) throw new AppError(500, `Could not load products: ${prodErr.message}`);

      const storeIds = [...new Set((products ?? []).map((p) => p.store_id).filter(Boolean))];
      if (storeIds.length > 0) {
        const { data: stores, error: storeErr } = await db
          .from('stores')
          .select('id, name, owner_id, profiles(full_name)')
          .in('id', storeIds);
        if (storeErr) throw new AppError(500, `Could not load stores: ${storeErr.message}`);
        for (const s of stores ?? []) {
          pendingSellers.set(s.id, { name: s.name, sellerName: s.profiles?.[0]?.full_name ?? null });
        }
      }
      for (const p of products ?? []) {
        if (pendingSellers.has(p.store_id)) storeByProduct.set(p.id, p.store_id);
      }
    }

    // Accumulate per store: distinct orders, units and goods value.
    const acc = new Map();
    for (const it of items ?? []) {
      unitsSold += it.quantity;
      const storeId = storeByProduct.get(it.product_id);
      const amt = Number(it.line_total);
      if (!storeId) {
        // Product was deleted after purchase — money settled but no store to pay.
        unattributedGross += amt;
        continue;
      }
      if (!acc.has(storeId)) {
        const meta = pendingSellers.get(storeId);
        acc.set(storeId, {
          id: storeId,
          name: meta?.name ?? 'Unknown store',
          sellerName: meta?.sellerName ?? null,
          orderIds: new Set(),
          units: 0,
          gross: 0,
        });
      }
      const row = acc.get(storeId);
      row.orderIds.add(it.order_id);
      row.units += it.quantity;
      row.gross += amt;
    }

    sellers = [...acc.values()]
      .map(({ orderIds, gross, units, ...rest }) => ({
        ...rest,
        orderCount: orderIds.size,
        units,
        gross: round2(gross),
        fee: round2(gross * PLATFORM_FEE_RATE),
        payout: round2(gross * (1 - PLATFORM_FEE_RATE)),
      }))
      .sort((a, b) => b.gross - a.gross);
  }

  const grossSales = round2(revenueOrders.reduce((sum, o) => sum + Number(o.total), 0));
  const platformFees = round2(grossSales * PLATFORM_FEE_RATE);
  const sellerPayouts = round2(grossSales - platformFees);

  const transactions = revenueOrders.slice(0, 50).map((o) => {
    const total = Number(o.total);
    const fee = round2(total * PLATFORM_FEE_RATE);
    return {
      id: o.id,
      status: o.status,
      total,
      fee,
      payout: round2(total - fee),
      createdAt: o.created_at,
      customerName: o.profiles?.full_name ?? null,
    };
  });

  return {
    feeRate: PLATFORM_FEE_RATE,
    asOf: new Date().toISOString(),
    summary: {
      grossSales,
      platformFees,
      sellerPayouts,
      orders: revenueOrders.length,
      unitsSold,
      pendingOrders: all.filter((o) => o.status === 'pending').length,
      cancelledOrders: all.filter((o) => o.status === 'cancelled').length,
    },
    sellers,
    grossUnattributed: round2(unattributedGross),
    transactions,
  };
}
