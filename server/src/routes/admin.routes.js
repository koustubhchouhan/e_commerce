import { Router } from 'express';
import {
  listApplications,
  reviewApplication,
  listSellers,
  revokeSeller,
  listAllOrders,
  updateAdminOrderStatus,
  listCategories,
  createCategory,
  deleteCategory,
  deleteProduct,
  getPlatformLedger,
} from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import {
  uuidParamSchema,
  createCategorySchema,
} from '../validators/catalog.validators.js';
import {
  listApplicationsQuerySchema,
  reviewApplicationSchema,
  updateOrderStatusSchema,
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
router.get('/admin/orders', requireAuth, requireRole('admin'), listAllOrders);
router.patch(
  '/admin/orders/:id/status',
  requireAuth,
  requireRole('admin'),
  validateParams(uuidParamSchema),
  validate(updateOrderStatusSchema),
  updateAdminOrderStatus
);
router.get('/admin/categories', requireAuth, requireRole('admin'), listCategories);
router.post(
  '/admin/categories',
  requireAuth,
  requireRole('admin'),
  validate(createCategorySchema),
  createCategory
);
router.delete(
  '/admin/categories/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(uuidParamSchema),
  deleteCategory
);
router.delete(
  '/admin/products/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(uuidParamSchema),
  deleteProduct
);
router.get('/admin/ledger', requireAuth, requireRole('admin'), getPlatformLedger);

export default router;
