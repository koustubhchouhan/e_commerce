import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';
import { loadImagesByProduct, pickCover } from './product-data.js';

// POST /orders — server-authoritative checkout. Prices never come from the
// client; the create_order Postgres function reads them, checks stock under a
// row lock, and decrements atomically (see server/db/create_order.sql).
export async function createOrder(userId, { items, shipping_address }) {
  const { data: orderId, error } = await db.rpc('create_order', {
    p_user_id: userId,
    p_items: items,
    p_shipping: shipping_address ?? null,
  });

  if (error) throw new AppError(400, error.message);

  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('id, total')
    .eq('id', orderId)
    .single();
  if (orderErr) throw new AppError(500, `Order created but could not be read: ${orderErr.message}`);

  return { order_id: order.id, total: Number(order.total) };
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

// GET /seller/orders — orders that contain at least one of the seller's
// products, newest first, with only that seller's line items attached.
export async function listSellerOrders(sellerId) {
  const { data: store, error: storeErr } = await db
    .from('stores')
    .select('id')
    .eq('owner_id', sellerId)
    .maybeSingle();
  if (storeErr) throw new AppError(500, `Could not load store: ${storeErr.message}`);
  if (!store) return { items: [] };

  const { data: products, error: prodErr } = await db
    .from('products')
    .select('id')
    .eq('store_id', store.id);
  if (prodErr) throw new AppError(500, `Could not load products: ${prodErr.message}`);
  if (!products?.length) return { items: [] };

  const { data: orderItems, error: itemErr } = await db
    .from('order_items')
    .select('id, order_id, product_id, product_name, unit_price, discount_percent, quantity, line_total')
    .in('product_id', products.map((p) => p.id));
  if (itemErr) throw new AppError(500, `Could not load order items: ${itemErr.message}`);
  if (!orderItems?.length) return { items: [] };

  const orderIds = [...new Set(orderItems.map((i) => i.order_id))];
  const { data: orders, error: orderErr } = await db
    .from('orders')
    .select('id, status, total, created_at, profiles(full_name)')
    .in('id', orderIds);
  if (orderErr) throw new AppError(500, `Could not load orders: ${orderErr.message}`);

  // An order is fulfillable by this seller only when every line item belongs to
  // their store (mixed carts span several sellers and must not be shipped by one).
  const { data: allItems, error: allItemsErr } = await db
    .from('order_items')
    .select('order_id, product_id')
    .in('order_id', orderIds);
  if (allItemsErr) throw new AppError(500, `Could not load order items: ${allItemsErr.message}`);

  const sellerProductIds = new Set(products.map((p) => p.id));
  const itemsByOrder = new Map();
  for (const item of allItems ?? []) {
    if (!itemsByOrder.has(item.order_id)) itemsByOrder.set(item.order_id, []);
    itemsByOrder.get(item.order_id).push(item);
  }

  const byOrder = new Map();
  for (const item of orderItems) {
    if (!byOrder.has(item.order_id)) byOrder.set(item.order_id, []);
    byOrder.get(item.order_id).push(item);
  }

  return {
    items: (orders ?? []).map((o) => {
      const everyItemMine = (itemsByOrder.get(o.id) ?? []).every((it) => sellerProductIds.has(it.product_id));
      return {
        id: o.id,
        status: o.status,
        total: Number(o.total),
        createdAt: o.created_at,
        customerName: o.profiles?.full_name ?? null,
        fulfillable: (itemsByOrder.get(o.id) ?? []).length > 0 && everyItemMine,
        items: (byOrder.get(o.id) ?? []).map((it) => ({
          id: it.id,
          productId: it.product_id,
          productName: it.product_name,
          unitPrice: Number(it.unit_price),
          discountPercent: it.discount_percent,
          quantity: it.quantity,
          lineTotal: Number(it.line_total),
        })),
      };
    }),
  };
}

// GET /orders/:id — one order + items. Owner or admin only (enforced here).
export async function getOrder(userId, userRole, orderId) {
  const { data: order, error } = await db
    .from('orders')
    .select(ORDER_SELECT)
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
    .select('id, status')
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

  if (actorRole !== 'admin') {
    const { data: store, error: storeErr } = await db
      .from('stores')
      .select('id')
      .eq('owner_id', actorUserId)
      .maybeSingle();
    if (storeErr) throw new AppError(500, `Could not load store: ${storeErr.message}`);
    if (!store) throw new AppError(403, 'No store found for this account');

    const { data: myProducts, error: prodErr } = await db
      .from('products')
      .select('id')
      .eq('store_id', store.id);
    if (prodErr) throw new AppError(500, `Could not load products: ${prodErr.message}`);

    const { data: orderItems, error: itemErr } = await db
      .from('order_items')
      .select('product_id')
      .eq('order_id', orderId);
    if (itemErr) throw new AppError(500, `Could not load order items: ${itemErr.message}`);

    const myProductIds = new Set((myProducts ?? []).map((p) => p.id));
    const allMine = (orderItems ?? []).length > 0 && (orderItems ?? []).every((i) => myProductIds.has(i.product_id));
    if (!allMine) {
      throw new AppError(403, 'This order is not fully yours to fulfil');
    }
  }

  if (nextStatus === 'cancelled') {
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

  const { data: updated, error: updateErr } = await db
    .from('orders')
    .update({ status: nextStatus })
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
  const imagesByProduct = await loadImagesByProduct(productIds);

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
      coverImage: item.product_id ? pickCover(imagesByProduct.get(item.product_id)) : null,
    })),
  }));
}
