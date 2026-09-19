import { asyncHandler } from '../middleware/asyncHandler.js';
import * as paymentService from '../services/payment.service.js';

export const createPaymentOrder = asyncHandler(async (req, res) => {
  res.status(201).json(await paymentService.createPaymentOrder(req.user.id, req.body));
});

export const verifyPayment = asyncHandler(async (req, res) => {
  res.json(await paymentService.verifyPayment(req.user.id, req.body));
});

// req.body is a Buffer here because app.js mounts express.raw for this path.
export const webhook = asyncHandler(async (req, res) => {
  const result = await paymentService.handleWebhook(req.body, req.get('x-razorpay-signature'));
  res.json(result);
});
