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
