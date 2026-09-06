import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';

const MESSAGE_SELECT =
  'id, first_name, last_name, email, subject, message, is_read, store_id, product_id, created_at, stores(name), products(name)';

const mapMessage = (m) => ({
  id: m.id,
  firstName: m.first_name,
  lastName: m.last_name,
  name: [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Anonymous',
  email: m.email,
  subject: m.subject,
  message: m.message,
  isRead: m.is_read,
  storeId: m.store_id ?? null,
  productId: m.product_id ?? null,
  storeName: m.stores?.name ?? null,
  productName: m.products?.name ?? null,
  createdAt: m.created_at,
});

// POST /contact — public. Anyone (logged in or not) can send a support message.
// A product_id tags the message to that product's seller; a bare store_id tags
// it to the given store. Messages with neither go to the platform inbox.
export async function createContactMessage({ first_name, last_name, email, subject, message, store_id, product_id }) {
  let resolvedStoreId = store_id ?? null;

  if (product_id) {
    const { data: product, error: prodErr } = await db
      .from('products')
      .select('store_id')
      .eq('id', product_id)
      .maybeSingle();
    if (prodErr) throw new AppError(500, `Could not look up product: ${prodErr.message}`);
    if (!product) throw new AppError(400, 'The referenced product no longer exists');
    // The product decides which store gets the message, so a stale/wrong
    // store_id can never mis-route an inquiry.
    resolvedStoreId = product.store_id;
  }

  if (resolvedStoreId) {
    const { data: store, error: storeErr } = await db
      .from('stores')
      .select('id')
      .eq('id', resolvedStoreId)
      .maybeSingle();
    if (storeErr) throw new AppError(500, `Could not look up store: ${storeErr.message}`);
    if (!store) throw new AppError(400, 'The referenced store no longer exists');
  }

  const { data, error } = await db
    .from('contact_messages')
    .insert({ first_name, last_name, email, subject, message, store_id: resolvedStoreId, product_id: product_id ?? null })
    .select(MESSAGE_SELECT)
    .single();

  if (error) throw new AppError(500, `Could not send message: ${error.message}`);
  return mapMessage(data);
}

// GET /admin/contact-messages — every support message, newest first.
export async function listContactMessages() {
  const { data, error } = await db
    .from('contact_messages')
    .select(MESSAGE_SELECT)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, `Could not load messages: ${error.message}`);
  return { items: (data ?? []).map(mapMessage) };
}

// GET /seller/contact-messages — messages addressed to any store the caller
// owns (i.e. inquiries customers sent about their products/storefront).
export async function listSellerContactMessages(sellerId) {
  const { data: stores, error: storeErr } = await db
    .from('stores')
    .select('id')
    .eq('owner_id', sellerId);
  if (storeErr) throw new AppError(500, `Could not load store: ${storeErr.message}`);
  if (!stores?.length) return { items: [] };

  const storeIds = stores.map((s) => s.id);
  const { data, error } = await db
    .from('contact_messages')
    .select(MESSAGE_SELECT)
    .in('store_id', storeIds)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, `Could not load messages: ${error.message}`);
  return { items: (data ?? []).map(mapMessage) };
}

async function applyReadUpdate(messageId, isRead) {
  const { data, error } = await db
    .from('contact_messages')
    .update({ is_read: isRead })
    .eq('id', messageId)
    .select(MESSAGE_SELECT)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw new AppError(404, 'Message not found');
    throw new AppError(500, `Could not update message: ${error.message}`);
  }
  return mapMessage(data);
}

// PATCH /admin/contact-messages/:id — mark a message read/unread.
export async function updateContactMessage(messageId, { is_read }) {
  return applyReadUpdate(messageId, is_read);
}

// PATCH /seller/contact-messages/:id — sellers may toggle read state, but only
// for messages actually addressed to a store they own.
export async function updateSellerContactMessage(sellerId, messageId, { is_read }) {
  const { data: message, error } = await db
    .from('contact_messages')
    .select('id, store_id')
    .eq('id', messageId)
    .maybeSingle();

  if (error) throw new AppError(500, `Could not load message: ${error.message}`);
  if (!message) throw new AppError(404, 'Message not found');
  if (!message.store_id) throw new AppError(403, 'This message was not addressed to your store');

  const { data: store, error: storeErr } = await db
    .from('stores')
    .select('id')
    .eq('id', message.store_id)
    .eq('owner_id', sellerId)
    .maybeSingle();
  if (storeErr) throw new AppError(500, `Could not load store: ${storeErr.message}`);
  if (!store) throw new AppError(403, 'This message was not addressed to your store');

  return applyReadUpdate(messageId, is_read);
}

// DELETE /admin/contact-messages/:id
export async function deleteContactMessage(messageId) {
  const { data, error } = await db
    .from('contact_messages')
    .delete()
    .eq('id', messageId)
    .select('id')
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw new AppError(404, 'Message not found');
    throw new AppError(500, `Could not delete message: ${error.message}`);
  }
  return { id: data.id };
}
