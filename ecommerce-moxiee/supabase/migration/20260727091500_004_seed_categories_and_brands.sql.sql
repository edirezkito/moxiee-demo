-- Moxiee ecommerce platform
-- Seed data: categories and brands (English, alphabetically ordered)
-- Run this AFTER the 3 migration files in this folder have been applied.

-- ---------- Categories ----------
insert into public.categories (name, slug, description, image_url) values
  ('Accessories', 'accessories', 'Bags, jewelry, watches, and everyday accessories.', 'https://images.pexels.com/photos/28719728/pexels-photo-28719728.jpeg'),
  ('Beauty',      'beauty',      'Skincare, makeup, and personal care products.', 'https://images.pexels.com/photos/4841273/pexels-photo-4841273.jpeg'),
  ('Digital',     'digital',     'Digital goods and downloadable products.', 'https://images.pexels.com/photos/6406691/pexels-photo-6406691.jpeg'),
  ('Electronics', 'electronics', 'Gadgets, devices, and electronic accessories.', 'https://images.pexels.com/photos/3184451/pexels-photo-3184451.jpeg'),
  ('Fashion',     'fashion',     'Apparel and clothing for everyday wear.', 'https://images.pexels.com/photos/2249249/pexels-photo-2249249.jpeg'),
  ('Home',        'home',        'Home decor, furniture, and living essentials.', 'https://images.pexels.com/photos/4468806/pexels-photo-4468806.jpeg')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url;

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
