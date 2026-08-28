# NovaMarket — Backend Build Plan

**Architecture:** React SPA → **Node/Express REST API** → **Supabase** (Postgres + Auth + Storage)
**Status:** Plan for review. No application code has been changed yet.
**Date:** 2026-08-26

---

## 1. The shape of it

```
  Browser (React SPA)
        │   HTTPS + JWT (Bearer token)
        ▼
  Express API  ──────────────►  Supabase
   • all business logic          • Postgres (data)
   • authorization (roles)       • Auth (identity, passwords, sessions)
   • holds the SECRET key        • Storage (product images)
   • recomputes prices/totals
```

The React app **only ever talks to your Express API** — never to Supabase directly. Express holds the Supabase **service-role key** (which bypasses all database security) and is therefore the single place where "who is allowed to do what" is decided. Supabase is the managed engine underneath: it stores the data, handles password hashing and login sessions, and holds the uploaded images.

Two consequences worth internalizing up front:

- **The server is authoritative.** Prices, discounts, order totals, stock, and roles are read and enforced from the database on the server. Anything the browser sends (a price, a "I'm an admin" flag) is treated as untrusted input.
- **Row Level Security (RLS) is a safety net, not the main lock.** Because the API uses the service-role key, database-level RLS is bypassed. Enforcement lives in Express middleware. We still turn RLS on with a default-deny posture so that a leaked key can't read or write anything (defense-in-depth).

---

## 2. Technology choices

| Concern | Choice | Why |
|---|---|---|
| API framework | **Express** (plain) | Minimal, familiar, easy to host. NestJS is an option if you want more structure/DI later. |
| Language | JavaScript (ESM) or TypeScript | TS strongly recommended — the schema types pay off. Plan works either way. |
| Database | **Supabase Postgres** | Relational fits e-commerce; you get SQL, transactions, and functions. |
| Identity | **Supabase Auth**, proxied through Express | Supabase handles hashing, sessions, refresh tokens; we don't reinvent auth. |
| DB access | `@supabase/supabase-js` with the **service-role key** | Server-side only, bypasses RLS, full access. |
| Validation | **zod** | Validate every request body/query before it touches the DB. |
| Image storage | **Supabase Storage** bucket | Upload via server, store public URLs on the product. |
| Hosting (later) | Render / Railway / Fly.io (API), Supabase (managed) | Any Node host works; keep the service key in server env only. |

### Auth model (important decision, flagged for you)

The recommended approach uses **Supabase Auth for identity** but keeps the browser talking only to Express:

1. Client posts credentials to `POST /auth/login`.
2. Express calls Supabase Auth server-side (`signInWithPassword`) and gets back a session (access token + refresh token).
3. Express returns those tokens to the client.
4. On every later request, the client sends the access token; Express verifies it (`supabase.auth.getUser(token)`) and looks up the user's role from `profiles`.

This gives you real password security and session management for free, while Express still owns all authorization. *Alternative:* roll your own auth (bcrypt + your own JWT) and use Supabase purely as a database. More code, more risk — only worth it if you have a specific reason. **This plan assumes the recommended Supabase-Auth approach; tell me if you'd rather roll your own.**

---

## 3. Data model

Entities and how they relate:

- **profiles** — one row per user, extends Supabase's `auth.users`. Holds `role` (customer / seller / admin).
- **stores** — a seller's storefront (one per seller). Products belong to a store.
- **seller_applications** — a customer's request to become a seller (pending → approved/rejected). Approval flips their role to `seller` and creates their store.
- **categories** — product categories.
- **products** — owned by a store; has price, discount %, stock, status, category.
- **product_images** — many images per product, one flagged as cover (matches your Add-Product modal).
- **orders** + **order_items** — an order has many items; each item snapshots the name/price/discount at purchase time so later product edits don't rewrite history.
- **reviews** *(optional)* — one review per user per product.

```
auth.users ─1:1─ profiles ─1:1─ stores ─1:N─ products ─1:N─ product_images
                    │                              │
                    │ 1:N                          │ N:1
                    ▼                              ▼
             seller_applications              categories
                    │
profiles ─1:N─ orders ─1:N─ order_items ─N:1─ products
```

