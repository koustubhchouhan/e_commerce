import { db } from '../config/supabase.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error.js';
import { razorpayRequest, verifyPaymentSignature } from './payment.service.js';
import { getSettings } from './settings.service.js';

// An approved applicant has one day to pay the one-time membership fee before
// the approval lapses (expire_stale_seller_approvals enforces this in the DB).
export const SELLER_MEMBERSHIP_WINDOW_MS = 24 * 60 * 60 * 1000;

const APPLICATION_SELECT =
  'id, user_id, store_name, status, payment_deadline, activated_at, membership_payment_id';

// Load an application the caller owns. A missing/foreign id is a 404 so one
// applicant cannot probe another's membership state.
async function loadOwnApplication(userId, applicationId) {
  const { data, error } = await db
    .from('seller_applications')
    .select(APPLICATION_SELECT)
    .eq('id', applicationId)
    .maybeSingle();

  if (error) throw new AppError(500, 'Could not load application', { cause: error });
  if (!data || data.user_id !== userId) throw new AppError(404, 'Application not found');
  return data;
}

// Reject approvals whose payment window has passed. Called lazily on reads so
// the state is correct even before the minute-ly worker runs, and by the worker.
// Best-effort: a sweep failure must never break the caller's request.
export async function expireStaleApprovals() {
  try {
    const { data, error } = await db.rpc('expire_stale_seller_approvals');
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[membership] expiry sweep failed:', err.message);
    return null;
  }
}

// POST /seller-applications/:id/membership-order — open a Razorpay order for the
// one-time fee. The amount comes from the admin setting, never the client.
export async function createMembershipOrder(userId, applicationId) {
  const application = await loadOwnApplication(userId, applicationId);

  if (application.status !== 'approved_pending_payment') {
    throw new AppError(400, 'This application is not awaiting payment');
  }
  if (application.payment_deadline && new Date(application.payment_deadline) <= new Date()) {
    await expireStaleApprovals();
    throw new AppError(400, 'The payment window for this approval has expired');
  }

  const { sellerMembershipFee } = await getSettings();
  const fee = Number(sellerMembershipFee);
  const amountPaise = Math.round(fee * 100);
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new AppError(400, 'Membership fee is not payable');
  }

  const { data: payment, error: payErr } = await db
    .from('payments')
    .insert({
      user_id: userId,
      gateway: 'razorpay',
      purpose: 'seller_membership',
      seller_application_id: application.id,
      amount: fee,
      currency: 'INR',
      status: 'created',
    })
    .select('id')
    .single();
  if (payErr) throw new AppError(500, 'Could not record payment', { cause: payErr });

  let gatewayOrder;
  try {
    gatewayOrder = await razorpayRequest('POST', '/orders', {
      amount: amountPaise,
      currency: 'INR',
      receipt: payment.id,
      notes: {
        user_id: userId,
        seller_application_id: application.id,
        kind: 'seller_membership',
      },
    });
  } catch (err) {
    // Keep the failed attempt from lingering as 'created'.
    try {
      await db.rpc('mark_payment_failed', { p_payment_id: payment.id, p_raw_payload: null });
    } catch {
      // Best-effort: the payment row is harmless if it stays 'created'.
    }
    throw err;
  }

  const { error: updateErr } = await db
    .from('payments')
    .update({ gateway_order_id: gatewayOrder.id, updated_at: new Date().toISOString() })
    .eq('id', payment.id);
  if (updateErr) throw new AppError(500, 'Could not save gateway order id', { cause: updateErr });

  return {
    keyId: env.razorpay.keyId,
    razorpayOrderId: gatewayOrder.id,
    amount: amountPaise,
    currency: 'INR',
    applicationId: application.id,
    fee,
  };
}

// POST /seller-applications/:id/membership-verify — the browser callback after
// Razorpay Checkout. Verifies the signature then captures through the RPC, which
// is idempotent so it races the webhook safely.
export async function verifyMembershipPayment(
  userId,
  applicationId,
  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
) {
  const application = await loadOwnApplication(userId, applicationId);

  const { data: payment, error } = await db
    .from('payments')
    .select('id, purpose, seller_application_id')
    .eq('gateway_order_id', razorpay_order_id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new AppError(500, 'Could not load payment', { cause: error });
  if (
    !payment ||
    payment.purpose !== 'seller_membership' ||
    payment.seller_application_id !== application.id
  ) {
    throw new AppError(404, 'Membership payment not found');
  }

  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    throw new AppError(400, 'Invalid payment signature');
  }

  const { data, error: rpcErr } = await db.rpc('mark_seller_membership_paid', {
    p_gateway_order_id: razorpay_order_id,
    p_gateway_payment_id: razorpay_payment_id,
  });
  if (rpcErr) {
    throw new AppError(500, 'Could not confirm membership payment', { cause: rpcErr });
  }

  const activated = Boolean(data?.activated);
  const status = data?.application_status ?? null;

  // The charge is captured even if the window lapsed; surface it so the seller
  // knows to contact support rather than silently keeping a non-activated store.
  if (!activated && status !== 'approved') {
    console.error(
      `[membership] capture for application ${application.id} did not activate (status ${status}); refund needed`
    );
    throw new AppError(
      409,
      'Payment received, but the approval window had already closed. Please contact support for a refund.'
    );
  }

  return {
    status,
    activated,
    storeId: data?.store_id ?? null,
    applicationId: application.id,
  };
}

// POST /seller-applications/:id/membership-decline — the applicant opts out of
// the paid membership, which rejects the approval.
export async function declineMembership(userId, applicationId) {
  const application = await loadOwnApplication(userId, applicationId);

  if (application.status !== 'approved_pending_payment') {
    throw new AppError(400, 'This application is not awaiting payment');
  }

  const { data, error } = await db
    .from('seller_applications')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      payment_deadline: null,
    })
    .eq('id', applicationId)
    .eq('status', 'approved_pending_payment')
    .select('id');
  if (error) throw new AppError(400, 'Could not decline the membership', { cause: error });
  // Lost a race with the payment RPC: the store is already active.
  if (!data?.length) throw new AppError(409, 'This application is no longer awaiting payment');

  return { status: 'rejected' };
}
