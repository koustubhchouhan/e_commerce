import { z } from 'zod';
import { createOrderSchema } from './order.validators.js';

// Same body as POST /orders: the payment amount is derived from it server-side.
export const createPaymentOrderSchema = createOrderSchema;

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'Missing gateway order id'),
  razorpay_payment_id: z.string().min(1, 'Missing gateway payment id'),
  razorpay_signature: z.string().min(1, 'Missing gateway signature'),
});
