# Welcome — Moxiee Ecommerce Setup Guide

This document helps you (the client) run this project in your own
environment. See `README.md` for full technical documentation (folder
structure, features, database schema).

## 1. Prerequisites
- Node.js version 18 or later
- A free Supabase account at https://supabase.com

## 2. Set Up Your Supabase Database
1. Create a new project in the Supabase Dashboard.
2. Open the **SQL Editor** menu.
3. Run the migration files in order from the `supabase/migration/` folder
   (run them in filename order, since tables depend on each other):
   - `20260727090950_001_create_catalog_and_profiles.sql.sql`
   - `20260727091039_002_create_commerce_tables.sql.sql`
   - `20260727091417_003_add_decrement_stock.sql.sql`
   - `20260727091500_004_seed_categories_and_brands.sql.sql`
   - `20260727091600_005_create_banners.sql.sql`
   - `20260727091700_006_add_stripe_refs_to_orders.sql.sql`
   - `20260727091800_007_add_tax_to_orders.sql.sql`
   - `20260727091900_008_create_product_images_bucket.sql.sql`
   - `20260727092000_009_add_tracking_to_orders.sql.sql`
   - `20260727092100_010_add_currency_to_orders.sql.sql`
   - `20260727091700_006_auto_admin_first_user.sql.sql`
4. Once the migrations complete, your database will have the full structure
   with Row Level Security (RLS) enabled, plus the 6 default categories,
   8 default brands, and 2 starter homepage banners pre-populated (in
   English, sorted alphabetically).

## 3. Configure Environment Variables
1. Copy `.env.example` to `.env`.
2. In the Supabase Dashboard, go to **Project Settings > API** and copy:
   - `Project URL` → paste into `VITE_SUPABASE_URL`
   - `anon public key` → paste into `VITE_SUPABASE_ANON_KEY`

## 4. Install & Run
```bash
npm install
npm run dev       # start the local development server
npm run build     # build for production
```

## 5. Setting Up Real Stripe Payments
This project processes real card payments through Stripe Checkout. Card
and Digital Wallet (Apple Pay/Google Pay) payments are handled by two
Supabase Edge Functions in `supabase/functions/`. Cash on Delivery does
not require any of this setup.

1. **Create a Stripe account** at https://stripe.com (use Test mode while
   setting up — no real charges happen in Test mode).
2. **Get your Secret Key**: Stripe Dashboard > Developers > API keys >
   copy the "Secret key" (starts with `sk_test_...`).
