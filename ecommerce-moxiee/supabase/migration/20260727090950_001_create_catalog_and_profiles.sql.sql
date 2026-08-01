/*
# Create core catalog and user profiles

1. Purpose
   Foundation of the Moxiee ecommerce platform: user profiles (linked to Supabase
   Auth), the product catalog (categories, brands, products, product variations),
   customer reviews, brand testimonials, newsletter subscribers, and promotional
   discount codes.

2. New Tables
   - profiles            — public profile data per authenticated user, with role (customer/admin).
   - categories          — product categories. Supports optional parent for subcategories.
   - brands              — product brands shown on the homepage brand strip.
   - products            — main catalog entity: price, discount, stock, SKU, images (JSONB array), rating, flags.
   - product_variations  — size/color/etc. variants per product, own stock + optional price adjustment.
   - reviews             — customer ratings (1-5) and comments.
   - testimonials        — homepage testimonials with avatar and rating.
   - newsletter_subscribers — emails collected from the newsletter form.
   - promotions          — discount codes (percentage off), active flag + validity window.

3. Helper Functions
   - is_admin() — true when current user has role='admin' in profiles. SECURITY DEFINER. Created BEFORE any policy that references it.
   - handle_new_user() — trigger that auto-creates a profiles row when a new auth user signs up.

4. Security (RLS)
   - profiles: each user reads/updates only their own row; admins read all rows.
   - categories, brands, products, product_variations, testimonials, promotions: publicly readable (anon + authenticated) so the storefront works without login; writes restricted to admins.
   - reviews: publicly readable; only the author may insert/update/delete their own review.
   - newsletter_subscribers: anyone may subscribe (insert) / unsubscribe (delete); reads are admin-only.
   - All tables have RLS enabled. Policies split per CRUD verb (no FOR ALL).

5. Notes
   - product images stored as JSONB array of URL strings for flexible multi-image galleries.
   - rating/review_count denormalized on products for fast display.
   - Idempotent via IF NOT EXISTS / DROP POLICY IF EXISTS.
*/

-- ============================================================
-- 1. TABLES FIRST (no policies referencing is_admin yet)
-- ============================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'customer' check (role in ('customer','admin')),
  avatar_url  text,
  phone       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  image_url   text,
  parent_id   uuid references public.categories(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  country     text,
  created_at  timestamptz not null default now()
);

create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  description     text,
  price           numeric(10,2) not null check (price >= 0),
  discount_price  numeric(10,2) check (discount_price >= 0),
  stock           integer not null default 0 check (stock >= 0),
  sku             text unique,
  category_id     uuid references public.categories(id) on delete set null,
  brand_id        uuid references public.brands(id) on delete set null,
  images          jsonb not null default '[]'::jsonb,
  rating          numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count    integer not null default 0,
  is_featured     boolean not null default false,
  is_bestseller   boolean not null default false,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.product_variations (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products(id) on delete cascade,
  name              text not null,
  value             text not null,
  stock             integer not null default 0 check (stock >= 0),
  price_adjustment  numeric(10,2) not null default 0
);

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);

