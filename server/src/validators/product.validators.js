import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  description: z.string().trim().max(5000).optional().default(''),
  price: z.number().positive('Price must be greater than 0'),
  discount_percent: z.number().int().min(0).max(100).optional().default(0),
  stock: z.number().int().min(0).optional().default(0),
  status: z.enum(['active', 'draft', 'out_of_stock']).optional().default('active'),
  category_id: z.string().uuid().optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

// PATCH /admin/products/:id/approval — admin decision on a seller listing.
export const reviewProductApprovalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().trim().max(500).optional(),
});

// GET /admin/products — moderation queue filter.
export const adminProductsQuerySchema = z.object({
  approval_status: z.enum(['pending', 'approved', 'rejected']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});
