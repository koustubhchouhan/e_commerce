import { asyncHandler } from '../middleware/asyncHandler.js';
import * as heroService from '../services/hero.service.js';

export const listSlides = asyncHandler(async (req, res) => {
  res.json({ items: await heroService.listActiveSlides() });
});

export const adminListSlides = asyncHandler(async (req, res) => {
  res.json({ items: await heroService.listAllSlides() });
});

export const createSlide = asyncHandler(async (req, res) => {
  res.status(201).json(await heroService.createSlide(req.body));
});

export const updateSlide = asyncHandler(async (req, res) => {
  res.json(await heroService.updateSlide(req.params.id, req.body));
});

export const deleteSlide = asyncHandler(async (req, res) => {
  await heroService.deleteSlide(req.params.id);
  res.status(204).end();
});

export const uploadSlideImage = asyncHandler(async (req, res) => {
  res.status(201).json(await heroService.uploadSlideImage(req.file));
});
