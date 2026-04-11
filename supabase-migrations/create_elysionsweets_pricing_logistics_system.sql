-- ELYSONSWEETS - Pricing, logistics and profitability management foundation
-- Date: 2026-04-09
-- Purpose: Add master-data cost fields, batch import management, tiered pricing defaults,
--          actual-vs-standard landed cost tracking and small-order delivery controls.

BEGIN;

ALTER TABLE public.urunler
  ADD COLUMN IF NOT EXISTS birim_agirlik_kg numeric(10,3),
  ADD COLUMN IF NOT EXISTS lojistik_sinifi text DEFAULT 'cold-chain',
  ADD COLUMN IF NOT EXISTS gumruk_vergi_orani_yuzde numeric(6,2),
  ADD COLUMN IF NOT EXISTS almanya_kdv_orani numeric(6,2),
  ADD COLUMN IF NOT EXISTS gunluk_depolama_maliyeti_eur numeric(10,4),
  ADD COLUMN IF NOT EXISTS ortalama_stokta_kalma_suresi integer,
  ADD COLUMN IF NOT EXISTS fire_zayiat_orani_yuzde numeric(6,2),
  ADD COLUMN IF NOT EXISTS standart_inis_maliyeti_net numeric(12,4),
  ADD COLUMN IF NOT EXISTS son_gercek_inis_maliyeti_net numeric(12,4),
  ADD COLUMN IF NOT EXISTS son_maliyet_sapma_yuzde numeric(8,2),
  ADD COLUMN IF NOT EXISTS karlilik_alarm_aktif boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS satis_fiyati_toptanci numeric(12,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'urunler_lojistik_sinifi_check'
  ) THEN
    ALTER TABLE public.urunler
      ADD CONSTRAINT urunler_lojistik_sinifi_check
      CHECK (lojistik_sinifi IN ('cold-chain', 'dry-load'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ithalat_partileri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referans_kodu text NOT NULL UNIQUE,
  tedarikci_id uuid NULL REFERENCES public.tedarikciler(id) ON DELETE SET NULL,
  para_birimi text NOT NULL DEFAULT 'EUR',
  kur_orani numeric(12,6) NOT NULL DEFAULT 1,
  soguk_kg numeric(12,3) NOT NULL DEFAULT 0,
  kuru_kg numeric(12,3) NOT NULL DEFAULT 0,
  navlun_soguk_eur numeric(12,2) NOT NULL DEFAULT 0,
  navlun_kuru_eur numeric(12,2) NOT NULL DEFAULT 0,
  gumruk_vergi_toplam_eur numeric(12,2) NOT NULL DEFAULT 0,
  traces_numune_ardiye_eur numeric(12,2) NOT NULL DEFAULT 0,
  ek_notlar text NULL,
  varis_tarihi date NULL,
  durum text NOT NULL DEFAULT 'Taslak',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ithalat_parti_kalemleri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parti_id uuid NOT NULL REFERENCES public.ithalat_partileri(id) ON DELETE CASCADE,
  urun_id uuid NOT NULL REFERENCES public.urunler(id) ON DELETE CASCADE,
  miktar_adet integer NOT NULL DEFAULT 0,
  toplam_agirlik_kg numeric(12,3) NOT NULL DEFAULT 0,
  birim_alis_fiyati_orijinal numeric(12,4) NOT NULL DEFAULT 0,
  ciplak_maliyet_eur numeric(12,4) NOT NULL DEFAULT 0,
  dagitilan_navlun_eur numeric(12,4) NOT NULL DEFAULT 0,
  dagitilan_gumruk_eur numeric(12,4) NOT NULL DEFAULT 0,
  dagitilan_ozel_gider_eur numeric(12,4) NOT NULL DEFAULT 0,
  operasyon_ve_risk_yuku_eur numeric(12,4) NOT NULL DEFAULT 0,
  gercek_inis_maliyeti_net numeric(12,4) NOT NULL DEFAULT 0,
  standart_inis_maliyeti_net numeric(12,4) NOT NULL DEFAULT 0,
  maliyet_sapma_yuzde numeric(8,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ithalat_partileri_tedarikci ON public.ithalat_partileri(tedarikci_id);
CREATE INDEX IF NOT EXISTS idx_ithalat_parti_kalemleri_parti ON public.ithalat_parti_kalemleri(parti_id);
CREATE INDEX IF NOT EXISTS idx_ithalat_parti_kalemleri_urun ON public.ithalat_parti_kalemleri(urun_id);

CREATE OR REPLACE FUNCTION public.calculate_actual_landed_cost(
  p_ciplak_maliyet_eur numeric,
  p_urun_agirlik_kg numeric,
  p_gumruk_vergi_orani_yuzde numeric,
  p_soguk_ek_gider_kg_basi_eur numeric,
  p_navlun_kg_basi_eur numeric,
  p_gunluk_depolama_maliyeti_eur numeric,
  p_ortalama_stok_gun integer,
  p_fire_zayiat_orani_yuzde numeric
)
RETURNS numeric
LANGUAGE sql
AS $$
  SELECT COALESCE(p_ciplak_maliyet_eur, 0)
    + (COALESCE(p_ciplak_maliyet_eur, 0) * COALESCE(p_gumruk_vergi_orani_yuzde, 0) / 100.0)
    + (COALESCE(p_soguk_ek_gider_kg_basi_eur, 0) * COALESCE(p_urun_agirlik_kg, 0))
    + (COALESCE(p_navlun_kg_basi_eur, 0) * COALESCE(p_urun_agirlik_kg, 0))
    + (COALESCE(p_gunluk_depolama_maliyeti_eur, 0) * COALESCE(p_ortalama_stok_gun, 0))
    + (COALESCE(p_ciplak_maliyet_eur, 0) * COALESCE(p_fire_zayiat_orani_yuzde, 0) / 100.0);
$$;

CREATE OR REPLACE FUNCTION public.calculate_tier_price(
  p_standart_inis_maliyeti numeric,
  p_marj_yuzde numeric
)
RETURNS numeric
LANGUAGE sql
AS $$
  SELECT ROUND(COALESCE(p_standart_inis_maliyeti, 0) * (1 + COALESCE(p_marj_yuzde, 0) / 100.0), 2);
$$;

CREATE OR REPLACE FUNCTION public.evaluate_variance_alert(
  p_standart_inis_maliyeti numeric,
  p_gercek_inis_maliyeti numeric,
  p_esik_yuzde numeric DEFAULT 5
)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT CASE
    WHEN COALESCE(p_standart_inis_maliyeti, 0) <= 0 THEN false
    ELSE ABS(((COALESCE(p_gercek_inis_maliyeti, 0) - COALESCE(p_standart_inis_maliyeti, 0)) / p_standart_inis_maliyeti) * 100.0) >= COALESCE(p_esik_yuzde, 5)
  END;
$$;

CREATE OR REPLACE FUNCTION public.update_urun_profitability_snapshot_from_batch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  variance_pct numeric;
  should_alert boolean;
BEGIN
  IF NEW.standart_inis_maliyeti_net > 0 THEN
    variance_pct := ROUND(((NEW.gercek_inis_maliyeti_net - NEW.standart_inis_maliyeti_net) / NEW.standart_inis_maliyeti_net) * 100.0, 2);
  ELSE
    variance_pct := 0;
  END IF;

  should_alert := public.evaluate_variance_alert(NEW.standart_inis_maliyeti_net, NEW.gercek_inis_maliyeti_net, 5);

  UPDATE public.urunler
  SET
    son_gercek_inis_maliyeti_net = NEW.gercek_inis_maliyeti_net,
    standart_inis_maliyeti_net = CASE
      WHEN COALESCE(standart_inis_maliyeti_net, 0) = 0 THEN NEW.standart_inis_maliyeti_net
      ELSE standart_inis_maliyeti_net
    END,
    son_maliyet_sapma_yuzde = variance_pct,
    karlilik_alarm_aktif = should_alert
  WHERE id = NEW.urun_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_urun_profitability_snapshot_from_batch ON public.ithalat_parti_kalemleri;
CREATE TRIGGER trg_update_urun_profitability_snapshot_from_batch
AFTER INSERT OR UPDATE OF gercek_inis_maliyeti_net, standart_inis_maliyeti_net
ON public.ithalat_parti_kalemleri
FOR EACH ROW
EXECUTE FUNCTION public.update_urun_profitability_snapshot_from_batch();

INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('pricing_tier1_margin_percent', '5', 'number', 'Alt bayi standart marj oranı (%)', 'pricing'),
  ('pricing_tier2_margin_percent', '25', 'number', 'Toptancı / Katering / Otel standart marj oranı (%)', 'pricing'),
  ('pricing_tier3_margin_percent', '30', 'number', 'Perakende / Kafe standart marj oranı (%)', 'pricing'),
  ('pricing_variance_alert_threshold_percent', '5', 'number', 'Kârlılık alarm eşiği (%)', 'pricing'),
  ('pricing_small_order_moq_units', '20', 'number', 'Küçük sipariş teslimat ücreti için minimum adet eşiği', 'pricing'),
  ('pricing_small_order_fee_eur', '25', 'number', 'MOQ altındaki siparişlere eklenecek teslimat ücreti (€)', 'pricing'),
  ('pricing_cold_docs_per_kg_eur', '0.18', 'number', 'TRACES/numune/ardiye için soğuk ürün kg başı ek yük (€)', 'pricing'),
  ('pricing_dry_docs_per_kg_eur', '0.02', 'number', 'Kuru yük için kg başı sabit gümrük/işlem yükü (€)', 'pricing'),
  ('pricing_storage_cold_daily_eur', '0.15', 'number', 'Soğuk ürün günlük depolama maliyeti (€)', 'pricing'),
  ('pricing_storage_dry_daily_eur', '0.01', 'number', 'Kuru ürün günlük depolama maliyeti (€)', 'pricing')
ON CONFLICT (setting_key) DO NOTHING;

COMMIT;
