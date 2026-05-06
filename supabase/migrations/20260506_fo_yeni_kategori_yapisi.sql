-- ============================================================
-- Migration: FO Yeni Kategori Yapısı
-- Tarih: 06.05.2026
-- Açıklama: 4 ana + 16 alt kategori; mevcut ürünler taşınır.
-- Idempotent: INSERT'ler WHERE NOT EXISTS ile korunur.
-- ============================================================

DO $$
DECLARE
  -- Ana kategori ID'leri
  v_icecek_id       UUID;
  v_soslar_id       UUID;
  v_suruplar_id     UUID;
  v_spreads_id      UUID;

  -- Alt kategori ID'leri (ara değişkenler — taşıma için)
  v_toz_icecek_id        UUID;
  v_iced_tea_id          UUID;
  v_kokteyl_karisim_id   UUID;

  v_dondurma_sos_id      UUID;
  v_pastry_pasta_id      UUID;
  v_dekoratif_top_id     UUID;
  v_meyve_sos_id         UUID;
  v_cafe_bar_pro_id      UUID;
  v_kucuk_format_id      UUID;

  v_premium_surup_id     UUID;
  v_kokteyl_surup_id     UUID;
  v_anadolu_id           UUID;
  v_silvery_surup_id     UUID;
  v_foamer_id            UUID;

  v_surulebilir_id       UUID;
  v_dubai_id             UUID;
  v_bulk_id              UUID;

  -- Eski kategori ID'leri (taşıma için)
  v_old_powder       UUID;
  v_old_iced_tea     UUID;
  v_old_cocktail_mix UUID;
  v_old_ice_cream    UUID;
  v_old_fruit_paste  UUID;
  v_old_decor_sauce  UUID;
  v_old_special_940  UUID;
  v_old_fruited      UUID;
  v_old_cafe_bar     UUID;
  v_old_pistachio    UUID;
  v_old_premium_syr  UUID;
  v_old_cocktail_syr UUID;
  v_old_silvery      UUID;
  v_old_foamer       UUID;
  v_old_sauces_ing   UUID;
  v_old_coffee       UUID;
  v_old_drinks       UUID;

BEGIN

-- ==============================================================
-- BÖLÜM 1: ANA KATEGORİLER (ust_kategori_id = NULL)
-- ==============================================================

-- 1. İçecek Bazları
INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'icecek-bazlari',
       '{"tr":"İçecek Bazları","de":"Getränkebasen","en":"Drink Bases"}'::jsonb,
       'barista-bakery-essentials', NULL
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'icecek-bazlari');

-- 2. Soslar & Toppingler
INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'soslar-toppingler',
       '{"tr":"Soslar & Toppingler","de":"Soßen & Toppings","en":"Sauces & Toppings"}'::jsonb,
       'barista-bakery-essentials', NULL
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'soslar-toppingler');

-- 3. Şuruplar
INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'suruplar',
       '{"tr":"Şuruplar","de":"Sirupe","en":"Syrups"}'::jsonb,
       'barista-bakery-essentials', NULL
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'suruplar');

-- 4. Sürülebilir & Özel
INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'surulebilir-ozel',
       '{"tr":"Sürülebilir & Özel","de":"Aufstriche & Spezialitäten","en":"Spreads & Specialty"}'::jsonb,
       'barista-bakery-essentials', NULL
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'surulebilir-ozel');

-- Ana kategori ID'lerini al
SELECT id INTO v_icecek_id  FROM kategoriler WHERE slug = 'icecek-bazlari'    LIMIT 1;
SELECT id INTO v_soslar_id  FROM kategoriler WHERE slug = 'soslar-toppingler' LIMIT 1;
SELECT id INTO v_suruplar_id FROM kategoriler WHERE slug = 'suruplar'         LIMIT 1;
SELECT id INTO v_spreads_id FROM kategoriler WHERE slug = 'surulebilir-ozel'  LIMIT 1;

-- ==============================================================
-- BÖLÜM 2: ALT KATEGORİLER
-- ==============================================================

-- ── İçecek Bazları ──────────────────────────────────────────

INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'toz-icecek-bazlari',
       '{"tr":"Toz İçecek Bazları (1 kg)","de":"Pulvergetränkebasen (1 kg)","en":"Powder Drink Bases (1 kg)"}'::jsonb,
       'barista-bakery-essentials', v_icecek_id
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'toz-icecek-bazlari');

INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'iced-tea-bazlari',
       '{"tr":"Iced Tea Şurup Bazları (700 ml)","de":"Eistee-Sirupbasen (700 ml)","en":"Iced Tea Syrup Bases (700 ml)"}'::jsonb,
       'barista-bakery-essentials', v_icecek_id
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'iced-tea-bazlari');

INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'kokteyl-karisimlari',
       '{"tr":"Özel Kokteyl Karışımları","de":"Spezielle Cocktail-Mixes","en":"Special Cocktail Mixes"}'::jsonb,
       'barista-bakery-essentials', v_icecek_id
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'kokteyl-karisimlari');

-- ── Soslar & Toppingler ─────────────────────────────────────

INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'dondurma-soslari',
       '{"tr":"Dondurma Sosları (1 kg)","de":"Eiscreme-Soßen (1 kg)","en":"Ice Cream Sauces (1 kg)"}'::jsonb,
       'barista-bakery-essentials', v_soslar_id
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'dondurma-soslari');

INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'pastry-pastalari',
       '{"tr":"Pastry Pastaları / Meyve Pastaları (1 kg)","de":"Frucht- & Aromapasten (1 kg)","en":"Fruit Pastes & Pastry Fillings (1 kg)"}'::jsonb,
       'barista-bakery-essentials', v_soslar_id
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'pastry-pastalari');

INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'dekoratif-toppingler',
       '{"tr":"Dekoratif Toppingler (940 gr)","de":"Dekorative Toppings (940 g)","en":"Decorative Toppings (940 g)"}'::jsonb,
       'barista-bakery-essentials', v_soslar_id
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'dekoratif-toppingler');

INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'meyve-soslari',
       '{"tr":"Meyve Sosları – %100 Pure (1 kg)","de":"Fruchtsoßen – 100 % Pur (1 kg)","en":"Fruit Sauces – 100% Pure (1 kg)"}'::jsonb,
       'barista-bakery-essentials', v_soslar_id
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'meyve-soslari');

INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'cafe-bar-soslari-pro',
       '{"tr":"Profesyonel Cafe-Bar Sosları (2,5 kg)","de":"Profi Café-Bar-Soßen (2,5 kg)","en":"Professional Cafe-Bar Sauces (2.5 kg)"}'::jsonb,
       'barista-bakery-essentials', v_soslar_id
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'cafe-bar-soslari-pro');

INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'kucuk-format-siseler',
       '{"tr":"Küçük Format Şişeler (120 ml – 370 gr)","de":"Kleinformat-Flaschen (120 ml – 370 g)","en":"Small Format Bottles (120 ml – 370 g)"}'::jsonb,
       'barista-bakery-essentials', v_soslar_id
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'kucuk-format-siseler');

-- ── Şuruplar ────────────────────────────────────────────────

INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'premium-suruplar',
       '{"tr":"Premium Şuruplar (700 ml)","de":"Premium-Sirupe (700 ml)","en":"Premium Syrups (700 ml)"}'::jsonb,
       'barista-bakery-essentials', v_suruplar_id
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'premium-suruplar');

INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'kokteyl-suruplar',
       '{"tr":"Kokteyl Şurupları (700 ml – 60+ aroma)","de":"Cocktail-Sirupe (700 ml – 60+ Aromen)","en":"Cocktail Syrups (700 ml – 60+ flavors)"}'::jsonb,
       'barista-bakery-essentials', v_suruplar_id
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'kokteyl-suruplar');

INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'anadolu-efsaneleri',
       '{"tr":"Anadolu Efsaneleri (800 ml)","de":"Anadolu-Legenden (800 ml)","en":"Anatolian Legends (800 ml)"}'::jsonb,
       'barista-bakery-essentials', v_suruplar_id
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'anadolu-efsaneleri');

INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'silvery-suruplar',
       '{"tr":"Silvery Şuruplar (700 ml)","de":"Silvery-Sirupe (700 ml)","en":"Silvery Syrups (700 ml)"}'::jsonb,
       'barista-bakery-essentials', v_suruplar_id
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'silvery-suruplar');

INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'foamer-ozel',
       '{"tr":"Foamer & Özel (100 ml)","de":"Foamer & Spezial (100 ml)","en":"Foamer & Special (100 ml)"}'::jsonb,
       'barista-bakery-essentials', v_suruplar_id
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'foamer-ozel');

-- ── Sürülebilir & Özel ──────────────────────────────────────

INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'surulebilir-kremler',
       '{"tr":"Sürülebilir Kremler (370 gr – 6 kg)","de":"Streichkremes (370 g – 6 kg)","en":"Spreadable Creams (370 g – 6 kg)"}'::jsonb,
       'barista-bakery-essentials', v_spreads_id
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'surulebilir-kremler');

INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'dubai-serisi',
       '{"tr":"Dubai Serisi – Özel Pistachio","de":"Dubai-Serie – Spezial Pistazie","en":"Dubai Series – Special Pistachio"}'::jsonb,
       'barista-bakery-essentials', v_spreads_id
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'dubai-serisi');

INSERT INTO kategoriler (slug, ad, urun_gami, ust_kategori_id)
SELECT 'bulk-formatlar',
       '{"tr":"Bulk Toptan Formatları","de":"Bulk-Großhandelsformate","en":"Bulk Wholesale Formats"}'::jsonb,
       'barista-bakery-essentials', v_spreads_id
WHERE NOT EXISTS (SELECT 1 FROM kategoriler WHERE slug = 'bulk-formatlar');

-- ==============================================================
-- BÖLÜM 3: YENİ ALT KATEGORİ ID'LERİNİ AL
-- ==============================================================

SELECT id INTO v_toz_icecek_id      FROM kategoriler WHERE slug = 'toz-icecek-bazlari'    LIMIT 1;
SELECT id INTO v_iced_tea_id         FROM kategoriler WHERE slug = 'iced-tea-bazlari'      LIMIT 1;
SELECT id INTO v_kokteyl_karisim_id  FROM kategoriler WHERE slug = 'kokteyl-karisimlari'   LIMIT 1;
SELECT id INTO v_dondurma_sos_id     FROM kategoriler WHERE slug = 'dondurma-soslari'      LIMIT 1;
SELECT id INTO v_pastry_pasta_id     FROM kategoriler WHERE slug = 'pastry-pastalari'      LIMIT 1;
SELECT id INTO v_dekoratif_top_id    FROM kategoriler WHERE slug = 'dekoratif-toppingler'  LIMIT 1;
SELECT id INTO v_meyve_sos_id        FROM kategoriler WHERE slug = 'meyve-soslari'         LIMIT 1;
SELECT id INTO v_cafe_bar_pro_id     FROM kategoriler WHERE slug = 'cafe-bar-soslari-pro'  LIMIT 1;
SELECT id INTO v_kucuk_format_id     FROM kategoriler WHERE slug = 'kucuk-format-siseler'  LIMIT 1;
SELECT id INTO v_premium_surup_id    FROM kategoriler WHERE slug = 'premium-suruplar'      LIMIT 1;
SELECT id INTO v_kokteyl_surup_id    FROM kategoriler WHERE slug = 'kokteyl-suruplar'      LIMIT 1;
SELECT id INTO v_anadolu_id          FROM kategoriler WHERE slug = 'anadolu-efsaneleri'    LIMIT 1;
SELECT id INTO v_silvery_surup_id    FROM kategoriler WHERE slug = 'silvery-suruplar'      LIMIT 1;
SELECT id INTO v_foamer_id           FROM kategoriler WHERE slug = 'foamer-ozel'           LIMIT 1;
SELECT id INTO v_surulebilir_id      FROM kategoriler WHERE slug = 'surulebilir-kremler'   LIMIT 1;
SELECT id INTO v_dubai_id            FROM kategoriler WHERE slug = 'dubai-serisi'          LIMIT 1;
SELECT id INTO v_bulk_id             FROM kategoriler WHERE slug = 'bulk-formatlar'        LIMIT 1;

