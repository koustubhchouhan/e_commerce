import { db } from '../config/supabase.js';
import { AppError } from './error.js';

// Verifies the Supabase access token in the Authorization header and attaches
// the caller's identity + role to req.user. The role comes from our own
// `profiles` table — never from anything the client sends.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (!token) throw new AppError(401, 'Missing bearer token');

    // Validates the JWT signature/expiry against Supabase Auth.
    const { data, error } = await db.auth.getUser(token);
    if (error || !data?.user) throw new AppError(401, 'Invalid or expired token');

    const { data: profile, error: profileErr } = await db
      .from('profiles')
      .select('role, full_name, avatar_url')
      .eq('id', data.user.id)
      .single();
    if (profileErr || !profile) throw new AppError(401, 'Profile not found');

    req.user = {
      id: data.user.id,
      email: data.user.email,
      role: profile.role,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
    };
    next();
  } catch (err) {
    next(err);
  }
}

// Gate a route to one or more roles. Use after requireAuth.
// e.g. router.post('/products', requireAuth, requireRole('seller', 'admin'), ...)
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(new AppError(401, 'Not authenticated'));
    if (!roles.includes(req.user.role)) return next(new AppError(403, 'Forbidden'));
    next();
  };
