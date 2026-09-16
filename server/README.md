# NovaMarket API (`server`)

Express REST API in front of Supabase (Postgres + Auth + Storage). The React
SPA talks only to this server; the server holds the Supabase **service_role**
key and is the single authorization layer.

For the complete local setup, environment reference, deployment and production
security checklist, see the repository root `README.md`. This file is the
backend/API reference.

## Prerequisites

- Node.js 20+
- A Supabase project (free tier is fine)

## Database setup

In the Supabase dashboard, open **SQL Editor** and run one of:

- **Fresh project:** paste all of `db/setup_all.sql` and Run. It combines
  `schema.sql`, `create_order.sql` and `seed.sql` in order.
- **Step by step:** run `db/schema.sql`, then `db/create_order.sql`, then
  `db/seed.sql`.

All of it is safe to re-run.

Then create a **public Storage bucket** named `product-images`
(**Storage -> New bucket**). The API uploads product images, avatars and hero
slides into this bucket with the service_role key; the browser only reads the
resulting public URLs.

If Supabase ever reports a stale schema cache after a schema change:

```sql
notify pgrst, 'reload schema';
```

## Configuration

```bash
cd server
cp .env.example .env
```

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `PORT` | No | `4000` | API listen port. |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | Exact origin allowed by CORS. Set the SPA origin in production. |
| `NODE_ENV` | No | `development` | `production` makes session cookies `Secure`. |
| `COOKIE_SAMESITE` | No | `lax` | `lax` when the SPA and API share a site; `none` only for a genuinely cross-site API over HTTPS. |
| `COOKIE_DOMAIN` | No | unset | Optional cookie parent domain, for example `.example.com`. |
| `SUPABASE_URL` | **Yes** | — | Project URL. |
| `SUPABASE_ANON_KEY` | **Yes** | — | Used only for auth sign-in / token refresh. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | — | Full database access, bypasses RLS. Server only, never shipped to the browser. |

The server exits at boot with a clear message if any required variable is
missing.

## Install and run

```bash
npm install
npm run dev
```

The API listens on http://localhost:4000 and restarts on change (`node
--watch`). `npm start` runs it once for production.

## Development accounts

```bash
npm run seed:users
```

Creates or resets three pre-confirmed accounts, all with the password
`password123`:

| Email | Role |
| --- | --- |
| `customer@novamarket.test` | customer |
| `seller@novamarket.test` | seller |
| `admin@novamarket.test` | admin |

**Dev only.** Never run this against a production project, and never ship these
credentials.

## Authentication model

- **Session cookies.** Login, register and OAuth return `Set-Cookie` headers for
  three cookies, all with `Path=/`:
  - `nm_at` — access token, **HttpOnly**, 1 hour.
  - `nm_rt` — refresh token, **HttpOnly**, 30 days.
  - `nm_csrf` — CSRF token, readable by JavaScript, 30 days.
  JavaScript can never read the access or refresh token.
- **CSRF (double submit).** Cookie-authenticated requests that mutate state
  (`POST`/`PATCH`/`PUT`/`DELETE`) must send an `X-CSRF-Token` header equal to
  the `nm_csrf` cookie. Requests authenticated with a `Bearer` header are
  exempt, because a browser never attaches that header automatically.
- **Bearer fallback.** `Authorization: Bearer <accessToken>` is still accepted
  so non-browser API clients keep working. The server prefers the cookie when
  both are present.
- **Roles.** The role always comes from the server's own `profiles` table,
  never from the client. `requireRole('seller', 'admin')` gates a route after
  `requireAuth`.
- **Refresh.** `POST /auth/refresh` reads the refresh token from the cookie
  (body fallback for API clients) and rotates the session cookies, preserving
  the existing CSRF token. The SPA retries a request once after a silent
  refresh on `401`.

### Google OAuth

`POST /auth/oauth/session` accepts a Supabase session obtained by the browser
via the Google provider (PKCE). With `mode: "login"` the account must already
exist; with `mode: "signup"` the identity must be brand new. Signing up as
`seller` files a pending seller application (an admin still has to approve it).
Google-only accounts have no password until they set one via
`POST /auth/password`.

## API endpoints

All responses are JSON. Errors use `{ "error": "message", "details": ... }`.

### Health

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/health` | — | `{ status, service, time }`. |

