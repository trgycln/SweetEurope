-- =====================================================================
-- B2B DEUTSCHLAND - SUPABASE MIGRATION
-- Elysion Sweets / sweetheaven-germany
--
-- Almanya B2B gıda sektörü için gerekli tüm alanlar:
-- LMIV (Lebensmittelinformationsverordnung EU Nr. 1169/2011) uyumlu
-- =====================================================================

-- ── 1. EAN / GTIN ────────────────────────────────────────────────────────────
ALTER TABLE public.urunler
    ADD COLUMN IF NOT EXISTS ean_gtin TEXT;
COMMENT ON COLUMN public.urunler.ean_gtin IS
    'EAN-13 veya GTIN barkod numarası. B2B WaWi/EDI entegrasyonu için zorunlu.';

-- ── 2. Herkunftsland / Menşei Ülke (LMIV Art. 26) ──────────────────────────
ALTER TABLE public.urunler
    ADD COLUMN IF NOT EXISTS herkunftsland JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.urunler.herkunftsland IS
    'Herkunftsland mehrsprachig. Beispiel: {"de": "Deutschland", "en": "Germany", "tr": "Almanya"}';

-- ── 3. Mindestbestellmenge (MOQ) ─────────────────────────────────────────────
ALTER TABLE public.urunler
    ADD COLUMN IF NOT EXISTS mindest_bestellmenge INTEGER DEFAULT 1;
ALTER TABLE public.urunler
    ADD COLUMN IF NOT EXISTS mindest_bestellmenge_einheit TEXT DEFAULT 'Karton';
-- Mögliche Werte: 'Karton', 'Kiste', 'Stück', 'Palette'
COMMENT ON COLUMN public.urunler.mindest_bestellmenge IS 'Mindestbestellmenge (MOQ).';
COMMENT ON COLUMN public.urunler.mindest_bestellmenge_einheit IS 'Einheit der MOQ: Karton, Kiste, Stück, Palette';

-- ── 4. Lagertemperatur ───────────────────────────────────────────────────────
-- Tiefkühl: min=-25, max=-18 | Kühlware: min=2, max=8 | Ambient: NULL
ALTER TABLE public.urunler
    ADD COLUMN IF NOT EXISTS lagertemperatur_min_celsius INTEGER;
ALTER TABLE public.urunler
    ADD COLUMN IF NOT EXISTS lagertemperatur_max_celsius INTEGER;
COMMENT ON COLUMN public.urunler.lagertemperatur_min_celsius IS 'Min. Lagertemperatur °C (Tiefkühl: -25, Kühlware: 2, Ambient: NULL)';
COMMENT ON COLUMN public.urunler.lagertemperatur_max_celsius IS 'Max. Lagertemperatur °C (Tiefkühl: -18, Kühlware: 8, Ambient: NULL)';

-- ── 5. Mindesthaltbarkeit ────────────────────────────────────────────────────
ALTER TABLE public.urunler
    ADD COLUMN IF NOT EXISTS haltbarkeit_monate INTEGER;
ALTER TABLE public.urunler
    ADD COLUMN IF NOT EXISTS haltbarkeit_nach_oeffnen_tage INTEGER;
COMMENT ON COLUMN public.urunler.haltbarkeit_monate IS 'Mindesthaltbarkeit in Monaten (z.B. 12 = 12 Monate).';
COMMENT ON COLUMN public.urunler.haltbarkeit_nach_oeffnen_tage IS 'Haltbarkeit nach Öffnung in Tagen.';

-- ── 6. Zertifikate ───────────────────────────────────────────────────────────
ALTER TABLE public.urunler
    ADD COLUMN IF NOT EXISTS zertifikate TEXT[] DEFAULT '{}';
-- Werte: 'Halal', 'Bio', 'IFS', 'BRC', 'HACCP', 'Kosher', 'Vegan_Zert', 'Rainforest'
COMMENT ON COLUMN public.urunler.zertifikate IS 'Zertifikate als Array: Halal, Bio, IFS, BRC, HACCP, Kosher, Vegan_Zert, Rainforest';

-- ── 7. Inhaltsstoffe / Zutaten (LMIV Pflicht) ───────────────────────────────
ALTER TABLE public.urunler
    ADD COLUMN IF NOT EXISTS inhaltsstoffe JSONB DEFAULT '{}'::jsonb;
