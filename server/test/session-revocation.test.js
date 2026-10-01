import './helpers/env.js';

import assert from 'node:assert/strict';
import test from 'node:test';

import { pickSessionTokens, revokeSupabaseSession } from '../src/services/session-revocation.js';

function makeReq({ cookies = {}, body, authorization } = {}) {
  return { cookies, body, headers: authorization ? { authorization } : {} };
}

test('pickSessionTokens prefers the HttpOnly cookies', () => {
  const tokens = pickSessionTokens(
    makeReq({
      cookies: { nm_at: 'cookie-access', nm_rt: 'cookie-refresh' },
      body: { refreshToken: 'body-refresh' },
      authorization: 'Bearer header-access',
    })
  );
  assert.deepEqual(tokens, { accessToken: 'cookie-access', refreshToken: 'cookie-refresh' });
});

test('pickSessionTokens falls back to the Bearer header and body refresh token', () => {
  const tokens = pickSessionTokens(
    makeReq({
      body: { refreshToken: 'body-refresh' },
      authorization: 'Bearer header-access',
    })
  );
  assert.deepEqual(tokens, { accessToken: 'header-access', refreshToken: 'body-refresh' });
});

test('revokeSupabaseSession revokes directly when an access token is present', async () => {
  const calls = [];
  const admin = {
    async signOut(jwt, scope) {
      calls.push([jwt, scope]);
      return { data: null, error: null };
    },
  };
  const auth = {
    async refreshSession() {
      throw new Error('should not refresh');
    },
  };

  const revoked = await revokeSupabaseSession(
    makeReq({ cookies: { nm_at: 'access-1', nm_rt: 'refresh-1' } }),
    { admin, auth }
  );

  assert.equal(revoked, true);
  assert.deepEqual(calls, [['access-1', 'local']]);
});

test('revokeSupabaseSession mints an access token from the refresh token first', async () => {
  const calls = [];
  const admin = {
    async signOut(jwt, scope) {
      calls.push([jwt, scope]);
      return { data: null, error: null };
    },
  };
  const auth = {
    async refreshSession({ refresh_token }) {
      calls.push(['refresh', refresh_token]);
      return { data: { session: { access_token: 'minted-access' } } };
    },
  };

  const revoked = await revokeSupabaseSession(makeReq({ cookies: { nm_rt: 'refresh-1' } }), {
    admin,
    auth,
  });

  assert.equal(revoked, true);
  assert.deepEqual(calls, [
    ['refresh', 'refresh-1'],
    ['minted-access', 'local'],
  ]);
});

test('revokeSupabaseSession falls back to the refresh token when signOut rejects the access token', async () => {
  const calls = [];
  const admin = {
    async signOut(jwt, scope) {
      calls.push([jwt, scope]);
      if (jwt === 'stale-access') return { data: null, error: { message: 'token expired' } };
      return { data: null, error: null };
    },
  };
  const auth = {
    async refreshSession({ refresh_token }) {
      calls.push(['refresh', refresh_token]);
      return { data: { session: { access_token: 'minted-access' } } };
    },
  };

  const revoked = await revokeSupabaseSession(
    makeReq({ cookies: { nm_at: 'stale-access', nm_rt: 'refresh-1' } }),
    { admin, auth }
  );

  assert.equal(revoked, true);
  assert.deepEqual(calls, [
    ['stale-access', 'local'],
    ['refresh', 'refresh-1'],
    ['minted-access', 'local'],
  ]);
});

test('revokeSupabaseSession does nothing without credentials', async () => {
  const admin = {
    async signOut() {
      throw new Error('should not be called');
    },
  };
  const auth = {
    async refreshSession() {
      throw new Error('should not be called');
    },
  };

  assert.equal(await revokeSupabaseSession(makeReq(), { admin, auth }), false);
});

test('revokeSupabaseSession returns false when the refresh token is rejected', async () => {
  const admin = {
    async signOut() {
      throw new Error('should not be called');
    },
  };
  const auth = {
    async refreshSession() {
      return { data: { session: null }, error: { message: 'invalid' } };
    },
  };

  assert.equal(await revokeSupabaseSession(makeReq({ cookies: { nm_rt: 'dead' } }), { admin, auth }), false);
});
