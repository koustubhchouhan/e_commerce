import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from '../config/supabase.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error.js';
import { createOrder } from './order.service.js';

// Razorpay REST base. Node 22 ships a global fetch, so this is a thin wrapper
// instead of another SDK dependency.
const RAZORPAY_API = 'https://api.razorpay.com/v1';

function assertConfigured() {
  if (!env.paymentsConfigured) {
    throw new AppError(503, 'Payments not configured');
  }
}

// Constant-time compare for two hex strings. Lengths are compared first because
// timingSafeEqual throws on mismatched buffer lengths.
function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Razorpay signs `${order_id}|${payment_id}` with the key secret. Pure so it can
// be unit-tested without a database or a live gateway.
export function expectedPaymentSignature(orderId, paymentId, secret) {
  return createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

// The webhook signs the raw request body with the (separate) webhook secret.
export function expectedWebhookSignature(rawBody, secret) {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function verifyPaymentSignature(orderId, paymentId, signature, secret = env.razorpay.keySecret) {
  if (!secret || !orderId || !paymentId || !signature) return false;
  return safeEqualHex(expectedPaymentSignature(orderId, paymentId, secret), signature);
}

export function verifyWebhookSignature(rawBody, signature, secret = env.razorpay.webhookSecret) {
  if (!secret || !rawBody || !signature) return false;
  return safeEqualHex(expectedWebhookSignature(rawBody, secret), signature);
}

async function razorpayRequest(method, path, body) {
  assertConfigured();

  const auth = Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64');
  const res = await fetch(`${RAZORPAY_API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const reason = data?.error?.description || data?.error?.reason || res.statusText;
    throw new AppError(502, `Razorpay request failed: ${reason}`);
  }
  return data;
}

// POST /payments/order - reuse the server-authoritative checkout, then open a
// gateway order for exactly the amount the database computed. The client never
// sends a price; only keyId (public) is returned so key rotation stays
// server-side.
export async function createPaymentOrder(userId, { items, shipping_address }) {
  assertConfigured();

  const checkout = await createOrder(userId, { items, shipping_address });
  const amountPaise = Math.round(checkout.total * 100);
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new AppError(400, 'Order total is not payable');
  }

  // Record the payment before talking to the gateway so the gateway order can
  // carry our id as its receipt.
  const { data: payment, error: payErr } = await db
    .from('payments')
    .insert({
      user_id: userId,
      gateway: 'razorpay',
      amount: checkout.total,
      currency: 'INR',
      status: 'created',
    })
    .select('id')
    .single();
  if (payErr) throw new AppError(500, `Could not record payment: ${payErr.message}`);

  // Link the payment to every order it will pay for (one per seller).
  const links = checkout.orders.map((o) => ({ payment_id: payment.id, order_id: o.orderId }));
  const { error: linkErr } = await db.from('payment_orders').insert(links);
  if (linkErr) {
    await db.rpc('mark_payment_failed', { p_payment_id: payment.id, p_raw_payload: null });
    throw new AppError(500, `Could not link payment to orders: ${linkErr.message}`);
  }

  let gatewayOrder;
  try {
    gatewayOrder = await razorpayRequest('POST', '/orders', {
      amount: amountPaise,
      currency: 'INR',
      receipt: payment.id,
      notes: { user_id: userId, order_ids: checkout.orders.map((o) => o.orderId).join(',') },
    });
  } catch (err) {
    // Release the stock the pending orders reserved before surfacing the error.
    await db.rpc('mark_payment_failed', { p_payment_id: payment.id, p_raw_payload: null });
    throw err;
  }

  const { error: updateErr } = await db
    .from('payments')
    .update({ gateway_order_id: gatewayOrder.id, updated_at: new Date().toISOString() })
    .eq('id', payment.id);
  if (updateErr) throw new AppError(500, `Could not save gateway order id: ${updateErr.message}`);

  return {
    keyId: env.razorpay.keyId,
    razorpayOrderId: gatewayOrder.id,
    amount: amountPaise,
    currency: 'INR',
    orderIds: checkout.orders.map((o) => o.orderId),
    orders: checkout.orders,
    total: checkout.total,
  };
}

// POST /payments/verify - the browser callback. Verifies the checkout signature
// and captures atomically through mark_payment_captured (idempotent, so it races
// the webhook safely).
export async function verifyPayment(userId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  assertConfigured();

  const { data: payment, error } = await db
    .from('payments')
    .select('id, user_id, status')
    .eq('gateway_order_id', razorpay_order_id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new AppError(500, `Could not load payment: ${error.message}`);
  if (!payment) throw new AppError(404, 'Payment order not found');

  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    throw new AppError(400, 'Invalid payment signature');
  }

  const { data, error: rpcErr } = await db.rpc('mark_payment_captured', {
    p_gateway_order_id: razorpay_order_id,
    p_gateway_payment_id: razorpay_payment_id,
  });
  if (rpcErr) throw new AppError(500, `Could not capture payment: ${rpcErr.message}`);

  return { paymentId: data.payment_id, status: data.status, orderIds: data.order_ids };
}

// POST /payments/webhook - called by Razorpay, not the browser. Signature is
// verified over the raw body; after that we always acknowledge (the caller
// retries otherwise) and rely on the RPCs' idempotency.
export async function handleWebhook(rawBody, signature) {
  if (!env.razorpay.webhookSecret) {
    throw new AppError(503, 'Payments webhook not configured');
  }
  if (!verifyWebhookSignature(rawBody, signature)) {
    throw new AppError(400, 'Invalid webhook signature');
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new AppError(400, 'Invalid webhook payload');
  }

  const event = payload?.event;
  const entity = payload?.payload?.payment?.entity ?? {};
  const rpcPayload = payload;

  try {
    if (event === 'payment.captured') {
      await db.rpc('mark_payment_captured', {
        p_gateway_order_id: entity.order_id,
        p_gateway_payment_id: entity.id,
        p_raw_payload: rpcPayload,
      });
    } else if (event === 'payment.failed') {
      await db.rpc('mark_payment_failed', {
        p_gateway_order_id: entity.order_id,
        p_gateway_payment_id: entity.id,
        p_raw_payload: rpcPayload,
      });
    }
    // refund.processed is deferred to phase 3.
  } catch (err) {
    // Signature was valid; log and still return 200 so Razorpay stops retrying.
    console.error('[payments] webhook handling failed:', err.message);
  }

  return { received: true, event };
}
