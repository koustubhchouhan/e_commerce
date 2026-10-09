import { db } from '../config/supabase.js';
import { sendMail, escapeHtml } from '../lib/mailer.js';

// Customer-facing order notifications. When an order is shipped, delivered or
// cancelled we drop a message into the customer's in-app inbox (a
// contact_messages row tagged kind='order') and email them. Both are
// best-effort: a notification failure must never fail the status change itself.

const NOTIFY_STATUSES = new Set(['shipped', 'delivered', 'cancelled']);

const shortId = (id) => (id ? String(id).slice(0, 8).toUpperCase() : '');

// Pure copy builder (exported so it can be unit-tested without a database).
export function orderStatusCopy(status, { orderId, storeName } = {}) {
  const ref = shortId(orderId);
  const from = storeName ? ` from ${storeName}` : '';
  switch (status) {
    case 'shipped':
      return {
        subject: `Your Arghya order #${ref} has shipped`,
        message: `Good news — your order #${ref}${from} has been shipped and is on its way. You can follow its status from your orders page.`,
      };
    case 'delivered':
      return {
        subject: `Your Arghya order #${ref} has been delivered`,
        message: `Your order #${ref}${from} has been delivered. We hope you love it — you can now leave a review from the product page.`,
      };
    case 'cancelled':
      return {
        subject: `Your Arghya order #${ref} was cancelled`,
        message: `Your order #${ref}${from} has been cancelled. If you were charged, the amount will be refunded to your original payment method.`,
      };
    default:
      return {
        subject: `Update on your Arghya order #${ref}`,
        message: `There has been an update to your order #${ref}.`,
      };
  }
}

function orderStatusEmailHtml({ subject, message }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#F5ECDE;font-family:Arial,Helvetica,sans-serif;color:#2A211B;">
    <div style="max-width:560px;margin:0 auto;background:#FDF8F0;border:1px solid rgba(35,26,22,0.08);border-radius:16px;overflow:hidden;">
      <div style="padding:20px 28px;border-bottom:1px solid rgba(35,26,22,0.08);">
        <span style="font-size:20px;font-weight:bold;color:#B7322A;">Arghya</span>
      </div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 16px;font-size:18px;color:#231A16;">${escapeHtml(subject)}</h1>
        <p style="margin:0;font-size:15px;line-height:1.6;">${escapeHtml(message)}</p>
      </div>
      <div style="padding:16px 28px;border-top:1px solid rgba(35,26,22,0.08);font-size:12px;color:#8A7B6B;">
        Thank you for shopping with Arghya.
      </div>
    </div>
  </body>
</html>`;
}

// Records the in-app notification and emails the customer. Never throws: any
// problem is logged and swallowed so the order status change stands.
export async function notifyOrderStatus(orderId, status) {
  if (!NOTIFY_STATUSES.has(status)) return;

  try {
    const { data: order, error } = await db
      .from('orders')
      .select('id, user_id, store_id, profiles(full_name, email), stores(name)')
      .eq('id', orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) return;

    const { subject, message } = orderStatusCopy(status, {
      orderId: order.id,
      storeName: order.stores?.name ?? null,
    });

    const fullName = (order.profiles?.full_name ?? '').trim();
    const [firstName, ...rest] = fullName.split(/\s+/);
    const email = order.profiles?.email ?? '';

    const { error: insertErr } = await db.from('contact_messages').insert({
      first_name: firstName || 'Customer',
      last_name: rest.join(' '),
      email: email || 'no-reply@arghya.store',
      subject,
      message,
      user_id: order.user_id,
      store_id: order.store_id ?? null,
      kind: 'order',
      order_id: order.id,
    });
    if (insertErr) throw insertErr;

    if (email) {
      try {
        await sendMail({ to: email, subject, html: orderStatusEmailHtml({ subject, message }), text: message });
      } catch (mailErr) {
        console.error(`[notifications] email for order ${order.id} failed:`, mailErr.message);
      }
    }
  } catch (err) {
    console.error(
      `[notifications] could not record "${status}" for order ${orderId}:`,
      err.message
    );
  }
}
