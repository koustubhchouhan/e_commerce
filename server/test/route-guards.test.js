import './helpers/env.js';

import assert from 'node:assert/strict';
import test from 'node:test';

import healthRoutes from '../src/routes/health.routes.js';
import authRoutes from '../src/routes/auth.routes.js';
import catalogRoutes from '../src/routes/catalog.routes.js';
import sellerRoutes from '../src/routes/seller.routes.js';
import sellerApplicationsRoutes from '../src/routes/sellerApplications.routes.js';
import adminRoutes from '../src/routes/admin.routes.js';
import orderRoutes from '../src/routes/order.routes.js';
import contactRoutes from '../src/routes/contact.routes.js';

// Must mirror the app.use(...) mounts in src/app.js. If a router is mounted at
// a new prefix there, add it here so this audit keeps covering it.
const MOUNTS = [
  ['/health', healthRoutes],
  ['/auth', authRoutes],
  ['', catalogRoutes],
  ['', sellerRoutes],
  ['', sellerApplicationsRoutes],
  ['', adminRoutes],
  ['', orderRoutes],
  ['', contactRoutes],
];

// The only endpoints allowed to run without requireAuth. Anything else that
// loses its guard will fail the first test below. `optionalAuth` endpoints are
// intentionally public too — they just attach the caller when signed in.
const PUBLIC_ROUTES = new Set([
  'GET /health',
  'POST /auth/register',
  'POST /auth/login',
  'POST /auth/refresh',
  'POST /auth/logout',
  'POST /auth/oauth/session',
  'GET /categories',
  'GET /hero-slides',
  'GET /products',
  'GET /products/:id',
  'GET /products/:id/reviews',
  'POST /contact',
]);

function joinPath(prefix, routePath) {
  const joined = `${prefix}${routePath}`;
  return joined.length > 1 ? joined.replace(/\/+$/, '') : joined;
}

// Walks every mounted router and returns one row per (method, path) with the
// middleware chain flattened into names, plus the roles requireRole was given.
function inventory() {
  const rows = [];

  for (const [prefix, router] of MOUNTS) {
    for (const layer of router.stack) {
      const route = layer.route;
      if (!route) continue;

      const handlerNames = route.stack.map(
        (entry) => entry.handle?.name || entry.name || '<anonymous>'
      );
      const roleEntry = route.stack.find((entry) => Array.isArray(entry.handle?.roles));
      const path = joinPath(prefix, route.path);

      for (const method of Object.keys(route.methods)) {
        if (method === '_all') continue;
        rows.push({
          key: `${method.toUpperCase()} ${path}`,
          handlerNames,
          hasAuth: handlerNames.includes('requireAuth'),
          hasOptionalAuth: handlerNames.includes('optionalAuth'),
          roles: roleEntry?.handle.roles ?? null,
          authIndex: handlerNames.indexOf('requireAuth'),
          roleIndex: roleEntry ? route.stack.indexOf(roleEntry) : -1,
        });
      }
    }
  }

  return rows;
}

const rows = inventory();
const keys = new Set(rows.map((row) => row.key));

test('every route is either explicitly public or behind requireAuth', () => {
  for (const row of rows) {
    if (PUBLIC_ROUTES.has(row.key)) continue;
    assert.ok(
      row.hasAuth,
      `${row.key} is not in the public allow-list and has no requireAuth (${row.handlerNames.join(' | ')})`
    );
  }
});

test('the public allow-list matches the routers exactly', () => {
  for (const key of PUBLIC_ROUTES) {
    assert.ok(keys.has(key), `public allow-list entry "${key}" no longer exists`);
  }
  for (const row of rows) {
    if (row.hasOptionalAuth) {
      assert.ok(
        PUBLIC_ROUTES.has(row.key),
        `${row.key} uses optionalAuth but is not documented as public`
      );
    }
  }
});

test('no route mixes requireAuth and optionalAuth', () => {
  for (const row of rows) {
    assert.ok(
      !(row.hasAuth && row.hasOptionalAuth),
      `${row.key} uses both requireAuth and optionalAuth`
    );
  }
});

test('requireRole always runs after requireAuth', () => {
  for (const row of rows) {
    if (!row.roles) continue;
    assert.ok(row.hasAuth, `${row.key} uses requireRole without requireAuth`);
    assert.ok(
      row.roleIndex > row.authIndex,
      `${row.key} must apply requireAuth before requireRole`
    );
  }
});

test('role-gated routes declare at least one role', () => {
  for (const row of rows) {
    if (row.roles) {
      assert.ok(row.roles.length > 0, `${row.key} has an empty role list`);
    }
  }
});

test('/admin routes are restricted to the admin role', () => {
  for (const row of rows) {
    if (!row.key.includes(' /admin')) continue;
    assert.ok(row.roles?.includes('admin'), `${row.key} must require the admin role`);
  }
});

test('the inventory actually loaded the routers', () => {
  assert.ok(rows.length >= 40, `expected >= 40 routes, found ${rows.length}`);
});
