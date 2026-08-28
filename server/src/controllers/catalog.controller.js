import { asyncHandler } from '../middleware/asyncHandler.js';
import * as catalogService from '../services/catalog.service.js';

export const listCategories = asyncHandler(async (req, res) => {
  res.json(await catalogService.listCategories());
});

export const listProducts = asyncHandler(async (req, res) => {
  res.json(await catalogService.listProducts(req.query));
});

export const getProduct = asyncHandler(async (req, res) => {
  res.json(await catalogService.getProduct(req.params.id));
});
