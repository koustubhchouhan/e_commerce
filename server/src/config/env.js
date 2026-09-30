import 'dotenv/config';

// Fail fast if the server can't possibly work. Better a clear message at boot
// than a confusing 500 on the first request.
const REQUIRED = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`[env] Missing required variables: ${missing.join(', ')}`);
  console.error('[env] Copy server/.env.example to server/.env and fill in your Supabase keys.');
  process.exit(1);
}

// Razorpay is optional: without it the app still boots (local dev, tests) and
// the /payments routes answer 503 "Payments not configured". KEY_SECRET and
// WEBHOOK_SECRET are server-only; only keyId ever reaches the browser.
const razorpay = {
  keyId: process.env.RAZORPAY_KEY_ID || '',
  keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
};
const paymentsConfigured = Boolean(razorpay.keyId && razorpay.keySecret);

if ((process.env.NODE_ENV || 'development') !== 'test') {
  if (!paymentsConfigured) {
    console.warn('[env] Razorpay keys not set - /payments routes will return 503.');
  } else if (!razorpay.webhookSecret) {
    console.warn('[env] RAZORPAY_WEBHOOK_SECRET not set - the webhook endpoint will reject events.');
  }
}

// Express `trust proxy` setting. Off by default so a direct client cannot spoof
// its address via X-Forwarded-For. Set TRUST_PROXY=1 (the number of proxy hops)
// when the API runs behind a reverse proxy such as Render, so req.ip — and
// therefore rate limiting — reflects the real client.
const trustProxyRaw = process.env.TRUST_PROXY;
const trustProxy = trustProxyRaw === 'true' ? 1 : trustProxyRaw ? Number(trustProxyRaw) : false;

// Optional shared store for rate limiting. When set (redis:// or rediss://),
// limiter counters are kept in Redis so they are shared across instances and
// survive restarts. Left unset, limits are enforced per process — correct for
// the single-instance deployment, insufficient once the API scales out.
const redisUrl = process.env.REDIS_URL || '';

export const env = {
  port: Number(process.env.PORT) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  trustProxy,
  redisUrl,
  // Session cookie policy. `lax` is safe for same-site frontends (the common
  // case); set COOKIE_SAMESITE=none when the API is served from a different
  // site than the SPA (which also requires Secure, i.e. production + HTTPS).
  cookieSameSite: process.env.COOKIE_SAMESITE || 'lax',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  razorpay,
  paymentsConfigured,
};
