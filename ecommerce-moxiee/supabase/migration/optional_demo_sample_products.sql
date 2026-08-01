-- Moxiee ecommerce platform
-- OPTIONAL: sample products for a public demo/preview deployment, so
-- prospective buyers see a populated store instead of an empty one.
-- NOT meant for a real client's live store — run this only on your own
-- demo project. Images are hotlinked from Pexels (free stock photos).
--
-- Run this AFTER migrations 001-007 (needs categories/brands to exist).

insert into public.products (name, slug, description, price, discount_price, category_id, brand_id, stock, is_active, is_featured, is_bestseller, images)
select
  v.name, v.slug, v.description, v.price, v.discount_price,
  (select id from public.categories where slug = v.category_slug),
  (select id from public.brands where slug = v.brand_slug),
  v.stock, true, v.featured, v.bestseller,
  jsonb_build_array(v.image)
from (values
  ('Classic Leather Tote', 'classic-leather-tote', 'Spacious everyday tote in full-grain leather.', 128.00, null::numeric, 'accessories', 'maison', 24, true, false, 'https://images.pexels.com/photos/2905238/pexels-photo-2905238.jpeg'),
  ('Minimalist Analog Watch', 'minimalist-analog-watch', 'Slim stainless steel case with a sapphire crystal face.', 189.00, 149.00, 'accessories', 'vertex', 15, true, true, 'https://images.pexels.com/photos/9978722/pexels-photo-9978722.jpeg'),
  ('Hydrating Face Serum', 'hydrating-face-serum', 'Lightweight daily serum with hyaluronic acid.', 42.00, null, 'beauty', 'aura', 60, false, false, 'https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg'),
  ('Matte Lipstick Set', 'matte-lipstick-set', 'Long-wear matte lipstick trio in everyday shades.', 36.00, 29.00, 'beauty', 'sage-and-co', 40, true, true, 'https://images.pexels.com/photos/2533266/pexels-photo-2533266.jpeg'),
  ('Noise-Cancelling Earbuds', 'noise-cancelling-earbuds', 'True wireless earbuds with active noise cancellation.', 159.00, null, 'electronics', 'pulse', 32, true, true, 'https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg'),
  ('Fast-Charge Power Bank', 'fast-charge-power-bank', '20,000mAh power bank with USB-C fast charging.', 49.00, 39.00, 'electronics', 'vertex', 50, false, false, 'https://images.pexels.com/photos/4526407/pexels-photo-4526407.jpeg'),
  ('Premium E-Book Bundle', 'premium-ebook-bundle', 'Digital bundle of 5 bestselling business e-books.', 24.00, null, 'digital', 'kinto', 999, false, false, 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg'),
  ('Productivity Planner Template', 'productivity-planner-template', 'Digital planner template pack for goal tracking.', 15.00, null, 'digital', 'kinto', 999, false, true, 'https://images.pexels.com/photos/4065876/pexels-photo-4065876.jpeg'),
  ('Relaxed Cotton Shirt', 'relaxed-cotton-shirt', 'Breathable 100% cotton shirt for everyday wear.', 58.00, null, 'fashion', 'nordic-lab', 45, true, false, 'https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg'),
  ('Tailored Wool Overcoat', 'tailored-wool-overcoat', 'Structured wool-blend overcoat for cooler days.', 220.00, 179.00, 'fashion', 'lumiere', 12, true, true, 'https://images.pexels.com/photos/985635/pexels-photo-985635.jpeg'),
  ('Ceramic Table Lamp', 'ceramic-table-lamp', 'Handcrafted ceramic base with a linen shade.', 76.00, null, 'home', 'nordic-lab', 20, false, false, 'https://images.pexels.com/photos/1112598/pexels-photo-1112598.jpeg'),
  ('Woven Throw Blanket', 'woven-throw-blanket', 'Soft cotton-blend throw, perfect for the sofa or bed.', 45.00, null, 'home', 'sage-and-co', 30, true, false, 'https://images.pexels.com/photos/6444/pencil-blur-black-and-white-bed.jpg')
) as v(name, slug, description, price, discount_price, category_slug, brand_slug, stock, featured, bestseller, image)
on conflict (slug) do nothing;
