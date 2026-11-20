-- STEER RIGHT initial schema. Apply only to a dedicated STEER RIGHT Supabase project.
create extension if not exists pgcrypto;
create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin')),
  display_name text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_price_pence integer not null check (base_price_pence >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_name text not null,
  customer_email text not null,
  delivery_address text,
  specification jsonb not null,
  total_pence integer not null check (total_pence >= 0),
  currency text not null default 'GBP',
  status text not null default 'pending' check (status in ('pending','confirmed','in_production','shipped','cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','paid','refunded','failed')),
  payment_provider text check (payment_provider in ('stripe','paypal')),
  provider_payment_id text,
  created_at timestamptz not null default now()
);
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.admin_profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.site_settings enable row level security;
-- No public access to customer records, settings, or administrator accounts.
create policy "Admins read own profile" on public.admin_profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "Public read active products" on public.products for select to anon, authenticated using (active = true);
-- Orders and site settings are intentionally inaccessible from the public browser.
-- Server endpoints must authenticate admin access and verify payment webhooks.
-- Initial admin_profiles records should be provisioned by the project owner,
-- never by self-service signup or editable user metadata.
