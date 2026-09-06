import { z } from 'zod';

// POST /contact body — public support form submission. When a customer is
// asking about a specific store or product, the optional store_id/product_id
// route the message to that seller's inbox instead of the platform inbox.
export const createContactMessageSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(120),
  last_name: z.string().trim().min(1, 'Last name is required').max(120),
  email: z.string().trim().email('A valid email is required').max(254),
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  message: z.string().trim().min(1, 'Message is required').max(5000),
  store_id: z.string().uuid('A valid store is required').nullable().optional(),
  product_id: z.string().uuid('A valid product is required').nullable().optional(),
});

// PATCH /admin/contact-messages/:id body — also used by the seller inbox.
export const updateContactMessageSchema = z.object({
  is_read: z.boolean(),
});
