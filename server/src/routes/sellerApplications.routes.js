import { Router } from 'express';
import {
  createApplication,
  uploadStorefrontImage,
  getMyApplications,
} from '../controllers/seller.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { imageUploadSingle, STOREFRONT_IMAGE_POLICY } from '../middleware/upload.js';
import { createApplicationSchema } from '../validators/seller.validators.js';

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

export default router;
