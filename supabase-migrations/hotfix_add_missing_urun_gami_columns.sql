-- Hotfix: add missing urun_gami columns for backward-compatible pricing/import flows
-- Date: 2026-04-09

BEGIN;

ALTER TABLE public.kategoriler
  ADD COLUMN IF NOT EXISTS urun_gami text;

ALTER TABLE public.urunler
  ADD COLUMN IF NOT EXISTS urun_gami text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'kategoriler_urun_gami_check'
  ) THEN
    ALTER TABLE public.kategoriler
      ADD CONSTRAINT kategoriler_urun_gami_check
      CHECK (urun_gami IS NULL OR urun_gami IN ('frozen-desserts', 'barista-bakery-essentials'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'urunler_urun_gami_check'
  ) THEN
    ALTER TABLE public.urunler
      ADD CONSTRAINT urunler_urun_gami_check
      CHECK (urun_gami IS NULL OR urun_gami IN ('frozen-desserts', 'barista-bakery-essentials'));
  END IF;
END $$;

UPDATE public.kategoriler
SET urun_gami = 'frozen-desserts'
WHERE slug IN ('cakes-and-tarts', 'cookies-and-muffins', 'pizza-and-fast-food')
  AND (urun_gami IS NULL OR urun_gami = '');

UPDATE public.kategoriler
SET urun_gami = 'barista-bakery-essentials'
WHERE slug IN ('sauces-and-ingredients', 'coffee', 'drinks', 'drink-bases', 'specialty-sauces', 'cafe-bar-sauces', 'cocktail-mixes')
  AND (urun_gami IS NULL OR urun_gami = '');

WITH parent_map AS (
  SELECT id, slug
  FROM public.kategoriler
  WHERE slug IN ('drinks', 'sauces-and-ingredients')
), new_categories AS (
  SELECT *
  FROM (
    VALUES
      ('drinks', 'cocktail-mixes', jsonb_build_object('de', 'Cocktail-Mixes', 'en', 'Cocktail Mixes', 'tr', 'Kokteyl Miksleri', 'ar', 'خلطات الكوكتيل')),
      ('sauces-and-ingredients', 'cafe-bar-sauces', jsonb_build_object('de', 'Cafe-Bar-Saucen', 'en', 'Cafe Bar Sauces', 'tr', 'Cafe Bar Sosları', 'ar', 'صلصات الكافيه والبار'))
  ) AS t(parent_slug, slug, ad)
)
INSERT INTO public.kategoriler (ad, slug, ust_kategori_id, urun_gami)
SELECT n.ad, n.slug, p.id, 'barista-bakery-essentials'
FROM new_categories n
JOIN parent_map p ON p.slug = n.parent_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.kategoriler existing
  WHERE existing.slug = n.slug
);

UPDATE public.kategoriler child
SET urun_gami = parent.urun_gami
FROM public.kategoriler parent
WHERE child.ust_kategori_id = parent.id
  AND parent.urun_gami IS NOT NULL
  AND (child.urun_gami IS NULL OR child.urun_gami = '');

UPDATE public.urunler u
SET urun_gami = k.urun_gami
FROM public.kategoriler k
WHERE u.kategori_id = k.id
  AND k.urun_gami IS NOT NULL
  AND (u.urun_gami IS NULL OR u.urun_gami = '');

COMMIT;
