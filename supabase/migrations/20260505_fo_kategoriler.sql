-- Migration: Create FO product categories (Barista, Sirupe & Backzutaten)
-- Brand: FO Food Products / Özmer A.Ş.
-- Product line: barista-bakery-essentials
-- Idempotent: each INSERT is guarded by WHERE NOT EXISTS.

DO $$
DECLARE
  v_slugs TEXT[] := ARRAY[
    'powder-drinks', 'fruit-pastes', 'topping-decor-sauces',
    'topping-ice-cream-sauces', 'special-sauces-940g', 'fruited-sauces',
    'premium-syrups', 'cocktail-syrups', 'silvery-syrups',
    'iced-tea-syrup-bases', 'cafe-bar-sauces', 'cocktail-mixes',
    'foamer', 'special-pistachio-sauce'
  ];
  v_ads  JSONB[] := ARRAY[
    '{"de":"Pulvergetränke","en":"Powder Drinks","tr":"Toz İçecekler"}'::jsonb,
    '{"de":"Frucht- & Aromapasten","en":"Fruit & Flavor Pastes","tr":"Pasta & Aroma Pastaları"}'::jsonb,
    '{"de":"Dekor-Toppingsoßen 750 g","en":"Decor Topping Sauces 750 g","tr":"Dekor Topping Sosları 750 g"}'::jsonb,
    '{"de":"Eis-Toppingsoßen 1 kg","en":"Ice Cream Topping Sauces 1 kg","tr":"Dondurma Topping Sosları 1 kg"}'::jsonb,
    '{"de":"Spezialsoßen 940 g","en":"Special Sauces 940 g","tr":"Özel Soslar 940 g"}'::jsonb,
    '{"de":"Fruchtsoßen 1 kg","en":"Fruited Sauces 1 kg","tr":"Meyveli Soslar 1 kg"}'::jsonb,
    '{"de":"Premium-Sirupe 700 ml","en":"Premium Syrups 700 ml","tr":"Premium Şuruplar 700 ml"}'::jsonb,
    '{"de":"Cocktail-Sirupe 700 ml","en":"Cocktail Syrups 700 ml","tr":"Kokteyl Şurupları 700 ml"}'::jsonb,
    '{"de":"Silvery-Sirupe 700 ml","en":"Silvery Syrups 700 ml","tr":"Silvery Şuruplar 700 ml"}'::jsonb,
    '{"de":"Eistee- & Sirup-Basen 700 ml","en":"Iced Tea & Syrup Bases 700 ml","tr":"Ice Tea ve Şurup Tabanları 700 ml"}'::jsonb,
    '{"de":"Profi-Bar-Soßen 2,5 kg (Pump)","en":"Cafe-Bar Sauces 2.5 kg","tr":"Profesyonel Cafe-Bar Sosları 2,5 kg"}'::jsonb,
    '{"de":"Cocktail-Mixes","en":"Cocktail Mixes","tr":"Kokteyl Karışımları"}'::jsonb,
    '{"de":"Foamer","en":"Foamer","tr":"Köpürtücü"}'::jsonb,
    '{"de":"Pistazien-Kadayifi-Soße","en":"Pistachio Kadayifi Sauce","tr":"Pistachio Kadayıfı Sosu"}'::jsonb
  ];
  i INT;
BEGIN
  FOR i IN 1..array_length(v_slugs, 1) LOOP
    IF NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = v_slugs[i]) THEN
      INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id, image_url)
      VALUES (v_slugs[i], v_ads[i], 'barista-bakery-essentials', NULL, NULL);
      RAISE NOTICE 'Inserted category: %', v_slugs[i];
    ELSE
      RAISE NOTICE 'Category already exists, skipping: %', v_slugs[i];
    END IF;
  END LOOP;
END;
$$;

-- After this migration, run scripts/migrate-fo-categories.ts to remap
-- existing products from legacy categories into these new FO-specific categories.
