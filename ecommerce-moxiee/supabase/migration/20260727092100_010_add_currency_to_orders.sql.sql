-- Moxiee ecommerce platform
-- Adds currency tracking to orders. `subtotal`/`discount`/`shipping`/
-- `tax`/`total` remain in USD (the store's base/bookkeeping currency) —
-- `currency` + `fx_rate` record what the customer actually saw/paid, so
-- the real charged amount can be reconstructed any time:
--   charged_amount = total * fx_rate  (in `currency`)
-- Run this after migration 009.

alter table public.orders
  add column if not exists currency text not null default 'USD',
  add column if not exists fx_rate numeric(12,6) not null default 1;
