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
