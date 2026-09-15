-- =====================================================================
-- Seed data. Run after schema.sql. Safe to re-run (on conflict do nothing).
-- Devotional / festive categories to match the NovaMarket brand.
-- =====================================================================
insert into public.categories (name, slug) values
  ('Idols & Murtis',      'idols-murtis'),
  ('Puja Essentials',     'puja-essentials'),
  ('Incense & Dhoop',     'incense-dhoop'),
  ('Diyas & Lamps',       'diyas-lamps'),
  ('Books & Scriptures',  'books-scriptures'),
  ('Festive Decor',       'festive-decor')
on conflict (slug) do nothing;

-- Seed the original homepage hero slides so the carousel is not empty on a
-- fresh install. Only inserts when the table has no slides, so re-runs (and
-- any admin-configured content) are never overwritten.
insert into public.hero_slides (eyebrow, title, description, image_url, button_label, button_link, theme, position)
select eyebrow, title, description, image_url, button_label, button_link, theme, position
from (values
  ('New Arrivals', 'Next-Gen Audio Experience', 'Discover our new line of quantum-processed wireless earbuds.',
   'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=1600', 'Shop Now', '/', 'orange', 0),
  ('Best Sellers', 'Dominate Your Arena', 'Top-rated mechanical keyboards and ultra-lightweight mice.',
   'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1600', 'Explore Gear', '/', 'gold', 1)
) as s(eyebrow, title, description, image_url, button_label, button_link, theme, position)
where not exists (select 1 from public.hero_slides);
