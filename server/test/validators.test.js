import './helpers/env.js';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  registerSchema,
  loginSchema,
  refreshSchema,
  oauthSessionSchema,
  changePasswordSchema,
  changeEmailSchema,
} from '../src/validators/auth.validators.js';

test('register accepts a normal sign-up', () => {
  const result = registerSchema.safeParse({
    email: 'a@b.com',
    password: 'hunter2!',
    fullName: 'A',
  });
  assert.equal(result.success, true);
});

test('register rejects an over-long password', () => {
  const result = registerSchema.safeParse({ email: 'a@b.com', password: 'x'.repeat(73) });
  assert.equal(result.success, false);
});

test('register rejects an over-long email and a short password', () => {
  const longEmail = `${'a'.repeat(250)}@b.com`;
  assert.equal(registerSchema.safeParse({ email: longEmail, password: 'longenough' }).success, false);
  assert.equal(registerSchema.safeParse({ email: 'a@b.com', password: 'short' }).success, false);
});

test('login rejects an over-long password but accepts a short one', () => {
  assert.equal(loginSchema.safeParse({ email: 'a@b.com', password: 'x'.repeat(73) }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'a@b.com', password: 'ok' }).success, true);
});

test('refresh tolerates an empty body but bounds the token', () => {
  assert.equal(refreshSchema.safeParse(undefined).success, true);
  assert.equal(refreshSchema.safeParse({}).success, true);
  assert.equal(refreshSchema.safeParse({ refreshToken: 'abc' }).success, true);
  assert.equal(refreshSchema.safeParse({ refreshToken: 'x'.repeat(2049) }).success, false);
});

test('oauth session bounds its tokens and requires a known mode', () => {
  const base = { session: { access_token: 'a', refresh_token: 'b' }, mode: 'login' };
  assert.equal(oauthSessionSchema.safeParse(base).success, true);

  const hugeToken = { ...base, session: { access_token: 'a'.repeat(4097), refresh_token: 'b' } };
  assert.equal(oauthSessionSchema.safeParse(hugeToken).success, false);

  const badMode = { session: { access_token: 'a', refresh_token: 'b' }, mode: 'other' };
  assert.equal(oauthSessionSchema.safeParse(badMode).success, false);
});

test('change password bounds both fields', () => {
  assert.equal(changePasswordSchema.safeParse({ newPassword: 'abcdefgh' }).success, true);
  assert.equal(changePasswordSchema.safeParse({ currentPassword: 'oldpass1', newPassword: 'abcdefgh' }).success, true);
  assert.equal(changePasswordSchema.safeParse({ newPassword: 'x'.repeat(73) }).success, false);
  assert.equal(changePasswordSchema.safeParse({ newPassword: 'short' }).success, false);
});

test('change email rejects an invalid or over-long address', () => {
  assert.equal(changeEmailSchema.safeParse({ newEmail: 'not-an-email' }).success, false);
  assert.equal(changeEmailSchema.safeParse({ newEmail: `${'a'.repeat(250)}@b.com` }).success, false);
  assert.equal(changeEmailSchema.safeParse({ newEmail: 'a@b.com' }).success, true);
});