### Auth

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | `{ email, password, fullName?, role? }` where `role` is `customer` or `seller`. Creates the auth user, files a pending seller application if `role=seller`, sets cookies. `201`. |
| POST | `/auth/login` | — | `{ email, password }`. Sets cookies. |
| POST | `/auth/refresh` | — | Rotates cookies from the refresh cookie (or body `refreshToken`). |
| POST | `/auth/logout` | — | Clears the session cookies. |
| POST | `/auth/oauth/session` | — | `{ session: { access_token, refresh_token, expires_at? }, mode: "login" \| "signup", role? }`. |
| GET | `/auth/me` | ✓ | The caller's profile-shaped user. |
| PATCH | `/auth/profile` | ✓ | `{ fullName?, phone?, avatarUrl?, shippingAddress? }`. |
| POST | `/auth/profile/avatar` | ✓ | `multipart/form-data`, field `avatar`. Replaces and cleans up the previous avatar. |
| POST | `/auth/password` | ✓ | `{ currentPassword?, newPassword }`. Google-only accounts may omit `currentPassword`. |
| POST | `/auth/email` | ✓ | `{ newEmail }`. |

### Categories, products and reviews (public reads)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/categories` | — | `[{ id, name, slug }]`. |
| GET | `/hero-slides` | — | Active homepage slides ordered by `position`, then `created_at`. Returns `[]` when all are hidden. |
| GET | `/products` | — | Query `search`, `category` (slug), `page`, `limit`. Returns `{ items, page, limit, total }`; each item has `coverImage` + `salePrice`. |
| GET | `/products/:id` | — | Full product with `images[]` and `storeName`. |
| GET | `/products/:id/reviews` | — | Visible reviews plus seller replies. |
| GET | `/products/:id/reviews/eligibility` | ✓ | Whether the caller (a verified buyer) may review. |
| POST | `/products/:id/reviews` | ✓ | `{ rating, comment? }`. Verified buyers only; one review per user per product. `201`. |

### Seller products and orders

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/seller/products` | seller/admin | The caller's own products. |
| POST | `/products` | seller/admin | `{ name, description, price, discount_percent, stock, status, category_id }` → `201`. |
| PATCH | `/products/:id` | seller/admin (owner) | Partial update. `403` if not the owner. |
| DELETE | `/products/:id` | seller/admin (owner) | `204`. Also removes stored images. |
| POST | `/products/:id/images` | seller/admin (owner) | `multipart/form-data`, field `images` (up to 8, 5 MB each). Inserts `product_images`. |
| GET | `/seller/orders` | seller/admin | Orders containing the caller's products. |
| PATCH | `/seller/orders/:id/status` | seller/admin | `{ status }` where status is `shipped`, `delivered` or `cancelled`. The service enforces the transition. |

### Store and store reviews

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/seller/store` | seller/admin | The caller's store. |
| PATCH | `/seller/store` | seller/admin | Update store details. |
| GET | `/seller/reviews` | seller/admin | Reviews for the caller's store's products. |
| PATCH | `/seller/reviews/:id/reply` | seller/admin (owner) | `{ reply }`. Sets `seller_reply` + `seller_replied_at`. |

### Orders

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/orders` | ✓ | `{ items: [{ product_id, quantity }], shipping_address? }` → `201 { order_id, total }`. Prices are computed server-side inside `create_order`; mixed-store carts are rejected. |
| GET | `/orders` | ✓ | The caller's orders with line items. |
| GET | `/orders/:id` | ✓ (owner/admin) | One order with items. |
| PATCH | `/orders/:id/cancel` | ✓ (owner/admin) | Cancel the caller's order. |

Order status values: `pending`, `paid`, `shipped`, `delivered`, `cancelled`.
Allowed transitions are `pending -> shipped`, `paid -> shipped`,
`shipped -> delivered`, and `cancelled` from `pending`/`paid`. Only `shipped`,
`delivered` and `cancelled` are accepted by the status endpoints; the `paid`
state is reserved for a future payment-gateway webhook and nothing in the API
sets it.

### Seller applications

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/seller-applications` | customer | `{ store_name, contact_email }` → `201`. One pending/approved application per user. |
| GET | `/seller-applications/me` | ✓ | The caller's applications, newest first. |

