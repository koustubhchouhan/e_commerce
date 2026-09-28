import { Router } from 'express';
import {
  listCategories,
  listProducts,
  getProduct,
} from '../controllers/catalog.controller.js';
import { listReviews, createReview, getReviewEligibility } from '../controllers/review.controller.js';
import { listSlides } from '../controllers/hero.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { publicCache, privateCache, noStore } from '../middleware/cache.js';
import { rateLimit, userKey } from '../middleware/rateLimit.js';
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

// Verified buyers only, but each submission re-checks purchase history, so cap
// how often one account can hit it.
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: userKey,
  message: 'Too many review submissions. Please try again later.',
});

// Public catalog reads are identical for every visitor, so they may be cached
// by the browser and shared caches; catalog edits appear within maxAge.
router.get('/categories', publicCache(300, 900), listCategories);
router.get('/hero-slides', publicCache(300, 900), listSlides);
router.get(
  '/products',
  publicCache(60, 300),
  validateQuery(listProductsQuerySchema),
  listProducts
);
router.get(
  '/products/:id/reviews',
  publicCache(60, 300),
  validateParams(uuidParamSchema),
  listReviews
);
router.get(
  '/products/:id/reviews/eligibility',
  noStore,
  requireAuth,
  validateParams(uuidParamSchema),
  getReviewEligibility
);
router.post(
  '/products/:id/reviews',
  requireAuth,
  reviewLimiter,
  validateParams(uuidParamSchema),
  validate(createReviewSchema),
  createReview
);
// A listing can be visible to its owner/admin but hidden from the public, so
// only the caller's own browser may keep a copy.
router.get(
  '/products/:id',
  privateCache(30, 120),
  optionalAuth,
  validateParams(uuidParamSchema),
  getProduct
);

export default router;
