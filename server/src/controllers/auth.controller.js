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

// Creates a "become a seller" application on behalf of a brand-new account that
// chose Seller at sign-up. Seller is NOT granted instantly — an admin still
// approves, which is what actually flips profiles.role to 'seller' and creates
// the store. Idempotent: an existing pending/approved application is reused.
async function ensurePendingSellerApplication(userId, fullName, email) {
  const { data: existing, error: checkErr } = await db
    .from('seller_applications')
    .select('id, store_name, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'approved'])
    .maybeSingle();
  if (checkErr) throw new AppError(500, `Could not check seller application: ${checkErr.message}`);

  if (existing) {
    return {
      status: existing.status === 'approved' ? 'approved' : 'pending',
      storeName: existing.store_name,
    };
  }

  const name = fullName?.trim() || email?.split('@')[0] || 'New';
  const storeName = `${name}'s Store`;
  const { data: inserted, error: insertErr } = await db
    .from('seller_applications')
    .insert({ user_id: userId, store_name: storeName, contact_email: email })
    .select('id, store_name, status')
    .single();
  if (insertErr) throw new AppError(500, `Could not submit seller application: ${insertErr.message}`);

  return { status: inserted.status, storeName: inserted.store_name };
}

// Copies Google's profile fields into the profile row when the trigger left
// them empty (avatar_url is never set by the trigger).
async function backfillProfileFromProvider(profileId, profile, meta) {
  const patch = {};
  const metaName = meta?.full_name || meta?.name;
  const metaAvatar = meta?.avatar_url || meta?.picture || meta?.avatar;

  if (!profile?.full_name && metaName) patch.full_name = metaName;
  if (!profile?.avatar_url && metaAvatar) patch.avatar_url = metaAvatar;
  if (Object.keys(patch).length === 0) return patch;

  const { error } = await db.from('profiles').update(patch).eq('id', profileId);
  if (error) throw new AppError(500, `Could not update profile: ${error.message}`);
  return patch;
}

// POST /auth/register
// Creates the auth user (email pre-confirmed for this prototype). The
// `handle_new_user` DB trigger auto-creates the matching profile row with the
// default 'customer' role. We then sign in to hand back a usable session.
export const register = asyncHandler(async (req, res) => {
  const { email, password, fullName, role } = req.body;

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

  // Chose Seller at sign-up? File the application now (pending) rather than
  // granting the role instantly. Admin approval flips profiles.role later.
  const sellerApplication =
    role === 'seller'
      ? await ensurePendingSellerApplication(created.user.id, fullName, email)
      : null;

  res.status(201).json({
    ...(await buildAuthResponse(signIn.user, signIn.session)),
    sellerApplication,
  });
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

// POST /auth/oauth/session
// The browser ran the Google OAuth dance with @supabase/supabase-js (PKCE)
// and now submits the resulting Supabase session. We validate it, make sure a
// profile row exists for the identity, and either:
//   - login:   return our normal shaped session for the existing account;
//   - signup:  the identity must be brand-new. The chosen account type
//              (customer/seller only) is applied: seller files a pending
//              application, customer keeps the default profile role.
export const oauthSession = asyncHandler(async (req, res) => {
  const { session, mode, role } = req.body;

  const { data: got, error: getUserErr } = await authClient.auth.getUser(session.access_token);
  if (getUserErr || !got?.user) throw new AppError(401, 'Google session is invalid or has expired');
  const supabaseUser = got.user;

  const { data: profile, error: profileErr } = await db
    .from('profiles')
    .select('id, role, full_name, avatar_url, auth_provider, created_at')
    .eq('id', supabaseUser.id)
    .maybeSingle();
  if (profileErr) throw new AppError(500, `Could not read profile: ${profileErr.message}`);

  // An OAuth sign-up inserts the auth user (and, via the trigger, the profile)
  // moments before this call. Anything older is a returning account.
  const isFreshGoogleSignup =
    !profile ||
    (profile.auth_provider === 'google' &&
      Date.now() - new Date(profile.created_at).getTime() < 5 * 60 * 1000);

  const browserSession = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at ?? null,
  };

  if (mode === 'signup') {
    if (!isFreshGoogleSignup) {
      throw new AppError(409, 'This Google account is already registered. Sign in instead.');
    }
    if (!profile) throw new AppError(500, 'No profile row was created for this Google identity');

    await backfillProfileFromProvider(profile.id, profile, supabaseUser.user_metadata);

    if (role === 'seller') {
      const sellerApplication = await ensurePendingSellerApplication(
        profile.id,
        profile.full_name || supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name,
        supabaseUser.email
      );
      res.status(201).json({
        ...(await buildAuthResponse(supabaseUser, browserSession)),
        sellerApplication,
      });
      return;
    }

    res.status(201).json(await buildAuthResponse(supabaseUser, browserSession));
    return;
  }

  // Login mode — the account must already exist.
  if (!profile) {
    throw new AppError(404, 'No NovaMarket account matches this Google account. Sign up first.');
  }
  // The profile row is keyed by the same auth user id that Google just
  // authenticated, so this is the account owner. GoTrue links the Google
  // identity onto an email+password account once Google has verified the
  // email, so the profile may still be tagged `email`. That is a login, not a
  // takeover attempt — a separate Google account would have its own user id
  // and its own (google-tagged) profile row. Allow it and upgrade the tag so
  // future sign-ins skip this path.
  if (profile.auth_provider !== 'google') {
    const { error: tagErr } = await db
      .from('profiles')
      .update({ auth_provider: 'google' })
      .eq('id', profile.id);
    if (tagErr) {
      throw new AppError(500, `Could not update profile: ${tagErr.message}`);
    }
  }

  await backfillProfileFromProvider(profile.id, profile, supabaseUser.user_metadata);
  res.json(await buildAuthResponse(supabaseUser, browserSession));
});
