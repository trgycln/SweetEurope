import fs from 'fs';

// Let's create a solid, clean, idempotent schema creation script
const schema = `
-- ========================================================
-- 1. EXTENSIONS & BASICS
-- ========================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Utility function for running SQL if needed
CREATE OR REPLACE FUNCTION public.exec_sql(sql_string text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_string;
END;
$$;

-- Enums
DO $$ BEGIN
    CREATE TYPE public.kullanici_rolu AS ENUM ('super_admin', 'admin', 'musteri', 'alt_bayi', 'satis_temsilcisi', 'depo_sorumlusu', 'muhasebe', 'tedarikci', 'personel');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.siparis_durumu AS ENUM ('beklemede', 'onaylandi', 'hazirlaniyor', 'kargoda', 'teslim_edildi', 'iptal_edildi');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.odeme_durumu AS ENUM ('bekliyor', 'odendi', 'kismi_odendi', 'iptal');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ========================================================
-- 2. CORE TABLES
-- ========================================================

-- KATEGORILER
CREATE TABLE IF NOT EXISTS public.kategoriler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    ad JSONB NOT NULL,
    ust_kategori_id UUID REFERENCES public.kategoriler(id) ON DELETE SET NULL,
    slug VARCHAR(255),
    image_url TEXT,
    urun_gami TEXT
);

-- FIRMALAR
CREATE TABLE IF NOT EXISTS public.firmalar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    unvan VARCHAR(255) NOT NULL,
    kategori VARCHAR(100),
    status VARCHAR(50) DEFAULT 'potansiyel',
    telefon VARCHAR(50),
    email VARCHAR(255),
    adres TEXT,
    vergi_dairesi VARCHAR(100),
    vergi_no VARCHAR(50),
    iban VARCHAR(50),
    sorumlu_personel_id UUID,
    iskonto_orani NUMERIC DEFAULT 0,
    referans_olarak_goster BOOLEAN DEFAULT false,
    google_maps_url TEXT,
    musteri_profil_id UUID,
    sahip_id UUID,
    kaynak VARCHAR(100),
    oncelik VARCHAR(50),
    instagram_url TEXT,
    facebook_url TEXT,
    web_url TEXT,
    son_etkilesim_tarihi TIMESTAMPTZ,
    sehir VARCHAR(100),
    ilce VARCHAR(100),
    posta_kodu VARCHAR(20),
    yetkili_kisi VARCHAR(255),
    etiketler TEXT[],
    oncelik_puani NUMERIC DEFAULT 0,
    mahalle VARCHAR(100),
    ticari_tip VARCHAR(100),
    created_by UUID,
    updated_by UUID,
    goruldu BOOLEAN DEFAULT false,
    linkedin_url TEXT,
    parent_firma_id UUID REFERENCES public.firmalar(id) ON DELETE SET NULL,
    sube_sayisi INT DEFAULT 0,
    inherit_web_url BOOLEAN DEFAULT false,
    inherit_instagram_url BOOLEAN DEFAULT false,
    inherit_linkedin_url BOOLEAN DEFAULT false,
    inherit_facebook_url BOOLEAN DEFAULT false,
    inherit_google_maps_url BOOLEAN DEFAULT false,
    pricing_tier VARCHAR(50),
    ust_bayi_firma_id UUID REFERENCES public.firmalar(id) ON DELETE SET NULL,
    teknik_ozellikler JSONB
);

-- PROFILLER (Profiles linked to Auth Users)
CREATE TABLE IF NOT EXISTS public.profiller (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    tam_ad VARCHAR(255),
    rol VARCHAR(50) DEFAULT 'musteri',
    tercih_edilen_dil VARCHAR(10) DEFAULT 'tr',
    firma_id UUID REFERENCES public.firmalar(id) ON DELETE SET NULL
);

-- URUNLER
CREATE TABLE IF NOT EXISTS public.urunler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    ad JSONB NOT NULL,
    kategori_id UUID REFERENCES public.kategoriler(id) ON DELETE SET NULL,
    tedarikci_id UUID REFERENCES public.firmalar(id) ON DELETE SET NULL,
    stok_kodu VARCHAR(100),
    stok_miktari NUMERIC DEFAULT 0,
    distributor_alis_fiyati NUMERIC DEFAULT 0,
    satis_fiyati_musteri NUMERIC DEFAULT 0,
    satis_fiyati_alt_bayi NUMERIC DEFAULT 0,
    aktif BOOLEAN DEFAULT true,
    teknik_ozellikler JSONB,
    stok_esigi NUMERIC DEFAULT 0,
    aciklamalar JSONB,
    ana_satis_birimi_id UUID,
    slug VARCHAR(255),
    ana_resim_url TEXT,
    galeri_resim_urls TEXT[],
    ortalama_puan NUMERIC DEFAULT 5,
    degerlendirme_sayisi INT DEFAULT 0,
    koli_ici_adet NUMERIC,
    palet_ici_adet NUMERIC,
    alis_fiyat_seviyesi VARCHAR(50),
    birim_agirlik_kg NUMERIC,
    lojistik_sinifi VARCHAR(50),
    gumruk_vergi_orani_yuzde NUMERIC,
    almanya_kdv_orani NUMERIC DEFAULT 19,
    gunluk_depolama_maliyeti_eur NUMERIC,
    ortalama_stokta_kalma_suresi NUMERIC,
    fire_zayiat_orani_yuzde NUMERIC,
    standart_inis_maliyeti_net NUMERIC,
    son_gercek_inis_maliyeti_net NUMERIC,
    son_maliyet_sapma_yuzde NUMERIC,
    karlilik_alarm_aktif BOOLEAN DEFAULT false,
    satis_fiyati_toptanci NUMERIC DEFAULT 0,
    urun_gami TEXT,
    ean_gtin VARCHAR(100),
    herkunftsland VARCHAR(100),
    mindest_bestellmenge NUMERIC,
    mindest_bestellmenge_einheit VARCHAR(50),
    lagertemperatur_min_celsius NUMERIC,
    lagertemperatur_max_celsius NUMERIC,
    haltbarkeit_monate INT,
    haltbarkeit_nach_oeffnen_tage INT,
    zertifikate JSONB,
    inhaltsstoffe JSONB,
    allergene JSONB,
    naehrwerte JSONB,
    lieferzeit_werktage VARCHAR(50),
    produktdatenblatt_url TEXT,
    taric_kodu VARCHAR(50),
    hersteller_name VARCHAR(255),
    hersteller_land VARCHAR(100),
    gtip_kodu VARCHAR(50),
    is_bestseller BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    besin_degerleri JSONB,
    featured_sira INT,
    seo_meta JSONB
);

-- SIPARISLER
CREATE TABLE IF NOT EXISTS public.siparisler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    firma_id UUID REFERENCES public.firmalar(id) ON DELETE SET NULL,
    siparis_tarihi TIMESTAMPTZ DEFAULT now(),
    toplam_tutar_net NUMERIC DEFAULT 0,
    toplam_tutar_brut NUMERIC DEFAULT 0,
    kdv_orani NUMERIC DEFAULT 19,
    siparis_durumu VARCHAR(50) DEFAULT 'beklemede',
    siparis_kaynagi VARCHAR(50),
    teslimat_adresi JSONB,
    olusturan_kullanici_id UUID,
    atanan_kisi_id UUID,
    odeme_durumu VARCHAR(50) DEFAULT 'bekliyor',
    odeme_kasa_tipi VARCHAR(50)
);

-- SIPARIS OGELERI
CREATE TABLE IF NOT EXISTS public.siparis_ogeleri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siparis_id UUID REFERENCES public.siparisler(id) ON DELETE CASCADE,
    urun_id UUID REFERENCES public.urunler(id) ON DELETE RESTRICT,
    miktar NUMERIC NOT NULL,
    birim_fiyat NUMERIC NOT NULL,
    toplam_fiyat NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ETKINLIKLER (CRM Activities)
CREATE TABLE IF NOT EXISTS public.etkinlikler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    firma_id UUID REFERENCES public.firmalar(id) ON DELETE CASCADE,
    olusturan_personel_id UUID,
    etkinlik_tipi VARCHAR(100) NOT NULL,
    aciklama TEXT
);

-- GIDERLER
CREATE TABLE IF NOT EXISTS public.giderler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    tutar NUMERIC NOT NULL,
    tarih DATE NOT NULL DEFAULT CURRENT_DATE,
    aciklama TEXT,
    belge_url TEXT,
    islem_yapan_kullanici_id UUID,
    odeme_sikligi VARCHAR(50),
    gider_kalemi_id UUID,
    durum VARCHAR(50) DEFAULT 'odendi',
    kaynak VARCHAR(50),
    kaynak_id UUID,
    tir_id UUID,
    otomatik_eklendi BOOLEAN DEFAULT false,
    tekrar_tipi VARCHAR(50),
    sablon_id UUID,
    kategori_ad VARCHAR(100),
    kasa_tipi VARCHAR(50)
);

-- SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    category VARCHAR(100),
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- WAITLIST
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firma_adi VARCHAR(255),
    yetkili_kisi VARCHAR(255),
    email VARCHAR(255),
    telefon VARCHAR(50),
    notlar TEXT,
    kayit_tarihi TIMESTAMPTZ DEFAULT now(),
    durum VARCHAR(50) DEFAULT 'beklemede',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    product_preferences TEXT[],
    firma_id UUID REFERENCES public.firmalar(id) ON DELETE SET NULL
);

-- ILETISIM MESAJLARI
CREATE TABLE IF NOT EXISTS public.iletisim_mesajlari (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    ad_soyad VARCHAR(255),
    email VARCHAR(255),
    mesaj TEXT,
    okundu_mu BOOLEAN DEFAULT false,
    okunma_tarihi TIMESTAMPTZ
);

-- BELGELER
CREATE TABLE IF NOT EXISTS public.belgeler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad VARCHAR(255) NOT NULL,
    kategori VARCHAR(100),
    alt_kategori VARCHAR(100),
    iliski_tipi VARCHAR(100),
    iliski_id UUID,
    firma_id UUID REFERENCES public.firmalar(id) ON DELETE SET NULL,
    tir_id UUID,
    aciklama TEXT,
    etiketler TEXT[],
    son_gecerlilik_tarihi DATE,
    yukleyen_id UUID,
    olusturma_tarihi TIMESTAMPTZ DEFAULT now(),
    gizli BOOLEAN DEFAULT false,
    otomatik_eklendi BOOLEAN DEFAULT false,
    tedarikci_adi VARCHAR(255),
    fiziksel_dosya VARCHAR(255),
    sira_no INT,
    evrak_tarihi DATE
);

-- SIRKET RESMI BILGILER
CREATE TABLE IF NOT EXISTS public.sirket_resmi_bilgiler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kategori VARCHAR(100) NOT NULL,
    baslik VARCHAR(255) NOT NULL,
    deger TEXT NOT NULL,
    sira INT DEFAULT 0,
    onemli_mi BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- DOCUMENT FOLDERS & DOCUMENTS
CREATE TABLE IF NOT EXISTS public.document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL,
    owner_id UUID NOT NULL,
    description TEXT,
    document_date DATE,
    document_subject VARCHAR(255),
    document_type VARCHAR(100),
    downloaded_count INT DEFAULT 0,
    recipient VARCHAR(255),
    reference_number VARCHAR(100),
    search_vector TSVECTOR,
    sender VARCHAR(255),
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ALT BAYI SATISLAR & DETAY
CREATE TABLE IF NOT EXISTS public.alt_bayi_satislar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bayi_firma_id UUID REFERENCES public.firmalar(id) ON DELETE CASCADE,
    musteri_id UUID REFERENCES public.firmalar(id) ON DELETE RESTRICT,
    durum VARCHAR(50) DEFAULT 'taslak',
    toplam_net NUMERIC DEFAULT 0,
    toplam_kdv NUMERIC DEFAULT 0,
    toplam_brut NUMERIC DEFAULT 0,
    kdv_orani NUMERIC DEFAULT 19,
    on_fatura_no VARCHAR(100),
    on_fatura_pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alt_bayi_satis_detay (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    satis_id UUID REFERENCES public.alt_bayi_satislar(id) ON DELETE CASCADE,
    urun_id UUID REFERENCES public.urunler(id) ON DELETE RESTRICT,
    adet NUMERIC NOT NULL,
    alis_birim_fiyati NUMERIC NOT NULL,
    birim_fiyat_net NUMERIC NOT NULL,
    kdv_tutari NUMERIC NOT NULL,
    satir_net NUMERIC NOT NULL,
    satir_brut NUMERIC NOT NULL
);

-- ========================================================
-- 3. DISABLE RLS TEMPORARILY OR ALLOW ACCESS
-- ========================================================
ALTER TABLE public.kategoriler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firmalar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiller ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urunler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siparisler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siparis_ogeleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etkinlikler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giderler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iletisim_mesajlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.belgeler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

-- Broad Public/Authenticated Read Policies
DO $$ BEGIN
  CREATE POLICY "Public Read kategoriler" ON public.kategoriler FOR SELECT USING (true);
  CREATE POLICY "Public Read urunler" ON public.urunler FOR SELECT USING (true);
  CREATE POLICY "Public Read system_settings" ON public.system_settings FOR SELECT USING (true);
  CREATE POLICY "Allow All for Authenticated" ON public.firmalar FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow All for Authenticated urunler" ON public.urunler FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow All for Authenticated kategoriler" ON public.kategoriler FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow All for Authenticated profiller" ON public.profiller FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow All for Authenticated siparisler" ON public.siparisler FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow All for Authenticated giderler" ON public.giderler FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow All for Authenticated system_settings" ON public.system_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow All for Authenticated waitlist" ON public.waitlist FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow All for Authenticated belgeler" ON public.belgeler FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow All for Authenticated documents" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow All for Authenticated document_folders" ON public.document_folders FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Allow All for Authenticated etkinlikler" ON public.etkinlikler FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN null; END $$;

-- Enable Storage Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('urun-gorselleri', 'urun-gorselleri', true),
  ('marketing-materialien', 'marketing-materialien', true),
  ('documents', 'documents', true),
  ('tedarikci-belgeleri', 'tedarikci-belgeleri', false),
  ('gider-belgeleri', 'gider-belgeleri', false),
  ('siparis-faturalari', 'siparis-faturalari', false),
  ('invoices', 'invoices', false),
  ('belgeler', 'belgeler', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Public Policies
DO $$ BEGIN
  CREATE POLICY "Public Access urun-gorselleri" ON storage.objects FOR SELECT USING (bucket_id = 'urun-gorselleri');
  CREATE POLICY "Public Access marketing" ON storage.objects FOR SELECT USING (bucket_id = 'marketing-materialien');
  CREATE POLICY "Public Access documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
  CREATE POLICY "Auth Upload Any" ON storage.objects FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Auth Update Any" ON storage.objects FOR UPDATE TO authenticated USING (true);
  CREATE POLICY "Auth Delete Any" ON storage.objects FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN OTHERS THEN null; END $$;
`;

fs.writeFileSync('c:/Users/User/Projeler (Web Sayfalari)/sweetheaven-germany/FULL_DATABASE_SETUP.sql', schema);
console.log('Clean FULL_DATABASE_SETUP.sql generated successfully!');