3. **Install the Supabase CLI** (if you don't have it):
   ```bash
   npm install -g supabase
   ```
4. **Link the CLI to your Supabase project**:
   ```bash
   supabase login
   supabase link --project-ref your-project-ref
   ```
   (`your-project-ref` is in your Supabase project URL:
   `https://<project-ref>.supabase.co`)
5. **Set the Stripe secret key as a function secret** (never put this in
   `.env` — it must stay server-side only):
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
   ```
6. **Deploy both functions**:
   ```bash
   supabase functions deploy stripe-checkout
   supabase functions deploy stripe-webhook
   supabase functions deploy stripe-refund
   ```
7. **Create the webhook in Stripe**: Stripe Dashboard > Developers >
   Webhooks > Add endpoint.
   - Endpoint URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   - Events to send: `checkout.session.completed` and
     `checkout.session.expired`
   - After creating it, copy the "Signing secret" (starts with `whsec_...`)
     and set it too:
     ```bash
     supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
     ```
8. **Test it**: run the app, add a product to your cart, choose Card at
   checkout, and use Stripe's test card `4242 4242 4242 4242` with any
   future expiry date and any 3-digit CVC.
9. **Go live**: once ready for real payments, switch your Stripe Dashboard
   out of Test mode, repeat steps 2–7 with your live keys, and re-deploy.

Note: order pricing (product price, stock, promo code discount) is
re-verified inside the `stripe-checkout` function using your database as
the source of truth — the browser is never trusted with the final amount
charged.

### Refunding an order
In Admin > Orders, any order paid via Card/Digital Wallet shows a
**"Refund via Stripe"** button once its payment status is "paid". Clicking
it issues a real refund through Stripe (full amount) and updates the
order's status automatically — only admins can do this. Cash on Delivery
orders have no Stripe transaction to refund, so those are handled outside
the app (e.g. bank transfer), and the payment status can still be updated
manually via the dropdown next to each order.

### Turning on Tax Calculation (Stripe Tax)
Card/Wallet checkout is already wired up to calculate tax automatically —
you just need to turn the feature on in Stripe:

1. Stripe Dashboard > **Settings > Tax** > follow the setup wizard to add
   your tax registrations (the countries/states where you're required to
   collect tax).
2. That's it — no code changes needed. Once enabled, Stripe shows the
   correct VAT/GST/sales tax live on the hosted Checkout page based on the
   address the customer enters, and the amount is saved back to the
   `tax` column on the order automatically.
3. Stripe Tax has its own small fee per transaction where it's active —
   check current pricing at https://stripe.com/tax before enabling.
4. If you skip this step, checkout still works fine — Stripe just charges
   $0 tax until you turn it on.

Note: this covers Card/Wallet orders only. Cash on Delivery orders are
not run through Stripe Tax, so no tax is calculated on those — factor
that into your COD pricing/policy if you offer it in a region with
mandatory sales tax.

### Cookie Consent Banner
A cookie consent banner (`src/components/layout/CookieConsentBanner.tsx`)
is already active on every page, offering "Essential only" or "Accept
all", and linking to the Privacy Policy. The visitor's choice is saved in
their browser (`localStorage`) and fires a `cookie-consent-change` event
you can listen for before loading any optional scripts, e.g.:
```ts
import { hasOptionalCookieConsent } from "@/components/layout/CookieConsentBanner";
if (hasOptionalCookieConsent()) {
  // initialize analytics, ad pixels, etc. here
}
```
The store's own essential cookies/local storage (cart, sign-in session)
work regardless of this choice, since those are required for the site to
function and don't need opt-in consent under GDPR/most privacy laws.

## 6. Setting Up Order Confirmation Emails
Order confirmation emails are sent through [Resend](https://resend.com), a
simple transactional email API. This step is optional — if you skip it,
the store still works fine, it just won't send emails.

1. **Create a free Resend account** at https://resend.com.
2. **Get your API key**: Resend Dashboard > API Keys > Create API Key.
3. **Set the secrets** (run this in the same terminal where you ran
   `supabase link` in the Stripe setup step above):
   ```bash
   supabase secrets set RESEND_API_KEY=re_...
   supabase secrets set EMAIL_FROM="Moxiee <orders@yourdomain.com>"
   supabase secrets set SITE_URL=https://your-store-domain.com
   ```
   - `EMAIL_FROM`: to send from your own domain, verify it in Resend
     Dashboard > Domains first. Until you do, you can use Resend's shared
     test address `onboarding@resend.dev` for `EMAIL_FROM`.
   - `SITE_URL`: used to build the "View your order" link inside the
     email. Use `http://localhost:5173` while testing locally.
4. **Deploy the two functions that send email**:
   ```bash
   supabase functions deploy stripe-webhook
   supabase functions deploy send-order-email
   ```
   (If you already deployed `stripe-webhook` in the Stripe setup step
   before adding `RESEND_API_KEY`, redeploy it so it picks up the secret.)
5. **Test it**: place a test order (Card or Cash on Delivery) — a
   confirmation email should arrive at the account's email address within
   a few seconds.

Card/wallet orders are emailed automatically once Stripe confirms payment
(triggered from `stripe-webhook`). Cash on Delivery orders are emailed
immediately after the order is placed (triggered from `send-order-email`,
called by the checkout page).

## 7. Creating an Admin Account
1. Sign up for a new account through the app's sign-up page (`/auth`),
   using the email/password you want to use as the store admin.
2. Open the Supabase Dashboard > **SQL Editor**.
3. Open `supabase/migration/promote_to_admin.sql`, replace the placeholder
   email with the email you just signed up with, and run it.
4. Log in again, then visit `/admin` to access the admin dashboard.

Note: there is no default/shared admin account included with this project.
Each store owner creates their own login and promotes it with the script
above — this keeps every store's admin credentials unique and secure,
rather than every buyer of this codebase sharing the same login.

## 8. Managing the Homepage from the Admin Dashboard
Every homepage section pulls live from the database — no code changes
needed:
- **Shop by category** — shows whatever categories exist in
  Admin > Categories.
- **Featured products** — check the "Featured" box on a product in
  Admin > Products.
- **Best sellers** — check the "Bestseller" box on a product in
  Admin > Products.
- **On sale this week** — fill in a "Discount price" lower than the
  regular price on a product in Admin > Products; it's automatically
  removed from this section once the discount price is cleared or raised
  back to the regular price.
- **Homepage banners** — managed separately in Admin > Banners.

## 9. Initial Data (Optional)
This project does not come pre-seeded with sample data (products/categories)
— add your first product through the admin dashboard once setup is complete.

## 10. Uploading Product Images
In Admin > Products, the image field is a drag-and-drop uploader — drag
image files in, or click to browse, and they're uploaded directly to
Supabase Storage (bucket `product-images`, created by migration 008). No
external image hosting needed. Accepts JPEG/PNG/WEBP/GIF up to 5MB each,
up to 6 images per product.

## 11. Tracking Shipments
Once you mark an order "Shipped" (from Admin > Orders' status dropdown,
or from Admin > Track Orders), it appears in **Admin > Track Orders** — a
dedicated view of everything currently in transit. From there you can:
- Enter a carrier name and tracking number (saved instantly).
- Get a one-click "Track on carrier site" link, auto-built for UPS,
  FedEx, USPS, DHL, JNE, and J&T (add more carriers by editing
  `CARRIER_TRACK_URLS` in `src/pages/admin/AdminTrackOrders.tsx`).
- See how many days an order has been in transit (flagged in red past 7
  days) so nothing silently falls through the cracks.
- Click "Mark delivered" once it arrives — this also removes it from the
  in-transit list.
The tracking number and carrier are shown to the customer on their own
order detail page too, once you've entered them.

## 12. Multi-Currency
A currency switcher (top-right of the header) lets shoppers browse and
check out in USD, EUR, GBP, CAD, AUD, SGD, or IDR. How it works:
- All prices in the database stay in **USD** — this is the store's single
  source of truth/bookkeeping currency. Everything else is a conversion
  layer on top.
- When a shopper picks a currency and pays with Card/Wallet, the
  `stripe-checkout` function converts the USD prices and creates the
  Stripe Checkout Session **in that currency** — Stripe genuinely charges
  the card in EUR/GBP/etc, not just displays a converted number. The
  `orders.currency` and `orders.fx_rate` columns record what was charged,
  while `orders.total`/`tax`/etc. stay in USD for consistent bookkeeping.
- Cash on Delivery orders record the selected currency for display/email
  purposes only — no card is charged, so there's nothing to convert there.

⚠️ **Before going live**: the exchange rates are static examples in
`src/lib/currency.ts` (frontend) and `supabase/functions/_shared/currency.ts`
(server) — **both files must be kept in sync**, and rates will drift from
real market rates over time. For production, either:
1. Replace both files' rates with a periodic fetch from a live FX API
   (e.g. exchangerate-api.com, Open Exchange Rates), cached for a few
   hours, or
2. Turn on Stripe's built-in **Adaptive Pricing** (Dashboard > Settings >
   Payments) as a simpler alternative for the Stripe-hosted checkout page
   specifically (though it won't affect prices shown on your own site
   pages the way this custom switcher does).

