-- Moxiee ecommerce platform
-- Promote an existing account to admin.
--
-- HOW TO USE:
-- 1. Sign up for a normal account on the website first (via the "/auth"
--    sign-up page), using the email you want to use as the store admin.
-- 2. Open Supabase Dashboard > SQL Editor.
-- 3. Replace 'admin@yourstore.com' below with that exact email address.
-- 4. Run this script.
-- 5. Log out and log back in on the website, then visit "/admin".
--
-- Why not a ready-made admin account out of the box? Shipping the same
-- hardcoded admin email/password with every sale of this source code would
-- mean every buyer shares the same admin login — a serious security risk.
-- This script keeps the one-step simplicity while letting each store owner
-- use their own unique email and password.

update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'admin@yourstore.com'
);

-- Sanity check: confirms exactly 1 row was updated. If this returns 0,
-- double-check the email matches the account you signed up with.
select id, full_name, role
from public.profiles
where id = (select id from auth.users where email = 'admin@yourstore.com');
