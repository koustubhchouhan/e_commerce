import { randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

// Cookie names. The access + refresh tokens are HttpOnly so JavaScript can
// never read them; the CSRF cookie is intentionally readable so the SPA can
// echo it back in a header (double-submit pattern).
export const ACCESS_COOKIE = 'nm_at';
export const REFRESH_COOKIE = 'nm_rt';
export const CSRF_COOKIE = 'nm_csrf';

// Access token lives for an hour, refresh + CSRF for 30 days so a returning
// visitor can still mutate safely after a long break.
const ACCESS_MAX_AGE_MS = 60 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// All cookies use Path=/ because the SPA reaches the API through a prefix
// (e.g. /api via the Vite proxy); a narrower path would stop the browser from
// sending the cookie on refresh calls.
function baseOptions() {
  const options = {
    secure: env.nodeEnv === 'production',
    sameSite: env.cookieSameSite,
    path: '/',
  };
  if (env.cookieDomain) options.domain = env.cookieDomain;
  return options;
}

export function issueCsrfToken() {
  return randomBytes(32).toString('hex');
}

// Writes the access/refresh tokens as HttpOnly cookies and (optionally) the
// CSRF token as a readable cookie. Safe to call on every login/refresh.
export function setSessionCookies(res, session, { csrfToken } = {}) {
  const base = baseOptions();
  if (session?.accessToken) {
    res.cookie(ACCESS_COOKIE, session.accessToken, {
      ...base,
      httpOnly: true,
      maxAge: ACCESS_MAX_AGE_MS,
    });
  }
  if (session?.refreshToken) {
    res.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...base,
      httpOnly: true,
      maxAge: REFRESH_MAX_AGE_MS,
    });
  }
  if (csrfToken) {
    res.cookie(CSRF_COOKIE, csrfToken, {
      ...base,
      httpOnly: false,
      maxAge: REFRESH_MAX_AGE_MS,
    });
  }
}

export function clearSessionCookies(res) {
  const base = baseOptions();
  res.clearCookie(ACCESS_COOKIE, { ...base, httpOnly: true });
  res.clearCookie(REFRESH_COOKIE, { ...base, httpOnly: true });
  res.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false });
}
