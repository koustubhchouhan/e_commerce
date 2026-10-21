import { Router } from 'express';
import {
  createApplication,
  uploadStorefrontImage,
  getMyApplications,
  createMembershipOrder,
  verifyMembershipPayment,
  declineMembership,
} from '../controllers/seller.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate, validateParams } from '../middleware/validate.js';
import { imageUploadSingle, STOREFRONT_IMAGE_POLICY } from '../middleware/upload.js';
import { createApplicationSchema } from '../validators/seller.validators.js';
import { verifyPaymentSchema } from '../validators/payment.validators.js';
import { uuidParamSchema } from '../validators/catalog.validators.js';

const router = Router();

router.post(
  '/seller-applications',
  requireAuth,
  requireRole('customer'),
  validate(createApplicationSchema),
  createApplication
);
router.post(
  '/seller-applications/image',
  requireAuth,
  requireRole('customer'),
  ...imageUploadSingle('image', STOREFRONT_IMAGE_POLICY),
  uploadStorefrontImage
);
router.get('/seller-applications/me', requireAuth, getMyApplications);

// Seller membership: an approved applicant pays a one-time fee before the seller
// role is granted. Auth-only (they are still a `customer` at this stage); the
// service enforces that the application belongs to the caller.
router.post(
  '/seller-applications/:id/membership-order',
  requireAuth,
  validateParams(uuidParamSchema),
  createMembershipOrder
);
router.post(
  '/seller-applications/:id/membership-verify',
  requireAuth,
  validateParams(uuidParamSchema),
  validate(verifyPaymentSchema),
  verifyMembershipPayment
);
router.post(
  '/seller-applications/:id/membership-decline',
  requireAuth,
  validateParams(uuidParamSchema),
  declineMembership
);

export default router;