To add another currency: add an entry to both `CURRENCIES` objects (same
code, same rate) in the two files above.

## 13. Running Tests
This project includes both unit and end-to-end tests.

**Unit tests** (Vitest + React Testing Library) — cover pricing logic,
the cart store, and UI components:
```bash
npm test            # run once
npm run test:watch  # watch mode while developing
```

**End-to-end tests** (Playwright) — cover critical user flows in a real
browser (browsing, cart, checkout access, admin access control):
```bash
npx playwright install  # first time only, installs browser binaries
npm run test:e2e
```
E2E tests need a working `.env` (Section 3) since they run against the
real dev server and Supabase project — point them at a test/demo project,
not a real client's live store.

## 14. Deployment
This is a standard Vite application and can be deployed to platforms such as
Vercel, Netlify, or Cloudflare Pages. Make sure the `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` environment variables are also set in your chosen
hosting platform's dashboard.

Before (or right after) each deploy, regenerate the sitemap so search
engines can discover every product/category page, not just the static
ones:
```bash
SITE_URL=https://your-store-domain.com \
VITE_SUPABASE_URL=https://your-project-ref.supabase.co \
VITE_SUPABASE_ANON_KEY=your-anon-key \
npm run generate:sitemap
```
This overwrites `public/sitemap.xml` with every active product and
category URL, then commit/redeploy so the updated file goes live. (A
static fallback sitemap with just the core pages already ships in
`public/sitemap.xml`, so the site works fine even before you run this.)

