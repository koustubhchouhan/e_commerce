import { Router } from 'express';
import multer from 'multer';
import {
  listSellerProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImages,
} from '../controllers/product.controller.js';
import { sellerOrders } from '../controllers/seller.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate, validateParams } from '../middleware/validate.js';
import { createProductSchema, updateProductSchema } from '../validators/product.validators.js';
import { uuidParamSchema } from '../validators/catalog.validators.js';

const router = Router();

// In-memory multipart parsing for image uploads (files land in req.files).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8 }, // 5MB each, max 8
});

router.get('/seller/products', requireAuth, requireRole('seller', 'admin'), listSellerProducts);
router.get('/seller/orders', requireAuth, requireRole('seller', 'admin'), sellerOrders);
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
  upload.array('images', 8),
  addProductImages
);

export default router;
