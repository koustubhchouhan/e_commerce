import { Router } from 'express';
import {
  listCategories,
  listProducts,
  getProduct,
} from '../controllers/catalog.controller.js';
import { listReviews, createReview } from '../controllers/review.controller.js';
import { requireAuth } from '../middleware/auth.js';
import {
  validate,
  validateQuery,
  validateParams,
} from '../middleware/validate.js';
import {
  listProductsQuerySchema,
  uuidParamSchema,
  createReviewSchema,
} from '../validators/catalog.validators.js';

const router = Router();

router.get('/categories', listCategories);
router.get('/products', validateQuery(listProductsQuerySchema), listProducts);
router.get('/products/:id/reviews', validateParams(uuidParamSchema), listReviews);
router.post(
  '/products/:id/reviews',
  requireAuth,
  validateParams(uuidParamSchema),
  validate(createReviewSchema),
  createReview
);
router.get('/products/:id', validateParams(uuidParamSchema), getProduct);

export default router;
