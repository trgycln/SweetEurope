-- ============================================================
-- Belge Yönetimi Modülünü "Evrak Fihristi"ne Dönüştürme SQL'i
-- Mevcut tüm kayıtları SİLER ve fiziksel konum takibi için 
-- tablo yapısını günceller.
-- ============================================================

-- 1. Eski kayıtları tamamen temizle (Dikkat: Geri alınamaz!)
DELETE FROM belgeler;

-- 2. Artık kullanılmayacak dosya/storage kolonlarını düşür
ALTER TABLE belgeler DROP COLUMN IF EXISTS dosya_url;
ALTER TABLE belgeler DROP COLUMN IF EXISTS dosya_boyutu;
ALTER TABLE belgeler DROP COLUMN IF EXISTS dosya_tipi;

-- 3. Fiziksel evrak fihristi için gerekli yeni kolonları ekle
ALTER TABLE public.belgeler 
ADD COLUMN IF NOT EXISTS sira_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS evrak_tarihi DATE;   -- Evrakın asıl tarihi
