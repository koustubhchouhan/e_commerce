import './helpers/env.js';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  expectedPaymentSignature,
  expectedWebhookSignature,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../src/services/payment.service.js';

const KEY_SECRET = 'test_key_secret';
const WEBHOOK_SECRET = 'test_webhook_secret';
const ORDER_ID = 'order_ABC123';
const PAYMENT_ID = 'pay_XYZ789';

test('a correctly signed payment is accepted', () => {
  const signature = expectedPaymentSignature(ORDER_ID, PAYMENT_ID, KEY_SECRET);
  assert.equal(verifyPaymentSignature(ORDER_ID, PAYMENT_ID, signature, KEY_SECRET), true);
});

test('a tampered payment signature is rejected', () => {
  const signature = expectedPaymentSignature(ORDER_ID, PAYMENT_ID, KEY_SECRET);
  const tampered = `${signature.slice(0, -1)}${signature.endsWith('a') ? 'b' : 'a'}`;
  assert.equal(verifyPaymentSignature(ORDER_ID, PAYMENT_ID, tampered, KEY_SECRET), false);
});

test('a signature from a different secret is rejected', () => {
  const signature = expectedPaymentSignature(ORDER_ID, PAYMENT_ID, 'other_secret');
  assert.equal(verifyPaymentSignature(ORDER_ID, PAYMENT_ID, signature, KEY_SECRET), false);
});

test('paying a different order does not validate', () => {
  const signature = expectedPaymentSignature(ORDER_ID, PAYMENT_ID, KEY_SECRET);
  assert.equal(verifyPaymentSignature('order_OTHER', PAYMENT_ID, signature, KEY_SECRET), false);
});

test('a correctly signed webhook body is accepted', () => {
  const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
  const signature = expectedWebhookSignature(body, WEBHOOK_SECRET);
  assert.equal(verifyWebhookSignature(body, signature, WEBHOOK_SECRET), true);
});

test('a modified webhook body is rejected', () => {
  const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
  const signature = expectedWebhookSignature(body, WEBHOOK_SECRET);
  const tamperedBody = Buffer.from(JSON.stringify({ event: 'payment.failed' }));
  assert.equal(verifyWebhookSignature(tamperedBody, signature, WEBHOOK_SECRET), false);
});

test('missing inputs and length mismatches return false without throwing', () => {
  assert.equal(verifyPaymentSignature(ORDER_ID, PAYMENT_ID, undefined, KEY_SECRET), false);
  assert.equal(verifyPaymentSignature(ORDER_ID, PAYMENT_ID, 'short', KEY_SECRET), false);
  assert.equal(verifyWebhookSignature(Buffer.from('{}'), null, WEBHOOK_SECRET), false);
  assert.equal(verifyWebhookSignature(null, 'sig', WEBHOOK_SECRET), false);
});

test('with no configured secret nothing validates', () => {
  assert.equal(verifyPaymentSignature(ORDER_ID, PAYMENT_ID, 'anything', ''), false);
  assert.equal(verifyWebhookSignature(Buffer.from('{}'), 'anything', ''), false);
});
