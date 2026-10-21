import './helpers/env.js';

import assert from 'node:assert/strict';
import test from 'node:test';

import { SELLER_MEMBERSHIP_WINDOW_MS } from '../src/services/membership.service.js';
import { updateSettingsSchema } from '../src/validators/settings.validators.js';
import { listApplicationsQuerySchema } from '../src/validators/seller.validators.js';

test('the membership payment window is exactly 24 hours', () => {
  assert.equal(SELLER_MEMBERSHIP_WINDOW_MS, 24 * 60 * 60 * 1000);
});

test('settings accepts a positive seller membership fee', () => {
  assert.equal(updateSettingsSchema.safeParse({ sellerMembershipFee: 500 }).success, true);
  assert.equal(updateSettingsSchema.safeParse({ sellerMembershipFee: 1 }).success, true);
});

test('settings rejects a zero, negative or absurd membership fee', () => {
  assert.equal(updateSettingsSchema.safeParse({ sellerMembershipFee: 0 }).success, false);
  assert.equal(updateSettingsSchema.safeParse({ sellerMembershipFee: -100 }).success, false);
  assert.equal(updateSettingsSchema.safeParse({ sellerMembershipFee: 5_000_000 }).success, false);
});

test('admin application filter accepts the awaiting-payment status', () => {
  assert.equal(listApplicationsQuerySchema.safeParse({ status: 'approved_pending_payment' }).success, true);
  assert.equal(listApplicationsQuerySchema.safeParse({ status: 'nonsense' }).success, false);
});