### 3.1 SQL — run this in the Supabase SQL Editor

> Paste as one script. It's idempotent-friendly enough to read top-to-bottom; run once on a fresh project.

```sql
-- ─── Enums ───────────────────────────────────────────────
create type user_role         as enum ('customer','seller','admin');
create type application_status as enum ('pending','approved','rejected');
create type product_status     as enum ('active','draft','out_of_stock');
create type order_status       as enum ('pending','paid','shipped','delivered','cancelled');

-- ─── profiles (extends auth.users) ───────────────────────
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null default '',
  avatar_url text,
  role       user_role not null default 'customer',
  created_at timestamptz not null default now()
);

-- Auto-create a profile whenever a new auth user is created
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'customer');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- reusable updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ─── stores ──────────────────────────────────────────────
create table public.stores (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  unique (owner_id)   -- one store per seller (drop if you want multi-store)
);

-- ─── seller_applications ─────────────────────────────────
create table public.seller_applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  store_name    text not null,
  contact_email text not null,
  status        application_status not null default 'pending',
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid references public.profiles(id)
);
create index on public.seller_applications (status);
create index on public.seller_applications (user_id);

-- ─── categories ──────────────────────────────────────────
create table public.categories (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

-- ─── products ────────────────────────────────────────────
create table public.products (
  id               uuid primary key default gen_random_uuid(),
  store_id         uuid not null references public.stores(id) on delete cascade,
  category_id      uuid references public.categories(id) on delete set null,
  name             text not null,
  description      text,
  price            numeric(10,2) not null check (price >= 0),
  discount_percent int not null default 0 check (discount_percent between 0 and 100),
  stock            int not null default 0 check (stock >= 0),
  status           product_status not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.products (store_id);
create index on public.products (category_id);
create index on public.products (status);
create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ─── product_images ──────────────────────────────────────
create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url        text not null,
  position   int not null default 0,
  is_cover   boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.product_images (product_id);

-- ─── orders ──────────────────────────────────────────────
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete restrict,
  status           order_status not null default 'pending',
  subtotal         numeric(12,2) not null default 0,
  total            numeric(12,2) not null default 0,
  shipping_address jsonb,
  created_at       timestamptz not null default now()
);
create index on public.orders (user_id);

-- ─── order_items (price snapshotted at purchase) ─────────
create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  product_id       uuid references public.products(id) on delete set null,
  product_name     text not null,
  unit_price       numeric(10,2) not null,
  discount_percent int not null default 0,
  quantity         int not null check (quantity > 0),
  line_total       numeric(12,2) not null
);
create index on public.order_items (order_id);

-- ─── reviews (optional) ──────────────────────────────────
create table public.reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  rating     int not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
```

### 3.2 Atomic checkout function

Stock decrement + order creation must be **one transaction** or you'll oversell under load. `supabase-js` can't run multi-statement transactions from the client, so we do it in a Postgres function and call it via RPC. The row is locked with `for update` while we check stock.

```sql
create or replace function public.create_order(
  p_user_id  uuid,
  p_items    jsonb,   -- [{ "product_id": "uuid", "quantity": 2 }, ...]
  p_shipping jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_item     jsonb;
  v_product  public.products;
  v_qty      int;
  v_line     numeric(12,2);
  v_subtotal numeric(12,2) := 0;
begin
  insert into public.orders (user_id, status, shipping_address)
  values (p_user_id, 'pending', p_shipping)
  returning id into v_order_id;

  for v_item in select jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 then raise exception 'Bad quantity'; end if;

    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid
      for update;                          -- lock the row
    if not found then raise exception 'Product % not found', v_item->>'product_id'; end if;
    if v_product.stock < v_qty then raise exception 'Insufficient stock for %', v_product.name; end if;

    v_line := round(v_product.price * (1 - v_product.discount_percent / 100.0) * v_qty, 2);
    v_subtotal := v_subtotal + v_line;

    insert into public.order_items
      (order_id, product_id, product_name, unit_price, discount_percent, quantity, line_total)
    values
      (v_order_id, v_product.id, v_product.name, v_product.price, v_product.discount_percent, v_qty, v_line);

    update public.products set stock = stock - v_qty where id = v_product.id;
  end loop;

  update public.orders set subtotal = v_subtotal, total = v_subtotal where id = v_order_id;
  return v_order_id;
end; $$;
```

