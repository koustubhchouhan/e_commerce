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
