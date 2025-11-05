-- =====================================================
-- ÜRÜN DEĞERLENDİRME SİSTEMİ
-- Gerçek müşteri değerlendirmeleri ve yorumları
-- =====================================================

-- 1) Ürün Değerlendirmeleri Tablosu
CREATE TABLE IF NOT EXISTS public.urun_degerlendirmeleri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    urun_id UUID NOT NULL REFERENCES public.urunler(id) ON DELETE CASCADE,
    kullanici_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    firma_id UUID REFERENCES public.firmalar(id) ON DELETE CASCADE,
    
    -- Değerlendirme Bilgileri
    puan INTEGER NOT NULL CHECK (puan >= 1 AND puan <= 5),
    baslik TEXT,
    yorum TEXT,
    
    -- Resimler (opsiyonel - müşteri ürün fotoğrafı yükleyebilir)
    resimler TEXT[], -- URL array
    
    -- Onay Durumu (admin onayı gerekebilir)
    onay_durumu TEXT DEFAULT 'beklemede' CHECK (onay_durumu IN ('beklemede', 'onaylandi', 'reddedildi')),
    onaylayan_id UUID REFERENCES auth.users(id),
    onay_tarihi TIMESTAMPTZ,
    red_nedeni TEXT,
    
    -- Yardımcı Oldu mu? (helpful votes)
    yardimci_oy_sayisi INTEGER DEFAULT 0,
    yardimci_olmayan_oy_sayisi INTEGER DEFAULT 0,
    
    -- Sipariş Doğrulaması (sadece ürünü satın alan müşteriler değerlendirme yapabilir)
    siparis_id UUID REFERENCES public.siparisler(id),
    dogrulanmis_alis BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: Bir kullanıcı aynı ürüne sadece bir değerlendirme yapabilir
    UNIQUE(urun_id, kullanici_id)
);

-- 2) Değerlendirme Oylama Tablosu (Helpful votes için)
CREATE TABLE IF NOT EXISTS public.degerlendirme_oylari (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    degerlendirme_id UUID NOT NULL REFERENCES public.urun_degerlendirmeleri(id) ON DELETE CASCADE,
    kullanici_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    yardimci_mi BOOLEAN NOT NULL, -- true = helpful, false = not helpful
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Bir kullanıcı aynı değerlendirmeye sadece bir kez oy verebilir
    UNIQUE(degerlendirme_id, kullanici_id)
);

-- 3) Ürünler Tablosuna Ortalama Puan ve Değerlendirme Sayısı Kolonları Ekle
ALTER TABLE public.urunler 
ADD COLUMN IF NOT EXISTS ortalama_puan NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS degerlendirme_sayisi INTEGER DEFAULT 0;

-- 4) İndeksler (Performance için)
CREATE INDEX IF NOT EXISTS idx_urun_degerlendirmeleri_urun_id ON public.urun_degerlendirmeleri(urun_id);
CREATE INDEX IF NOT EXISTS idx_urun_degerlendirmeleri_kullanici_id ON public.urun_degerlendirmeleri(kullanici_id);
CREATE INDEX IF NOT EXISTS idx_urun_degerlendirmeleri_onay_durumu ON public.urun_degerlendirmeleri(onay_durumu);
CREATE INDEX IF NOT EXISTS idx_urun_degerlendirmeleri_created_at ON public.urun_degerlendirmeleri(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_degerlendirme_oylari_degerlendirme_id ON public.degerlendirme_oylari(degerlendirme_id);

-- 5) RLS Policies
ALTER TABLE public.urun_degerlendirmeleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.degerlendirme_oylari ENABLE ROW LEVEL SECURITY;

-- Herkes onaylanmış değerlendirmeleri okuyabilir
CREATE POLICY "Herkes onaylanan degerlendirmeleri gorebilir"
ON public.urun_degerlendirmeleri
FOR SELECT
USING (onay_durumu = 'onaylandi');

-- Kullanıcılar kendi değerlendirmelerini görebilir (onay durumu fark etmeksizin)
CREATE POLICY "Kullanicilar kendi degerlendirmelerini gorebilir"
ON public.urun_degerlendirmeleri
FOR SELECT
USING (auth.uid() = kullanici_id);

-- Sadece doğrulanmış alışveriş yapan kullanıcılar değerlendirme ekleyebilir
CREATE POLICY "Dogrulanmis musteri degerlendirme ekleyebilir"
ON public.urun_degerlendirmeleri
FOR INSERT
WITH CHECK (
    auth.uid() = kullanici_id 
    AND EXISTS (
        SELECT 1 FROM public.siparisler s
        JOIN public.siparis_detay sd ON s.id = sd.siparis_id
        WHERE s.olusturan_kullanici_id = auth.uid()
        AND sd.urun_id = urun_id
        AND s.siparis_durumu = 'Teslim Edildi'
    )
);

-- Kullanıcılar kendi değerlendirmelerini güncelleyebilir (sadece beklemede veya reddedilmiş olanları)
CREATE POLICY "Kullanicilar kendi degerlendirmelerini guncelleyebilir"
ON public.urun_degerlendirmeleri
FOR UPDATE
USING (auth.uid() = kullanici_id AND onay_durumu IN ('beklemede', 'reddedildi'))
WITH CHECK (auth.uid() = kullanici_id);

-- Yöneticiler tüm değerlendirmeleri görebilir ve yönetebilir
CREATE POLICY "Yoneticiler tum degerlendirmeleri gorebilir"
ON public.urun_degerlendirmeleri
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiller
        WHERE id = auth.uid()
        AND rol IN ('Yönetici', 'Ekip Üyesi')
    )
);

