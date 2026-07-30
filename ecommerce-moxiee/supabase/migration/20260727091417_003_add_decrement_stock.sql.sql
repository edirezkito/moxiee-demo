/*
# Add decrement_stock helper function

1. Purpose
   Provides a safe, atomic way to reduce a product's stock when an order is
   placed, without going negative. Called from the application's placeOrder
   flow for each line item.

2. New Functions
   - decrement_stock(p_product_id uuid, p_qty integer) — decreases the stock
     of the given product by p_qty, but never below zero. SECURITY DEFINER so
     it can update products regardless of the caller's RLS context.

3. Notes
   - Uses GREATEST to clamp at zero so concurrent orders can't drive stock
     negative.
   - Idempotent (CREATE OR REPLACE).
*/

create or replace function public.decrement_stock(p_product_id uuid, p_qty integer)
returns void
language plpgsql
security definer
as $$
begin
  update public.products
  set stock = greatest(0, stock - p_qty),
      updated_at = now()
  where id = p_product_id;
end;
$$;
