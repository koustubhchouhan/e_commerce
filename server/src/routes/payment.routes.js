import { Router } from 'express';
import { createPaymentOrder, verifyPayment, webhook } from '../controllers/payment.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createPaymentOrderSchema, verifyPaymentSchema } from '../validators/payment.validators.js';

const router = Router();

// Cookie-authenticated, so both mutating routes get the CSRF check from
// requireAuth automatically.
router.post('/order', requireAuth, validate(createPaymentOrderSchema), createPaymentOrder);
router.post('/verify', requireAuth, validate(verifyPaymentSchema), verifyPayment);

// No auth and no CSRF: the caller is Razorpay, verified by its own signature.
router.post('/webhook', webhook);

export default router;
