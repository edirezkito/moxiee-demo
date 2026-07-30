/*
# Create commerce tables: addresses, carts, orders, wishlist

1. Purpose
   Adds the transactional/shopping layer of the Moxiee ecommerce platform on top
   of the catalog from migration 001: saved shipping addresses, persistent
   customer carts, orders and their line items, and per-customer wishlists.
   Together these power the cart drawer, checkout flow, order history, and the
   wishlist view in the customer dashboard.

2. New Tables
   - addresses      — saved shipping addresses per customer (label, recipient, street, city, postal code, country, phone, is_default).
   - carts          — one persistent cart per customer; stores optional promo code and updated_at.
   - cart_items     — line items in a cart: product, variation, quantity, unit price snapshot.
   - orders         — orders placed by a customer: status, payment status, totals, shipping address snapshot, optional promo.
   - order_items    — immutable line items of a placed order: product snapshot (name/image), variation, quantity, unit price.
   - wishlists      — one wishlist per customer.
   - wishlist_items — products a customer has saved for later.

3. Helper Functions
   - recalc_product_rating(product_id) — recomputes the average rating and review count on a product from its reviews. SECURITY DEFINER so it can update products even with RLS. Called by the application after inserting/deleting a review.

4. Security (RLS)
   - All commerce tables are owner-scoped: a customer can only read/modify rows that belong to them (via auth.uid() = user_id, or via EXISTS subquery to the parent cart/order for line items).
   - Owner columns default to auth.uid() so inserts that omit user_id still satisfy WITH CHECK.
   - Admins can read all orders and order_items (via is_admin()) for the admin dashboard; only the owning customer may create/modify.
   - All tables have RLS enabled. Policies split per CRUD verb.

5. Notes
   - order_items stores a snapshot of product name, image, and unit price at purchase time so historic orders remain accurate even if the catalog later changes.
   - cart_items stores a price snapshot too, for stable cart totals while shopping.
   - Idempotent via IF NOT EXISTS / DROP POLICY IF EXISTS.
*/

-- ============================================================
-- 1. TABLES
-- ============================================================

create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label       text not null default 'Home',
  full_name   text not null,
  street      text not null,
  city        text not null,
  postal_code text not null,
  country     text not null default 'United States',
  phone       text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists addresses_user_id_idx on public.addresses(user_id);

create table if not exists public.carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  promo_code  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists carts_user_id_idx on public.carts(user_id);

