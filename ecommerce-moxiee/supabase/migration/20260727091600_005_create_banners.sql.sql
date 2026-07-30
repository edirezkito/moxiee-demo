/*
  # Add homepage banners table

  Lets admins manage the homepage hero banners (previously hardcoded in
  HomePage.tsx) directly from the admin dashboard, without touching code.

  - banners — image, title, subtitle, optional link, sort order, active flag.
  - Public read (storefront needs it without login), admin-gated write —
    same pattern as categories/brands.
*/

create table if not exists public.banners (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  subtitle    text,
  image_url   text not null,
  link_url    text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.banners enable row level security;

drop policy if exists "banners_select_public" on public.banners;
create policy "banners_select_public"
  on public.banners for select
  to anon, authenticated using (true);

drop policy if exists "banners_admin_write" on public.banners;
create policy "banners_admin_write"
  on public.banners for insert
  to authenticated with check (public.is_admin());

drop policy if exists "banners_admin_update" on public.banners;
create policy "banners_admin_update"
  on public.banners for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "banners_admin_delete" on public.banners;
create policy "banners_admin_delete"
  on public.banners for delete
  to authenticated using (public.is_admin());

-- Seed with the 4 images that used to be hardcoded on the homepage, so the
-- storefront looks the same immediately after this migration runs.
insert into public.banners (title, subtitle, image_url, sort_order) values
  ('New Season Arrivals', 'Discover the latest drops', 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=500', 1),
  ('Shop the Look', 'Curated outfits for every occasion', 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=500', 2),
  ('Home Essentials', 'Refresh your space', 'https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg?auto=compress&cs=tinysrgb&w=500', 3),
  ('Tech & Gadgets', 'The latest in electronics', 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=500', 4);
