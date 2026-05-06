-- Migration: FO ürünleri için adet bazlı paketleme kolonları
-- koli_ici_adet : 1 kolide kaç adet ürün var (FO için, kutu kavramı yok)
-- palet_ici_adet: 1 palette kaç adet ürün var (FO için, doğrudan adet sayısı)
-- Idempotent: kolonlar zaten varsa hiçbir şey yapmaz.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'urunler'
      AND column_name = 'koli_ici_adet'
  ) THEN
    ALTER TABLE public.urunler ADD COLUMN koli_ici_adet integer;
    COMMENT ON COLUMN public.urunler.koli_ici_adet IS 'FO ürünleri için: 1 kolide kaç adet (örn: 1 kolide 6 adet şişe)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'urunler'
      AND column_name = 'palet_ici_adet'
  ) THEN
    ALTER TABLE public.urunler ADD COLUMN palet_ici_adet integer;
    COMMENT ON COLUMN public.urunler.palet_ici_adet IS 'FO ürünleri için: 1 palette toplam kaç adet (örn: 1 palette 125 adet şurup)';
  END IF;
END
$$;