*(Total = subtotal for now; add shipping/tax here later.)*

### 3.3 Row Level Security (turn on, deny by default)

```sql
alter table public.profiles            enable row level security;
alter table public.stores              enable row level security;
alter table public.seller_applications enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.product_images      enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.reviews             enable row level security;
```

We add **no** policies for the `anon`/`authenticated` roles, so those roles can do nothing. The Express API uses the **service-role** key, which bypasses RLS entirely — that's expected. Enforcement is in the API. This block just guarantees that if the anon key ever leaks, it exposes zero data.

### 3.4 Storage

Create a bucket named **`product-images`**, marked **public** (so image URLs load in the browser). Uploads happen **only through Express** using the service key; the browser never writes to Storage. Product image URLs are saved in `product_images.url`.

---

## 4. The Express API

### 4.1 Project structure

Keep the server in its own folder (a sibling of the React app, or a `server/` subfolder — your call). It deploys and runs separately from the frontend.

```
server/
  src/
    config/
      env.js                 # load + validate env vars once
      supabase.js            # service-role client (DB) + anon client (auth)
    middleware/
      auth.js                # requireAuth, requireRole(...)
      validate.js            # zod body/query validation wrapper
      error.js               # central error handler
    routes/
      auth.routes.js
      products.routes.js
      categories.routes.js
      sellerApplications.routes.js
      admin.routes.js
      orders.routes.js
    controllers/             # request → service → response
    services/                # DB calls + business logic (talk to Supabase here)
    validators/              # zod schemas per resource
    app.js                   # express app: cors, json, mount routes, error handler
    index.js                 # start listening
  .env                       # secrets (gitignored)
  package.json
```

Rule of thumb: **routes** wire URLs, **controllers** handle HTTP in/out, **services** hold the actual Supabase queries and business rules. This keeps authorization and logic testable and out of the route files.

### 4.2 Environment variables (server-side only)

```bash
PORT=4000
CLIENT_ORIGIN=http://localhost:5173          # your Vite dev origin, for CORS
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...             # SECRET — full DB access, never ship to browser
SUPABASE_ANON_KEY=eyJ...                     # used only to run auth sign-in/refresh
```

> ⚠️ The service-role key must **never** appear in the React app or any `VITE_`-prefixed variable — those are bundled into the browser and are public. Only `VITE_API_URL` (pointing at Express) belongs on the frontend.

### 4.3 Supabase clients

```js
// config/supabase.js
import { createClient } from '@supabase/supabase-js';

// DB + storage + admin: full access, bypasses RLS. Server only.
export const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Used only to exchange credentials for a session (login/refresh).
export const authClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

### 4.4 Auth middleware

```js
// middleware/auth.js
import { db } from '../config/supabase.js';

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const { data, error } = await db.auth.getUser(token);   // verifies the JWT
  if (error || !data?.user) return res.status(401).json({ error: 'Invalid token' });

  const { data: profile } = await db
    .from('profiles').select('id, role, full_name').eq('id', data.user.id).single();

  req.user = { id: data.user.id, email: data.user.email, role: profile?.role ?? 'customer' };
  next();
}

