import { asyncHandler } from '../middleware/asyncHandler.js';
import * as adminService from '../services/admin.service.js';
import * as orderService from '../services/order.service.js';

export const listApplications = asyncHandler(async (req, res) => {
  res.json({ items: await adminService.listApplications(req.query) });
});

export const listAllOrders = asyncHandler(async (req, res) => {
  res.json(await orderService.listAllOrders());
});

export const updateAdminOrderStatus = asyncHandler(async (req, res) => {
  res.json(await orderService.updateOrderStatus(req.user.id, req.user.role, req.params.id, req.body.status));
});

export const listCategories = asyncHandler(async (req, res) => {
  res.json({ items: await adminService.listCategories() });
});

export const createCategory = asyncHandler(async (req, res) => {
  res.status(201).json(await adminService.createCategory(req.body));
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await adminService.deleteCategory(req.params.id);
  res.status(204).end();
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await adminService.deleteAnyProduct(req.params.id);
  res.status(204).end();
});

export const reviewApplication = asyncHandler(async (req, res) => {
  const result = await adminService.reviewApplication(
    req.user.id,
    req.params.id,
    req.body.action
  );
  res.json(result);
});

export const listSellers = asyncHandler(async (req, res) => {
  res.json({ items: await adminService.listSellers() });
});

export const revokeSeller = asyncHandler(async (req, res) => {
  await adminService.revokeSeller(req.params.id);
  res.status(204).end();
});
