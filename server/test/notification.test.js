import './helpers/env.js';

import assert from 'node:assert/strict';
import test from 'node:test';

import { orderStatusCopy } from '../src/services/notification.service.js';
import { escapeHtml, sendMail } from '../src/lib/mailer.js';

const ORDER_ID = 'd3f1a2b4-0000-0000-0000-000000000000';
const REF = 'D3F1A2B4';

test('shipped copy names the order and mentions it is on the way', () => {
  const { subject, message } = orderStatusCopy('shipped', { orderId: ORDER_ID, storeName: 'Nova Store' });
  assert.match(subject, new RegExp(`#${REF}`));
  assert.match(subject, /shipped/i);
  assert.match(message, /on its way/i);
  assert.match(message, /Nova Store/);
});

test('delivered copy invites a review', () => {
  const { subject, message } = orderStatusCopy('delivered', { orderId: ORDER_ID });
  assert.match(subject, /delivered/i);
  assert.match(message, /review/i);
});

test('cancelled copy mentions a refund', () => {
  const { subject, message } = orderStatusCopy('cancelled', { orderId: ORDER_ID });
  assert.match(subject, /cancelled/i);
  assert.match(message, /refund/i);
});

test('an unexpected status still produces a usable subject', () => {
  const { subject, message } = orderStatusCopy('refunded', { orderId: ORDER_ID });
  assert.match(subject, new RegExp(`#${REF}`));
  assert.match(message, new RegExp(`#${REF}`));
});

test('escapeHtml neutralises markup characters', () => {
  assert.equal(
    escapeHtml('<script>"x" & \'y\'</script>'),
    '&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;'
  );
});

test('sendMail is a no-op when email is not configured', async () => {
  assert.equal(process.env.RESEND_API_KEY, undefined);
  const result = await sendMail({ to: 'buyer@example.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' });
  assert.deepEqual(result, { skipped: true });
});