// requireRole('admin') or requireRole('seller','admin')
export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ error: 'Forbidden' });
```

### 4.5 Auth flow (how login works end-to-end)

Because the browser never touches Supabase, Express proxies the three auth actions:

- **Register** — `db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })`. The `handle_new_user` trigger creates the matching `profiles` row with role `customer`.
- **Login** — `authClient.auth.signInWithPassword({ email, password })` returns a session; Express hands the `access_token` + `refresh_token` back to the client.
- **Refresh** — `authClient.auth.refreshSession({ refresh_token })` when the access token expires.

The client stores the access token (in memory, with the refresh token persisted) and sends `Authorization: Bearer <access_token>` on every request. `requireAuth` verifies it and attaches `req.user` with the DB-backed role — so a client can never claim a role it doesn't have.

---

## 5. Endpoint spec

`Auth` column: **—** public · **✓** any logged-in user · **seller/admin** role-gated. All bodies and responses are JSON.

### Auth

| Method | Path | Auth | Body → Response |
|---|---|---|---|
| POST | `/auth/register` | — | `{ email, password, full_name }` → `201 { user }` |
| POST | `/auth/login` | — | `{ email, password }` → `{ access_token, refresh_token, user }` |
| POST | `/auth/refresh` | — | `{ refresh_token }` → `{ access_token, refresh_token }` |
| GET | `/auth/me` | ✓ | → `{ id, email, role, full_name }` |

### Categories & Products

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/categories` | — | → `[{ id, name, slug }]` |
| GET | `/products` | — | Query: `search`, `category` (slug), `page`, `limit`. → `{ items, page, limit, total }`. Each item includes cover image + sale price. |
| GET | `/products/:id` | — | → full product with `images[]` and store name. `404` if missing. |
| GET | `/seller/products` | seller | The caller's own products (for the inventory page). |
| POST | `/products` | seller | `{ name, description, price, discount_percent, stock, status, category_id }` → `201 { product }`. Attached to the caller's store. |
| PATCH | `/products/:id` | seller (owner) | Partial update. `403` if not the owner. |
| DELETE | `/products/:id` | seller (owner) | → `204`. |
| POST | `/products/:id/images` | seller (owner) | `multipart/form-data` files → uploads to Storage, inserts `product_images`, → `{ images }`. |

### Seller applications & admin

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/seller-applications` | ✓ (customer) | `{ store_name, contact_email }` → `201`. One pending per user. |
| GET | `/seller-applications/me` | ✓ | The caller's own application status. |
| GET | `/admin/seller-applications` | admin | Query `status` (default `pending`). → list. |
| PATCH | `/admin/seller-applications/:id` | admin | `{ action: "approve" \| "reject" }`. **Approve** = set status `approved`, flip `profiles.role` → `seller`, create the `stores` row. **Reject** = set status `rejected`. |
| GET | `/admin/sellers` | admin | Approved sellers (profile + store). |
| DELETE | `/admin/sellers/:id` | admin | Revoke: role back to `customer` (optionally set the store's products to `draft`). → `204`. |

### Orders

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/orders` | ✓ (customer) | `{ items: [{ product_id, quantity }], shipping_address }` → `201 { order_id, total }`. Calls `create_order` RPC. |
| GET | `/orders` | ✓ | The caller's orders. |
| GET | `/orders/:id` | ✓ (owner or admin) | Order + items. `403` otherwise. |

### 5.1 Server-authoritative checkout (the part that matters most)

The client sends only **product ids and quantities** — never prices. Express calls the `create_order` function, which reads the real price/discount from the DB, checks stock under a row lock, snapshots each line, and decrements stock atomically:

```js
// controllers/orders.controller.js
import { db } from '../config/supabase.js';

export async function createOrder(req, res, next) {
  try {
    const { items, shipping_address } = req.body;   // validated by zod first
    const { data, error } = await db.rpc('create_order', {
      p_user_id: req.user.id,
      p_items: items,                 // [{ product_id, quantity }]
      p_shipping: shipping_address ?? null,
    });
    if (error) return res.status(400).json({ error: error.message }); // e.g. "Insufficient stock for …"
    const order_id = data;
    const { data: order } = await db.from('orders').select('id,total').eq('id', order_id).single();
    res.status(201).json({ order_id, total: order.total });
  } catch (e) { next(e); }
}
```

Notice there is **no price in the request** and no way for the client to influence the total. Same principle applies to product ownership: seller mutations first load the product, join to `stores`, and confirm `stores.owner_id === req.user.id` before writing.

---

## 6. Cross-cutting conventions

- **Validation:** every route validates its body/query with a zod schema before touching the DB; failures return `400 { error, details }`.
- **Errors:** one central error handler; consistent shape `{ error: string }` (plus `details` when useful). Never leak stack traces or raw Postgres errors to the client in production.
- **CORS:** allow only `CLIENT_ORIGIN`. Auth is via Bearer tokens (not cookies), so no credentials/cookie config needed.
- **Pagination:** list endpoints take `page` (1-based) and `limit` (default 20, cap ~100) and return `total` for the UI.
- **Money:** store and compute in `numeric`; never use floats for prices. The server is the only place totals are computed.
- **Ownership & roles:** enforced in middleware/services, not trusted from the client.

