-- Migration: Kargo Takip Kolonları
-- Tarih: 2026-10-04
-- Açıklama: siparisler tablosuna kargo takip bilgileri için kolonlar eklenir.
-- Bu kolonlar "Yola Çıktı" durumu işlenirken doldurulur.

ALTER TABLE public.siparisler
  ADD COLUMN IF NOT EXISTS kargo_firmasi  TEXT,
  ADD COLUMN IF NOT EXISTS kargo_takip_no TEXT,
  ADD COLUMN IF NOT EXISTS kargo_takip_url TEXT;

-- İndeks: Takip numarasına göre arama desteklenir
CREATE INDEX IF NOT EXISTS idx_siparisler_kargo_takip_no
  ON public.siparisler (kargo_takip_no)
  WHERE kargo_takip_no IS NOT NULL;

COMMENT ON COLUMN public.siparisler.kargo_firmasi  IS 'Kargo firması adı (DHL, UPS, DPD, Spedition, Eigenversand vb.)';
COMMENT ON COLUMN public.siparisler.kargo_takip_no IS 'Kargo takip numarası';
COMMENT ON COLUMN public.siparisler.kargo_takip_url IS 'Kargo takip linki (tracking URL)';