-- Beispiel: {"de": "WEIZENMEHL, ZUCKER, BUTTER (24%)...", "en": "WHEAT FLOUR, SUGAR..."}
COMMENT ON COLUMN public.urunler.inhaltsstoffe IS 'Zutaten/Inhaltsstoffe mehrsprachig (LMIV Pflicht). JSON: {"de": "...", "en": "..."}';

-- ── 8. Allergene (EU 14 Hauptallergene nach LMIV Anhang II) ──────────────────
ALTER TABLE public.urunler
    ADD COLUMN IF NOT EXISTS allergene JSONB DEFAULT '{}'::jsonb;
/*
  JSON-Struktur:
  {
    "gluten": true,           -- Glutenhaltiges Getreide
    "krebstiere": false,      -- Krebstiere
    "eier": true,             -- Eier
    "fisch": false,           -- Fisch
    "erdnuesse": false,       -- Erdnüsse
    "soja": false,            -- Soja
    "milch": true,            -- Milch / Laktose
    "nuesse": false,          -- Schalenfrüchte (Nüsse)
    "sellerie": false,        -- Sellerie
    "senf": false,            -- Senf
    "sesam": false,           -- Sesam
    "schwefeldioxid": false,  -- Schwefeldioxid / Sulfite
    "lupinen": false,         -- Lupinen
    "weichtiere": false,      -- Weichtiere
    "spuren_gluten": false,   -- Spurenhinweis Gluten
    "spuren_milch": false,    -- Spurenhinweis Milch
    "spuren_nuesse": false,   -- Spurenhinweis Nüsse
    "spuren_soja": false,     -- Spurenhinweis Soja
    "spuren_sesam": false     -- Spurenhinweis Sesam
  }
*/
COMMENT ON COLUMN public.urunler.allergene IS 'EU 14 Hauptallergene nach LMIV Anhang II als JSONB.';

-- ── 9. Nährwertangaben (LMIV Art. 30 — Pflicht seit 13.12.2016) ─────────────
ALTER TABLE public.urunler
    ADD COLUMN IF NOT EXISTS naehrwerte JSONB DEFAULT '{}'::jsonb;
/*
  JSON-Struktur:
  {
    "pro_100g": {
      "energie_kj": 1250,
      "energie_kcal": 299,
      "fett": 15.2,
      "davon_gesaettigt": 9.4,
      "kohlenhydrate": 38.1,
      "davon_zucker": 24.5,
      "ballaststoffe": 1.2,
      "eiweiss": 4.8,
      "salz": 0.25
    },
    "pro_portion": {
      "portion_gramm": 80,
      "energie_kj": 1000,
      "energie_kcal": 239,
      "fett": 12.2,
      "davon_gesaettigt": 7.5,
      "kohlenhydrate": 30.5,
      "davon_zucker": 19.6,
      "ballaststoffe": 0.96,
      "eiweiss": 3.84,
      "salz": 0.2
    }
  }
*/
COMMENT ON COLUMN public.urunler.naehrwerte IS 'Nährwertangaben pro 100g und pro Portion (LMIV Art.30 Pflicht).';

-- ── 10. Lieferzeit ───────────────────────────────────────────────────────────
ALTER TABLE public.urunler
    ADD COLUMN IF NOT EXISTS lieferzeit_werktage INTEGER DEFAULT 3;
COMMENT ON COLUMN public.urunler.lieferzeit_werktage IS 'Standard-Lieferzeit in Werktagen (Mo–Fr).';

-- ── 11. Produktdatenblatt PDF URL ────────────────────────────────────────────
ALTER TABLE public.urunler
    ADD COLUMN IF NOT EXISTS produktdatenblatt_url TEXT;
COMMENT ON COLUMN public.urunler.produktdatenblatt_url IS 'URL zum Technischen Datenblatt als PDF (Supabase Storage).';

-- ── 12. TARIC / HS-Code ──────────────────────────────────────────────────────
ALTER TABLE public.urunler
    ADD COLUMN IF NOT EXISTS taric_kodu TEXT;
COMMENT ON COLUMN public.urunler.taric_kodu IS 'TARIC/HS-Zolltarifnummer für Importprodukte.';

-- ── 13. Hersteller ───────────────────────────────────────────────────────────
ALTER TABLE public.urunler
    ADD COLUMN IF NOT EXISTS hersteller_name TEXT;
