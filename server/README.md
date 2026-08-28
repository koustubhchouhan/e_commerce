# NovaMarket API (server)

Express REST API in front of Supabase (Postgres + Auth + Storage). React talks
only to this server; the server holds the Supabase **service_role** key and is
the single authorization layer. See `../BACKEND_PLAN.md` for the full design.

Currently implemented: **Milestone 1 (scaffold + health)** and **Milestone 2
(auth: register / login / refresh / me + role middleware)**.

## Prerequisites

- Node.js 20+
- A Supabase project (free tier is fine)

## 1. Create the database

In the Supabase dashboard, open **SQL Editor** and run, in order:

1. `db/schema.sql` — enums, tables, the `handle_new_user` trigger, indexes, and RLS.
2. `db/create_order.sql` — the atomic checkout function (used later at checkout).
3. `db/seed.sql` — a starter set of product categories.

All three are safe to re-run.

## 2. Configure the server

```bash
cd server
cp .env.example .env
```

Fill `.env` from **Project Settings → API** in Supabase:

| Variable                    | Where to find it            | Notes                                  |
| --------------------------- | --------------------------- | -------------------------------------- |
| `SUPABASE_URL`              | Project URL                 |                                        |
| `SUPABASE_ANON_KEY`         | Project API keys → `anon`   | public-ish, used for sign-in/refresh   |
| `SUPABASE_SERVICE_ROLE_KEY` | Project API keys → `service_role` | **SECRET** — never ship to the browser |

## 3. Install & run

```bash
npm install
npm run dev        # http://localhost:4000  (auto-restarts on change)
```

## 4. Smoke-test

```bash
# Health
curl http://localhost:4000/health

# Register (returns { user, session })
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"supersecret","fullName":"Test User"}'

# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"supersecret"}'

# Me (paste the accessToken from the login response)
curl http://localhost:4000/auth/me -H "Authorization: Bearer <accessToken>"
```

To make an account a **seller** or **admin** while there's no admin UI yet,
edit its role in Supabase: **Table Editor → profiles → role**.

## 5. Seed the dev role accounts

Roles now live on the account, so there is a single login form for everyone —
no role picker. To preview each dashboard without hand-editing the database:

```bash
npm run seed:users
```

This creates (or resets) three pre-confirmed accounts, all with the password
`password123`:

| Email                       | Role     |
| --------------------------- | -------- |
| `customer@novamarket.test`  | customer |
| `seller@novamarket.test`    | seller   |
| `admin@novamarket.test`     | admin    |

Safe to re-run — existing accounts get their password and role reset. The login
page shows **Dev quick login** buttons for these three, gated behind
`import.meta.env.DEV`, so Vite strips them from production builds.

**Dev only.** Never run this against a production project, and never ship these
credentials.

## Connecting the React app

The frontend client lives at `../src/lib/api.js`. Point it at this server by
adding to the **project root** `.env`:

```
VITE_API_URL=http://localhost:4000
```

Then restart `npm run dev` for the Vite app. The mock-auth screens are now wired
to the real API: `AuthContext` calls `api.login()` / `api.register()` / `api.me()`,
restores the session on refresh, and `userRole` comes from the server.

## Layout

```
server/
  db/                schema.sql, create_order.sql, seed.sql
  scripts/           seed-users.js (dev role accounts)
  src/
    config/          env.js (fail-fast), supabase.js (db + authClient)
    middleware/      auth.js, validate.js, error.js, asyncHandler.js
    controllers/     auth.controller.js
    routes/          auth.routes.js, health.routes.js
    validators/      auth.validators.js
    app.js           express app (cors, json, routes, error handling)
    index.js         listen()
```
