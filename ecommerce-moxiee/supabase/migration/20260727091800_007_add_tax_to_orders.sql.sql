-- Moxiee ecommerce platform
-- Adds a "tax" column so we can record the tax amount Stripe Tax
-- calculates automatically at checkout. Run this after migration 006.

alter table public.orders
  add column if not exists tax numeric(10,2) not null default 0;
