import { db, authClient } from '../config/supabase.js';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './session-cookies.js';

// Pulls the credentials a sign-out should act on. The HttpOnly cookies win
// because the browser is the normal caller; the body/Bearer fallbacks keep
// non-browser clients working.
export function pickSessionTokens(req) {
  const header = req.headers?.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  return {
    accessToken: req.cookies?.[ACCESS_COOKIE] || bearer || null,
    refreshToken: req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken || null,
  };
}

// Best-effort server-side revocation of the Supabase session so a copied or
// stolen refresh token cannot be replayed after sign-out.
//   - a still-valid access token revokes the session directly;
//   - otherwise (access cookie expired, or the token was rejected) a fresh
//     access token is minted from the refresh token and then revoked.
// Returns true when a revocation call was made, false when there was nothing to
// revoke. Unexpected errors propagate so the caller can decide how to react.
export async function revokeSupabaseSession(req, deps = {}) {
  const admin = deps.admin ?? db.auth.admin;
  const auth = deps.auth ?? authClient.auth;

  const { accessToken, refreshToken } = pickSessionTokens(req);

  if (accessToken) {
    try {
      // GoTrue resolves with { error } for a rejected/expired token (it only
      // throws for transport failures), so inspect the result before trusting it.
      const { error } = await admin.signOut(accessToken, 'local');
      if (!error) return true;
    } catch {
      // Transport failure — fall back to the refresh token below.
    }
  }

  if (!refreshToken) return false;

  const { data } = await auth.refreshSession({ refresh_token: refreshToken });
  const minted = data?.session?.access_token;
  if (!minted) return false;

  const { error } = await admin.signOut(minted, 'local');
  return !error;
}
