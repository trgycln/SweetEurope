-- Update CRM Schema for B2B Sales Funnel

-- 1. Add new columns to firmalar table
ALTER TABLE public.firmalar 
ADD COLUMN IF NOT EXISTS yetkili_kisi text,
ADD COLUMN IF NOT EXISTS etiketler text[], -- Array of strings for tags
ADD COLUMN IF NOT EXISTS oncelik_puani integer DEFAULT 0;

COMMENT ON COLUMN public.firmalar.yetkili_kisi IS 'Decision Maker Name (from Impressum)';
COMMENT ON COLUMN public.firmalar.etiketler IS 'Tags for filtering (e.g. #Türk_Sahibi, #Vitrin_Boş)';
COMMENT ON COLUMN public.firmalar.oncelik_puani IS 'Calculated priority score based on category and tags';

-- 2. Update Enums
-- PostgreSQL enums are static. We need to add new values. 
-- Since we are replacing the logic, we might just add the new ones. 
-- Ideally we would rename the type and create a new one, but adding values is safer for existing data.

-- Update firma_status
ALTER TYPE public.firma_status ADD VALUE IF NOT EXISTS 'ISITILIYOR';
ALTER TYPE public.firma_status ADD VALUE IF NOT EXISTS 'TEMAS EDİLDİ';
ALTER TYPE public.firma_status ADD VALUE IF NOT EXISTS 'POTANSİYEL';
-- 'ADAY', 'İLETİŞİMDE', 'MÜŞTERİ', 'PASİF' already exist or are close enough (case sensitivity might be an issue, but let's assume existing are 'Aday', 'İletişimde' etc. Postgres enums are case sensitive).
-- Existing: "Aday", "Takipte", "Temas Kuruldu", "İletişimde", "Müşteri", "Pasif"
-- New mapping needed in code if we want to strictly use new terms, or we just add new ones and migrate data.
-- Let's add the uppercase ones if they are distinct, or just use the closest match.
-- User asked for specific uppercase status. Let's add them.
ALTER TYPE public.firma_status ADD VALUE IF NOT EXISTS 'ADAY'; 
ALTER TYPE public.firma_status ADD VALUE IF NOT EXISTS 'İLETİŞİMDE'; -- Might exist as 'İletişimde'
ALTER TYPE public.firma_status ADD VALUE IF NOT EXISTS 'MÜŞTERİ'; -- Might exist as 'Müşteri'
ALTER TYPE public.firma_status ADD VALUE IF NOT EXISTS 'PASİF'; -- Might exist as 'Pasif'

-- Update firma_kategori
ALTER TYPE public.firma_kategori ADD VALUE IF NOT EXISTS 'Shisha & Lounge';
ALTER TYPE public.firma_kategori ADD VALUE IF NOT EXISTS 'Coffee Shop & Eiscafé';
ALTER TYPE public.firma_kategori ADD VALUE IF NOT EXISTS 'Casual Dining';
ALTER TYPE public.firma_kategori ADD VALUE IF NOT EXISTS 'Hotel & Event';
ALTER TYPE public.firma_kategori ADD VALUE IF NOT EXISTS 'Rakip/Üretici';

-- 3. Update etkinlik_tipi (Activity Types)
ALTER TYPE public.etkinlik_tipi ADD VALUE IF NOT EXISTS 'Instagram Etkileşimi';
ALTER TYPE public.etkinlik_tipi ADD VALUE IF NOT EXISTS 'DM Gönderildi';
ALTER TYPE public.etkinlik_tipi ADD VALUE IF NOT EXISTS 'Numune İsteği';
