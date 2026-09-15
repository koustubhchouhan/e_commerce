// Browser-side Google OAuth (PKCE) via the official Supabase client.
//
// Supabase runs the whole dance (code verifier + token exchange) and stores the
// resulting session in this tab. We only need to: kick the flow off with an
// "intent" (login vs role-tagged signup), then on /auth/callback hand the
// session to our backend, which validates it and returns our shaped app session.
//
// The anon key is public by design; it only ever talks to Supabase Auth for
// this user's own Google login. The service-role key stays server-only.

import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env?.VITE_SUPABASE_URL;
const ANON = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const isGoogleOAuthConfigured = Boolean(URL && ANON);

const client = isGoogleOAuthConfigured
  ? createClient(URL, ANON, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

const INTENT_KEY = 'novamarket-oauth-intent';

function persistIntent(mode, role) {
  sessionStorage.setItem(INTENT_KEY, JSON.stringify({ mode, role: role ?? null }));
}

function readIntent() {
  const raw = sessionStorage.getItem(INTENT_KEY);
  sessionStorage.removeItem(INTENT_KEY);
  if (!raw) return { mode: 'login', role: null };
  try {
    return JSON.parse(raw);
  } catch {
    return { mode: 'login', role: null };
  }
}

// Kicks off Google OAuth. `mode` tells the callback page whether this is a
// plain sign-in or a sign-up, and `role` (customer/seller, signup only) is the
// account type the user chose before tapping the button.
export async function startGoogleOAuth({ mode = 'login', role } = {}) {
  if (!client) {
    throw new Error(
      'Google sign-in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }
  persistIntent(mode, role);
  const redirectTo = `${window.location.origin}/auth/callback`;
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw new Error(error?.message || 'Could not start Google sign-in.');
  // SignInWithOAuth redirects the browser away; if we're still here nothing more to do.
}

// Runs from /auth/callback after Google redirects back. Returns the Supabase
// session plus the intent that was recorded before the redirect.
export async function finishGoogleOAuth() {
  if (!client) {
    return {
      intent: readIntent(),
      session: null,
      error: new Error('Google sign-in is not configured.'),
    };
  }
  const intent = readIntent();
  const { data, error } = await client.auth.getSession();
  if (error) return { intent, session: null, error };

  // Don't leave the access token / code sitting in the address bar.
  window.history.replaceState({}, document.title, window.location.pathname);

  const session = data?.session ?? null;
  if (session) {
    // The tokens are handed to our backend, which then owns the session via
    // HttpOnly cookies. Do NOT call client.auth.signOut() here: even with
    // { scope: 'local' } it still POSTs to /logout and revokes the session, so
    // the backend's getUser() would reject the very token we just passed it.
    // Instead, stop the browser client from rotating the refresh token and drop
    // its local copy so a later page load cannot auto-refresh a dead session.
    try {
      client.auth.stopAutoRefresh();
    } catch {
      // Non-fatal.
    }
    try {
      const key = client.auth.storageKey;
      await client.auth.storage.removeItem(key);
      await client.auth.storage.removeItem(`${key}-user`);
    } catch {
      // Storage can be unavailable; the hand-off still works.
    }
  }

  return { intent, session, error: null };
}
