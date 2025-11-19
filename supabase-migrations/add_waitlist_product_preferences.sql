-- =====================================================
-- Waitlist Sistemi Geliştirmesi
-- Ürün tercihleri ekleme
-- =====================================================

-- 1. Mevcut waitlist tablosuna ürün tercihleri kolonu ekle
ALTER TABLE waitlist 
ADD COLUMN IF NOT EXISTS product_preferences JSONB;

-- 2. Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at DESC);

-- 3. Yorum ekle
COMMENT ON COLUMN waitlist.product_preferences IS 'Müşterinin seçtiği ürün tercihleri (JSON formatında). Örn: {"categories": ["cakes", "coffee"], "specific_products": ["san-sebastian", "lotus-magnolia"]}';

