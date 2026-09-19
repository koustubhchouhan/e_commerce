-- =====================================================================
-- NovaMarket -- COMPLETE DATABASE SETUP (one paste)
--
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- It combines, in order: schema.sql, create_order.sql, seed.sql
-- Safe to re-run: enums are guarded, tables use IF NOT EXISTS,
-- functions use CREATE OR REPLACE, seed rows use ON CONFLICT DO NOTHING.
-- =====================================================================


-- ###################### schema.sql ######################

-- =====================================================================
-- NovaMarket schema  (run in Supabase SQL Editor)
-- Safe to re-run: enums are guarded, tables use IF NOT EXISTS.
-- =====================================================================

-- ---- Enums ----------------------------------------------------------
do $$ begin
  create type user_role as enum ('customer', 'seller', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_status as enum ('active', 'draft', 'out_of_stock');
exception when duplicate_object then null; end $$;

-- Admin-only gate over whether a seller listing is storefront-visible. Kept
-- separate from product_status because sellers control product_status.
do $$ begin
  create type product_approval_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending', 'paid', 'shipped', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

-- Gateway-agnostic payment lifecycle: 'created' is a local gateway order
-- before the customer pays; 'captured'/'authorized'/'failed'/'refunded' come
-- from the payment gateway.
do $$ begin
  create type payment_status as enum ('created', 'authorized', 'captured', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

-- 'expired' marks an unpaid order abandoned at checkout (its reserved stock
-- is released); 'refunded' marks an order whose payment was returned.
alter type order_status add value if not exists 'expired';
alter type order_status add value if not exists 'refunded';

-- ---- profiles (1:1 with auth.users) ---------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  full_name        text not null default '',
  email            text,
  avatar_url       text,
  phone            text,
  shipping_address jsonb,
  role             user_role not null default 'customer',
  auth_provider    text not null default 'email',
  password_hash    text,
  created_at       timestamptz not null default now()
);

-- Keep existing installs in sync.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists auth_provider text not null default 'email';
alter table public.profiles add column if not exists password_hash text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists shipping_address jsonb;

-- Auto-create a profile whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, email, auth_provider, password_hash)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'customer',
    new.email,
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    case
      when coalesce(new.raw_app_meta_data->>'provider', 'email') = 'google' then null
      else new.encrypted_password
    end
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill existing profiles from auth.users so already-registered users also
-- carry their real sign-in provider and password hash (idempotent).
do $$ begin
  update public.profiles p
  set email = u.email,
      auth_provider = coalesce(u.raw_app_meta_data->>'provider', 'email'),
      password_hash = case
        when coalesce(u.raw_app_meta_data->>'provider', 'email') = 'google' then null
        else u.encrypted_password
      end
  from auth.users u
  where u.id = p.id;
exception when others then null; end $$;

-- Shared trigger: keep updated_at fresh on UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---- stores (one per seller for now) --------------------------------
-- `is_official` marks the platform's own store, which an admin can sell from
-- without going through the seller-application flow. It is excluded from
-- seller payouts in the admin ledger.
create table if not exists public.stores (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  description text,
  is_official boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (owner_id)
);

-- Keep existing installs in sync.
alter table public.stores add column if not exists is_official boolean not null default false;

-- ---- seller_applications --------------------------------------------
create table if not exists public.seller_applications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  store_name    text not null,
  contact_email text not null,
  status        application_status not null default 'pending',
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid references public.profiles(id)
);

