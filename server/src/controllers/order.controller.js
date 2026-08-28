import { asyncHandler } from '../middleware/asyncHandler.js';
import * as orderService from '../services/order.service.js';

export const createOrder = asyncHandler(async (req, res) => {
  res.status(201).json(await orderService.createOrder(req.user.id, req.body));
});

export const listOrders = asyncHandler(async (req, res) => {
  res.json(await orderService.listOrders(req.user.id));
});

export const getOrder = asyncHandler(async (req, res) => {
  res.json(await orderService.getOrder(req.user.id, req.user.role, req.params.id));
});
