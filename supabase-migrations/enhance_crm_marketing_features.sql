-- Migration: CRM Enhancement - Add marketing and sales tracking features
-- Date: 2025-11-23
-- Description: Add social media links, priority field, last interaction tracking, and update status/activity enums

-- Step 1: Add new columns to firmalar table
ALTER TABLE firmalar
ADD COLUMN IF NOT EXISTS oncelik VARCHAR(1) DEFAULT 'B' CHECK (oncelik IN ('A', 'B', 'C')),
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS web_url TEXT,
ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
ADD COLUMN IF NOT EXISTS son_etkilesim_tarihi TIMESTAMPTZ;

-- Add comment for clarity
COMMENT ON COLUMN firmalar.oncelik IS 'Priority level: A (High), B (Medium), C (Low)';
COMMENT ON COLUMN firmalar.son_etkilesim_tarihi IS 'Last interaction date - auto-updated by trigger on etkinlikler insert';

-- Step 2: Update firma_status enum with new sales pipeline stages
-- First, check if we need to drop the old enum and create new one
DO $$ 
BEGIN
    -- Drop existing enum and recreate with new values
    ALTER TYPE firma_status RENAME TO firma_status_old;
    
    CREATE TYPE firma_status AS ENUM (
        'Aday',              -- Lead: Just added to list
        'Takipte',           -- Warming: Following on social media
        'Temas Kuruldu',     -- Contacted: DM or email sent
        'İletişimde',        -- Engaged: They responded, interested
        'Müşteri',           -- Won: Made a purchase
        'Pasif'              -- Lost: Not interested
    );
    
    -- Update the column to use new enum (convert old values)
    ALTER TABLE firmalar 
        ALTER COLUMN status DROP DEFAULT,
        ALTER COLUMN status TYPE firma_status USING (
            CASE status::text
                WHEN 'Bilinmiyor' THEN 'Aday'::firma_status
                WHEN 'Potansiyel' THEN 'Aday'::firma_status
                WHEN 'İlk Temas' THEN 'Temas Kuruldu'::firma_status
                WHEN 'Numune Sunuldu' THEN 'İletişimde'::firma_status
                WHEN 'Teklif Verildi' THEN 'İletişimde'::firma_status
                WHEN 'Anlaşma Sağlandı' THEN 'Müşteri'::firma_status
                WHEN 'Pasif' THEN 'Pasif'::firma_status
                ELSE 'Aday'::firma_status
            END
        ),
        ALTER COLUMN status SET DEFAULT 'Aday'::firma_status;
    
    -- Drop old enum
    DROP TYPE firma_status_old;
    
EXCEPTION
    WHEN duplicate_object THEN
        -- If enum already exists with these values, just skip
        RAISE NOTICE 'firma_status enum already updated';
END $$;

-- Step 3: Update etkinlik_tipi enum with social media activities
DO $$ 
BEGIN
    ALTER TYPE etkinlik_tipi RENAME TO etkinlik_tipi_old;
    
    CREATE TYPE etkinlik_tipi AS ENUM (
        'Not',
        'Telefon Görüşmesi',
        'Toplantı',
        'E-posta',
        'Teklif',
        'Instagram DM',        -- NEW
        'Instagram Yorum',     -- NEW
        'E-Mail Gönderimi',    -- NEW
        'Yüz Yüze Ziyaret'     -- NEW
    );
    
    -- Update the column to use new enum
    ALTER TABLE etkinlikler 
        ALTER COLUMN etkinlik_tipi TYPE etkinlik_tipi USING (
            CASE etkinlik_tipi::text
                WHEN 'Not' THEN 'Not'::etkinlik_tipi
                WHEN 'Telefon Görüşmesi' THEN 'Telefon Görüşmesi'::etkinlik_tipi
                WHEN 'Toplantı' THEN 'Toplantı'::etkinlik_tipi
                WHEN 'E-posta' THEN 'E-posta'::etkinlik_tipi
                WHEN 'Teklif' THEN 'Teklif'::etkinlik_tipi
                ELSE 'Not'::etkinlik_tipi
            END
        );
    
    DROP TYPE etkinlik_tipi_old;
    
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'etkinlik_tipi enum already updated';
END $$;

-- Step 4: Create index on new columns for better performance
CREATE INDEX IF NOT EXISTS idx_firmalar_oncelik ON firmalar(oncelik);
CREATE INDEX IF NOT EXISTS idx_firmalar_son_etkilesim ON firmalar(son_etkilesim_tarihi DESC);
CREATE INDEX IF NOT EXISTS idx_firmalar_status_oncelik ON firmalar(status, oncelik);

-- Step 5: Update existing null son_etkilesim_tarihi with created_at or most recent etkinlik
UPDATE firmalar f
SET son_etkilesim_tarihi = COALESCE(
    (SELECT MAX(created_at) FROM etkinlikler WHERE firma_id = f.id),
    f.created_at
)
WHERE son_etkilesim_tarihi IS NULL;
