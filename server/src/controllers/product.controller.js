import { asyncHandler } from '../middleware/asyncHandler.js';
import * as productService from '../services/product.service.js';

export const listSellerProducts = asyncHandler(async (req, res) => {
  res.json(await productService.listSellerProducts(req.user.id));
});

export const createProduct = asyncHandler(async (req, res) => {
  res.status(201).json(await productService.createProduct(req.user.id, req.body));
});

export const updateProduct = asyncHandler(async (req, res) => {
  res.json(await productService.updateProduct(req.user.id, req.params.id, req.body));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.user.id, req.params.id);
  res.status(204).end();
});

export const addProductImages = asyncHandler(async (req, res) => {
  res.status(201).json(await productService.addProductImages(req.user.id, req.params.id, req.files));
});
