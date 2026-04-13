-- Product stock movement logs for supplier order receipt flow
-- Date: 2026-04-12

BEGIN;

CREATE TABLE IF NOT EXISTS public.urun_stok_hareket_loglari (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  urun_id uuid NOT NULL REFERENCES public.urunler(id) ON DELETE CASCADE,
  hareket_tipi text NOT NULL,
  kaynak text NOT NULL,
  miktar numeric(12,2) NOT NULL,
  birim text NOT NULL DEFAULT 'kutu',
  birim_miktar numeric(12,2),
  onceki_stok numeric(12,2) NOT NULL,
  sonraki_stok numeric(12,2) NOT NULL,
  referans_kayit_id text,
  tedarikci_id uuid REFERENCES public.tedarikciler(id),
  yapan_user_id uuid,
  yapan_user_adi text,
  yapan_user_email text,
  aciklama text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_urun_stok_hareket_loglari_urun_id_created_at
  ON public.urun_stok_hareket_loglari (urun_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_urun_stok_hareket_loglari_referans
  ON public.urun_stok_hareket_loglari (referans_kayit_id);

COMMENT ON TABLE public.urun_stok_hareket_loglari IS 'Urun bazli stok hareket loglari (kim, ne zaman, ne kadar, kaynak).';
COMMENT ON COLUMN public.urun_stok_hareket_loglari.hareket_tipi IS 'stok_artisi, stok_azalisi vb.';
COMMENT ON COLUMN public.urun_stok_hareket_loglari.kaynak IS 'ornek: supplier_order_receipt';

COMMIT;
