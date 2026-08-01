-- Moxiee ecommerce platform
-- Seed data: categories and brands (English, alphabetically ordered)
-- Run this AFTER the 3 migration files in this folder have been applied.

-- ---------- Categories ----------
insert into public.categories (name, slug, description) values
  ('Accessories', 'accessories', 'Bags, jewelry, watches, and everyday accessories.'),
  ('Beauty',      'beauty',      'Skincare, makeup, and personal care products.'),
  ('Digital',     'digital',     'Digital goods and downloadable products.'),
  ('Electronics', 'electronics', 'Gadgets, devices, and electronic accessories.'),
  ('Fashion',     'fashion',     'Apparel and clothing for everyday wear.'),
  ('Home',        'home',        'Home decor, furniture, and living essentials.')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description;

-- ---------- Brands ----------
insert into public.brands (name, slug) values
  ('Aura',        'aura'),
  ('Kinto',       'kinto'),
  ('Lumiere',     'lumiere'),
  ('Maison',      'maison'),
  ('Nordic Lab',  'nordic-lab'),
  ('Pulse',       'pulse'),
  ('Sage & Co',   'sage-and-co'),
  ('Vertex',      'vertex')
on conflict (slug) do update set
  name = excluded.name;

-- Note: the app already fetches both categories and brands ordered by
-- "name" (see src/lib/catalogApi.ts), so they will always display
-- alphabetically in the storefront regardless of insert order above.
