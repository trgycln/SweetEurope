-- 1. urunler tablosuna 'onerilen' sütunu ekleyelim
ALTER TABLE public.urunler 
ADD COLUMN IF NOT EXISTS onerilen BOOLEAN DEFAULT false;

-- 2. urun_talepleri tablosunu olusturalim
CREATE TABLE IF NOT EXISTS public.urun_talepleri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firma_id UUID NOT NULL REFERENCES public.firmalar(id),
    kullanici_id UUID NOT NULL REFERENCES auth.users(id),
    urun_id UUID NOT NULL REFERENCES public.urunler(id),
    miktar NUMERIC NOT NULL,
    birim VARCHAR(50) NOT NULL,
    durum VARCHAR(50) NOT NULL DEFAULT 'Bekliyor', -- 'Bekliyor', 'İşleme Alındı', 'Tedarik Edildi', 'İptal'
    notlar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) Politikalari (Opsiyonel ama onerilir)
ALTER TABLE public.urun_talepleri ENABLE ROW LEVEL SECURITY;

-- Kullanicilar kendi taleplerini gorebilir ve ekleyebilir
CREATE POLICY "Kullanicilar kendi taleplerini gorebilir" ON public.urun_talepleri
    FOR SELECT USING (auth.uid() = kullanici_id);

CREATE POLICY "Kullanicilar kendi taleplerini ekleyebilir" ON public.urun_talepleri
    FOR INSERT WITH CHECK (auth.uid() = kullanici_id);

-- Adminler her seyi yapabilir (Gerekiyorsa, projeye gore admin rolune izin verebilirsiniz)
