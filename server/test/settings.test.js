import './helpers/env.js';

import assert from 'node:assert/strict';
import test from 'node:test';

import { updateSettingsSchema } from '../src/validators/settings.validators.js';

test('settings accepts a delivery charge and threshold', () => {
  assert.equal(
    updateSettingsSchema.safeParse({ deliveryCharge: 29, freeDeliveryThreshold: 200 }).success,
    true
  );
});

test('settings accepts a single field', () => {
  assert.equal(updateSettingsSchema.safeParse({ deliveryCharge: 0 }).success, true);
  assert.equal(updateSettingsSchema.safeParse({ freeDeliveryThreshold: 0 }).success, true);
});

test('settings rejects an empty patch', () => {
  assert.equal(updateSettingsSchema.safeParse({}).success, false);
});

test('settings rejects negative or absurd amounts', () => {
  assert.equal(updateSettingsSchema.safeParse({ deliveryCharge: -1 }).success, false);
  assert.equal(updateSettingsSchema.safeParse({ freeDeliveryThreshold: -5 }).success, false);
  assert.equal(updateSettingsSchema.safeParse({ deliveryCharge: 5_000_000 }).success, false);
});
