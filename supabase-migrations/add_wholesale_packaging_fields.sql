-- Migration: Add wholesale packaging hierarchy to urunler
-- Date: 2026-04-09
-- Purpose: Store box/case/pallet structure in DB and keep derived totals in sync.

BEGIN;

ALTER TABLE public.urunler
  ADD COLUMN IF NOT EXISTS kutu_ici_adet integer,
  ADD COLUMN IF NOT EXISTS koli_ici_kutu_adet integer,
  ADD COLUMN IF NOT EXISTS palet_ici_koli_adet integer,
  ADD COLUMN IF NOT EXISTS koli_ici_adet integer,
  ADD COLUMN IF NOT EXISTS palet_ici_kutu_adet integer,
  ADD COLUMN IF NOT EXISTS palet_ici_adet integer,
  ADD COLUMN IF NOT EXISTS alis_fiyat_seviyesi text DEFAULT 'kutu';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'urunler_alis_fiyat_seviyesi_check'
  ) THEN
    ALTER TABLE public.urunler
      ADD CONSTRAINT urunler_alis_fiyat_seviyesi_check
      CHECK (alis_fiyat_seviyesi IN ('adet', 'kutu', 'koli', 'palet'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_urun_packaging_metrics()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  teknik jsonb := COALESCE(NEW.teknik_ozellikler::jsonb, '{}'::jsonb);
BEGIN
  NEW.kutu_ici_adet := GREATEST(
    COALESCE(NEW.kutu_ici_adet, NULLIF(teknik ->> 'kutu_ici_adet', '')::integer, 1),
    1
  );

  NEW.koli_ici_kutu_adet := GREATEST(
    COALESCE(NEW.koli_ici_kutu_adet, NULLIF(teknik ->> 'koli_ici_kutu_adet', '')::integer, 1),
    1
  );

  NEW.palet_ici_koli_adet := GREATEST(
    COALESCE(NEW.palet_ici_koli_adet, NULLIF(teknik ->> 'palet_ici_koli_adet', '')::integer, 1),
    1
  );

  NEW.koli_ici_adet := NEW.kutu_ici_adet * NEW.koli_ici_kutu_adet;
  NEW.palet_ici_kutu_adet := NEW.koli_ici_kutu_adet * NEW.palet_ici_koli_adet;
  NEW.palet_ici_adet := NEW.kutu_ici_adet * NEW.koli_ici_kutu_adet * NEW.palet_ici_koli_adet;

  NEW.teknik_ozellikler := (
    teknik || jsonb_build_object(
      'kutu_ici_adet', NEW.kutu_ici_adet,
      'koli_ici_kutu_adet', NEW.koli_ici_kutu_adet,
      'palet_ici_koli_adet', NEW.palet_ici_koli_adet,
      'koli_ici_adet', NEW.koli_ici_adet,
      'palet_ici_kutu_adet', NEW.palet_ici_kutu_adet,
      'palet_ici_adet', NEW.palet_ici_adet,
      'alis_fiyat_seviyesi', COALESCE(NEW.alis_fiyat_seviyesi, 'kutu')
    )
  )::jsonb;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_urun_packaging_metrics ON public.urunler;

CREATE TRIGGER trg_sync_urun_packaging_metrics
BEFORE INSERT OR UPDATE OF teknik_ozellikler, kutu_ici_adet, koli_ici_kutu_adet, palet_ici_koli_adet, alis_fiyat_seviyesi
ON public.urunler
FOR EACH ROW
EXECUTE FUNCTION public.sync_urun_packaging_metrics();

UPDATE public.urunler
SET
  kutu_ici_adet = COALESCE(kutu_ici_adet, NULLIF(teknik_ozellikler ->> 'kutu_ici_adet', '')::integer, 1),
  koli_ici_kutu_adet = COALESCE(koli_ici_kutu_adet, NULLIF(teknik_ozellikler ->> 'koli_ici_kutu_adet', '')::integer, 1),
  palet_ici_koli_adet = COALESCE(palet_ici_koli_adet, NULLIF(teknik_ozellikler ->> 'palet_ici_koli_adet', '')::integer, 1),
  alis_fiyat_seviyesi = COALESCE(alis_fiyat_seviyesi, NULLIF(teknik_ozellikler ->> 'alis_fiyat_seviyesi', ''), 'kutu');

INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, category)
VALUES
  ('pricing_box_discount_percent', '0', 'number', 'Kutu bazlı satış indirimi (%)', 'pricing'),
  ('pricing_case_discount_percent', '4', 'number', 'Koli bazlı satış indirimi (%)', 'pricing'),
  ('pricing_pallet_discount_percent', '8', 'number', 'Palet bazlı satış indirimi (%)', 'pricing')
ON CONFLICT (setting_key) DO NOTHING;

COMMIT;
