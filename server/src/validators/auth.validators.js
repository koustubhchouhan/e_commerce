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
