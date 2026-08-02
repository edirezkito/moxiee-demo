-- Moxiee ecommerce platform
-- OPTIONAL, run-as-needed fixes for demo product data that was already
-- inserted with a wrong value. Unlike the numbered migrations (run once,
-- in order, on a fresh database), this file is meant to be opened and
-- run selectively — only the UPDATE statements relevant to you.
--
-- Add more one-off fixes here over time instead of creating a new file
-- for each small correction.

-- Fix: "Woven Throw Blanket" was originally seeded with a broken/
-- mismatched image URL (didn't actually show a blanket). Safe to run
-- again — it's a no-op if the image is already correct.
update public.products
set images = jsonb_build_array('https://images.pexels.com/photos/14188395/pexels-photo-14188395.jpeg')
where slug = 'woven-throw-blanket';

-- Fix: "Fitness Smartwatch" was originally seeded with an old Pexels
-- photo (ID 23474, from 2016) that no longer loads. Replaced with a
-- more recent, verified smartwatch photo.
update public.products
set images = jsonb_build_array('https://images.pexels.com/photos/35147278/pexels-photo-35147278.jpeg')
where slug = 'fitness-smartwatch';
