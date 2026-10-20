import { asyncHandler } from '../middleware/asyncHandler.js';
import * as settingsService from '../services/settings.service.js';

export const getSettings = asyncHandler(async (req, res) => {
  res.json(await settingsService.getSettings());
});

export const updateSettings = asyncHandler(async (req, res) => {
  res.json(await settingsService.updateSettings(req.body, req.user.id));
});
