-- ALT BAYI PORTALI IÇIN VERITABANI SEMASI VE GÜVENLIK KURALLARI
-- Bu script, alt bayilerin kendi müşterilerini, görevlerini, finansallarını ve stoklarını
-- ana sistemden tamamen izole bir şekilde yönetebilmesi için gerekli altyapıyı kurar.

BEGIN;

-- ADIM 1: MEVCUT TABLOLARA SAHIPLIK SUTUNU EKLEME
-- Bu sayede her bir müşteri ve görevin hangi kullanıcıya (Yönetici veya Alt Bayi) ait olduğunu bileceğiz.

-- "firmalar" tablosuna sahip_id ekle
ALTER TABLE public.firmalar
ADD COLUMN IF NOT EXISTS sahip_id UUID REFERENCES public.profiller(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.firmalar.sahip_id IS 'Bu müşteri kaydının sahibi olan kullanıcının (profiller.id) referansı. NULL ise, ana yöneticiye aittir.';

-- "gorevler" tablosuna sahip_id ekle
ALTER TABLE public.gorevler
ADD COLUMN IF NOT EXISTS sahip_id UUID REFERENCES public.profiller(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.gorevler.sahip_id IS 'Bu görevin sahibi olan kullanıcının (profiller.id) referansı.';


-- ADIM 2: ALT BAYILERE OZEL YENI TABLOLAR OLUSTURMA
-- Bu tablolar, alt bayilerin finansal ve stok verilerini ana sistemden tamamen ayri tutar.

-- Alt Bayi Giderleri Tablosu
CREATE TABLE IF NOT EXISTS public.alt_bayi_giderleri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sahip_id UUID NOT NULL REFERENCES public.profiller(id) ON DELETE CASCADE,
    tarih DATE NOT NULL,
    kategori TEXT,
    aciklama TEXT,
    tutar NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.alt_bayi_giderleri IS 'Alt bayilerin kendi operasyonel giderlerini kaydettiği tablo.';

-- Alt Bayi Gelirleri Tablosu
CREATE TABLE IF NOT EXISTS public.alt_bayi_gelirleri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sahip_id UUID NOT NULL REFERENCES public.profiller(id) ON DELETE CASCADE,
    tarih DATE NOT NULL,
    musteri_adi TEXT,
    aciklama TEXT,
    tutar NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.alt_bayi_gelirleri IS 'Alt bayilerin kendi gelirlerini (örneğin hizmet bedeli) kaydettiği tablo.';

-- Alt Bayi Stokları Tablosu
CREATE TABLE IF NOT EXISTS public.alt_bayi_stoklari (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    sahip_id UUID NOT NULL REFERENCES public.profiller(id) ON DELETE CASCADE,
    urun_id UUID NOT NULL REFERENCES public.urunler(id) ON DELETE CASCADE,
    miktar INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(sahip_id, urun_id)
);
COMMENT ON TABLE public.alt_bayi_stoklari IS 'Alt bayilerin kendi ürün stoklarını takip ettiği tablo.';

-- Alt Bayi Satış Kayıtları (Ana Tablo)
CREATE TABLE IF NOT EXISTS public.alt_bayi_satis_kayitlari (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sahip_id UUID NOT NULL REFERENCES public.profiller(id) ON DELETE CASCADE,
    musteri_firma_id UUID REFERENCES public.firmalar(id) ON DELETE SET NULL,
    tarih DATE NOT NULL,
    toplam_tutar NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE public.alt_bayi_satis_kayitlari IS 'Alt bayilerin kendi müşterilerine yaptığı satışların ana kaydı.';

-- Alt Bayi Satış Detayları (Detay Tablosu)
CREATE TABLE IF NOT EXISTS public.alt_bayi_satis_detaylari (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    satis_kaydi_id UUID NOT NULL REFERENCES public.alt_bayi_satis_kayitlari(id) ON DELETE CASCADE,
    urun_id UUID NOT NULL REFERENCES public.urunler(id) ON DELETE RESTRICT,
    miktar INT NOT NULL,
    satis_fiyati NUMERIC(10, 2) NOT NULL,
    toplam_fiyat NUMERIC(10, 2) GENERATED ALWAYS AS (miktar * satis_fiyati) STORED
);
COMMENT ON TABLE public.alt_bayi_satis_detaylari IS 'Bir alt bayi satış kaydının ürün detaylarını içerir.';


-- ADIM 3: VERI GUVENLIGI ICIN ROW LEVEL SECURITY (RLS) POLITIKALARI

-- Fonksiyon: Mevcut kullanıcının rolünü getirir
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT rol INTO user_role FROM public.profiller WHERE id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS'i etkinleştir
ALTER TABLE public.firmalar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gorevler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alt_bayi_giderleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alt_bayi_gelirleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alt_bayi_stoklari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alt_bayi_satis_kayitlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alt_bayi_satis_detaylari ENABLE ROW LEVEL SECURITY;

-- Mevcut RLS politikalarını temizle (varsa)
DROP POLICY IF EXISTS "Yöneticiler tüm firmaları görebilir" ON public.firmalar;
DROP POLICY IF EXISTS "Alt Bayiler sadece kendi firmalarını görebilir" ON public.firmalar;
DROP POLICY IF EXISTS "Kullanıcılar kendi firmalarını ekleyebilir" ON public.firmalar;
DROP POLICY IF EXISTS "Kullanıcılar kendi firmalarını güncelleyip silebilir" ON public.firmalar; -- Eski hatalı politika
DROP POLICY IF EXISTS "Kullanıcılar kendi firmalarını güncelleyebilir" ON public.firmalar; -- Yeni politika
DROP POLICY IF EXISTS "Kullanıcılar kendi firmalarını silebilir" ON public.firmalar; -- Yeni politika

DROP POLICY IF EXISTS "Yöneticiler tüm görevleri yönetebilir" ON public.gorevler;
DROP POLICY IF EXISTS "Alt Bayiler sadece kendi görevlerini yönetebilir" ON public.gorevler;

DROP POLICY IF EXISTS "Kullanıcılar kendi finansal kayıtlarını yönetebilir" ON public.alt_bayi_giderleri;
DROP POLICY IF EXISTS "Kullanıcılar kendi finansal kayıtlarını yönetebilir" ON public.alt_bayi_gelirleri;
DROP POLICY IF EXISTS "Kullanıcılar kendi stoklarını yönetebilir" ON public.alt_bayi_stoklari;
DROP POLICY IF EXISTS "Kullanıcılar kendi satış kayıtlarını yönetebilir" ON public.alt_bayi_satis_kayitlari;
DROP POLICY IF EXISTS "Kullanıcılar kendi satış detaylarını görebilir" ON public.alt_bayi_satis_detaylari;


-- Yeni RLS Politikaları

-- firmalar tablosu için
CREATE POLICY "Yöneticiler tüm firmaları görebilir" ON public.firmalar
FOR SELECT USING (get_my_role() = 'Yönetici');

CREATE POLICY "Alt Bayiler sadece kendi firmalarını görebilir" ON public.firmalar
FOR SELECT USING (sahip_id = auth.uid());

CREATE POLICY "Kullanıcılar kendi firmalarını ekleyebilir" ON public.firmalar
FOR INSERT WITH CHECK (sahip_id = auth.uid());

CREATE POLICY "Kullanıcılar kendi firmalarını güncelleyebilir" ON public.firmalar
FOR UPDATE USING (sahip_id = auth.uid()) WITH CHECK (sahip_id = auth.uid());

CREATE POLICY "Kullanıcılar kendi firmalarını silebilir" ON public.firmalar
FOR DELETE USING (sahip_id = auth.uid());

-- gorevler tablosu için
CREATE POLICY "Yöneticiler tüm görevleri yönetebilir" ON public.gorevler
FOR ALL USING (get_my_role() = 'Yönetici');

CREATE POLICY "Alt Bayiler sadece kendi görevlerini yönetebilir" ON public.gorevler
FOR ALL USING (sahip_id = auth.uid());

-- Alt Bayi'ye özel tablolar için (tek politika yeterli)
CREATE POLICY "Kullanıcılar kendi finansal kayıtlarını yönetebilir" ON public.alt_bayi_giderleri
FOR ALL USING (sahip_id = auth.uid());

CREATE POLICY "Kullanıcılar kendi finansal kayıtlarını yönetebilir" ON public.alt_bayi_gelirleri
FOR ALL USING (sahip_id = auth.uid());

CREATE POLICY "Kullanıcılar kendi stoklarını yönetebilir" ON public.alt_bayi_stoklari
FOR ALL USING (sahip_id = auth.uid());

CREATE POLICY "Kullanıcılar kendi satış kayıtlarını yönetebilir" ON public.alt_bayi_satis_kayitlari
FOR ALL USING (sahip_id = auth.uid());

CREATE POLICY "Kullanıcılar kendi satış detaylarını görebilir" ON public.alt_bayi_satis_detaylari
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.alt_bayi_satis_kayitlari
    WHERE id = satis_kaydi_id AND sahip_id = auth.uid()
  )
);
-- Not: alt_bayi_satis_detaylari için insert/update/delete doğrudan yapılmaz, ana kayıt üzerinden tetiklenir.

COMMIT;
