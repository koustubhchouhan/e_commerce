import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRODUCT_MARKUP_RATE,
  PRICE_MULTIPLIER,
  PLATFORM_FEE_RATE,
  customerPrice,
  basePriceFor,
  round2,
} from '../src/lib/pricing.js';

test('markup is 10% and the fee is its share of the marked-up price', () => {
  assert.equal(PRODUCT_MARKUP_RATE, 0.1);
  assert.equal(PRICE_MULTIPLIER, 1.1);
  assert.ok(Math.abs(PLATFORM_FEE_RATE - 1 / 11) < 1e-12);
});

test('customerPrice adds the platform markup to the seller base price', () => {
  assert.equal(customerPrice(100), 110);
  assert.equal(customerPrice(250), 275);
  assert.equal(customerPrice(99.99), 109.99);
});

test('basePriceFor inverts the markup for grandfathered listings', () => {
  assert.equal(basePriceFor(110), 100);
  assert.equal(basePriceFor(275), 250);
});

test('paying out the markup-inclusive gross returns the seller base price', () => {
  for (const base of [1, 19.99, 50, 80, 95, 100, 249.5, 999.99]) {
    const gross = customerPrice(base);
    const payout = round2(gross * (1 - PLATFORM_FEE_RATE));
    assert.equal(payout, round2(base), `base ${base} should net ${base}, got ${payout}`);
  }
});

test('the platform keeps exactly the 10% markup, never more', () => {
  const base = 100;
  const gross = customerPrice(base);
  const fee = round2(gross * PLATFORM_FEE_RATE);
  assert.equal(fee, round2(gross - base));
});
