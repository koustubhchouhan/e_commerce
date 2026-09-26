import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';
import { loadCoversByProduct } from './product-data.js';

// POST /orders — server-authoritative checkout. Prices never come from the
// client; the create_orders Postgres function reads them, checks stock under a
// row lock, decrements atomically, and splits a multi-store cart into one order
// per seller (see server/db/create_order.sql).
export async function createOrder(userId, { items, shipping_address }) {
  const { data, error } = await db.rpc('create_orders', {
    p_user_id: userId,
    p_items: items,
    p_shipping: shipping_address ?? null,
  });

  if (error) throw new AppError(400, error.message);

  const orders = (data ?? []).map((o) => ({
    orderId: o.order_id,
    storeId: o.store_id,
    total: Number(o.total),
  }));
  if (orders.length === 0) throw new AppError(400, 'No order was created');

  return {
    orders,
    // Backward-compatible single-order fields (first order + grand total).
    order_id: orders[0].orderId,
    total: orders.reduce((sum, o) => sum + o.total, 0),
  };
}

const ORDER_SELECT = 'id, status, subtotal, total, shipping_address, created_at';

// GET /orders — the caller's orders, newest first, each with its line items.
export async function listOrders(userId) {
  const { data: orders, error } = await db
    .from('orders')
    .select(ORDER_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, `Could not load orders: ${error.message}`);
  return { items: await attachItems(orders ?? []) };
}

// GET /admin/orders — every order across the platform, newest first.
export async function listAllOrders() {
  const { data: orders, error } = await db
    .from('orders')
    .select('id, status, subtotal, total, created_at, profiles(full_name)')
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, `Could not load orders: ${error.message}`);
  const withItems = await attachItems(orders ?? []);

  return {
    items: withItems.map((o) => ({
      id: o.id,
      status: o.status,
      subtotal: o.subtotal,
      total: o.total,
      createdAt: o.created_at,
      customerName: o.profiles?.full_name ?? null,
      items: o.items,
    })),
  };
}

