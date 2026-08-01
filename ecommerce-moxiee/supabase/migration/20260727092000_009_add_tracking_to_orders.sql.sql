-- Moxiee ecommerce platform
-- Adds shipment tracking fields to orders, used by the new
-- Admin > Track Orders page. Run this after migration 008.

alter table public.orders
  add column if not exists tracking_number text,
  add column if not exists carrier text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz;