-- ---- categories -----------------------------------------------------
create table if not exists public.categories (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

-- ---- products -------------------------------------------------------
create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  store_id         uuid not null references public.stores(id) on delete cascade,
  category_id      uuid references public.categories(id) on delete set null,
  name             text not null,
  description      text,
  price            numeric(10,2) not null check (price >= 0),
  discount_percent int not null default 0 check (discount_percent between 0 and 100),
  stock            int not null default 0 check (stock >= 0),
  status           product_status not null default 'active',
  approval_status  product_approval_status not null default 'approved',
  rejection_reason text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Keep existing installs in sync: listings are storefront-visible only after an
-- admin approves them. Existing rows default to approved (grandfathered in).
alter table public.products add column if not exists approval_status product_approval_status not null default 'approved';
alter table public.products add column if not exists rejection_reason text;

create index if not exists idx_products_store_id    on public.products(store_id);
create index if not exists idx_products_category_id  on public.products(category_id);
create index if not exists idx_products_status       on public.products(status);
create index if not exists idx_products_approval_status on public.products(approval_status);

create or replace trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---- product_images -------------------------------------------------
create table if not exists public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url        text not null,
  position   int not null default 0,
  is_cover   boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_images_product_id on public.product_images(product_id);

-- ---- orders ---------------------------------------------------------
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete restrict,
  store_id         uuid references public.stores(id) on delete set null,
  status           order_status not null default 'pending',
  subtotal         numeric(12,2) not null default 0,
  total            numeric(12,2) not null default 0,
  shipping_address jsonb,
  created_at       timestamptz not null default now()
);

-- Keep existing installs in sync: orders belong to a single store (mixed carts
-- are split into one order per seller at checkout).
alter table public.orders add column if not exists store_id uuid references public.stores(id) on delete set null;

create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_store_id on public.orders(store_id);

-- ---- order_items ----------------------------------------------------
create table if not exists public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  product_id       uuid references public.products(id) on delete set null,
  product_name     text not null,
  unit_price       numeric(10,2) not null,
  discount_percent int not null default 0,
  quantity         int not null check (quantity > 0),
  line_total       numeric(12,2) not null
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);

-- ---- payments -------------------------------------------------------
-- One payment covers one checkout, which can fan out to several orders: a
-- mixed cart is split one order per seller by create_orders(). The gateway is
-- charged once, so payments is the source of truth for money and
-- payment_orders links it to every order it paid for.
--
-- Writes are service_role only. The API creates rows with status 'created',
-- then a signature-verified webhook (or /payments/verify) flips them to
-- 'captured'. gateway_payment_id is unique so a retried webhook can never
-- double-insert.
create table if not exists public.payments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete restrict,
  gateway            text not null default 'razorpay',
  gateway_order_id   text,
  gateway_payment_id text,
  amount             numeric(12,2) not null default 0,
  currency           text not null default 'INR',
  status             payment_status not null default 'created',
  signature_verified boolean not null default false,
  raw_payload        jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_payments_user_id on public.payments(user_id);

-- A gateway id must map to at most one payment row (webhook retries, verify
-- after webhook, etc.). Partial indexes so the many NULL placeholders during
-- the 'created' stage do not collide.
create unique index if not exists idx_payments_gateway_order_id
  on public.payments(gateway_order_id) where gateway_order_id is not null;
create unique index if not exists idx_payments_gateway_payment_id
  on public.payments(gateway_payment_id) where gateway_payment_id is not null;

-- One payment may cover several orders, and an order is paid by exactly one
-- payment. The composite primary key enforces the first, the unique on
-- order_id enforces the second.
create table if not exists public.payment_orders (
  payment_id uuid not null references public.payments(id) on delete cascade,
  order_id   uuid not null references public.orders(id) on delete restrict,
  primary key (payment_id, order_id),
  unique (order_id)
);

create index if not exists idx_payment_orders_order_id on public.payment_orders(order_id);

-- Backfill store_id for orders created before splitting existed. Every legacy
-- order came from a single store because checkout rejected mixed carts.
update public.orders o
set store_id = sub.store_id
from (
  select distinct on (oi.order_id) oi.order_id, p.store_id
  from public.order_items oi
  join public.products p on p.id = oi.product_id
  order by oi.order_id
) sub
where sub.order_id = o.id and o.store_id is null;

