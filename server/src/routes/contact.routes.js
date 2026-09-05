import { Router } from 'express';
import {
  createContactMessage,
  listContactMessages,
  updateContactMessage,
  deleteContactMessage,
} from '../controllers/contact.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate, validateParams } from '../middleware/validate.js';
import { uuidParamSchema } from '../validators/catalog.validators.js';
import {
  createContactMessageSchema,
  updateContactMessageSchema,
} from '../validators/contact.validators.js';

const router = Router();

// Public
router.post('/contact', validate(createContactMessageSchema), createContactMessage);

// Admin inbox
router.get('/admin/contact-messages', requireAuth, requireRole('admin'), listContactMessages);
router.patch(
  '/admin/contact-messages/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(uuidParamSchema),
  validate(updateContactMessageSchema),
  updateContactMessage
);
router.delete(
  '/admin/contact-messages/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(uuidParamSchema),
  deleteContactMessage
);

export default router;
