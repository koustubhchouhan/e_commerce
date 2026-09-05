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

do $$ begin
  create type order_status as enum ('pending', 'paid', 'shipped', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---- profiles (1:1 with auth.users) ---------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null default '',
  email         text,
  avatar_url    text,
  role          user_role not null default 'customer',
  auth_provider text not null default 'email',
  password_hash text,
  created_at    timestamptz not null default now()
);

-- Keep existing installs in sync.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists auth_provider text not null default 'email';
alter table public.profiles add column if not exists password_hash text;

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
create table if not exists public.stores (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  unique (owner_id)
);

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
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_products_store_id    on public.products(store_id);
create index if not exists idx_products_category_id  on public.products(category_id);
create index if not exists idx_products_status       on public.products(status);

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
  status           order_status not null default 'pending',
  subtotal         numeric(12,2) not null default 0,
  total            numeric(12,2) not null default 0,
  shipping_address jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists idx_orders_user_id on public.orders(user_id);

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

-- ---- reviews --------------------------------------------------------
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  rating     int not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists idx_reviews_product_id on public.reviews(product_id);

-- ---- contact_messages -------------------------------------------------
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name  text not null,
  email      text not null,
  subject    text not null,
  message    text not null,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_messages_created_at on public.contact_messages(created_at);

-- =====================================================================
-- Row Level Security: enable on every table (default-deny).
-- The Express API uses the service_role key, which BYPASSES RLS, and is
-- the single authorization layer. Enabling RLS with no policies means that
-- if the anon/authenticated keys ever hit these tables directly, they get
-- nothing. Defense in depth.
-- =====================================================================
alter table public.profiles            enable row level security;
alter table public.stores              enable row level security;
alter table public.seller_applications enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.product_images      enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.reviews             enable row level security;
alter table public.contact_messages    enable row level security;


-- ###################### create_order.sql ######################

-- =====================================================================
-- create_order: atomic checkout.
-- Called from Express via db.rpc('create_order', { p_user_id, p_items, p_shipping }).
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
    select id, name, price, discount_percent, stock, status
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
    if v_product.stock < v_qty then
      raise exception 'Insufficient stock for product %', v_product_id;
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
        total    = v_subtotal
    where id = v_order_id;

  return v_order_id;
end;
$$;


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


-- Refresh the API schema cache so PostgREST sees the new tables
-- immediately (otherwise you may get "table not found in schema cache").
notify pgrst, 'reload schema';

-- Sanity check: should list all 10 tables.
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
