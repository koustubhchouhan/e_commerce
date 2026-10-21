import { asyncHandler } from '../middleware/asyncHandler.js';
import * as sellerService from '../services/seller.service.js';
import * as membershipService from '../services/membership.service.js';

export const createApplication = asyncHandler(async (req, res) => {
  res.status(201).json(await sellerService.createApplication(req.user.id, req.body));
});

export const uploadStorefrontImage = asyncHandler(async (req, res) => {
  res.status(201).json(await sellerService.uploadStorefrontImage(req.file));
});

export const getMyApplications = asyncHandler(async (req, res) => {
  res.json({ items: await sellerService.getMyApplications(req.user.id) });
});

// ---- Seller membership (one-time fee after admin approval) ----
export const createMembershipOrder = asyncHandler(async (req, res) => {
  res.status(201).json(await membershipService.createMembershipOrder(req.user.id, req.params.id));
});

export const verifyMembershipPayment = asyncHandler(async (req, res) => {
  res.json(
    await membershipService.verifyMembershipPayment(req.user.id, req.params.id, req.body)
  );
});

export const declineMembership = asyncHandler(async (req, res) => {
  res.json(await membershipService.declineMembership(req.user.id, req.params.id));
});

export const getStore = asyncHandler(async (req, res) => {
  res.json(await sellerService.getStore(req.user.id, req.user.role));
});

export const updateStore = asyncHandler(async (req, res) => {
  res.json(await sellerService.updateStore(req.user.id, req.user.role, req.body));
});

export const getStoreReviews = asyncHandler(async (req, res) => {
  res.json({ items: await sellerService.listStoreReviews(req.user.id) });
});

export const replyToStoreReview = asyncHandler(async (req, res) => {
  res.json(await sellerService.replyToReview(req.user.id, req.params.id, req.body.reply));
});
