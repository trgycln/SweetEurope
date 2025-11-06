-- Müşteri Bazlı Özel Fiyatlar (İstisnalar)
CREATE TABLE IF NOT EXISTS public.musteri_fiyat_istisnalari (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  urun_id UUID NOT NULL REFERENCES public.urunler(id) ON DELETE CASCADE,
  firma_id UUID NOT NULL REFERENCES public.firmalar(id) ON DELETE CASCADE,
  kanal public.user_role NOT NULL DEFAULT 'Müşteri',
  ozel_fiyat_net NUMERIC(10,2) NOT NULL CHECK (ozel_fiyat_net > 0),
  baslangic_tarihi DATE NULL,
  bitis_tarihi DATE NULL,
  aciklama TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (urun_id, firma_id, kanal)
);

CREATE INDEX IF NOT EXISTS idx_mfi_urun_id ON public.musteri_fiyat_istisnalari(urun_id);
CREATE INDEX IF NOT EXISTS idx_mfi_firma_id ON public.musteri_fiyat_istisnalari(firma_id);
CREATE INDEX IF NOT EXISTS idx_mfi_kanal ON public.musteri_fiyat_istisnalari(kanal);

-- RLS
ALTER TABLE public.musteri_fiyat_istisnalari ENABLE ROW LEVEL SECURITY;

-- Adminler tüm kayıtları yönetebilir
CREATE POLICY IF NOT EXISTS "yoneticiler_mfi_full" ON public.musteri_fiyat_istisnalari
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiller p
    WHERE p.id = auth.uid() AND p.rol IN ('Yönetici','Ekip Üyesi')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiller p
    WHERE p.id = auth.uid() AND p.rol IN ('Yönetici','Ekip Üyesi')
  )
);

-- Firmalar kendi kayıtlarını görebilir (okuma)
CREATE POLICY IF NOT EXISTS "firma_kendi_mfi_okur" ON public.musteri_fiyat_istisnalari
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiller pr
    WHERE pr.id = auth.uid() AND pr.firma_id = musteri_fiyat_istisnalari.firma_id
  )
);
