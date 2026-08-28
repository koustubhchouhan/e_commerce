import { db, authClient } from '../config/supabase.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../middleware/error.js';

// Shapes a Supabase session + our profile into the response the frontend expects.
// Roles always come from our `profiles` table, never from client input.
async function buildAuthResponse(user, session) {
  const { data: profile, error } = await db
    .from('profiles')
    .select('role, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  // Don't paper over a missing table / missing row with a default role — that
  // makes a broken database look like a successful login.
  if (error) {
    throw new AppError(
      500,
      `Could not read the profiles table (${error.message}). Did you run server/db/schema.sql?`
    );
  }
  if (!profile) {
    throw new AppError(500, 'No profile row for this user — is the handle_new_user trigger installed?');
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: profile.role,
      fullName: profile.full_name ?? '',
      avatarUrl: profile.avatar_url ?? null,
    },
    session: {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
    },
  };
}

// POST /auth/register
// Creates the auth user (email pre-confirmed for this prototype). The
// `handle_new_user` DB trigger auto-creates the matching profile row with the
// default 'customer' role. We then sign in to hand back a usable session.
export const register = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;

  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createErr) throw new AppError(400, createErr.message);

  // The handle_new_user trigger inserts the profile row (role defaults to
  // 'customer'). Set the display name explicitly so it doesn't depend on
  // auth metadata reaching the trigger.
  if (fullName) {
    const { error: profileErr } = await db
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', created.user.id);
    if (profileErr) {
      throw new AppError(
        500,
        `Account created, but the profile could not be updated (${profileErr.message}). Did you run server/db/schema.sql?`
      );
    }
  }

  const { data: signIn, error: signInErr } = await authClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr || !signIn?.session) throw new AppError(400, 'Account created, but sign-in failed');

  res.status(201).json(await buildAuthResponse(signIn.user, signIn.session));
});

// POST /auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error || !data?.session) throw new AppError(401, 'Invalid email or password');

  res.json(await buildAuthResponse(data.user, data.session));
});

// POST /auth/refresh
export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data?.session) throw new AppError(401, 'Could not refresh session');

  res.json(await buildAuthResponse(data.user, data.session));
});

// GET /auth/me  (requireAuth already resolved the profile)
export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