create table if not exists public.testimonials (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text,
  content     text not null,
  avatar_url  text,
  rating      integer not null default 5 check (rating between 1 and 5),
  created_at  timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.promotions (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  description       text,
  discount_percent  numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  is_active         boolean not null default true,
  valid_until       timestamptz,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================
create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_brand_id_idx on public.products(brand_id);
create index if not exists products_slug_idx on public.products(slug);
create index if not exists products_active_idx on public.products(is_active);
create index if not exists product_variations_product_id_idx on public.product_variations(product_id);
create index if not exists reviews_product_id_idx on public.reviews(product_id);

-- ============================================================
-- 3. HELPER FUNCTION is_admin (before policies)
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- 4. ENABLE RLS ON ALL TABLES
-- ============================================================
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_variations enable row level security;
alter table public.reviews enable row level security;
alter table public.testimonials enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.promotions enable row level security;

-- ============================================================
-- 5. POLICIES
-- ============================================================

-- profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- categories (public read, admin write)
drop policy if exists "categories_select_public" on public.categories;
create policy "categories_select_public"
  on public.categories for select
  to anon, authenticated using (true);

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write"
  on public.categories for insert
  to authenticated with check (public.is_admin());

drop policy if exists "categories_admin_update" on public.categories;
create policy "categories_admin_update"
  on public.categories for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "categories_admin_delete" on public.categories;
create policy "categories_admin_delete"
  on public.categories for delete
  to authenticated using (public.is_admin());

-- brands
drop policy if exists "brands_select_public" on public.brands;
create policy "brands_select_public"
  on public.brands for select
  to anon, authenticated using (true);

drop policy if exists "brands_admin_write" on public.brands;
create policy "brands_admin_write"
  on public.brands for insert
  to authenticated with check (public.is_admin());

drop policy if exists "brands_admin_update" on public.brands;
create policy "brands_admin_update"
  on public.brands for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "brands_admin_delete" on public.brands;
create policy "brands_admin_delete"
  on public.brands for delete
  to authenticated using (public.is_admin());

-- products
drop policy if exists "products_select_public" on public.products;
create policy "products_select_public"
  on public.products for select
  to anon, authenticated using (true);

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write"
  on public.products for insert
  to authenticated with check (public.is_admin());

drop policy if exists "products_admin_update" on public.products;
create policy "products_admin_update"
  on public.products for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_admin_delete" on public.products;
create policy "products_admin_delete"
  on public.products for delete
  to authenticated using (public.is_admin());

-- product_variations
drop policy if exists "variations_select_public" on public.product_variations;
create policy "variations_select_public"
  on public.product_variations for select
  to anon, authenticated using (true);

drop policy if exists "variations_admin_write" on public.product_variations;
create policy "variations_admin_write"
  on public.product_variations for insert
  to authenticated with check (public.is_admin());

drop policy if exists "variations_admin_update" on public.product_variations;
create policy "variations_admin_update"
  on public.product_variations for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "variations_admin_delete" on public.product_variations;
create policy "variations_admin_delete"
  on public.product_variations for delete
  to authenticated using (public.is_admin());

-- reviews (public read, own write)
drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public"
  on public.reviews for select
  to anon, authenticated using (true);

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own"
  on public.reviews for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own"
  on public.reviews for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own"
  on public.reviews for delete
  to authenticated using (auth.uid() = user_id);

-- testimonials
drop policy if exists "testimonials_select_public" on public.testimonials;
create policy "testimonials_select_public"
  on public.testimonials for select
  to anon, authenticated using (true);

drop policy if exists "testimonials_admin_write" on public.testimonials;
create policy "testimonials_admin_write"
  on public.testimonials for insert
  to authenticated with check (public.is_admin());

drop policy if exists "testimonials_admin_update" on public.testimonials;
create policy "testimonials_admin_update"
  on public.testimonials for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "testimonials_admin_delete" on public.testimonials;
create policy "testimonials_admin_delete"
  on public.testimonials for delete
  to authenticated using (public.is_admin());

-- newsletter_subscribers
drop policy if exists "newsletter_insert_public" on public.newsletter_subscribers;
create policy "newsletter_insert_public"
  on public.newsletter_subscribers for insert
  to anon, authenticated with check (true);

drop policy if exists "newsletter_delete_own_email" on public.newsletter_subscribers;
create policy "newsletter_delete_own_email"
  on public.newsletter_subscribers for delete
  to anon, authenticated using (true);

drop policy if exists "newsletter_select_admin" on public.newsletter_subscribers;
create policy "newsletter_select_admin"
  on public.newsletter_subscribers for select
  to authenticated using (public.is_admin());

-- promotions
drop policy if exists "promotions_select_public" on public.promotions;
create policy "promotions_select_public"
  on public.promotions for select
  to anon, authenticated using (true);

drop policy if exists "promotions_admin_write" on public.promotions;
create policy "promotions_admin_write"
  on public.promotions for insert
  to authenticated with check (public.is_admin());

drop policy if exists "promotions_admin_update" on public.promotions;
create policy "promotions_admin_update"
  on public.promotions for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "promotions_admin_delete" on public.promotions;
create policy "promotions_admin_delete"
  on public.promotions for delete
  to authenticated using (public.is_admin());

-- ============================================================
-- 6. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
