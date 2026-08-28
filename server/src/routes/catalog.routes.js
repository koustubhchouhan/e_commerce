import { Router } from 'express';
import {
  listCategories,
  listProducts,
  getProduct,
} from '../controllers/catalog.controller.js';
import { validateQuery, validateParams } from '../middleware/validate.js';
import { listProductsQuerySchema, uuidParamSchema } from '../validators/catalog.validators.js';

const router = Router();

router.get('/categories', listCategories);
router.get('/products', validateQuery(listProductsQuerySchema), listProducts);
router.get('/products/:id', validateParams(uuidParamSchema), getProduct);

export default router;
