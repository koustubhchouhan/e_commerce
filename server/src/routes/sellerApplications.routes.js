import { Router } from 'express';
import { createApplication, getMyApplications } from '../controllers/seller.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createApplicationSchema } from '../validators/seller.validators.js';

const router = Router();

router.post(
  '/seller-applications',
  requireAuth,
  requireRole('customer'),
  validate(createApplicationSchema),
  createApplication
);
router.get('/seller-applications/me', requireAuth, getMyApplications);

export default router;
