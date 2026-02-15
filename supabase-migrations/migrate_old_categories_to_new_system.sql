-- Migration: Convert Old Category System to New A, B, C, D System
-- Date: 2026-02-15
-- Description: Migrates all existing categories in 'firmalar' table from old system to new system (A, B, C, D)

-- Create a temporary mapping and update the kategori column
-- This ensures all existing data is migrated without loss

BEGIN TRANSACTION;

-- Backups are recommended before running this migration
-- SELECT * FROM firmalar WHERE kategori IS NOT NULL; -- Check before migration

-- Update all old categories to new system
UPDATE firmalar
SET kategori = CASE
    -- Old systematic categories
    WHEN kategori = 'Hacim Krallari' THEN 'A'
    WHEN kategori = 'Gunluk Nakit Akisi' THEN 'B'
    WHEN kategori = 'Nis Pazarlar' THEN 'C'
    WHEN kategori = 'Perakende ve Raf Urunleri' THEN 'D'
    
    -- Other old categories mapped to new system
    WHEN kategori = 'Shisha & Lounge' THEN 'C'
    WHEN kategori = 'Coffee Shop & Eiscafé' THEN 'B'
    WHEN kategori = 'Casual Dining' THEN 'C'
    WHEN kategori = 'Restoran' THEN 'C'
    WHEN kategori = 'Hotel & Event' THEN 'A'
    WHEN kategori = 'Catering' THEN 'A'
    WHEN kategori = 'Alt Bayi' THEN 'D'
    WHEN kategori = 'Rakip/Üretici' THEN 'D'
    WHEN kategori = 'Kafe' THEN 'B'
    WHEN kategori = 'Otel' THEN 'A'
    WHEN kategori = 'Zincir Market' THEN 'D'
    
    -- Default: Unknown categories to D (lowest priority)
    ELSE 'D'
END
WHERE kategori IS NOT NULL;

-- Update oncelik_puani based on new kategori
UPDATE firmalar
SET oncelik_puani = CASE
    WHEN kategori = 'A' AND (oncelik_puani IS NULL OR oncelik_puani < 80) THEN 90
    WHEN kategori = 'B' AND (oncelik_puani IS NULL OR oncelik_puani < 60 OR oncelik_puani > 79) THEN 70
    WHEN kategori = 'C' AND (oncelik_puani IS NULL OR oncelik_puani < 40 OR oncelik_puani > 59) THEN 50
    WHEN kategori = 'D' AND (oncelik_puani IS NULL OR oncelik_puani > 39) THEN 20
    ELSE oncelik_puani
END
WHERE kategori IN ('A', 'B', 'C', 'D');

-- Log the migration results
-- You can verify with: SELECT kategori, COUNT(*) FROM firmalar GROUP BY kategori;

COMMIT TRANSACTION;

-- Verification query (run after migration):
-- SELECT kategori, COUNT(*) as count, AVG(oncelik_puani) as avg_puan 
-- FROM firmalar 
-- GROUP BY kategori 
-- ORDER BY kategori;
