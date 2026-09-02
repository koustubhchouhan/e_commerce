import { asyncHandler } from '../middleware/asyncHandler.js';
import * as sellerService from '../services/seller.service.js';

export const createApplication = asyncHandler(async (req, res) => {
  res.status(201).json(await sellerService.createApplication(req.user.id, req.body));
});

export const getMyApplications = asyncHandler(async (req, res) => {
  res.json({ items: await sellerService.getMyApplications(req.user.id) });
});

export const getStore = asyncHandler(async (req, res) => {
  res.json(await sellerService.getStore(req.user.id));
});

export const updateStore = asyncHandler(async (req, res) => {
  res.json(await sellerService.updateStore(req.user.id, req.body));
});