// GET /seller/orders — the seller's orders, newest first, with line items.
// Every order belongs to exactly one store (checkout splits mixed carts), so
// this filters on the indexed orders.store_id instead of fanning out through
// products and back through order_items.
export async function listSellerOrders(sellerId) {
  const { data: store, error: storeErr } = await db
    .from('stores')
    .select('id')
    .eq('owner_id', sellerId)
    .maybeSingle();
  if (storeErr) throw new AppError(500, `Could not load store: ${storeErr.message}`);
  if (!store) return { items: [] };

  const { data: orders, error } = await db
    .from('orders')
    .select('id, status, total, created_at, profiles(full_name)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false });
  if (error) throw new AppError(500, `Could not load orders: ${error.message}`);

  const withItems = await attachItems(orders ?? []);

  return {
    items: withItems.map((o) => ({
      id: o.id,
      status: o.status,
      total: Number(o.total),
      createdAt: o.created_at,
      customerName: o.profiles?.full_name ?? null,
      // Orders are single-store by construction, so this is always the
      // owning seller's to fulfil.
      fulfillable: o.items.length > 0,
      items: o.items,
    })),
  };
}

// GET /orders/:id — one order + items. Owner or admin only (enforced here).
export async function getOrder(userId, userRole, orderId) {
  const { data: order, error } = await db
    .from('orders')
    .select('id, user_id, status, subtotal, total, shipping_address, created_at')
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw new AppError(500, `Could not load order: ${error.message}`);
  if (!order) throw new AppError(404, 'Order not found');
  if (order.user_id !== userId && userRole !== 'admin') {
    throw new AppError(403, 'You can only view your own orders');
  }

  const [withItems] = await attachItems([order]);
  return withItems;
}

// GET /admin/orders/:id — everything an admin needs about one order: the order
// itself, its line items, the buyer's contact details and the seller store.
// Same shape as getOrder() plus the customer/store info an admin may see.
export async function getOrderForAdmin(orderId) {
  const { data: order, error } = await db
    .from('orders')
    .select(
      'id, user_id, store_id, status, subtotal, total, shipping_address, created_at, profiles(full_name, email, phone), stores(name)'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw new AppError(500, `Could not load order: ${error.message}`);
  if (!order) throw new AppError(404, 'Order not found');

  const [withItems] = await attachItems([order]);

  return {
    id: withItems.id,
    status: withItems.status,
    subtotal: withItems.subtotal,
    total: withItems.total,
    shippingAddress: withItems.shipping_address,
    createdAt: withItems.created_at,
    customer: {
      id: order.user_id,
      name: order.profiles?.full_name ?? null,
      email: order.profiles?.email ?? null,
      phone: order.profiles?.phone ?? null,
    },
    store: order.stores?.name ?? null,
    items: withItems.items,
  };
}

// Allowed order lifecycle steps (terminal states have no outgoing steps).
const STATUS_TRANSITIONS = {
  pending: ['shipped', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
};

// PATCH /seller/orders/:id/status — advance fulfilment. A seller may only act on
// orders made up entirely of their own products (mixed carts span sellers, so no
// single seller ships them); admins may act on any order. Cancelling restores
// stock so cancelled units can be re-purchased.
export async function updateOrderStatus(actorUserId, actorRole, orderId, nextStatus) {
  const { data: order, error } = await db
    .from('orders')
    .select('id, status, store_id')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw new AppError(500, `Could not load order: ${error.message}`);
  if (!order) throw new AppError(404, 'Order not found');

  const allowed = STATUS_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(
      400,
      `Cannot change an order from "${order.status}" to "${nextStatus}"`
    );
  }

  // Orders belong to a single store, so ownership is a direct comparison — no
  // need to walk products and line items.
  if (actorRole !== 'admin') {
    const { data: store, error: storeErr } = await db
      .from('stores')
      .select('id')
      .eq('owner_id', actorUserId)
      .maybeSingle();
    if (storeErr) throw new AppError(500, `Could not load store: ${storeErr.message}`);
    if (!store || order.store_id !== store.id) {
      throw new AppError(403, 'This order belongs to another store');
    }
  }

  if (nextStatus === 'cancelled') {
    await restoreStockForOrder(orderId);
  }

  return setOrderStatus(orderId, nextStatus);
}

// PATCH /orders/:id/cancel — a customer cancels their own order before it ships
// (pending/paid only). Admins can cancel any order on behalf of a customer.
export async function cancelOrder(userId, userRole, orderId) {
  const { data: order, error } = await db
    .from('orders')
    .select('id, user_id, status')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw new AppError(500, `Could not load order: ${error.message}`);
  if (!order) throw new AppError(404, 'Order not found');

  if (order.user_id !== userId && userRole !== 'admin') {
    throw new AppError(403, 'You can only cancel your own orders');
  }

  const allowed = STATUS_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes('cancelled')) {
    throw new AppError(400, `Cannot cancel an order that is "${order.status}"`);
  }

  await restoreStockForOrder(orderId);
  return setOrderStatus(orderId, 'cancelled');
}

// Adds back each cancelled line item's quantity to product stock. Rows whose
// product no longer exists are skipped so a deletion never blocks a cancel.
async function restoreStockForOrder(orderId) {
  const { data: orderItems, error: itemErr } = await db
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', orderId);
  if (itemErr) throw new AppError(500, `Could not load order items: ${itemErr.message}`);

  for (const item of orderItems ?? []) {
    if (!item.product_id) continue;
    const { data: product, error: prodErr } = await db
      .from('products')
      .select('stock')
      .eq('id', item.product_id)
      .maybeSingle();
    if (prodErr || !product) continue;
    const { error: updateErr } = await db
      .from('products')
      .update({ stock: Number(product.stock) + Number(item.quantity) })
      .eq('id', item.product_id);
    if (updateErr) throw new AppError(500, `Could not restore stock: ${updateErr.message}`);
  }
}

// Sets an order's status and returns the minimal updated row.
async function setOrderStatus(orderId, status) {
  const { data: updated, error: updateErr } = await db
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select('id, status')
    .single();
  if (updateErr) throw new AppError(500, `Could not update order: ${updateErr.message}`);
  return { id: updated.id, status: updated.status };
}

// Fetches order_items for a set of orders in one query and groups them back
// onto each order, including each item's product cover image.
async function attachItems(orders) {
  if (orders.length === 0) return [];

  const ids = orders.map((o) => o.id);
  const { data: items, error } = await db
    .from('order_items')
    .select('id, order_id, product_id, product_name, unit_price, discount_percent, quantity, line_total')
    .in('order_id', ids);

  if (error) throw new AppError(500, `Could not load order items: ${error.message}`);

  const productIds = [...new Set((items ?? []).map((i) => i.product_id).filter(Boolean))];
  const covers = await loadCoversByProduct(productIds);

  const byOrder = new Map();
  for (const item of items ?? []) {
    if (!byOrder.has(item.order_id)) byOrder.set(item.order_id, []);
    byOrder.get(item.order_id).push(item);
  }

  return orders.map((order) => ({
    ...order,
    shipping_address: order.shipping_address ?? null,
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    items: (byOrder.get(order.id) ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      unitPrice: Number(item.unit_price),
      discountPercent: item.discount_percent,
      quantity: item.quantity,
      lineTotal: Number(item.line_total),
      coverImage: item.product_id ? covers.get(item.product_id) ?? null : null,
    })),
  }));
}