ALTER TABLE public.urunler
    ADD COLUMN IF NOT EXISTS hersteller_land TEXT;
COMMENT ON COLUMN public.urunler.hersteller_name IS 'Herstellername (LMIV Art. 9 Abs. 1 lit. h).';
COMMENT ON COLUMN public.urunler.hersteller_land IS 'Herstellerland (ISO 2-Buchstaben, z.B. DE, TR, PL).';

-- =====================================================================
-- PERFORMANCE-INDIZES
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_urunler_lagertemp_max
    ON public.urunler (lagertemperatur_max_celsius)
    WHERE aktif = true;

CREATE INDEX IF NOT EXISTS idx_urunler_allergene_gin
    ON public.urunler USING GIN (allergene)
    WHERE aktif = true;

CREATE INDEX IF NOT EXISTS idx_urunler_zertifikate_gin
    ON public.urunler USING GIN (zertifikate)
    WHERE aktif = true;

CREATE INDEX IF NOT EXISTS idx_urunler_ean_gtin
    ON public.urunler (ean_gtin)
    WHERE aktif = true AND ean_gtin IS NOT NULL;

-- =====================================================================
-- PUBLIC CATALOG VIEW — keine Preisfelder!
-- =====================================================================

CREATE OR REPLACE VIEW public.public_urunler_katalog AS
SELECT
    u.id, u.ad, u.slug, u.kategori_id,
    u.ana_resim_url, u.galeri_resim_urls,
    u.teknik_ozellikler, u.aciklamalar,
    u.stok_kodu, u.urun_gami,
    u.koli_ici_kutu_adet, u.koli_ici_adet,
    u.palet_ici_koli_adet, u.palet_ici_kutu_adet, u.palet_ici_adet,
    u.birim_agirlik_kg, u.lojistik_sinifi,
    -- Neue B2B-Felder
    u.ean_gtin,
    u.herkunftsland,
    u.mindest_bestellmenge,
    u.mindest_bestellmenge_einheit,
    u.lagertemperatur_min_celsius,
    u.lagertemperatur_max_celsius,
    u.haltbarkeit_monate,
    u.haltbarkeit_nach_oeffnen_tage,
    u.zertifikate,
    u.inhaltsstoffe,
    u.allergene,
    u.naehrwerte,
    u.lieferzeit_werktage,
    u.produktdatenblatt_url,
    u.hersteller_name,
    u.hersteller_land,
    -- Kategorie (denormalisiert)
    k.ad   AS kategori_ad,
    k.slug AS kategori_slug
FROM public.urunler u
LEFT JOIN public.kategoriler k ON u.kategori_id = k.id
WHERE u.aktif = true;

GRANT SELECT ON public.public_urunler_katalog TO anon, authenticated;

-- =====================================================================
-- OPTIONAL: Lagertemperatur für vorhandene Produkte setzen
-- lojistik_sinifi alanına göre otomatik doldurma — ÖNCE KONTROL ET!
-- =====================================================================

/*
-- Tiefkühlware:
UPDATE public.urunler SET
    lagertemperatur_min_celsius = -25,
    lagertemperatur_max_celsius = -18
WHERE aktif = true
    AND lagertemperatur_max_celsius IS NULL
    AND (
        LOWER(lojistik_sinifi) LIKE '%tiefkühl%'
        OR LOWER(lojistik_sinifi) LIKE '%frozen%'
        OR LOWER(lojistik_sinifi) LIKE '%dondurulmuş%'
    );

-- Ambient / Trockenware (Sirupe, Kaffee, Bakery):
UPDATE public.urunler SET
    lagertemperatur_min_celsius = 5,
    lagertemperatur_max_celsius = 25
WHERE aktif = true
    AND lagertemperatur_max_celsius IS NULL
    AND (
        LOWER(lojistik_sinifi) LIKE '%trocken%'
        OR LOWER(lojistik_sinifi) LIKE '%ambient%'
        OR LOWER(lojistik_sinifi) LIKE '%kuru%'
    );
*/

-- =====================================================================
-- SON ADIM: TypeScript tiplerini yenile
-- npx supabase gen types typescript --project-id <project-id> \
--   > src/lib/supabase/database.types.ts
-- =====================================================================