---

## 7. How the React app changes

The frontend keeps its structure; we swap data sources. New file: `src/lib/api.js` — a small `fetch` wrapper that reads `VITE_API_URL`, attaches the Bearer token, and throws on non-2xx.

| Area | Today (mock) | After |
|---|---|---|
| Auth | `AuthContext` sets a role from a login tab, stored in localStorage | `POST /auth/login` → store tokens; `GET /auth/me` for role; `ProtectedRoute` reads the real role |
| Product list | hardcoded `export const products` in `Home.jsx` | `GET /products` in a loader/effect; **`SearchResults` and `AdminPanel` also import that array today — both must switch to fetching** |
| Product detail | looks up the hardcoded array by `:id` | `GET /products/:id` |
| Seller inventory | in-memory `useState` list; Add-Product modal is local-only | list `GET /seller/products`; Add → `POST /products` then `POST /products/:id/images`; delete → `DELETE /products/:id` |
| Admin seller mgmt | `INITIAL_REQUESTS` / `INITIAL_APPROVED` in `useState` | requests `GET /admin/seller-applications`; approve/reject `PATCH`; approved `GET /admin/sellers`; revoke `DELETE` |
| Cart | Zustand + localStorage | **unchanged** — stays client-side |
| Checkout | local only | `POST /orders` with `{ items, shipping_address }`; `OrderConfirmation` uses the returned `order_id`/`total` |

The one refactor to plan for: `Home.jsx` currently *exports* the product array that other pages import. Replacing it with a fetch means those consumers (`SearchResults`, `AdminPanel`) need their own fetch or a shared data hook.

---

## 8. Supabase setup checklist (do this once, in the dashboard)

1. **Create a project** at supabase.com. From **Settings → API**, copy the **Project URL**, **anon key**, and **service_role key**.
2. **SQL Editor** → paste and run, in order: the schema (§3.1), the `create_order` function (§3.2), the RLS block (§3.3).
3. **Storage** → **New bucket** named `product-images`, toggle **Public**.
4. **Seed data (optional):** insert a few `categories`; create your own user via **Authentication → Add user**, then in SQL run `update public.profiles set role = 'admin' where id = 'YOUR_UUID';` to make yourself admin.
5. Put the three keys into the server's `.env` (§4.2). Confirm the service_role key is **only** there — never in the React app.

---

## 9. Build sequence (suggested milestones)

Each milestone is independently testable and unblocks frontend wiring as you go.

1. **Scaffold** — Express app, `db`/`authClient`, env loading, CORS, a `GET /health` route. Confirm it runs.
2. **Auth** — register / login / refresh / me + `requireAuth`/`requireRole`. Wire the React login and `ProtectedRoute`. *(Unblocks everything role-gated.)*
3. **Catalog reads** — `GET /categories`, `GET /products`, `GET /products/:id`. Wire `Home`, `ProductDetails`, `SearchResults`.
4. **Seller onboarding** — seller applications + admin approve/reject/revoke (role flip + store creation). Wire `AdminProfile`.
5. **Product writes** — create/update/delete + image upload to Storage. Wire the `SellerInventory` modal.
6. **Orders** — `create_order` RPC + order reads. Wire `Cart` → `Checkout` → `OrderConfirmation`.
7. **Polish** — pagination, reviews, loading/error states, then deploy (API to Render/Railway/Fly, frontend to Vercel/Netlify, `VITE_API_URL` pointed at the deployed API).

---

## 10. Open decisions for you

- **Auth ownership:** use Supabase Auth (recommended, assumed here) or roll your own in Express?
- **One store per seller** (current schema) or allow multiple?
- **Cart:** keep client-side (recommended for now) or persist server-side?
- **Payments:** out of scope here — when you're ready, Stripe slots in at the `POST /orders` step (create order as `pending`, mark `paid` on webhook).

None of these block starting on milestones 1–2. Tell me your answers (and whether you want TypeScript), and I can scaffold the Express project and the `src/lib/api.js` client next.

