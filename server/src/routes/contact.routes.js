import { Router } from 'express';
import {
  createContactMessage,
  listContactMessages,
  listMyContactMessages,
  updateContactMessage,
  replyContactMessage,
  listSellerContactMessages,
  updateSellerContactMessage,
  replySellerContactMessage,
  deleteContactMessage,
} from '../controllers/contact.controller.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { validate, validateParams } from '../middleware/validate.js';
import { uuidParamSchema } from '../validators/catalog.validators.js';
import {
  createContactMessageSchema,
  updateContactMessageSchema,
  replyContactMessageSchema,
} from '../validators/contact.validators.js';

const router = Router();

// Public — optionalAuth links the message to the account when signed in.
router.post('/contact', optionalAuth, validate(createContactMessageSchema), createContactMessage);

// Customer inbox — the caller's own messages and any replies from support/sellers.
router.get('/contact-messages/mine', requireAuth, listMyContactMessages);

// Seller inbox — messages customers sent about the seller's products/store.
router.get(
  '/seller/contact-messages',
  requireAuth,
  requireRole('seller', 'admin'),
  listSellerContactMessages
);
router.patch(
  '/seller/contact-messages/:id',
  requireAuth,
  requireRole('seller', 'admin'),
  validateParams(uuidParamSchema),
  validate(updateContactMessageSchema),
  updateSellerContactMessage
);
router.post(
  '/seller/contact-messages/:id/reply',
  requireAuth,
  requireRole('seller', 'admin'),
  validateParams(uuidParamSchema),
  validate(replyContactMessageSchema),
  replySellerContactMessage
);

// Admin inbox (sees everything, including seller-bound messages)
router.get('/admin/contact-messages', requireAuth, requireRole('admin'), listContactMessages);
router.patch(
  '/admin/contact-messages/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(uuidParamSchema),
  validate(updateContactMessageSchema),
  updateContactMessage
);
router.post(
  '/admin/contact-messages/:id/reply',
  requireAuth,
  requireRole('admin'),
  validateParams(uuidParamSchema),
  validate(replyContactMessageSchema),
  replyContactMessage
);
router.delete(
  '/admin/contact-messages/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(uuidParamSchema),
  deleteContactMessage
);

export default router;
