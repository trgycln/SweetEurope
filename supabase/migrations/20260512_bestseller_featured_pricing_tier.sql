-- Add is_bestseller and is_featured flags to products
ALTER TABLE urunler
  ADD COLUMN IF NOT EXISTS is_bestseller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured   boolean NOT NULL DEFAULT false;

-- Add pricing_tier to companies (partners)
-- Values: 'koli_bazli' | 'cok_koli' | 'palet' | 'alt_bayi'
ALTER TABLE firmalar
  ADD COLUMN IF NOT EXISTS pricing_tier text;

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS urunler_is_bestseller_idx ON urunler(is_bestseller) WHERE is_bestseller = true;
CREATE INDEX IF NOT EXISTS urunler_is_featured_idx   ON urunler(is_featured)   WHERE is_featured   = true;