-- ==============================================================
-- BÖLÜM 4: ESKİ KATEGORİ ID'LERİNİ AL
-- ==============================================================

SELECT id INTO v_old_powder      FROM kategoriler WHERE slug = 'powder-drinks'           LIMIT 1;
SELECT id INTO v_old_iced_tea    FROM kategoriler WHERE slug = 'iced-tea-syrup-bases'     LIMIT 1;
SELECT id INTO v_old_cocktail_mix FROM kategoriler WHERE slug = 'cocktail-mixes'         LIMIT 1;
SELECT id INTO v_old_ice_cream   FROM kategoriler WHERE slug = 'topping-ice-cream-sauces' LIMIT 1;
SELECT id INTO v_old_fruit_paste FROM kategoriler WHERE slug = 'fruit-pastes'            LIMIT 1;
SELECT id INTO v_old_decor_sauce FROM kategoriler WHERE slug = 'topping-decor-sauces'    LIMIT 1;
SELECT id INTO v_old_special_940 FROM kategoriler WHERE slug = 'special-sauces-940g'     LIMIT 1;
SELECT id INTO v_old_fruited     FROM kategoriler WHERE slug = 'fruited-sauces'          LIMIT 1;
SELECT id INTO v_old_cafe_bar    FROM kategoriler WHERE slug = 'cafe-bar-sauces'         LIMIT 1;
SELECT id INTO v_old_pistachio   FROM kategoriler WHERE slug = 'special-pistachio-sauce' LIMIT 1;
SELECT id INTO v_old_premium_syr FROM kategoriler WHERE slug = 'premium-syrups'         LIMIT 1;
SELECT id INTO v_old_cocktail_syr FROM kategoriler WHERE slug = 'cocktail-syrups'       LIMIT 1;
SELECT id INTO v_old_silvery     FROM kategoriler WHERE slug = 'silvery-syrups'         LIMIT 1;
SELECT id INTO v_old_foamer      FROM kategoriler WHERE slug = 'foamer'                 LIMIT 1;
SELECT id INTO v_old_sauces_ing  FROM kategoriler WHERE slug = 'sauces-and-ingredients' LIMIT 1;
SELECT id INTO v_old_coffee      FROM kategoriler WHERE slug = 'coffee'                 LIMIT 1;
SELECT id INTO v_old_drinks      FROM kategoriler WHERE slug = 'drinks'                 LIMIT 1;

