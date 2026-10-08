import { createApp } from './app.js';
import { env } from './config/env.js';
import { expireStalePayments } from './services/payment.service.js';

const app = createApp();

// Abandoned-checkout sweeper: a dismissed Razorpay modal is released
// immediately via POST /payments/cancel, but a closed tab or lost connection
// leaves stock reserved. Every minute, fail payments still open past the window
// and give their stock back. Idempotent (the SQL claims rows atomically), so
// running it on a single instance is safe.
async function sweepStalePayments() {
  try {
    const result = await expireStalePayments(env.paymentExpiryMinutes);
    if (result?.expired_payments) {
      console.log(
        `[payments] expired ${result.expired_payments} stale payment(s), released ${result.expired_orders} order(s)`
      );
    }
  } catch (err) {
    console.error('[payments] stale-payment sweep failed:', err.message);
  }
}

app.listen(env.port, () => {
  console.log(`[server] NovaMarket API listening on http://localhost:${env.port}`);
  console.log(`[server] CORS allowed origin: ${env.clientOrigin}`);

  if (env.nodeEnv !== 'test') {
    sweepStalePayments();
    setInterval(sweepStalePayments, 60 * 1000).unref();
  }
});
