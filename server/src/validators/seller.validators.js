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

// PATCH /seller/orders/:id/status body — the target status the seller (or an
// admin) is moving the order to. The service validates the transition itself.
export const updateOrderStatusSchema = z.object({
  status: z.enum(['shipped', 'delivered', 'cancelled']),
});

// PATCH /seller/reviews/:id/reply body — the public reply a seller leaves on a
// review. An empty string clears an existing reply.
export const replyToReviewSchema = z.object({
  reply: z.string().trim().max(2000, 'Reply must be 2000 characters or fewer'),
});

// POST /admin/settlements body — one manual seller payout. The RPC re-checks
// that every order belongs to the store and has not been settled already.
export const createSettlementSchema = z.object({
  store_id: z.string().uuid('Invalid store'),
  order_ids: z
    .array(z.string().uuid('Invalid order'))
    .min(1, 'Pick at least one order')
    .max(500, 'Too many orders in one settlement'),
  note: z.string().trim().max(500, 'Note must be 500 characters or fewer').optional(),
});
