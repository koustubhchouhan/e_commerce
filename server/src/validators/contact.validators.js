import { z } from 'zod';

// POST /contact body — public support form submission.
export const createContactMessageSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(120),
  last_name: z.string().trim().min(1, 'Last name is required').max(120),
  email: z.string().trim().email('A valid email is required').max(254),
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  message: z.string().trim().min(1, 'Message is required').max(5000),
});

// PATCH /admin/contact-messages/:id body.
export const updateContactMessageSchema = z.object({
  is_read: z.boolean(),
});
