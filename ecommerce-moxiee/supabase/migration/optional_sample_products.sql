-- Moxiee ecommerce platform
-- OPTIONAL: sample products for a public demo/preview deployment, so
-- prospective buyers see a populated store instead of an empty one.
-- 24 products total, 4 per category — all image URLs individually
-- verified to be real, working Pexels photos matching their product name.
-- NOT meant for a real client's live store — run this only on your own
-- demo project. Images are hotlinked from Pexels (free stock photos).
--
-- Run this AFTER migrations 001-010 (needs categories/brands to exist).

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
  ('Woven Throw Blanket', 'woven-throw-blanket', 'Soft cotton-blend throw, perfect for the sofa or bed.', 45.00, null, 'home', 'sage-and-co', 30, true, false, 'https://images.pexels.com/photos/14188395/pexels-photo-14188395.jpeg'),
  -- Batch 2: added to bring the catalog to 24 products (4 per category).
  ('Slim Bifold Wallet', 'slim-bifold-wallet', 'Full-grain leather bifold wallet with card slots.', 39.00, null, 'accessories', 'aura', 50, false, false, 'https://images.pexels.com/photos/915917/pexels-photo-915917.jpeg'),
  ('Round Sunglasses', 'round-sunglasses', 'UV400 round-frame sunglasses with a lightweight build.', 32.00, 25.00, 'accessories', 'vertex', 44, true, false, 'https://images.pexels.com/photos/2371968/pexels-photo-2371968.jpeg'),
  ('Barrier Repair Cream', 'barrier-repair-cream', 'Calming moisture barrier cream for sensitive skin.', 38.00, null, 'beauty', 'sage-and-co', 35, false, false, 'https://images.pexels.com/photos/13794471/pexels-photo-13794471.jpeg'),
  ('Signature Eau de Parfum', 'signature-eau-de-parfum', 'Long-lasting signature fragrance in a travel-friendly bottle.', 68.00, null, 'beauty', 'aura', 26, true, true, 'https://images.pexels.com/photos/3785784/pexels-photo-3785784.jpeg'),
  ('Online Course Bundle', 'online-course-bundle', 'Digital bundle of 6 self-paced business & marketing courses.', 79.00, 59.00, 'digital', 'kinto', 999, true, false, 'https://images.pexels.com/photos/20432893/pexels-photo-20432893.jpeg'),
  ('Digital Reading Library', 'digital-reading-library', 'Curated digital library of 20 e-books across popular genres.', 19.00, null, 'digital', 'kinto', 999, false, false, 'https://images.pexels.com/photos/7129624/pexels-photo-7129624.jpeg'),
  ('Fitness Smartwatch', 'fitness-smartwatch', 'Heart-rate and sleep tracking smartwatch with a week-long battery.', 129.00, null, 'electronics', 'pulse', 22, true, true, 'https://images.pexels.com/photos/35147278/pexels-photo-35147278.jpeg'),
  ('Portable Bluetooth Speaker', 'portable-bluetooth-speaker', 'Compact water-resistant speaker with 12-hour playtime.', 45.00, 35.00, 'electronics', 'vertex', 38, false, false, 'https://images.pexels.com/photos/18542239/pexels-photo-18542239.jpeg'),
  ('Everyday Canvas Sneakers', 'everyday-canvas-sneakers', 'Lightweight low-top sneakers for everyday wear.', 65.00, null, 'fashion', 'nordic-lab', 40, true, true, 'https://images.pexels.com/photos/11946032/pexels-photo-11946032.jpeg'),
  ('Leather Crossbody Bag', 'leather-crossbody-bag', 'Compact crossbody bag in smooth full-grain leather.', 89.00, null, 'fashion', 'lumiere', 18, false, false, 'https://images.pexels.com/photos/2433862/pexels-photo-2433862.jpeg'),
  ('Soy Wax Scented Candle', 'soy-wax-scented-candle', 'Hand-poured soy candle with a 45-hour burn time.', 28.00, null, 'home', 'sage-and-co', 55, false, true, 'https://images.pexels.com/photos/7704461/pexels-photo-7704461.jpeg'),
  ('Handcrafted Ceramic Vase', 'handcrafted-ceramic-vase', 'Artisan ceramic vase, each piece uniquely glazed.', 42.00, null, 'home', 'nordic-lab', 24, true, false, 'https://images.pexels.com/photos/4611612/pexels-photo-4611612.jpeg')
) as v(name, slug, description, price, discount_price, category_slug, brand_slug, stock, featured, bestseller, image)
on conflict (slug) do nothing;
