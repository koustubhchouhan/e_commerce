import { Router } from 'express';
import {
  listSellerProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  resubmitProduct,
  addProductImages,
} from '../controllers/product.controller.js';
import { listSellerOrders, updateSellerOrderStatus } from '../controllers/order.controller.js';
import {
  getStore,
  updateStore,
  getStoreReviews,
  replyToStoreReview,
} from '../controllers/seller.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { imageUploadArray, PRODUCT_IMAGE_POLICY } from '../middleware/upload.js';
import { validate, validateParams } from '../middleware/validate.js';
import { createProductSchema, updateProductSchema } from '../validators/product.validators.js';
import { uuidParamSchema } from '../validators/catalog.validators.js';
import {
  updateStoreSchema,
  updateOrderStatusSchema,
  replyToReviewSchema,
} from '../validators/seller.validators.js';

const router = Router();

router.get('/seller/products', requireAuth, requireRole('seller', 'admin'), listSellerProducts);
router.get('/seller/orders', requireAuth, requireRole('seller', 'admin'), listSellerOrders);
router.patch(
  '/seller/orders/:id/status',
  requireAuth,
  requireRole('seller', 'admin'),
  validateParams(uuidParamSchema),
  validate(updateOrderStatusSchema),
  updateSellerOrderStatus
);
router.get('/seller/store', requireAuth, requireRole('seller', 'admin'), getStore);
router.patch(
  '/seller/store',
  requireAuth,
  requireRole('seller', 'admin'),
  validate(updateStoreSchema),
  updateStore
);
router.get('/seller/reviews', requireAuth, requireRole('seller', 'admin'), getStoreReviews);
router.patch(
  '/seller/reviews/:id/reply',
  requireAuth,
  requireRole('seller', 'admin'),
  validateParams(uuidParamSchema),
  validate(replyToReviewSchema),
  replyToStoreReview
);
router.post(
  '/products',
  requireAuth,
  requireRole('seller', 'admin'),
  validate(createProductSchema),
  createProduct
);
router.patch(
  '/products/:id',
  requireAuth,
  requireRole('seller', 'admin'),
  validateParams(uuidParamSchema),
  validate(updateProductSchema),
  updateProduct
);
router.post(
  '/products/:id/resubmit',
  requireAuth,
  requireRole('seller', 'admin'),
  validateParams(uuidParamSchema),
  resubmitProduct
);
router.delete(
  '/products/:id',
  requireAuth,
  requireRole('seller', 'admin'),
  validateParams(uuidParamSchema),
  deleteProduct
);
router.post(
  '/products/:id/images',
  requireAuth,
  requireRole('seller', 'admin'),
  validateParams(uuidParamSchema),
  ...imageUploadArray('images', 8, PRODUCT_IMAGE_POLICY),
  addProductImages
);

export default router;
