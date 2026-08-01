-- Moxiee ecommerce platform
-- OPTIONAL safety net: automatically cancels "pending"/"unpaid" orders
-- older than 24 hours, in case a Stripe webhook delivery was ever missed
-- (rare, but possible — network blips, temporary outages, etc).
--
-- Not required — the checkout.session.expired webhook already cancels
-- abandoned orders within ~30 minutes in the normal case, and Admin >
-- Orders already shows an "Abandoned" badge with a manual cancel button.
-- Run this only if you want a fully automatic backup on top of that.
--
-- REQUIRES the pg_cron extension, which isn't available on every Supabase
-- plan. Enable it first: Supabase Dashboard > Database > Extensions >
-- search "pg_cron" > Enable. If it's not available on your plan, skip
-- this file — the app works fine without it.

create extension if not exists pg_cron with schema extensions;

create or replace function public.cancel_abandoned_orders()
returns void
language plpgsql
security definer
as $$
begin
  update public.orders
  set status = 'cancelled', payment_status = 'failed', updated_at = now()
  where status = 'pending'
    and payment_status = 'unpaid'
    and created_at < now() - interval '24 hours';
end;
$$;

-- Runs once every hour.
select cron.schedule(
  'cancel-abandoned-orders-hourly',
  '0 * * * *',
  $$select public.cancel_abandoned_orders();$$
);

-- To remove this scheduled job later:
--   select cron.unschedule('cancel-abandoned-orders-hourly');
