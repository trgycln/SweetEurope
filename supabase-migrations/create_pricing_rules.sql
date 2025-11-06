-- Fiyat Kuralları (otomatik indirim/artış)
CREATE TABLE IF NOT EXISTS public.fiyat_kurallari (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad TEXT NOT NULL,
  aktif BOOLEAN NOT NULL DEFAULT true,
  kapsam TEXT NOT NULL CHECK (kapsam IN ('global','kategori','urun')),
  kategori_id UUID NULL REFERENCES public.kategoriler(id) ON DELETE CASCADE,
  urun_id UUID NULL REFERENCES public.urunler(id) ON DELETE CASCADE,
  kanal public.user_role NOT NULL DEFAULT 'Müşteri',
  firma_id UUID NULL REFERENCES public.firmalar(id) ON DELETE CASCADE,
  min_adet INTEGER NOT NULL DEFAULT 0 CHECK (min_adet >= 0),
  yuzde_degisim NUMERIC(6,2) NOT NULL, -- -5.00 = %5 indirim, 2.00 = %2 artış
  oncelik INTEGER NOT NULL DEFAULT 100,
  baslangic_tarihi DATE NULL,
  bitis_tarihi DATE NULL,
  aciklama TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fk_aktif ON public.fiyat_kurallari(aktif);
CREATE INDEX IF NOT EXISTS idx_fk_kanal ON public.fiyat_kurallari(kanal);
CREATE INDEX IF NOT EXISTS idx_fk_oncelik ON public.fiyat_kurallari(oncelik);
CREATE INDEX IF NOT EXISTS idx_fk_kapsam ON public.fiyat_kurallari(kapsam);

-- RLS
ALTER TABLE public.fiyat_kurallari ENABLE ROW LEVEL SECURITY;

-- Adminler tüm kayıtları yönetir
CREATE POLICY IF NOT EXISTS "yoneticiler_fk_full" ON public.fiyat_kurallari
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

-- Herkes (auth) aktif kuralları okuyabilir (fiyat hesaplamak için)
CREATE POLICY IF NOT EXISTS "auth_okur_aktif_kurallar" ON public.fiyat_kurallari
FOR SELECT
USING (aktif = true);
