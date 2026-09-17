import { timingSafeEqual } from 'node:crypto';
import { db } from '../config/supabase.js';
import { AppError } from './error.js';
import { ACCESS_COOKIE, CSRF_COOKIE } from '../services/session-cookies.js';

function bearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

// Prefer the HttpOnly session cookie; fall back to a Bearer header so
// non-browser API clients keep working during and after the cookie migration.
function readToken(req) {
  const cookieToken = req.cookies?.[ACCESS_COOKIE];
  if (cookieToken) return { token: cookieToken, viaCookie: true };
  const bearer = bearerToken(req);
  if (bearer) return { token: bearer, viaCookie: false };
  return { token: null, viaCookie: false };
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function tokensMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Double-submit CSRF check. Only enforced when the caller authenticated with a
// cookie and the request mutates state; Bearer clients are exempt because the
// browser never attaches that header automatically.
function assertCsrf(req) {
  if (SAFE_METHODS.has(req.method)) return;
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get('x-csrf-token');
  if (!tokensMatch(cookieToken, headerToken)) {
    throw new AppError(403, 'Invalid or missing CSRF token');
  }
}

// Resolves a token to our own profile-backed user shape. Returns null when the
// token is invalid/expired or the profile is missing.
async function loadUser(token) {
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return null;

  const { data: profile, error: profileErr } = await db
    .from('profiles')
    .select('email, role, full_name, avatar_url, phone, shipping_address')
    .eq('id', data.user.id)
    .single();
  if (profileErr || !profile) return null;

  return {
    id: data.user.id,
    email: profile.email || data.user.email,
    role: profile.role,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    phone: profile.phone ?? null,
    shippingAddress: profile.shipping_address ?? null,
  };
}

// Verifies the caller's identity (session cookie or bearer token) and attaches
// the profile-backed user to req.user. The role comes from our own `profiles`
// table — never from anything the client sends. Cookie-authenticated mutating
// requests must also pass the CSRF check.
export async function requireAuth(req, res, next) {
  try {
    const { token, viaCookie } = readToken(req);
    if (!token) throw new AppError(401, 'Missing authentication');

    const user = await loadUser(token);
    if (!user) throw new AppError(401, 'Invalid or expired token');

    if (viaCookie) assertCsrf(req);

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Public-route variant: attaches req.user when a valid token is supplied, but
// never rejects unauthenticated callers. Lets endpoints that guests may use
// still associate the action with a signed-in caller (e.g. the contact form
// linking a message to an account).
export async function optionalAuth(req, res, next) {
  try {
    const { token, viaCookie } = readToken(req);
    if (token) {
      const user = await loadUser(token);
      if (user) {
        if (viaCookie) assertCsrf(req);
        req.user = user;
      }
    }
  } catch (err) {
    // CSRF failures must surface; a bad token or DB hiccup should never block
    // a public route (it just falls back to acting as a guest).
    if (err instanceof AppError && err.status === 403) return next(err);
  }
  next();
}

// Gate a route to one or more roles. Use after requireAuth.
// e.g. router.post('/products', requireAuth, requireRole('seller', 'admin'), ...)
export const requireRole = (...roles) => {
  const middleware = (req, res, next) => {
    if (!req.user) return next(new AppError(401, 'Not authenticated'));
    if (!roles.includes(req.user.role)) return next(new AppError(403, 'Forbidden'));
    next();
  };
  // Exposed so the route-guard audit (test/route-guards.test.js) can assert
  // which roles each endpoint is gated to. Carries no runtime behaviour.
  middleware.roles = roles;
  return middleware;
};
