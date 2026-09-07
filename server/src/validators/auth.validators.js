import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1).max(120).optional().default(''),
  // Account type the user picked on the sign-up page. Admin is never
  // self-selectable — admin accounts are created separately by the platform.
  role: z.enum(['customer', 'seller']).optional().default('customer'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

// POST /auth/oauth/session — browser-side OAuth (Google) hands its Supabase
// session to the backend, which validates it and shapes our own response.
// `role` is only meaningful for sign-ups (what account type was chosen).
export const oauthSessionSchema = z.object({
  session: z.object({
    access_token: z.string().min(1, 'access_token is required'),
    refresh_token: z.string().min(1, 'refresh_token is required'),
    expires_at: z.number().nullable().optional(),
  }),
  mode: z.enum(['login', 'signup']),
  role: z.enum(['customer', 'seller']).optional(),
});

// Shipping address shape — mirrors what checkout stores on an order, so a
// saved default can be reused at the register without any reshaping.
const shippingAddressSchema = z
  .object({
    firstName: z.string().max(120).optional().default(''),
    lastName: z.string().max(120).optional().default(''),
    address: z.string().max(300).optional().default(''),
    city: z.string().max(120).optional().default(''),
    pin: z.string().max(20).optional().default(''),
    phone: z.string().max(40).optional().default(''),
  })
  .nullable()
  .optional();

// PATCH /auth/profile — all fields optional; only provided ones are written.
export const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  phone: z.string().max(40).nullable().optional(),
  avatarUrl: z.string().url('Avatar URL must be a valid URL').max(500).nullable().optional(),
  shippingAddress: shippingAddressSchema,
});

// POST /auth/password — current password is optional so Google-only accounts
// (which have no password yet) can set one without proving a nonexistent one.
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).optional().default(''),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// POST /auth/email — changing the sign-in email.
export const changeEmailSchema = z.object({
  newEmail: z.string().email('Enter a valid email address'),
});
