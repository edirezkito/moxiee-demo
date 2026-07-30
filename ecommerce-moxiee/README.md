# Moxiee — Premium Ecommerce Platform

A production-ready, full-stack ecommerce storefront and admin dashboard built with React, TypeScript, Tailwind CSS, and Supabase (PostgreSQL).

## Tech Stack

- **Frontend:** Vite + React 18 + TypeScript
- **Styling:** Tailwind CSS (custom design system, dark mode)
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **State:** Zustand (cart, toasts) + React Context (auth)
- **Forms:** React Hook Form patterns + Zod-ready validation
- **Charts:** Recharts (admin analytics)
- **Backend:** Supabase (PostgreSQL database, Auth, Storage, Row Level Security)
- **Routing:** React Router v6

## Features

### Storefront
- Homepage with hero, featured products, category grid, best sellers, sale section, brand partners, testimonials, and newsletter signup
- Shop page with search, category/brand/price filters, sorting, and pagination
- Product detail page with image gallery, variations (size/color), reviews, related products
- Cart drawer + full cart page with promo codes
- Checkout with shipping form, real Stripe payment (Card/Digital Wallet) or Cash on Delivery, and order confirmation emails
- Legal pages: Privacy Policy, Terms of Service, Refund/Return Policy (editable templates at `src/pages/legal/`)
- Customer authentication (sign up / sign in)
- Customer dashboard: profile, order history, order tracking, wishlist, address management

### Admin Dashboard
- Sales overview with revenue charts and order status breakdown
- Product management (full CRUD with category/brand assignment)
- Order management (status and payment updates)
- Customer list with order counts and lifetime value
- Category management (full CRUD)

### Database
- 16 tables with full Row Level Security
- Public read for catalog; owner-scoped for customer data; admin-gated for management
- Auto-created user profiles on signup
- Stock decrement on order placement
- Product rating recalculation after reviews

## Documentation

Detailed technical documentation is in the [`docs/`](./docs/README.md) directory:

- [Database Schema](./docs/DATABASE_SCHEMA.md) — all 16 tables, columns, relationships, indexes, RLS policies, functions, and triggers
- [API Reference](./docs/API_REFERENCE.md) — every data-access function with signatures, parameters, return types, and JSON examples

## Project Structure

```
src/
  components/      # Reusable UI components
    ui/            # Design system primitives (Button, Input, Card, etc.)
    layout/        # Header, Footer, CartDrawer, Layout shell
    product/       # ProductCard, HeartButton
  contexts/        # AuthContext
  hooks/           # useTheme, useWishlist
  lib/             # Supabase client, catalog API, commerce API, utils
  pages/           # Route-level pages
    account/       # Customer dashboard pages
    admin/         # Admin dashboard pages
  store/           # Zustand stores (cart, toast)
  types/           # TypeScript type definitions
```

## Getting Started

The Supabase database is pre-provisioned. Environment variables are in `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

```bash
npm install
npm run dev      # start dev server
npm run build    # production build
npm run lint     # type check
```

## Admin Access

To access the admin dashboard, a user's `profiles.role` must be set to `admin`. After creating an account via the sign-up page, update the role in the Supabase dashboard or via SQL:

```sql
UPDATE profiles SET role = 'admin' WHERE id = '<your-user-id>';
```

Then navigate to `/admin`.

## Demo Data

The database is seeded with:
- 6 categories (Accessories, Beauty, Digital, Electronics, Fashion, Home)
- 8 brands
- 24 products with real images, pricing, and stock
- 14 product variations (sizes, colors)
- 3 testimonials
- 2 promo codes (`WELCOME10`, `SAVE20`)
