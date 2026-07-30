-- Moxiee ecommerce platform
-- Adds columns needed to look up and refund a Stripe payment later.
-- Run this AFTER migrations 001-005.

alter table public.orders
  add column if not exists stripe_session_id text,
  add column if not exists stripe_payment_intent_id text;

create index if not exists orders_stripe_session_id_idx on public.orders(stripe_session_id);