-- Oylar için policy
CREATE POLICY "Kullanicilar oy verebilir"
ON public.degerlendirme_oylari
FOR ALL
USING (auth.uid() = kullanici_id)
WITH CHECK (auth.uid() = kullanici_id);

-- 6) Trigger: Ürün ortalama puanını otomatik güncelle
CREATE OR REPLACE FUNCTION public.update_urun_ortalama_puan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ortalama NUMERIC(3,2);
    v_sayi INTEGER;
BEGIN
    -- Sadece onaylanan değerlendirmeleri hesapla
    SELECT 
        COALESCE(AVG(puan), 0),
        COUNT(*)
    INTO v_ortalama, v_sayi
    FROM public.urun_degerlendirmeleri
    WHERE urun_id = COALESCE(NEW.urun_id, OLD.urun_id)
    AND onay_durumu = 'onaylandi';
    
    -- Ürünler tablosunu güncelle
    UPDATE public.urunler
    SET 
        ortalama_puan = v_ortalama,
        degerlendirme_sayisi = v_sayi
    WHERE id = COALESCE(NEW.urun_id, OLD.urun_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger'ı ekle
DROP TRIGGER IF EXISTS trigger_update_urun_ortalama_puan ON public.urun_degerlendirmeleri;
CREATE TRIGGER trigger_update_urun_ortalama_puan
    AFTER INSERT OR UPDATE OR DELETE ON public.urun_degerlendirmeleri
    FOR EACH ROW
    EXECUTE FUNCTION public.update_urun_ortalama_puan();

-- 7) Trigger: Oyları güncelle
CREATE OR REPLACE FUNCTION public.update_degerlendirme_oylari()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_yardimci INTEGER;
    v_yardimci_olmayan INTEGER;
BEGIN
    -- Oy sayılarını hesapla
    SELECT 
        COUNT(*) FILTER (WHERE yardimci_mi = true),
        COUNT(*) FILTER (WHERE yardimci_mi = false)
    INTO v_yardimci, v_yardimci_olmayan
    FROM public.degerlendirme_oylari
    WHERE degerlendirme_id = COALESCE(NEW.degerlendirme_id, OLD.degerlendirme_id);
    
    -- Değerlendirme tablosunu güncelle
    UPDATE public.urun_degerlendirmeleri
    SET 
        yardimci_oy_sayisi = v_yardimci,
        yardimci_olmayan_oy_sayisi = v_yardimci_olmayan
    WHERE id = COALESCE(NEW.degerlendirme_id, OLD.degerlendirme_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger'ı ekle
DROP TRIGGER IF EXISTS trigger_update_degerlendirme_oylari ON public.degerlendirme_oylari;
CREATE TRIGGER trigger_update_degerlendirme_oylari
    AFTER INSERT OR UPDATE OR DELETE ON public.degerlendirme_oylari
    FOR EACH ROW
    EXECUTE FUNCTION public.update_degerlendirme_oylari();

-- 8) Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_urun_degerlendirmeleri_updated_at ON public.urun_degerlendirmeleri;
CREATE TRIGGER trigger_urun_degerlendirmeleri_updated_at
    BEFORE UPDATE ON public.urun_degerlendirmeleri
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- YORUMLAR
-- =====================================================

COMMENT ON TABLE public.urun_degerlendirmeleri IS 
'Müşteri ürün değerlendirmeleri ve yorumları. Sadece ürünü satın alan doğrulanmış müşteriler değerlendirme yapabilir.';

COMMENT ON COLUMN public.urun_degerlendirmeleri.onay_durumu IS 
'Admin onay durumu: beklemede, onaylandi, reddedildi. Sadece onaylanmış değerlendirmeler herkese görünür.';

COMMENT ON COLUMN public.urun_degerlendirmeleri.dogrulanmis_alis IS 
'Müşterinin bu ürünü gerçekten satın alıp almadığını gösterir. Sadece doğrulanmış alışlar değerlendirme yapabilir.';

COMMENT ON TABLE public.degerlendirme_oylari IS 
'Değerlendirmelere verilen "Yardımcı oldu mu?" oyları.';

-- =====================================================
-- KULLANIM ÖRNEĞİ
-- =====================================================
/*
-- Yeni değerlendirme ekleme (Server Action'dan çağrılacak)
INSERT INTO public.urun_degerlendirmeleri (
    urun_id, 
    kullanici_id, 
    firma_id,
    siparis_id,
    puan, 
    baslik, 
    yorum,
    dogrulanmis_alis
) VALUES (
    'urun-uuid',
    auth.uid(),
    'firma-uuid',
    'siparis-uuid',
    5,
    'Harika ürün!',
    'Kalitesi çok iyi, kesinlikle tavsiye ederim.',
    true
);

-- Ürünün tüm onaylı değerlendirmelerini getir
SELECT 
    d.*,
    p.tam_ad as kullanici_adi,
    f.unvan as firma_adi
FROM public.urun_degerlendirmeleri d
LEFT JOIN public.profiller p ON d.kullanici_id = p.id
LEFT JOIN public.firmalar f ON d.firma_id = f.id
WHERE d.urun_id = 'urun-uuid'
AND d.onay_durumu = 'onaylandi'
ORDER BY d.created_at DESC;

-- Ürün ortalama puanı ve değerlendirme sayısı (direkt urunler tablosundan)
SELECT 
    ad,
    ortalama_puan,
    degerlendirme_sayisi
FROM public.urunler
WHERE id = 'urun-uuid';
*/