create table if not exists public.cart_items (
  id            uuid primary key default gen_random_uuid(),
  cart_id       uuid not null references public.carts(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  variation_id  uuid references public.product_variations(id) on delete set null,
  quantity      integer not null default 1 check (quantity > 0),
  unit_price    numeric(10,2) not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists cart_items_cart_id_idx on public.cart_items(cart_id);
create index if not exists cart_items_product_id_idx on public.cart_items(product_id);

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status          text not null default 'pending' check (status in ('pending','processing','shipped','delivered','cancelled','refunded')),
  payment_status  text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded','failed')),
  payment_method  text default 'card',
  subtotal        numeric(10,2) not null default 0,
  discount        numeric(10,2) not null default 0,
  shipping        numeric(10,2) not null default 0,
  total           numeric(10,2) not null default 0,
  promo_code      text,
  shipping_address jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  variation_id  uuid references public.product_variations(id) on delete set null,
  product_name  text not null,
  product_image text,
  variation_value text,
  quantity      integer not null check (quantity > 0),
  unit_price    numeric(10,2) not null,
  created_at    timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);

create table if not exists public.wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists wishlists_user_id_idx on public.wishlists(user_id);

create table if not exists public.wishlist_items (
  id          uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (wishlist_id, product_id)
);

create index if not exists wishlist_items_wishlist_id_idx on public.wishlist_items(wishlist_id);

-- ============================================================
-- 2. HELPER: recalc_product_rating
-- ============================================================
create or replace function public.recalc_product_rating(p_product_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.products
  set rating = coalesce((select avg(rating)::numeric(2,1) from public.reviews where product_id = p_product_id), 0),
      review_count = coalesce((select count(*)::integer from public.reviews where product_id = p_product_id), 0)
  where id = p_product_id;
end;
$$;

-- ============================================================
-- 3. ENABLE RLS
-- ============================================================
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;

-- ============================================================
-- 4. POLICIES — addresses (owner scoped)
-- ============================================================
drop policy if exists "addresses_select_own" on public.addresses;
create policy "addresses_select_own"
  on public.addresses for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "addresses_insert_own" on public.addresses;
create policy "addresses_insert_own"
  on public.addresses for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "addresses_update_own" on public.addresses;
create policy "addresses_update_own"
  on public.addresses for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "addresses_delete_own" on public.addresses;
create policy "addresses_delete_own"
  on public.addresses for delete
  to authenticated using (auth.uid() = user_id);

-- ============================================================
-- 5. POLICIES — carts (owner scoped)
-- ============================================================
drop policy if exists "carts_select_own" on public.carts;
create policy "carts_select_own"
  on public.carts for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "carts_insert_own" on public.carts;
create policy "carts_insert_own"
  on public.carts for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "carts_update_own" on public.carts;
create policy "carts_update_own"
  on public.carts for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "carts_delete_own" on public.carts;
create policy "carts_delete_own"
  on public.carts for delete
  to authenticated using (auth.uid() = user_id);

-- ============================================================
-- 6. POLICIES — cart_items (scoped via parent cart ownership)
-- ============================================================
drop policy if exists "cart_items_select_own" on public.cart_items;
create policy "cart_items_select_own"
  on public.cart_items for select
  to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

drop policy if exists "cart_items_insert_own" on public.cart_items;
create policy "cart_items_insert_own"
  on public.cart_items for insert
  to authenticated
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

drop policy if exists "cart_items_update_own" on public.cart_items;
create policy "cart_items_update_own"
  on public.cart_items for update
  to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

drop policy if exists "cart_items_delete_own" on public.cart_items;
create policy "cart_items_delete_own"
  on public.cart_items for delete
  to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- ============================================================
-- 7. POLICIES — orders (owner read/write, admin read all)
-- ============================================================
drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin"
  on public.orders for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
  on public.orders for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "orders_update_own_or_admin" on public.orders;
create policy "orders_update_own_or_admin"
  on public.orders for update
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "orders_delete_own" on public.orders;
create policy "orders_delete_own"
  on public.orders for delete
  to authenticated using (auth.uid() = user_id);

-- ============================================================
-- 8. POLICIES — order_items (via parent order ownership, admin read)
-- ============================================================
drop policy if exists "order_items_select_own_or_admin" on public.order_items;
create policy "order_items_select_own_or_admin"
  on public.order_items for select
  to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own"
  on public.order_items for insert
  to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

drop policy if exists "order_items_update_own" on public.order_items;
create policy "order_items_update_own"
  on public.order_items for update
  to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()))
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

drop policy if exists "order_items_delete_own" on public.order_items;
create policy "order_items_delete_own"
  on public.order_items for delete
  to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- ============================================================
-- 9. POLICIES — wishlists (owner scoped)
-- ============================================================
drop policy if exists "wishlists_select_own" on public.wishlists;
create policy "wishlists_select_own"
  on public.wishlists for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "wishlists_insert_own" on public.wishlists;
create policy "wishlists_insert_own"
  on public.wishlists for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "wishlists_delete_own" on public.wishlists;
create policy "wishlists_delete_own"
  on public.wishlists for delete
  to authenticated using (auth.uid() = user_id);

-- ============================================================
-- 10. POLICIES — wishlist_items (via parent wishlist ownership)
-- ============================================================
drop policy if exists "wishlist_items_select_own" on public.wishlist_items;
create policy "wishlist_items_select_own"
  on public.wishlist_items for select
  to authenticated
  using (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()));

drop policy if exists "wishlist_items_insert_own" on public.wishlist_items;
create policy "wishlist_items_insert_own"
  on public.wishlist_items for insert
  to authenticated
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()));

drop policy if exists "wishlist_items_delete_own" on public.wishlist_items;
create policy "wishlist_items_delete_own"
  on public.wishlist_items for delete
  to authenticated
  using (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()));
