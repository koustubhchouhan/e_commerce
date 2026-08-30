import { z } from 'zod';

// Query params for GET /products
export const listProductsQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  category: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid UUID'),
});

// POST /admin/categories body
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(120),
});

// POST /products/:id/reviews body
export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().default(''),
});