### Contact messages

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/contact` | optional | `{ first_name, last_name, email, subject, message, store_id?, product_id? }`. Links to the account when signed in; `store_id`/`product_id` route it to that seller's inbox. |
| GET | `/contact-messages/mine` | ✓ | The caller's own messages plus replies. |
| GET | `/seller/contact-messages` | seller/admin | Messages about the seller's store/products. |
| PATCH | `/seller/contact-messages/:id` | seller/admin | `{ is_read }`. |
| POST | `/seller/contact-messages/:id/reply` | seller/admin | `{ reply }`. |
| GET | `/admin/contact-messages` | admin | All messages. |
| PATCH | `/admin/contact-messages/:id` | admin | `{ is_read }`. |
| POST | `/admin/contact-messages/:id/reply` | admin | `{ reply }`. |
| DELETE | `/admin/contact-messages/:id` | admin | Delete. |

### Admin

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/admin/seller-applications` | admin | Query `status` (`pending`/`approved`/`rejected`). |
| PATCH | `/admin/seller-applications/:id` | admin | `{ action: "approve" \| "reject" }`. Approve flips the role and creates the store. |
| GET | `/admin/sellers` | admin | Approved sellers and their store. |
| DELETE | `/admin/sellers/:id` | admin | Revoke: demote to customer and draft their products. |
| GET | `/admin/orders` | admin | All orders. |
| PATCH | `/admin/orders/:id/status` | admin | `{ status }` where status is `shipped`, `delivered` or `cancelled`. |
| GET | `/admin/categories` | admin | All categories. |
| POST | `/admin/categories` | admin | `{ name }` (the slug is derived). |
| DELETE | `/admin/categories/:id` | admin | Delete a category. |
| DELETE | `/admin/products/:id` | admin | Delete any product. |
| GET | `/admin/ledger` | admin | Platform ledger / order totals. |
| GET | `/admin/reviews` | admin | All reviews, including hidden. |
| PATCH | `/admin/reviews/:id` | admin | `{ is_hidden }` — moderation visibility. |
| DELETE | `/admin/reviews/:id` | admin | Delete a review. |
| GET | `/admin/hero-slides` | admin | All slides, including inactive. |
| POST | `/admin/hero-slides` | admin | `{ title, imageUrl, eyebrow?, description?, buttonLabel?, buttonLink?, theme?: "orange"\|"gold", position?, isActive? }`. |
| POST | `/admin/hero-slides/image` | admin | `multipart/form-data`, field `image`. Returns the uploaded URL. |
| PATCH | `/admin/hero-slides/:id` | admin | Partial update (fields optional; existing values are preserved). |
| DELETE | `/admin/hero-slides/:id` | admin | Delete a slide. |

## Data model

`profiles`, `stores`, `seller_applications`, `categories`, `products`,
`product_images`, `orders`, `order_items`, `reviews`, `contact_messages`,
`hero_slides`. Full column definitions are in `db/schema.sql`.

- `handle_new_user` (trigger on `auth.users`) creates the matching `profiles`
  row with the default `customer` role.
- Admins can sell without applying as a seller: the first time an admin uses a
  product or store endpoint, an official store (`stores.is_official = true`) is
  created for them lazily. Official-store sales are excluded from seller payouts
  in the admin ledger.
- `create_order` (in `db/create_order.sql`) is the atomic checkout: it locks
  product rows `FOR UPDATE`, computes prices from `products`, enforces stock and
  single-store carts, and writes the order and items in one transaction.
- Row Level Security is enabled with **no policies** on every table. The API's
  service_role key bypasses RLS, so this only blocks direct access with the
  anon/authenticated keys — defense in depth.

## Layout

```
server/
  db/                schema.sql, create_order.sql, seed.sql, setup_all.sql
  scripts/           seed-users.js (dev role accounts)
  src/
    config/          env.js (fail-fast), supabase.js (db + authClient)
    middleware/      auth.js (requireAuth/requireRole/optionalAuth + CSRF), validate.js, error.js, asyncHandler.js
    services/        catalog, product, seller, admin, order, contact, review, hero, storage, session-cookies, product-data
    controllers/     auth, catalog, product, seller, admin, order, contact, review, hero
    routes/          health, auth, catalog, seller, sellerApplications, admin, order, contact
    validators/      auth, catalog, product, seller, order, contact, hero
    app.js           express app (helmet, cors, cookies, json, routes, error handling)
    index.js         listen()
```

`routes/` wires URLs, `controllers/` handles HTTP, `services/` holds the
Supabase queries and business rules.