-- ---- reviews --------------------------------------------------------
create table if not exists public.reviews (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  rating            int not null check (rating between 1 and 5),
  comment           text,
  is_hidden         boolean not null default false,
  seller_reply      text,
  seller_replied_at timestamptz,
  created_at        timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists idx_reviews_product_id on public.reviews(product_id);

-- Keep existing installs in sync (moderation + seller reply columns).
alter table public.reviews add column if not exists is_hidden boolean not null default false;
alter table public.reviews add column if not exists seller_reply text;
alter table public.reviews add column if not exists seller_replied_at timestamptz;

-- ---- contact_messages -------------------------------------------------
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name  text not null,
  email      text not null,
  subject    text not null,
  message    text not null,
  is_read    boolean not null default false,
  user_id    uuid references public.profiles(id) on delete set null,
  store_id   uuid references public.stores(id)   on delete set null,
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Keep existing installs in sync (columns were added after the initial table).
alter table public.contact_messages add column if not exists store_id uuid references public.stores(id) on delete set null;
alter table public.contact_messages add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.contact_messages add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.contact_messages add column if not exists reply text;
alter table public.contact_messages add column if not exists replied_at timestamptz;
alter table public.contact_messages add column if not exists replied_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_contact_messages_created_at on public.contact_messages(created_at);
create index if not exists idx_contact_messages_store_id on public.contact_messages(store_id);
create index if not exists idx_contact_messages_product_id on public.contact_messages(product_id);
create index if not exists idx_contact_messages_user_id on public.contact_messages(user_id);

-- ---- hero_slides (admin-managed homepage carousel) -------------------
-- Admins can add any number of slides; `position` controls display order
-- (ties fall back to creation time) and `is_active` hides a slide without
-- deleting it. `theme` selects one of the built-in color treatments.
create table if not exists public.hero_slides (
  id           uuid primary key default gen_random_uuid(),
  eyebrow      text not null default '',
  title        text not null,
  description  text not null default '',
  image_url    text not null,
  button_label text not null default 'Shop Now',
  button_link  text not null default '/',
  theme        text not null default 'orange',
  position     int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Keep existing installs in sync if the table predates a column.
alter table public.hero_slides add column if not exists eyebrow text not null default '';
alter table public.hero_slides add column if not exists description text not null default '';
alter table public.hero_slides add column if not exists button_label text not null default 'Shop Now';
alter table public.hero_slides add column if not exists button_link text not null default '/';
alter table public.hero_slides add column if not exists theme text not null default 'orange';
alter table public.hero_slides add column if not exists position int not null default 0;
alter table public.hero_slides add column if not exists is_active boolean not null default true;

create index if not exists idx_hero_slides_order on public.hero_slides(is_active, position, created_at);

-- =====================================================================
-- Row Level Security
--
-- The Express API talks to Postgres with the service_role key, which
-- BYPASSES RLS, so today it is unaffected by everything below. These
-- policies are the second layer: they state what the anon/authenticated
-- keys may see and do if they ever query the database directly, and they
-- are what stage 3 will rely on when user-scoped reads move onto a
-- per-request user client.
--
-- Posture:
--   * Read policies cover the public catalog and a caller's own data.
--   * Write policies exist only where a user creates their own content
--     (reviews, contact messages, seller applications). Products, stores,
--     orders, categories and hero slides are intentionally write-denied to
--     anon/authenticated and stay on service_role, so a seller can never
--     self-approve a listing or change their own role.
--
-- Display names: the public review list needs each author's name, but
-- profiles is readable only by its owner and admins. The display_name()
-- helper projects just the name, and the reviews_public view joins it onto
-- reviews with reviews RLS still in force, so a user-scoped read gets author
-- names without opening up the profiles table.
-- =====================================================================

alter table public.profiles            enable row level security;
alter table public.stores              enable row level security;
alter table public.seller_applications enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.product_images      enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.payments            enable row level security;
alter table public.payment_orders      enable row level security;
alter table public.reviews             enable row level security;
alter table public.contact_messages    enable row level security;
alter table public.hero_slides         enable row level security;

-- ---- RLS helper functions -------------------------------------------
-- SECURITY DEFINER so they can read the base tables without re-triggering
-- RLS (which would recurse), STABLE so the planner can cache them within a
-- statement, and an empty search_path with fully-qualified names so they
-- cannot be hijacked.

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.owns_store(p_store_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.stores
    where id = p_store_id and owner_id = auth.uid()
  );
$$;

create or replace function public.owns_product(p_product_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.products p
    join public.stores s on s.id = p.store_id
    where p.id = p_product_id and s.owner_id = auth.uid()
  );
$$;

create or replace function public.can_view_product(p_product_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.products p
    join public.stores s on s.id = p.store_id
    where p.id = p_product_id
      and (
        (p.status = 'active' and p.approval_status = 'approved')
        or s.owner_id = auth.uid()
        or public.is_admin()
      )
  );
$$;

create or replace function public.can_view_order(p_order_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and (
        o.user_id = auth.uid()
        or (o.store_id is not null and public.owns_store(o.store_id))
        or public.is_admin()
      )
  );
$$;

-- Resolve a profile's public display name without exposing email, phone,
-- role or password hashes. SECURITY DEFINER so it can read past the
-- owner/admin-only profiles policy; it is the only profile column the public
-- reviews_public view needs.
create or replace function public.display_name(p_user_id uuid)
returns text
language sql stable security definer
set search_path = ''
as $$
  select nullif(full_name, '') from public.profiles where id = p_user_id;
$$;

-- ---- profiles --------------------------------------------------------
-- Own row or admin. No write policy: profile writes go through the API,
-- which whitelists fields, so a user can never edit their own role.
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- ---- stores ----------------------------------------------------------
-- Storefront name/description are public. No write policy: store creation
-- (including the admin's official store) goes through the API.
drop policy if exists stores_select_public on public.stores;
create policy stores_select_public on public.stores
  for select to anon, authenticated
  using (true);

-- ---- seller_applications ---------------------------------------------
-- Applicants see their own; admins see all. Only a customer may apply, and
-- nobody can review (approve) their own application from here.
drop policy if exists seller_applications_select_own_or_admin on public.seller_applications;
create policy seller_applications_select_own_or_admin on public.seller_applications
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists seller_applications_insert_own on public.seller_applications;
create policy seller_applications_insert_own on public.seller_applications
  for insert to authenticated
  with check (user_id = auth.uid() and public.current_user_role() = 'customer');

-- ---- categories ------------------------------------------------------
drop policy if exists categories_select_public on public.categories;
create policy categories_select_public on public.categories
  for select to anon, authenticated
  using (true);

-- ---- products --------------------------------------------------------
-- Public sees only approved + active listings; owners and admins see their
-- own regardless of state. Write-denied for anon/authenticated so a seller
-- cannot flip their own approval_status.
drop policy if exists products_select_visible_or_owner on public.products;
create policy products_select_visible_or_owner on public.products
  for select to anon, authenticated
  using (
    (status = 'active' and approval_status = 'approved')
    or public.is_admin()
    or public.owns_store(store_id)
  );

-- ---- product_images --------------------------------------------------
-- An image is visible exactly when its product is.
drop policy if exists product_images_select_visible on public.product_images;
create policy product_images_select_visible on public.product_images
  for select to anon, authenticated
  using (public.can_view_product(product_id));

-- ---- orders ----------------------------------------------------------
-- The buyer, the seller who owns the order's store, or an admin.
drop policy if exists orders_select_participant on public.orders;
create policy orders_select_participant on public.orders
  for select to authenticated
  using (public.can_view_order(id));

-- ---- order_items -----------------------------------------------------
drop policy if exists order_items_select_participant on public.order_items;
create policy order_items_select_participant on public.order_items
  for select to authenticated
  using (public.can_view_order(order_id));

-- ---- payments --------------------------------------------------------
-- Only the buyer and admins may read a payment directly; sellers fulfil the
-- order and never need the gateway ids. Writes stay on service_role: the
-- server is the only actor allowed to mark a payment captured, and only
-- after verifying the gateway signature.
drop policy if exists payments_select_own_or_admin on public.payments;
create policy payments_select_own_or_admin on public.payments
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists payment_orders_select_participant on public.payment_orders;
create policy payment_orders_select_participant on public.payment_orders
  for select to authenticated
  using (public.can_view_order(order_id));

-- ---- reviews ---------------------------------------------------------
-- Visible reviews are public; hidden ones stay visible to their author, an
-- admin, and the store that was reviewed. Authors may create/update/delete
-- their own review.
drop policy if exists reviews_select_visible_or_owner on public.reviews;
create policy reviews_select_visible_or_owner on public.reviews
  for select to anon, authenticated
  using (
    is_hidden = false
    or user_id = auth.uid()
    or public.is_admin()
    or public.owns_product(product_id)
  );

drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own on public.reviews
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists reviews_update_own_or_admin on public.reviews;
create policy reviews_update_own_or_admin on public.reviews
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists reviews_delete_own_or_admin on public.reviews;
create policy reviews_delete_own_or_admin on public.reviews
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---- contact_messages ------------------------------------------------
-- The contact form is public, but a message may only be attributed to the
-- caller's own account (or left anonymous). Reads are limited to the
-- sender, the addressed store, and admins; marking read / replying stays
-- on service_role.
drop policy if exists contact_messages_select_participant on public.contact_messages;
create policy contact_messages_select_participant on public.contact_messages
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or (store_id is not null and public.owns_store(store_id))
  );

drop policy if exists contact_messages_insert_anyone on public.contact_messages;
create policy contact_messages_insert_anyone on public.contact_messages
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- ---- hero_slides -----------------------------------------------------
drop policy if exists hero_slides_select_active_or_admin on public.hero_slides;
create policy hero_slides_select_active_or_admin on public.hero_slides
  for select to anon, authenticated
  using (is_active = true or public.is_admin());

-- ---- public read views ----------------------------------------------
-- The public review list needs the author's display name. This view adds it
-- via display_name() while `security_invoker = true` keeps the reviews RLS
-- policies in force: an anonymous visitor sees visible reviews only, and an
-- author, the store that was reviewed, or an admin still sees hidden ones.
create or replace view public.reviews_public
with (security_invoker = true)
as
select
  r.id,
  r.product_id,
  r.user_id,
  public.display_name(r.user_id) as author_name,
  r.rating,
  r.comment,
  r.is_hidden,
  r.seller_reply,
  r.seller_replied_at,
  r.created_at
from public.reviews r;

grant select on public.reviews_public to anon, authenticated;
grant execute on function public.display_name(uuid) to anon, authenticated;


-- ###################### create_order.sql ######################

-- =====================================================================
-- Checkout functions: create_orders splits a multi-store cart into one order
-- per seller (atomically) and create_order is the single-store primitive it
-- calls.
-- Called from Express via db.rpc('create_orders', { p_user_id, p_items, p_shipping }).
--   p_items example: [{ "product_id": "uuid", "quantity": 2 }, ...]
-- Prices are read from the products table INSIDE this function — the client
-- never sends a price. Product rows are locked FOR UPDATE so two shoppers
-- can't buy the last unit at the same time. Any error rolls the whole thing back.
-- =====================================================================
create or replace function public.create_order(
  p_user_id  uuid,
  p_items    jsonb,
  p_shipping jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id   uuid;
  v_item       jsonb;
  v_product_id uuid;
  v_qty        int;
  v_product    record;
  v_first_store uuid := null;
  v_unit_price numeric(10,2);
  v_discount   int;
  v_line_total numeric(12,2);
  v_subtotal   numeric(12,2) := 0;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  insert into public.orders (user_id, status, subtotal, total, shipping_address)
  values (p_user_id, 'pending', 0, 0, p_shipping)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty        := (v_item->>'quantity')::int;

    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for product %', v_product_id;
    end if;

    -- Lock this product row until the transaction commits.
    select id, name, price, discount_percent, stock, status, approval_status, store_id
      into v_product
      from public.products
      where id = v_product_id
      for update;

    if not found then
      raise exception 'Product % not found', v_product_id;
    end if;
    if v_product.status <> 'active' then
      raise exception 'Product % is not available', v_product_id;
    end if;
    -- status is seller-controlled; approval_status is admin-controlled. Both
    -- are required so a seller can't self-publish an unapproved listing.
    if v_product.approval_status <> 'approved' then
      raise exception 'Product % is not available', v_product_id;
    end if;
    if v_product.stock < v_qty then
      raise exception 'Insufficient stock for product %', v_product_id;
    end if;

    -- This primitive handles a single store. create_orders groups the cart by
    -- store first, so a mixed cart never reaches here.
    if v_first_store is null then
      v_first_store := v_product.store_id;
    elsif v_product.store_id is distinct from v_first_store then
      raise exception 'Checkout can only contain items from one store; please place separate orders for each seller';
    end if;

    v_unit_price := v_product.price;
    v_discount   := v_product.discount_percent;
    v_line_total := round(v_unit_price * (1 - v_discount / 100.0) * v_qty, 2);

    insert into public.order_items
      (order_id, product_id, product_name, unit_price, discount_percent, quantity, line_total)
    values
      (v_order_id, v_product.id, v_product.name, v_unit_price, v_discount, v_qty, v_line_total);

    update public.products
      set stock = stock - v_qty
      where id = v_product_id;

    v_subtotal := v_subtotal + v_line_total;
  end loop;

  update public.orders
    set subtotal = v_subtotal,
        total    = v_subtotal,
        store_id = v_first_store
    where id = v_order_id;

  return v_order_id;
end;
$$;

-- Splits the cart into one order per store, atomically (all orders succeed or
-- none do), and returns a JSON array of { order_id, store_id, total }.
create or replace function public.create_orders(
  p_user_id  uuid,
  p_items    jsonb,
  p_shipping jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result   jsonb := '[]'::jsonb;
  v_store_id uuid;
  v_group    jsonb;
  v_order_id uuid;
  v_total    numeric(12,2);
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  -- Fail loudly on unknown products instead of silently dropping them from the
  -- grouping join below.
  if exists (
    select 1
    from jsonb_array_elements(p_items) e
    where not exists (
      select 1 from public.products p where p.id = (e->>'product_id')::uuid
    )
  ) then
    raise exception 'One or more products were not found';
  end if;

  for v_store_id, v_group in
    select p.store_id, jsonb_agg(t.elem order by t.ord)
    from jsonb_array_elements(p_items) with ordinality as t(elem, ord)
    join public.products p on p.id = (t.elem->>'product_id')::uuid
    group by p.store_id
    order by min(t.ord)
  loop
    v_order_id := public.create_order(p_user_id, v_group, p_shipping);
    select total into v_total from public.orders where id = v_order_id;

    v_result := v_result || jsonb_build_object(
      'order_id', v_order_id,
      'store_id', v_store_id,
      'total',    v_total
    );
  end loop;

  return v_result;
end;
$$;

-- =====================================================================
-- Payment lifecycle.
--   mark_payment_captured -> flip a payments row to 'captured' and every order
--     it paid for to 'paid', in one transaction. Idempotent: a webhook retry
--     racing /payments/verify affects zero rows the second time.
--   mark_payment_failed   -> mark the payment failed and release the stock its
--     still-pending orders reserved, so an abandoned checkout frees inventory.
-- Both can move money/stock, so the revokes below drop the default
-- anon/authenticated EXECUTE grant and leave them service_role-only.
-- =====================================================================
create or replace function public.mark_payment_captured(
  p_gateway_order_id   text,
  p_gateway_payment_id text,
  p_raw_payload        jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_order_ids  uuid[];
  v_status     payment_status;
begin
  select id into v_payment_id
    from public.payments
    where gateway_order_id = p_gateway_order_id
    for update;

  if not found then
    raise exception 'Unknown payment order %', p_gateway_order_id;
  end if;

  select array_agg(order_id) into v_order_ids
    from public.payment_orders
    where payment_id = v_payment_id;

  -- Only a payment that has not reached a terminal state flips.
  update public.payments
    set status             = 'captured',
        gateway_payment_id = coalesce(gateway_payment_id, p_gateway_payment_id),
        signature_verified = true,
        raw_payload        = coalesce(p_raw_payload, raw_payload),
        updated_at         = now()
    where id = v_payment_id
      and status in ('created', 'authorized');

  update public.orders
    set status = 'paid'
    where id = any(coalesce(v_order_ids, '{}'::uuid[]))
      and status = 'pending';

  select status into v_status from public.payments where id = v_payment_id;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'status',     v_status,
    'order_ids',  coalesce(to_jsonb(v_order_ids), '[]'::jsonb)
  );
end;
$$;

create or replace function public.mark_payment_failed(
  p_gateway_order_id   text default null,
  p_gateway_payment_id text default null,
  p_raw_payload        jsonb default null,
  p_payment_id         uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_order_ids  uuid[];
  v_status     payment_status;
begin
  select id into v_payment_id
    from public.payments
    where (p_payment_id is not null and id = p_payment_id)
       or (p_gateway_order_id is not null and gateway_order_id = p_gateway_order_id)
    for update;

  if not found then
    raise exception 'Unknown payment (order %, id %)', p_gateway_order_id, p_payment_id;
  end if;

  select array_agg(order_id) into v_order_ids
    from public.payment_orders
    where payment_id = v_payment_id;

  -- Give back the stock of orders that were still awaiting payment.
  update public.products p
    set stock = p.stock + released.qty
    from (
      select oi.product_id, sum(oi.quantity) as qty
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.order_id = any(coalesce(v_order_ids, '{}'::uuid[]))
        and o.status = 'pending'
        and oi.product_id is not null
      group by oi.product_id
    ) released
    where p.id = released.product_id;

  update public.orders
    set status = 'cancelled'
    where id = any(coalesce(v_order_ids, '{}'::uuid[]))
      and status = 'pending';

  update public.payments
    set status             = 'failed',
        gateway_payment_id = coalesce(gateway_payment_id, p_gateway_payment_id),
        raw_payload        = coalesce(p_raw_payload, raw_payload),
        updated_at         = now()
    where id = v_payment_id
      and status in ('created', 'authorized');

  select status into v_status from public.payments where id = v_payment_id;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'status',     v_status,
    'order_ids',  coalesce(to_jsonb(v_order_ids), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.mark_payment_captured(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.mark_payment_failed(text, text, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.mark_payment_captured(text, text, jsonb) to service_role;
grant execute on function public.mark_payment_failed(text, text, jsonb, uuid) to service_role;


-- ###################### seed.sql ######################

-- =====================================================================
-- Seed data. Run after schema.sql. Safe to re-run (on conflict do nothing).
-- Devotional / festive categories to match the NovaMarket brand.
-- =====================================================================
insert into public.categories (name, slug) values
  ('Idols & Murtis',      'idols-murtis'),
  ('Puja Essentials',     'puja-essentials'),
  ('Incense & Dhoop',     'incense-dhoop'),
  ('Diyas & Lamps',       'diyas-lamps'),
  ('Books & Scriptures',  'books-scriptures'),
  ('Festive Decor',       'festive-decor')
on conflict (slug) do nothing;

-- Seed the original homepage hero slides so the carousel is not empty on a
-- fresh install. Only inserts when the table has no slides, so re-runs (and
-- any admin-configured content) are never overwritten.
insert into public.hero_slides (eyebrow, title, description, image_url, button_label, button_link, theme, position)
select eyebrow, title, description, image_url, button_label, button_link, theme, position
from (values
  ('New Arrivals', 'Next-Gen Audio Experience', 'Discover our new line of quantum-processed wireless earbuds.',
   'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=1600', 'Shop Now', '/', 'orange', 0),
  ('Best Sellers', 'Dominate Your Arena', 'Top-rated mechanical keyboards and ultra-lightweight mice.',
   'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1600', 'Explore Gear', '/', 'gold', 1)
) as s(eyebrow, title, description, image_url, button_label, button_link, theme, position)
where not exists (select 1 from public.hero_slides);


-- Refresh the API schema cache so PostgREST sees the new tables
-- immediately (otherwise you may get "table not found in schema cache").
notify pgrst, 'reload schema';

-- Sanity check: should list all 11 tables.
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
