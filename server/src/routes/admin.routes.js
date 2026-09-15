import { Router } from 'express';
import multer from 'multer';
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
  listReviews,
  updateReviewVisibility,
  deleteReview,
} from '../controllers/admin.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate, validateQuery, validateParams } from '../middleware/validate.js';
import {
  adminListSlides,
  createSlide,
  updateSlide,
  deleteSlide,
  uploadSlideImage,
} from '../controllers/hero.controller.js';
import {
  createHeroSlideSchema,
  updateHeroSlideSchema,
} from '../validators/hero.validators.js';
import {
  uuidParamSchema,
  createCategorySchema,
  updateReviewVisibilitySchema,
} from '../validators/catalog.validators.js';
import {
  listApplicationsQuerySchema,
  reviewApplicationSchema,
  updateOrderStatusSchema,
} from '../validators/seller.validators.js';

const router = Router();

// In-memory multipart parsing for hero slide image uploads (lands in req.file).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

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

router.get('/admin/reviews', requireAuth, requireRole('admin'), listReviews);
router.patch(
  '/admin/reviews/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(uuidParamSchema),
  validate(updateReviewVisibilitySchema),
  updateReviewVisibility
);
router.delete(
  '/admin/reviews/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(uuidParamSchema),
  deleteReview
);

router.get('/admin/hero-slides', requireAuth, requireRole('admin'), adminListSlides);
router.post(
  '/admin/hero-slides',
  requireAuth,
  requireRole('admin'),
  validate(createHeroSlideSchema),
  createSlide
);
router.post(
  '/admin/hero-slides/image',
  requireAuth,
  requireRole('admin'),
  upload.single('image'),
  uploadSlideImage
);
router.patch(
  '/admin/hero-slides/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(uuidParamSchema),
  validate(updateHeroSlideSchema),
  updateSlide
);
router.delete(
  '/admin/hero-slides/:id',
  requireAuth,
  requireRole('admin'),
  validateParams(uuidParamSchema),
  deleteSlide
);

export default router;
