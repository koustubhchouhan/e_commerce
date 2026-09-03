import { Router } from 'express';
import { createOrder, listOrders, getOrder, cancelOwnOrder } from '../controllers/order.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate, validateParams } from '../middleware/validate.js';
import { createOrderSchema } from '../validators/order.validators.js';
import { uuidParamSchema } from '../validators/catalog.validators.js';

const router = Router();

router.post('/orders', requireAuth, validate(createOrderSchema), createOrder);
router.get('/orders', requireAuth, listOrders);
router.get('/orders/:id', requireAuth, validateParams(uuidParamSchema), getOrder);
router.patch('/orders/:id/cancel', requireAuth, validateParams(uuidParamSchema), cancelOwnOrder);

export default router;
