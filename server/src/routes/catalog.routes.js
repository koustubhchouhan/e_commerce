import { Router } from 'express';
import {
  listCategories,
  listProducts,
  getProduct,
} from '../controllers/catalog.controller.js';
import { listReviews, createReview, getReviewEligibility } from '../controllers/review.controller.js';
import { listSlides } from '../controllers/hero.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
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
router.get('/hero-slides', listSlides);
router.get('/products', validateQuery(listProductsQuerySchema), listProducts);
router.get('/products/:id/reviews', validateParams(uuidParamSchema), listReviews);
router.get(
  '/products/:id/reviews/eligibility',
  requireAuth,
  validateParams(uuidParamSchema),
  getReviewEligibility
);
router.post(
  '/products/:id/reviews',
  requireAuth,
  validateParams(uuidParamSchema),
  validate(createReviewSchema),
  createReview
);
router.get('/products/:id', optionalAuth, validateParams(uuidParamSchema), getProduct);

export default router;
