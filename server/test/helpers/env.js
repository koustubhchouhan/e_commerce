// Deterministic Supabase config for the test suite, so route and middleware
// modules can be imported without a real project or a local server/.env.
//
// createClient() does not open a connection until a query runs, so these dummy
// values are never sent anywhere. They are set before anything else is
// imported (see the side-effect import at the top of each test file) because
// src/config/env.js exits the process when they are missing.
const DUMMY_ENV = {
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  NODE_ENV: 'test',
};

for (const [key, value] of Object.entries(DUMMY_ENV)) {
  if (!process.env[key]) process.env[key] = value;
}
