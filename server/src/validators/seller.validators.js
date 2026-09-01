import { z } from 'zod';

export const createApplicationSchema = z.object({
  store_name: z.string().trim().min(1, 'Store name is required').max(120),
  contact_email: z.string().email('Invalid email').max(200),
});

export const reviewApplicationSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

export const listApplicationsQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

// PATCH /seller/store body — both fields optional so a single field can be
// updated in isolation.
export const updateStoreSchema = z.object({
  name: z.string().trim().min(1, 'Store name is required').max(120).optional(),
  description: z.string().trim().max(1000).optional(),
});
