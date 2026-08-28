import { asyncHandler } from '../middleware/asyncHandler.js';
import * as adminService from '../services/admin.service.js';

export const listApplications = asyncHandler(async (req, res) => {
  res.json({ items: await adminService.listApplications(req.query) });
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
