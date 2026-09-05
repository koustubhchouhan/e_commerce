import { db } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';

const MESSAGE_SELECT = 'id, first_name, last_name, email, subject, message, is_read, created_at';

const mapMessage = (m) => ({
  id: m.id,
  firstName: m.first_name,
  lastName: m.last_name,
  name: [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Anonymous',
  email: m.email,
  subject: m.subject,
  message: m.message,
  isRead: m.is_read,
  createdAt: m.created_at,
});

// POST /contact — public. Anyone (logged in or not) can send a support message.
export async function createContactMessage({ first_name, last_name, email, subject, message }) {
  const { data, error } = await db
    .from('contact_messages')
    .insert({ first_name, last_name, email, subject, message })
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

// PATCH /admin/contact-messages/:id — mark a message read/unread.
export async function updateContactMessage(messageId, { is_read }) {
  const { data, error } = await db
    .from('contact_messages')
    .update({ is_read })
    .eq('id', messageId)
    .select(MESSAGE_SELECT)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw new AppError(404, 'Message not found');
    throw new AppError(500, `Could not update message: ${error.message}`);
  }
  return mapMessage(data);
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