-- ==============================================================
-- BÖLÜM 5: ÜRÜNLERİ YENİ KATEGORİLERE TAŞI
-- (Sadece yeni kategori ID'si mevcutsa güncelle)
-- ==============================================================

-- powder-drinks → toz-icecek-bazlari
IF v_old_powder IS NOT NULL AND v_toz_icecek_id IS NOT NULL THEN
  UPDATE urunler SET kategori_id = v_toz_icecek_id
  WHERE kategori_id = v_old_powder;
  RAISE NOTICE 'powder-drinks → toz-icecek-bazlari: % urun tasindi',
    (SELECT COUNT(*) FROM urunler WHERE kategori_id = v_toz_icecek_id);
END IF;

-- iced-tea-syrup-bases → iced-tea-bazlari
IF v_old_iced_tea IS NOT NULL AND v_iced_tea_id IS NOT NULL THEN
  UPDATE urunler SET kategori_id = v_iced_tea_id
  WHERE kategori_id = v_old_iced_tea;
END IF;

-- cocktail-mixes → kokteyl-karisimlari
IF v_old_cocktail_mix IS NOT NULL AND v_kokteyl_karisim_id IS NOT NULL THEN
  UPDATE urunler SET kategori_id = v_kokteyl_karisim_id
  WHERE kategori_id = v_old_cocktail_mix;
END IF;

-- topping-ice-cream-sauces → dondurma-soslari
IF v_old_ice_cream IS NOT NULL AND v_dondurma_sos_id IS NOT NULL THEN
  UPDATE urunler SET kategori_id = v_dondurma_sos_id
  WHERE kategori_id = v_old_ice_cream;
END IF;

-- fruit-pastes → pastry-pastalari
IF v_old_fruit_paste IS NOT NULL AND v_pastry_pasta_id IS NOT NULL THEN
  UPDATE urunler SET kategori_id = v_pastry_pasta_id
  WHERE kategori_id = v_old_fruit_paste;
END IF;

-- topping-decor-sauces → dekoratif-toppingler
IF v_old_decor_sauce IS NOT NULL AND v_dekoratif_top_id IS NOT NULL THEN
  UPDATE urunler SET kategori_id = v_dekoratif_top_id
  WHERE kategori_id = v_old_decor_sauce;
END IF;

-- special-sauces-940g → dekoratif-toppingler
IF v_old_special_940 IS NOT NULL AND v_dekoratif_top_id IS NOT NULL THEN
  UPDATE urunler SET kategori_id = v_dekoratif_top_id
  WHERE kategori_id = v_old_special_940;
END IF;

-- fruited-sauces → meyve-soslari
IF v_old_fruited IS NOT NULL AND v_meyve_sos_id IS NOT NULL THEN
  UPDATE urunler SET kategori_id = v_meyve_sos_id
  WHERE kategori_id = v_old_fruited;
END IF;

-- cafe-bar-sauces → cafe-bar-soslari-pro
IF v_old_cafe_bar IS NOT NULL AND v_cafe_bar_pro_id IS NOT NULL THEN
  UPDATE urunler SET kategori_id = v_cafe_bar_pro_id
  WHERE kategori_id = v_old_cafe_bar;
END IF;

-- special-pistachio-sauce → dubai-serisi
IF v_old_pistachio IS NOT NULL AND v_dubai_id IS NOT NULL THEN
  UPDATE urunler SET kategori_id = v_dubai_id
  WHERE kategori_id = v_old_pistachio;
END IF;

-- premium-syrups → premium-suruplar
IF v_old_premium_syr IS NOT NULL AND v_premium_surup_id IS NOT NULL THEN
  UPDATE urunler SET kategori_id = v_premium_surup_id
  WHERE kategori_id = v_old_premium_syr;
END IF;

-- cocktail-syrups → kokteyl-suruplar
IF v_old_cocktail_syr IS NOT NULL AND v_kokteyl_surup_id IS NOT NULL THEN
  UPDATE urunler SET kategori_id = v_kokteyl_surup_id
  WHERE kategori_id = v_old_cocktail_syr;
END IF;

-- silvery-syrups → silvery-suruplar
IF v_old_silvery IS NOT NULL AND v_silvery_surup_id IS NOT NULL THEN
  UPDATE urunler SET kategori_id = v_silvery_surup_id
  WHERE kategori_id = v_old_silvery;
END IF;

-- foamer → foamer-ozel
IF v_old_foamer IS NOT NULL AND v_foamer_id IS NOT NULL THEN
  UPDATE urunler SET kategori_id = v_foamer_id
  WHERE kategori_id = v_old_foamer;
END IF;

-- Legacy: sauces-and-ingredients → soslar-toppingler (ana kategori, eşleşemeyenler)
IF v_old_sauces_ing IS NOT NULL AND v_soslar_id IS NOT NULL THEN
  UPDATE urunler SET kategori_id = v_soslar_id
  WHERE kategori_id = v_old_sauces_ing;
END IF;

-- Legacy: coffee / drinks → icecek-bazlari (ana kategori)
IF v_old_coffee IS NOT NULL AND v_icecek_id IS NOT NULL THEN
  UPDATE urunler SET kategori_id = v_icecek_id
  WHERE kategori_id = v_old_coffee;
END IF;
IF v_old_drinks IS NOT NULL AND v_icecek_id IS NOT NULL THEN
  UPDATE urunler SET kategori_id = v_icecek_id
  WHERE kategori_id = v_old_drinks;
END IF;

RAISE NOTICE '✅ Yeni kategori yapisi olusturuldu. Urunler eski kategorilerden yenilere tasindi.';
RAISE NOTICE 'NOT: Eski kategoriler silinmedi. Urunler tasindiktan sonra manuel silebilirsiniz.';

END;
$$;
