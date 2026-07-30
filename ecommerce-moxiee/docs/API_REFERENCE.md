# Moxiee — API Reference

The Moxiee frontend communicates with the Supabase backend through two data-access
modules: `catalogApi.ts` (catalog, reviews, promotions, newsletter) and
`commerceApi.ts` (cart, orders, addresses, wishlist). All functions use the Supabase
JavaScript client with the anon key, and Row Level Security enforces authorization
on every query.

This document covers every exported function: its signature, parameters, return
type, the underlying Supabase query, and which RLS policy governs it.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication API](#authentication-api)
3. [Catalog API (`catalogApi.ts`)](#catalog-api-catalogapits)
   - [Categories](#categories)
   - [Brands](#brands)
   - [Products](#products)
   - [Testimonials](#testimonials)
   - [Promotions](#promotions)
   - [Reviews](#reviews)
   - [Newsletter](#newsletter)
   - [Admin: Product CRUD](#admin-product-crud)
   - [Admin: Category CRUD](#admin-category-crud)
4. [Commerce API (`commerceApi.ts`)](#commerce-api-commerceapits)
   - [Addresses](#addresses)
   - [Cart](#cart)
   - [Orders](#orders)
   - [Wishlist](#wishlist)
   - [Admin: Customers](#admin-customers)
5. [Server Functions (RPC)](#server-functions-rpc)
6. [Error Handling](#error-handling)
7. [JSON Data Structures](#json-data-structures)

---

## Architecture Overview

```
React Components
       │
       ├── catalogApi.ts ──┐
       ├── commerceApi.ts ─┤
       ├── cartStore.ts ───┼──→ supabase.ts (singleton client)
       └── AuthContext ────┘          │
                                       ▼
                              Supabase PostgreSQL
                              (RLS-enforced queries)
```

**All data access goes through the Supabase client.** There are no REST endpoints to
maintain — Supabase's PostgREST API auto-generates CRUD endpoints from the database
schema, and the client SDK provides type-safe query builders. RLS policies enforce
authorization at the database level, so the same client safely handles both public
reads and authenticated writes.

### Client Configuration

```typescript
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

Environment variables (pre-populated in `.env`):
- `VITE_SUPABASE_URL` — project URL
- `VITE_SUPABASE_ANON_KEY` — anon/public key (safe for client-side use)

---

## Authentication API

Authentication is handled by Supabase Auth via the `AuthContext` provider
(`src/contexts/AuthContext.tsx`). It wraps the Supabase client methods and exposes
them through the `useAuth()` hook.

### `signUp(email, password, fullName)`

Creates a new user account. A `profiles` row is auto-created by the
`handle_new_user()` database trigger.

```typescript
const { error } = await signUp("jane@example.com", "securepass", "Jane Doe");
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | User email. |
| `password` | string | Yes | Password (min 6 characters). |
| `fullName` | string | Yes | Display name, stored in `raw_user_meta_data`. |

**Returns:** `{ error: string | null }`

**Underlying call:** `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`

### `signIn(email, password)`

Signs in an existing user with email and password.

```typescript
const { error } = await signIn("jane@example.com", "securepass");
```

**Returns:** `{ error: string | null }`

**Underlying call:** `supabase.auth.signInWithPassword({ email, password })`

### `signOut()`

Signs out the current user and clears the session.

```typescript
await signOut();
```

**Underlying call:** `supabase.auth.signOut()`

### `useAuth()` Hook

```typescript
const { user, profile, isLoading, isAdmin, signUp, signIn, signOut, refreshProfile } = useAuth();
```

| Property | Type | Description |
|----------|------|-------------|
| `session` | Session \| null | Current Supabase auth session. |
| `user` | User \| null | Current authenticated user object. |
| `profile` | Profile \| null | Public profile row from `profiles` table. |
| `isLoading` | boolean | True during initial session/profile load. |
| `isAdmin` | boolean | `true` if `profile.role === 'admin'`. |
| `refreshProfile` | () => Promise<void> | Reloads the profile from the database. |

**Session management:** The context subscribes to `onAuthStateChange` and loads the
profile whenever the session changes. Async work inside the callback is wrapped in an
IIFE to avoid the Supabase deadlock gotcha.

---

## Catalog API (`catalogApi.ts`)

### Categories

#### `fetchCategories()`

Retrieves all product categories, ordered by name.

```typescript
const categories = await fetchCategories();
```

**Returns:** `Promise<Category[]>`

**Query:** `SELECT * FROM categories ORDER BY name`
**RLS:** `categories_select_public` (anon + authenticated)

---

#### `fetchCategoryBySlug(slug)`

Retrieves a single category by its URL slug.

```typescript
const category = await fetchCategoryBySlug("fashion");
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | string | Category slug. |

**Returns:** `Promise<Category | null>`

**Query:** `SELECT * FROM categories WHERE slug = $1` (via `.maybeSingle()`)
**RLS:** `categories_select_public`

---

### Brands

#### `fetchBrands()`

Retrieves all brands, ordered by name.

```typescript
const brands = await fetchBrands();
```

**Returns:** `Promise<Brand[]>`

**Query:** `SELECT * FROM brands ORDER BY name`
**RLS:** `brands_select_public`

---

### Products

#### `fetchProducts(query)`

The primary product listing function. Supports search, category/brand filtering,
price range, sale-only filter, sorting, and pagination. Used by the Shop page and
homepage sections.

```typescript
const { items, total } = await fetchProducts({
  search: "headphones",
  categorySlug: "electronics",
  sortBy: "price-asc",
  page: 1,
  perPage: 12,
});
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | — | Full-text search across name, description, SKU. |
| `categorySlug` | string | — | Filter by category slug. |
| `brandSlug` | string | — | Filter by brand slug. |
| `featured` | boolean | — | Only `is_featured = true` products. |
| `bestseller` | boolean | — | Only `is_bestseller = true` products. |
| `onSale` | boolean | — | Only products where `discount_price < price`. |
| `minPrice` | number | — | Minimum price (inclusive). |
| `maxPrice` | number | — | Maximum price (inclusive). |
| `sortBy` | enum | `"newest"` | `newest`, `price-asc`, `price-desc`, `rating`, `popular` |
| `page` | number | `1` | Page number (1-indexed). |
| `perPage` | number | `12` | Items per page. |

**Returns:** `Promise<{ items: Product[]; total: number }>`

**Query:** `SELECT *, category:categories(*), brand:brands(*) FROM products WHERE is_active = true [filters] [sort] RANGE $from, $to`
**RLS:** `products_select_public`

**Sort options:**

| Value | ORDER BY |
|-------|----------|
| `newest` | `created_at DESC` |
| `price-asc` | `price ASC` |
| `price-desc` | `price DESC` |
| `rating` | `rating DESC` |
| `popular` | `review_count DESC` |

---

#### `fetchProductBySlug(slug)`

Retrieves a single product with its category, brand, and variations. Used by the
Product Detail page.

```typescript
const product = await fetchProductBySlug("nordic-wireless-headphones");
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | string | Product slug. |

**Returns:** `Promise<Product | null>`

**Query:** `SELECT *, category:categories(*), brand:brands(*), product_variations(*) FROM products WHERE slug = $1`
**RLS:** `products_select_public`

---

#### `fetchRelatedProducts(product, limit)`

Retrieves products in the same category (excluding the current product). Used by
the "You may also like" section on the Product Detail page.

```typescript
const related = await fetchRelatedProducts(product, 4);
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `product` | Product | — | The product to find related items for. |
| `limit` | number | `4` | Max items to return. |

**Returns:** `Promise<Product[]>`

**Query:** `SELECT *, category:categories(*), brand:brands(*) FROM products WHERE is_active = true AND category_id = $1 AND id != $2 LIMIT $3`
**RLS:** `products_select_public`

---

#### `fetchFeaturedProducts(limit)`

Retrieves featured products for the homepage.

```typescript
const featured = await fetchFeaturedProducts(8);
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | `8` | Max items. |

**Returns:** `Promise<Product[]>`

**Query:** `... WHERE is_active = true AND is_featured = true LIMIT $1`
**RLS:** `products_select_public`

---

#### `fetchBestsellers(limit)`

Retrieves bestseller products for the homepage.

```typescript
const bestsellers = await fetchBestsellers(8);
```

**Returns:** `Promise<Product[]>`

**Query:** `... WHERE is_active = true AND is_bestseller = true LIMIT $1`
**RLS:** `products_select_public`

---

#### `fetchOnSaleProducts(limit)`

Retrieves products with an active discount for the homepage sale section.

```typescript
const onSale = await fetchOnSaleProducts(8);
```

**Returns:** `Promise<Product[]>`

**Query:** `... WHERE is_active = true AND discount_price IS NOT NULL AND discount_price < price LIMIT $1`
**RLS:** `products_select_public`

---

### Testimonials

#### `fetchTestimonials()`

Retrieves all homepage testimonials, newest first.

```typescript
const testimonials = await fetchTestimonials();
```

**Returns:** `Promise<Testimonial[]>`

**Query:** `SELECT * FROM testimonials ORDER BY created_at DESC`
**RLS:** `testimonials_select_public`

---

### Promotions

#### `fetchPromotionByCode(code)`

Validates a promo code at checkout. Looks up by uppercase code, must be active.

```typescript
const promo = await fetchPromotionByCode("welcome10");
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Promo code string. Automatically uppercased. |

**Returns:** `Promise<Promotion | null>`

**Query:** `SELECT * FROM promotions WHERE code = $1 AND is_active = true`
**RLS:** `promotions_select_public`

---

### Reviews

#### `fetchProductReviews(productId)`

Retrieves all reviews for a product, newest first. Joins the reviewer's profile
(name, avatar) for display.

```typescript
const reviews = await fetchProductReviews(productId);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `productId` | string | Product UUID. |

**Returns:** `Promise<Review[]>`

**Query:** `SELECT *, profiles:profiles(full_name, avatar_url) FROM reviews WHERE product_id = $1 ORDER BY created_at DESC`
**RLS:** `reviews_select_public`

---

#### `createReview(input)`

Creates a new product review and triggers a server-side rating recalculation.

```typescript
await createReview({
  productId: "abc-123",
  userId: "def-456",
  rating: 5,
  comment: "Excellent product!",
});
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `input.productId` | string | Product UUID. |
| `input.userId` | string | Authenticated user UUID. |
| `input.rating` | number | Star rating (1–5). |
| `input.comment` | string | Review text. |

**Returns:** `Promise<void>`

**Operations:**
1. `INSERT INTO reviews (product_id, user_id, rating, comment)`
2. `RPC recalc_product_rating(p_product_id)` — updates the product's avg rating

**RLS:** `reviews_insert_own` (CHECK: `auth.uid() = user_id`)

---

### Newsletter

#### `subscribeNewsletter(email)`

Adds an email to the newsletter subscribers list. Uses upsert to avoid duplicates.

```typescript
await subscribeNewsletter("jane@example.com");
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `email` | string | Subscriber email. |

**Returns:** `Promise<void>`

**Query:** `INSERT INTO newsletter_subscribers (email) ON CONFLICT (email) DO NOTHING`
**RLS:** `newsletter_insert_public`

---

### Admin: Product CRUD

These functions require an authenticated admin session (`is_admin()` returns true).

#### `createProduct(input)`

```typescript
const product = await createProduct({
  name: "New Product",
  slug: "new-product",
  price: 99.00,
  stock: 50,
  images: ["https://..."],
  // ...all Product fields except id, created_at, updated_at
});
```

**Returns:** `Promise<Product>`

**RLS:** `products_admin_write` (CHECK: `is_admin()`)

---

#### `updateProduct(id, patch)`

```typescript
await updateProduct("product-uuid", { price: 79.00, stock: 30 });
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Product UUID. |
| `patch` | Partial<Product> | Fields to update. `updated_at` is auto-set. |

**Returns:** `Promise<void>`

**RLS:** `products_admin_update` (USING + CHECK: `is_admin()`)

---

#### `deleteProduct(id)`

```typescript
await deleteProduct("product-uuid");
```

**Returns:** `Promise<void>`

**RLS:** `products_admin_delete` (USING: `is_admin()`)

---

### Admin: Category CRUD

#### `createCategory(input)`

```typescript
await createCategory({ name: "Sports", slug: "sports", description: "Sporting goods" });
```

**RLS:** `categories_admin_write`

#### `updateCategory(id, patch)`

```typescript
await updateCategory("cat-uuid", { name: "Sports & Outdoors" });
```

**RLS:** `categories_admin_update`

#### `deleteCategory(id)`

```typescript
await deleteCategory("cat-uuid");
```

**RLS:** `categories_admin_delete`

---

## Commerce API (`commerceApi.ts`)

### Addresses

#### `fetchAddresses(userId)`

Retrieves all saved addresses for a user, default address first.

```typescript
const addresses = await fetchAddresses(user.id);
```

**Returns:** `Promise<Address[]>`

**Query:** `SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC`
**RLS:** `addresses_select_own`

---

#### `createAddress(input)`

Creates a new address. If `is_default` is true, resets all other addresses to
non-default first.

```typescript
await createAddress({
  user_id: user.id,
  label: "Home",
  full_name: "Jane Doe",
  street: "123 Main St",
  city: "New York",
  postal_code: "10001",
  country: "United States",
  is_default: true,
});
```

**Returns:** `Promise<void>`

**Operations:**
1. If `is_default`: `UPDATE addresses SET is_default = false WHERE user_id = $1`
2. `INSERT INTO addresses (...)`

**RLS:** `addresses_insert_own`

---

#### `updateAddress(id, patch, userId)`

Updates an existing address. Handles default-flag reset.

```typescript
await updateAddress("addr-uuid", { city: "Brooklyn", is_default: true }, user.id);
```

**RLS:** `addresses_update_own`

---

#### `deleteAddress(id)`

```typescript
await deleteAddress("addr-uuid");
```

**RLS:** `addresses_delete_own`

---

### Cart

#### `fetchCartWithProducts(userId)`

Retrieves the user's cart items with full product details, category, and brand
joins. Returns empty array if no cart exists.

```typescript
const items = await fetchCartWithProducts(user.id);
```

**Returns:** `Promise<CartItem[]>`

**Operations:**
1. `SELECT id FROM carts WHERE user_id = $1` (`.maybeSingle()`)
2. `SELECT *, product:products(*, category:categories(*), brand:brands(*)), variation:product_variations(*) FROM cart_items WHERE cart_id = $1`

**RLS:** `carts_select_own`, `cart_items_select_own`

---

### Orders

#### `fetchUserOrders(userId)`

Retrieves all orders for a customer with their line items, newest first.

```typescript
const orders = await fetchUserOrders(user.id);
```

**Returns:** `Promise<Order[]>`

**Query:** `SELECT *, order_items(*) FROM orders WHERE user_id = $1 ORDER BY created_at DESC`
**RLS:** `orders_select_own_or_admin`

---

#### `fetchOrderById(orderId, userId)`

Retrieves a single order with line items. Scoped to the owning user.

```typescript
const order = await fetchOrderById("order-uuid", user.id);
```

**Returns:** `Promise<Order | null>`

**RLS:** `orders_select_own_or_admin`, `order_items_select_own_or_admin`

---

#### `fetchAllOrders()`

Admin function — retrieves all orders across all customers.

```typescript
const allOrders = await fetchAllOrders();
```

**Returns:** `Promise<Order[]>`

**RLS:** `orders_select_own_or_admin` (admin branch via `is_admin()`)

---

#### `updateOrderStatus(orderId, status, paymentStatus?)`

Admin function — updates an order's status and optionally its payment status.

```typescript
await updateOrderStatus("order-uuid", "shipped", "paid");
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `orderId` | string | Order UUID. |
| `status` | OrderStatus | New order status. |
| `paymentStatus` | PaymentStatus? | Optional new payment status. |

**Returns:** `Promise<void>`

**RLS:** `orders_update_own_or_admin`

---

#### `placeOrder(input)`

The core checkout function. Creates an order, inserts line items, decrements stock,
and clears the server cart. This is a multi-step operation.

```typescript
const order = await placeOrder({
  userId: user.id,
  items: [{ product, variationId: null, quantity: 2, unitPrice: 49.00 }],
  subtotal: 98.00,
  discount: 9.80,
  shipping: 0,
  total: 88.20,
  promoCode: "WELCOME10",
  paymentMethod: "card",
  shippingAddress: {
    full_name: "Jane Doe",
    street: "123 Main St",
    city: "New York",
    postal_code: "10001",
    country: "United States",
  },
});
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `input.userId` | string | Authenticated user UUID. |
| `input.items` | array | Line items with product, variation, quantity, unit price. |
| `input.subtotal` | number | Sum of item prices. |
| `input.discount` | number | Discount amount from promo code. |
| `input.shipping` | number | Shipping cost. |
| `input.total` | number | Final total. |
| `input.promoCode` | string \| null | Applied promo code. |
| `input.paymentMethod` | string | Payment method identifier. |
| `input.shippingAddress` | object | Shipping address snapshot (stored as JSONB). |

**Returns:** `Promise<Order>` — the created order with its ID.

**Operations (in order):**
1. `INSERT INTO orders (...)` → returns the new order row
2. `INSERT INTO order_items (...)` — one row per line item, with product name/image/price snapshots
3. For each item: `RPC decrement_stock(p_product_id, p_qty)` — reduces product stock
4. `DELETE FROM cart_items WHERE cart_id = $1` — clears the server cart

**RLS:** `orders_insert_own`, `order_items_insert_own`, cart delete via `cart_items_delete_own`

---

### Wishlist

#### `fetchWishlist(userId)`

Retrieves the user's wishlist with full product details.

```typescript
const items = await fetchWishlist(user.id);
```

**Returns:** `Promise<{ id: string; product: Product }[]>`

**Operations:**
1. `SELECT id FROM wishlists WHERE user_id = $1` (`.maybeSingle()`)
2. `SELECT *, product:products(*, category:categories(*), brand:brands(*)) FROM wishlist_items WHERE wishlist_id = $1`

**RLS:** `wishlists_select_own`, `wishlist_items_select_own`

---

#### `addToWishlist(userId, productId)`

Adds a product to the user's wishlist. Creates a wishlist row if one doesn't exist.
Uses upsert to prevent duplicates.

```typescript
await addToWishlist(user.id, "product-uuid");
```

**Returns:** `Promise<void>`

**Operations:**
1. `SELECT id FROM wishlists WHERE user_id = $1` — check for existing wishlist
2. If none: `INSERT INTO wishlists (user_id) RETURNING id`
3. `UPSERT INTO wishlist_items (wishlist_id, product_id) ON CONFLICT DO NOTHING`

**RLS:** `wishlists_insert_own`, `wishlist_items_insert_own`

---

#### `removeFromWishlist(itemId)`

Removes a single wishlist item.

```typescript
await removeFromWishlist("item-uuid");
```

**Returns:** `Promise<void>`

**RLS:** `wishlist_items_delete_own`

---

### Admin: Customers

#### `fetchAllProfiles()`

Admin function — retrieves all user profiles for the customer management page.

```typescript
const profiles = await fetchAllProfiles();
```

**Returns:** `Promise<Profile[]>`

**Query:** `SELECT * FROM profiles ORDER BY created_at DESC`
**RLS:** `profiles_select_own_or_admin` (admin branch via `is_admin()`)

---

## Server Functions (RPC)

These are PostgreSQL functions called via `supabase.rpc()`. They are `SECURITY DEFINER`
so they bypass RLS to perform their work.

### `recalc_product_rating(p_product_id)`

Recalculates a product's `rating` and `review_count` from its reviews. Called after
each review insert.

```typescript
await supabase.rpc("recalc_product_rating", { p_product_id: productId });
```

### `decrement_stock(p_product_id, p_qty)`

Reduces a product's stock by the given quantity, clamped to zero. Called during
order placement.

```typescript
await supabase.rpc("decrement_stock", { p_product_id: productId, p_qty: quantity });
```

### `is_admin()`

Checks if the current user is an admin. Used internally by RLS policies — not called
directly from the frontend.

---

## Error Handling

All API functions follow a consistent error-handling pattern:

```typescript
const { data, error } = await supabase.from("table").select("*");
if (error) throw error;
return data;
```

Callers (page components) wrap calls in `try/catch` and surface errors via the toast
system:

```typescript
try {
  await createReview({ ... });
  toast.success("Review posted", "Thanks for your feedback!");
} catch (err) {
  toast.error("Could not post review", err?.message);
}
```

**Key patterns:**

- `.maybeSingle()` is used for single-row queries that may return zero rows (returns `null` instead of throwing).
- `.single()` is used only when a row is guaranteed to exist (e.g., after an insert with `.select()`).
- RPC errors are logged as warnings (non-blocking) when they're secondary operations like stock decrement.

---

## JSON Data Structures

These are the TypeScript interfaces used throughout the API layer. They mirror the
database columns and are defined in `src/types/index.ts`.

### Product

```json
{
  "id": "uuid",
  "name": "Aura Wool Overcoat",
  "slug": "aura-wool-overcoat",
  "description": "A timeless wool-blend overcoat...",
  "price": 289.00,
  "discount_price": 219.00,
  "stock": 32,
  "sku": "AUR-WC-001",
  "category_id": "uuid",
  "brand_id": "uuid",
  "images": ["https://images.pexels.com/..."],
  "rating": 4.8,
  "review_count": 24,
  "is_featured": true,
  "is_bestseller": true,
  "is_active": true,
  "created_at": "2026-07-27T09:00:00Z",
  "updated_at": "2026-07-27T09:00:00Z",
  "category": { "id": "uuid", "name": "Fashion", "slug": "fashion", ... },
  "brand": { "id": "uuid", "name": "Aura", "slug": "aura", ... }
}
```

### Category

```json
{
  "id": "uuid",
  "name": "Fashion",
  "slug": "fashion",
  "description": "Clothing, footwear, and accessories.",
  "image_url": "https://...",
  "parent_id": null,
  "created_at": "2026-07-27T09:00:00Z"
}
```

### Order

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "status": "processing",
  "payment_status": "paid",
  "payment_method": "card",
  "subtotal": 289.00,
  "discount": 28.90,
  "shipping": 0,
  "total": 260.10,
  "promo_code": "WELCOME10",
  "shipping_address": {
    "full_name": "Jane Doe",
    "street": "123 Main St",
    "city": "New York",
    "postal_code": "10001",
    "country": "United States"
  },
  "created_at": "2026-07-27T10:00:00Z",
  "updated_at": "2026-07-27T10:00:00Z",
  "order_items": [ { "id": "uuid", "product_name": "...", "quantity": 1, "unit_price": 289.00, ... } ]
}
```

### Review

```json
{
  "id": "uuid",
  "product_id": "uuid",
  "user_id": "uuid",
  "rating": 5,
  "comment": "Excellent quality!",
  "created_at": "2026-07-27T11:00:00Z",
  "profiles": { "full_name": "Jane Doe", "avatar_url": null }
}
```

### CartItem

```json
{
  "id": "uuid",
  "cart_id": "uuid",
  "product_id": "uuid",
  "variation_id": "uuid",
  "quantity": 2,
  "unit_price": 219.00,
  "created_at": "2026-07-27T09:00:00Z",
  "product": { "id": "uuid", "name": "...", "price": 289.00, ... },
  "variation": { "id": "uuid", "name": "Size", "value": "M", "stock": 12, ... }
}
```

### Promotion

```json
{
  "id": "uuid",
  "code": "WELCOME10",
  "description": "10% off your first order",
  "discount_percent": 10.00,
  "is_active": true,
  "valid_until": "2027-07-27T09:00:00Z",
  "created_at": "2026-07-27T09:00:00Z"
}
```
