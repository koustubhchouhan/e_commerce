import { asyncHandler } from '../middleware/asyncHandler.js';
import * as reviewService from '../services/review.service.js';

export const listReviews = asyncHandler(async (req, res) => {
  res.json(await reviewService.listReviews(req.params.id));
});

export const createReview = asyncHandler(async (req, res) => {
  res.status(201).json(await reviewService.createReview(req.user.id, req.params.id, req.body));
});
