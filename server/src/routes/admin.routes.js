import { Router } from 'express';
import {
  listApplications,
  reviewApplication,
  listSellers,
  revokeSeller,
} from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import { uuidParamSchema } from '../validators/catalog.validators.js';
import {
  listApplicationsQuerySchema,
  reviewApplicationSchema,
} from '../validators/seller.validators.js';

const router = Router();

router.get(
  '/admin/seller-applications',
  requireAuth,
  requireRole('admin'),
  validateQuery(listApplicationsQuerySchema),
  listApplications
);
router.patch(
  '/admin/seller-applications/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(uuidParamSchema),
  validate(reviewApplicationSchema),
  reviewApplication
);
router.get('/admin/sellers', requireAuth, requireRole('admin'), listSellers);
router.delete(
  '/admin/sellers/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(uuidParamSchema),
  revokeSeller
);

export default router;