## 15. Setting Up a Public Demo (for selling this template)
If you're using this project as a live preview to sell to buyers (Envato,
Gumroad, Fiverr, your own site, etc.), set up an **entirely separate demo
deployment** — never point a public demo at a real client's project.

1. **Create a dedicated demo Supabase project** (separate from any real
   client's project) and run through Sections 2, 5, and 6 above using it.
   Keep Stripe in **Test mode permanently** for this project — never
   switch the demo to live keys.
2. **Populate it with sample products**: run
   `supabase/migration/optional_demo_sample_products.sql` in the Supabase
   SQL Editor (after the numbered migrations) to add 12 sample products
   across all categories/brands, so the demo doesn't look empty.
3. **Deploy it** to Vercel or Netlify:
   - Push this project to your own GitHub repository first.
   - [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_GITHUB_REPO_URL) —
     replace `YOUR_GITHUB_REPO_URL` with your repo's URL, or just import
     the repo manually from the Vercel dashboard.
   - Or use Netlify: Netlify Dashboard > Add new site > Import an existing
     project > pick your repo.
   - Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
     `VITE_DEMO_MODE=true` as environment variables on the hosting
     platform.
4. **`VITE_DEMO_MODE=true`** turns on a banner telling visitors it's a
   live demo and gives them the Stripe test card number, so they feel safe
   trying checkout instead of being afraid to "break" something — this
   noticeably increases buyer trust and engagement with a public preview.
5. **Create a demo admin account** (Section 7 above) using a throwaway
   email, and consider sharing those demo credentials openly in your
   marketplace listing (e.g. "Try the admin dashboard: demo@example.com /
   Demo1234!") — letting buyers explore Admin > Products, Orders, Brands,
   and Banners themselves is one of the strongest trust signals you can
   offer, and it's a demo project with fake data, so there's nothing
   sensitive to protect.
6. **Reset periodically**: since anyone can place test orders or (if you
   share the admin login) edit demo products, consider re-running the
   sample data script every so often, or writing a small cron/edge
   function to reset the demo database on a schedule if it sees heavy
   traffic.

## 16. Changing the Store Logo
The logo shown in the header and footer is the image file at
`public/logo.png`. To replace it:
1. Prepare your new logo image (square shape works best, transparent
   background recommended).
2. Replace `public/logo.png` with your file — keep the exact same filename
   (`logo.png`), or update the `src="/logo.png"` reference in
   `src/components/layout/Header.tsx` and
   `src/components/layout/Footer.tsx` if you use a different filename.
3. To also update the browser tab icon, replace `public/favicon.svg`
   (SVG format) or update the `<link rel="icon">` tag in `index.html` to
   point to your new file.

## License & Support
Use of this project is governed by the `LICENSE` file included in this
package. For questions, additional customization, or license upgrades,
please contact the developer.
