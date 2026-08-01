# Moxiee — Database Schema

The Moxiee ecommerce platform uses **Supabase** (managed PostgreSQL) as its database.
This document covers every table, column, relationship, index, Row Level Security
policy, database function, and trigger in the `public` schema.

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Tables](#tables)
   - [profiles](#profiles)
   - [categories](#categories)
   - [brands](#brands)
   - [products](#products)
   - [product_variations](#product_variations)
   - [reviews](#reviews)
   - [testimonials](#testimonials)
   - [newsletter_subscribers](#newsletter_subscribers)
   - [promotions](#promotions)
   - [addresses](#addresses)
   - [carts](#carts)
   - [cart_items](#cart_items)
   - [orders](#orders)
   - [order_items](#order_items)
   - [wishlists](#wishlists)
   - [wishlist_items](#wishlist_items)
4. [Database Functions](#database-functions)
5. [Triggers](#triggers)
6. [Row Level Security Reference](#row-level-security-reference)
7. [Seed Data](#seed-data)

---

## Overview

The schema is organized into two logical layers:

| Layer | Tables | Purpose |
|-------|--------|---------|
| **Catalog** | `profiles`, `categories`, `brands`, `products`, `product_variations`, `reviews`, `testimonials`, `newsletter_subscribers`, `promotions` | Public-facing catalog that shoppers browse, plus identity and marketing data. |
| **Commerce** | `addresses`, `carts`, `cart_items`, `orders`, `order_items`, `wishlists`, `wishlist_items` | Transactional and shopping data scoped to individual customers. |

**Key design decisions:**

- **Row Level Security** is enabled on every table. Catalog tables are publicly readable (anon + authenticated) so the storefront works without login; commerce tables are owner-scoped via `auth.uid()`.
- **Owner columns** (`user_id`) default to `auth.uid()` so inserts that omit the owner still satisfy RLS `WITH CHECK` policies.
- **Product images** are stored as a `jsonb` array of URL strings for flexible multi-image galleries without a join table.
- **Order line items** snapshot the product name, image, and unit price at purchase time so historic orders remain accurate even if the catalog later changes.
- **Denormalized rating** on `products` (avg + count) is kept in sync by the `recalc_product_rating()` function after each review insert/delete.
- **Admin authorization** is centralized in the `is_admin()` SECURITY DEFINER function, referenced by every admin-gated RLS policy.

---

## Entity Relationship Diagram

```
auth.users (Supabase Auth)
    │
    ├── 1:1 ──── profiles
    │                │
    ├── 1:n ──── addresses
    │
    ├── 1:1 ──── carts ──── 1:n ──── cart_items ──── n:1 ──── products
    │                                                         │
    ├── 1:n ──── orders ──── 1:n ──── order_items ────────────┘
    │
    └── 1:1 ──── wishlists ── 1:n ──── wishlist_items ── n:1 ── products

categories ──── 1:n ──── products ──── 1:n ──── product_variations
    │  (self-referencing parent_id)         │
    └───────────────────────────────────────┘

brands ──── 1:n ──── products

products ──── 1:n ──── reviews ──── n:1 ──── auth.users

testimonials        (standalone, no FK)
newsletter_subscribers  (standalone, no FK)
promotions          (standalone, no FK)
```

---

## Tables

### profiles

Public profile data for each authenticated user. One row per auth user, auto-created
on signup by the `handle_new_user()` trigger. Stores the user's role (`customer` or
`admin`), which gates admin dashboard access.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | — | **PK**. References `auth.users(id)` ON DELETE CASCADE. |
| `full_name` | text | YES | — | Display name. Populated from `raw_user_meta_data.full_name` on signup. |
| `role` | text | NO | `'customer'` | Check constraint: `customer` or `admin`. |
| `avatar_url` | text | YES | — | Profile image URL. |
| `phone` | text | YES | — | Contact phone number. |
| `created_at` | timestamptz | NO | `now()` | Account creation timestamp. |

**RLS:** Enabled. Each user reads/updates only their own row. Admins can read all rows.

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `profiles_select_own_or_admin` | SELECT | authenticated | `auth.uid() = id OR is_admin()` |
| `profiles_update_own` | UPDATE | authenticated | USING: `auth.uid() = id` · CHECK: `auth.uid() = id` |
| `profiles_insert_own` | INSERT | authenticated | CHECK: `auth.uid() = id` |

---

### categories

Product categories (Accessories, Beauty, Digital, Electronics, Fashion, Home).
Supports optional parent categories for subcategory hierarchies.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK**. |
| `name` | text | NO | — | Category display name. |
| `slug` | text | NO | — | **Unique**. URL-friendly identifier. |
| `description` | text | YES | — | Category description. |
| `image_url` | text | YES | — | Category thumbnail image. |
| `parent_id` | uuid | YES | — | Self-referencing FK to `categories(id)` ON DELETE SET NULL. |
| `created_at` | timestamptz | NO | `now()` | — |

**RLS:** Enabled. Publicly readable; admin-only writes.

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `categories_select_public` | SELECT | anon, authenticated | `true` |
| `categories_admin_write` | INSERT | authenticated | CHECK: `is_admin()` |
| `categories_admin_update` | UPDATE | authenticated | USING + CHECK: `is_admin()` |
| `categories_admin_delete` | DELETE | authenticated | USING: `is_admin()` |

---

### brands

Product brands displayed on the homepage brand strip and product pages.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK**. |
| `name` | text | NO | — | Brand display name. |
| `slug` | text | NO | — | **Unique**. URL-friendly identifier. |
| `logo_url` | text | YES | — | Brand logo image URL. |
| `country` | text | YES | — | Country of origin. |
| `created_at` | timestamptz | NO | `now()` | — |

**RLS:** Enabled. Publicly readable; admin-only writes.

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `brands_select_public` | SELECT | anon, authenticated | `true` |
| `brands_admin_write` | INSERT | authenticated | CHECK: `is_admin()` |
| `brands_admin_update` | UPDATE | authenticated | USING + CHECK: `is_admin()` |
| `brands_admin_delete` | DELETE | authenticated | USING: `is_admin()` |

---

### products

The main catalog entity. Stores pricing, stock, images, ratings, and merchandising flags.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK**. |
| `name` | text | NO | — | Product name. |
| `slug` | text | NO | — | **Unique**. URL-friendly identifier. |
| `description` | text | YES | — | Full product description. |
| `price` | numeric(10,2) | NO | — | Base price. Check: `>= 0`. |
| `discount_price` | numeric(10,2) | YES | — | Sale price. Check: `>= 0`. Must be < `price` to count as on-sale. |
| `stock` | integer | NO | `0` | Available quantity. Check: `>= 0`. |
| `sku` | text | YES | — | **Unique**. Stock keeping unit. |
| `category_id` | uuid | YES | — | FK → `categories(id)` ON DELETE SET NULL. |
| `brand_id` | uuid | YES | — | FK → `brands(id)` ON DELETE SET NULL. |
| `images` | jsonb | NO | `'[]'` | Array of image URL strings. |
| `rating` | numeric(2,1) | NO | `0` | Average rating (0–5). Updated by `recalc_product_rating()`. Check: 0–5. |
| `review_count` | integer | NO | `0` | Total review count. Updated by `recalc_product_rating()`. |
| `is_featured` | boolean | NO | `false` | Shown on homepage "Featured" section. |
| `is_bestseller` | boolean | NO | `false` | Shown on homepage "Best sellers" section. |
| `is_active` | boolean | NO | `true` | Visible in storefront. Inactive products are hidden. |
| `created_at` | timestamptz | NO | `now()` | — |
| `updated_at` | timestamptz | NO | `now()` | Updated on product edits. |

**Indexes:** `category_id`, `brand_id`, `slug`, `is_active`

**RLS:** Enabled. Publicly readable; admin-only writes.

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `products_select_public` | SELECT | anon, authenticated | `true` |
| `products_admin_write` | INSERT | authenticated | CHECK: `is_admin()` |
| `products_admin_update` | UPDATE | authenticated | USING + CHECK: `is_admin()` |
| `products_admin_delete` | DELETE | authenticated | USING: `is_admin()` |

---

### product_variations

Size/color/material variants for a product. Each variation has its own stock level
and optional price adjustment (added to the product's base price).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK**. |
| `product_id` | uuid | NO | — | FK → `products(id)` ON DELETE CASCADE. |
| `name` | text | NO | — | Variation group name (e.g. "Size", "Color"). |
| `value` | text | NO | — | Variation value (e.g. "M", "Black"). |
| `stock` | integer | NO | `0` | Per-variation stock. Check: `>= 0`. |
| `price_adjustment` | numeric(10,2) | NO | `0` | Amount added to base price (can be 0). |

**Indexes:** `product_id`

**RLS:** Enabled. Publicly readable; admin-only writes. Same pattern as `products`.

---

### reviews

Customer ratings (1–5 stars) and comments on products. Only the review author may
modify or delete their own review.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK**. |
| `product_id` | uuid | NO | — | FK → `products(id)` ON DELETE CASCADE. |
| `user_id` | uuid | NO | `auth.uid()` | FK → `auth.users(id)` ON DELETE CASCADE. |
| `rating` | integer | NO | — | Check: 1–5. |
| `comment` | text | YES | — | Review text body. |
| `created_at` | timestamptz | NO | `now()` | — |

**Indexes:** `product_id`

**RLS:** Enabled. Publicly readable; author-only writes.

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `reviews_select_public` | SELECT | anon, authenticated | `true` |
| `reviews_insert_own` | INSERT | authenticated | CHECK: `auth.uid() = user_id` |
| `reviews_update_own` | UPDATE | authenticated | USING + CHECK: `auth.uid() = user_id` |
| `reviews_delete_own` | DELETE | authenticated | USING: `auth.uid() = user_id` |

---

### testimonials

Homepage customer testimonials with avatar and star rating. Managed by admins.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK**. |
| `name` | text | NO | — | Customer name. |
| `role` | text | YES | — | Customer role/title (e.g. "Verified Buyer"). |
| `content` | text | NO | — | Testimonial text. |
| `avatar_url` | text | YES | — | Avatar image URL. |
| `rating` | integer | NO | `5` | Check: 1–5. |
| `created_at` | timestamptz | NO | `now()` | — |

**RLS:** Enabled. Publicly readable; admin-only writes.

---

### newsletter_subscribers

Email addresses collected from the homepage newsletter signup form.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK**. |
| `email` | text | NO | — | **Unique**. Subscriber email. |
| `created_at` | timestamptz | NO | `now()` | — |

**RLS:** Enabled. Anyone may subscribe (INSERT) or unsubscribe (DELETE); reads are admin-only.

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `newsletter_insert_public` | INSERT | anon, authenticated | `true` |
| `newsletter_delete_own_email` | DELETE | anon, authenticated | `true` |
| `newsletter_select_admin` | SELECT | authenticated | `is_admin()` |

---

### promotions

Discount codes (percentage off) with an active flag and optional validity window.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK**. |
| `code` | text | NO | — | **Unique**. Promo code string (e.g. `WELCOME10`). |
| `description` | text | YES | — | Human-readable description. |
| `discount_percent` | numeric(5,2) | NO | `0` | Percentage off (0–100). Check: 0–100. |
| `is_active` | boolean | NO | `true` | Whether the code can be redeemed. |
| `valid_until` | timestamptz | YES | — | Expiration timestamp. NULL = no expiry. |
| `created_at` | timestamptz | NO | `now()` | — |

**RLS:** Enabled. Publicly readable (needed for code validation at checkout); admin-only writes.

---

### addresses

Saved shipping addresses per customer.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK**. |
| `user_id` | uuid | NO | `auth.uid()` | FK → `auth.users(id)` ON DELETE CASCADE. |
| `label` | text | NO | `'Home'` | Address label (Home, Work, Other). |
| `full_name` | text | NO | — | Recipient name. |
| `street` | text | NO | — | Street address. |
| `city` | text | NO | — | City. |
| `postal_code` | text | NO | — | Postal/ZIP code. |
| `country` | text | NO | `'United States'` | Country. |
| `phone` | text | YES | — | Contact phone. |
| `is_default` | boolean | NO | `false` | Default shipping address flag. |
| `created_at` | timestamptz | NO | `now()` | — |

**Indexes:** `user_id`

**RLS:** Enabled. Owner-scoped — each user can only access their own addresses.

| Policy | Command | Role | Condition |
|--------|---------|------|-----------|
| `addresses_select_own` | SELECT | authenticated | `auth.uid() = user_id` |
| `addresses_insert_own` | INSERT | authenticated | CHECK: `auth.uid() = user_id` |
| `addresses_update_own` | UPDATE | authenticated | USING + CHECK: `auth.uid() = user_id` |
| `addresses_delete_own` | DELETE | authenticated | USING: `auth.uid() = user_id` |

---

### carts

One persistent cart per authenticated customer. Stores an optional promo code.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK**. |
| `user_id` | uuid | NO | `auth.uid()` | FK → `auth.users(id)` ON DELETE CASCADE. |
| `promo_code` | text | YES | — | Applied promo code reference. |
| `created_at` | timestamptz | NO | `now()` | — |
| `updated_at` | timestamptz | NO | `now()` | — |

**Indexes:** `user_id`

**RLS:** Enabled. Owner-scoped.

---

### cart_items

Line items within a cart. Stores a price snapshot for stable cart totals while shopping.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK**. |
| `cart_id` | uuid | NO | — | FK → `carts(id)` ON DELETE CASCADE. |
| `product_id` | uuid | NO | — | FK → `products(id)` ON DELETE CASCADE. |
| `variation_id` | uuid | YES | — | FK → `product_variations(id)` ON DELETE SET NULL. |
| `quantity` | integer | NO | `1` | Check: `> 0`. |
| `unit_price` | numeric(10,2) | NO | `0` | Price snapshot at time of add. |
| `created_at` | timestamptz | NO | `now()` | — |

**Indexes:** `cart_id`, `product_id`

**RLS:** Enabled. Scoped via parent cart ownership — policies use an `EXISTS` subquery
checking that the parent `carts.user_id` matches `auth.uid()`.

| Policy | Command | Condition |
|--------|---------|-----------|
| `cart_items_select_own` | SELECT | `EXISTS(SELECT 1 FROM carts WHERE carts.id = cart_id AND carts.user_id = auth.uid())` |
| `cart_items_insert_own` | INSERT | CHECK: same EXISTS predicate |
| `cart_items_update_own` | UPDATE | USING + CHECK: same EXISTS predicate |
| `cart_items_delete_own` | DELETE | USING: same EXISTS predicate |

---

### orders

Orders placed by a customer. Stores order status, payment status, totals, and a
shipping address snapshot (JSONB) captured at checkout time.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK**. |
| `user_id` | uuid | NO | `auth.uid()` | FK → `auth.users(id)` ON DELETE CASCADE. |
| `status` | text | NO | `'pending'` | Check: `pending`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`. |
| `payment_status` | text | NO | `'unpaid'` | Check: `unpaid`, `paid`, `refunded`, `failed`. |
| `payment_method` | text | YES | `'card'` | Payment method identifier. |
| `subtotal` | numeric(10,2) | NO | `0` | Sum of item prices before discount/shipping. |
| `discount` | numeric(10,2) | NO | `0` | Discount amount from promo code. |
| `shipping` | numeric(10,2) | NO | `0` | Shipping cost. |
| `total` | numeric(10,2) | NO | `0` | Final total = subtotal − discount + shipping. |
| `promo_code` | text | YES | — | Applied promo code (if any). |
| `shipping_address` | jsonb | YES | — | Snapshot of shipping address at checkout. |
| `created_at` | timestamptz | NO | `now()` | — |
| `updated_at` | timestamptz | NO | `now()` | — |

**Indexes:** `user_id`, `status`, `created_at DESC`

**RLS:** Enabled. Owner can read and create; admins can read and update all orders.

| Policy | Command | Condition |
|--------|---------|-----------|
| `orders_select_own_or_admin` | SELECT | `auth.uid() = user_id OR is_admin()` |
| `orders_insert_own` | INSERT | CHECK: `auth.uid() = user_id` |
| `orders_update_own_or_admin` | UPDATE | USING + CHECK: `auth.uid() = user_id OR is_admin()` |
| `orders_delete_own` | DELETE | USING: `auth.uid() = user_id` |

---

### order_items

Immutable line items of a placed order. Snapshots product name, image, and unit
price so historic orders stay accurate even if the catalog changes.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK**. |
| `order_id` | uuid | NO | — | FK → `orders(id)` ON DELETE CASCADE. |
| `product_id` | uuid | YES | — | FK → `products(id)` ON DELETE SET NULL. |
| `variation_id` | uuid | YES | — | FK → `product_variations(id)` ON DELETE SET NULL. |
| `product_name` | text | NO | — | Product name snapshot at purchase. |
| `product_image` | text | YES | — | Product image URL snapshot. |
| `variation_value` | text | YES | — | Variation display value. |
| `quantity` | integer | NO | — | Check: `> 0`. |
| `unit_price` | numeric(10,2) | NO | — | Unit price snapshot at purchase. |
| `created_at` | timestamptz | NO | `now()` | — |

**Indexes:** `order_id`

**RLS:** Enabled. Owner can read and create; admins can read. Scoped via parent order ownership.

| Policy | Command | Condition |
|--------|---------|-----------|
| `order_items_select_own_or_admin` | SELECT | `EXISTS(... orders.user_id = auth.uid()) OR is_admin()` |
| `order_items_insert_own` | INSERT | CHECK: `EXISTS(... orders.user_id = auth.uid())` |
| `order_items_update_own` | UPDATE | USING + CHECK: same EXISTS predicate |
| `order_items_delete_own` | DELETE | USING: same EXISTS predicate |

---

### wishlists

One wishlist per customer.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK**. |
| `user_id` | uuid | NO | `auth.uid()` | FK → `auth.users(id)` ON DELETE CASCADE. |
| `created_at` | timestamptz | NO | `now()` | — |

**Indexes:** `user_id`

**RLS:** Enabled. Owner-scoped.

---

### wishlist_items

Products a customer has saved to their wishlist. Enforces uniqueness of
(wishlist_id, product_id) so a product can't be saved twice.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | **PK**. |
| `wishlist_id` | uuid | NO | — | FK → `wishlists(id)` ON DELETE CASCADE. |
| `product_id` | uuid | NO | — | FK → `products(id)` ON DELETE CASCADE. |
| `created_at` | timestamptz | NO | `now()` | — |

**Indexes:** `wishlist_id`, unique `(wishlist_id, product_id)`

**RLS:** Enabled. Scoped via parent wishlist ownership.

---

## Database Functions

All functions are `SECURITY DEFINER` so they can read/update tables even when the
caller's RLS context would normally block it.

### `is_admin()`

```sql
is_admin() → boolean
```

Returns `true` if the currently authenticated user has `role = 'admin'` in the
`profiles` table. Used by every admin-gated RLS policy.

| Property | Value |
|----------|-------|
| Language | SQL |
| Volatility | STABLE |
| Security | SECURITY DEFINER |

### `handle_new_user()`

```sql
handle_new_user() → trigger
```

Trigger function that auto-creates a `profiles` row when a new user signs up via
Supabase Auth. Reads `full_name` and `avatar_url` from `raw_user_meta_data`.

| Property | Value |
|----------|-------|
| Language | PL/pgSQL |
| Security | SECURITY DEFINER |
| Fires | `AFTER INSERT ON auth.users` |

### `recalc_product_rating(p_product_id uuid)`

```sql
recalc_product_rating(p_product_id uuid) → void
```

Recomputes the `rating` (average) and `review_count` on a product from its reviews.
Called by the application after inserting or deleting a review.

| Property | Value |
|----------|-------|
| Language | PL/pgSQL |
| Security | SECURITY DEFINER |

### `decrement_stock(p_product_id uuid, p_qty integer)`

```sql
decrement_stock(p_product_id uuid, p_qty integer) → void
```

Reduces a product's `stock` by `p_qty`, clamped to zero (never goes negative).
Called during order placement for each line item.

| Property | Value |
|----------|-------|
| Language | PL/pgSQL |
| Security | SECURITY DEFINER |

---

## Triggers

| Trigger | Table | Timing | Function | Purpose |
|---------|-------|--------|----------|---------|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | `handle_new_user()` | Auto-creates a `profiles` row on signup. |

---

## Row Level Security Reference

RLS is **enabled on all 16 tables**. The policy model follows three patterns:

### Pattern 1: Public read, admin write (catalog tables)

Used by: `categories`, `brands`, `products`, `product_variations`, `testimonials`, `promotions`

- **SELECT** → `TO anon, authenticated USING (true)` — storefront works without login
- **INSERT/UPDATE/DELETE** → `TO authenticated` with `is_admin()` check

### Pattern 2: Owner-scoped (customer data)

Used by: `profiles`, `addresses`, `carts`, `wishlists`

- All commands → `TO authenticated` with `auth.uid() = user_id`
- Owner columns default to `auth.uid()` so inserts that omit `user_id` still pass `WITH CHECK`

### Pattern 3: Parent-scoped via EXISTS (line items)

Used by: `cart_items`, `order_items`, `wishlist_items`

- All commands → `TO authenticated` with an `EXISTS` subquery checking the parent's `user_id`
- `order_items` additionally allows admin read via `OR is_admin()`

### Pattern 4: Author-scoped (reviews)

Used by: `reviews`

- **SELECT** → public (`anon, authenticated`)
- **INSERT/UPDATE/DELETE** → author only (`auth.uid() = user_id`)

### Pattern 5: Open write, admin read (newsletter)

Used by: `newsletter_subscribers`

- **INSERT/DELETE** → `TO anon, authenticated` (anyone can subscribe/unsubscribe)
- **SELECT** → `TO authenticated` with `is_admin()` (protects subscriber privacy)

---

## Seed Data

The database is pre-seeded with demo content:

| Entity | Count | Examples |
|--------|-------|---------|
| Categories | 6 | Accessories, Beauty, Digital, Electronics, Fashion, Home |
| Brands | 8 | Aura, Kinto, Lumiere, Maison, Nordic Lab, Pulse, Sage & Co, Vertex |
| Products | 24 | Across all 6 categories with real Pexels images, pricing, stock |
| Product variations | 14 | Sizes (S–XL, 30–36) and colors for select products |
| Testimonials | 3 | Homepage customer reviews |
| Promotions | 2 | `WELCOME10` (10% off), `SAVE20` (20% off) |
