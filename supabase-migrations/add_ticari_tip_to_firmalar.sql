-- Add commercial type to firmalar to separate sub-dealers from regular customers
ALTER TABLE IF EXISTS public.firmalar
ADD COLUMN IF NOT EXISTS ticari_tip text;

-- Mark existing sub-dealers
UPDATE public.firmalar
SET ticari_tip = 'alt_bayi'
WHERE kategori = 'Alt Bayi'
  AND (ticari_tip IS NULL OR ticari_tip = '');

-- Default remaining records to regular customers
UPDATE public.firmalar
SET ticari_tip = 'musteri'
WHERE ticari_tip IS NULL OR ticari_tip = '';

-- Default for future inserts
ALTER TABLE IF EXISTS public.firmalar
ALTER COLUMN ticari_tip SET DEFAULT 'musteri';
