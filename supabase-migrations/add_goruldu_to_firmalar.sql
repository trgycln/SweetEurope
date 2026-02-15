-- Add görüldü (seen/viewed) flag to firmalar table
-- This tracks whether an admin has viewed the application

ALTER TABLE firmalar 
ADD COLUMN IF NOT EXISTS goruldu BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_firmalar_goruldu ON firmalar(goruldu);

-- Mark existing Müşteri and Pasif firms as görüldü (already processed)
UPDATE firmalar 
SET goruldu = true 
WHERE status IN ('Müşteri', 'Pasif');

COMMENT ON COLUMN firmalar.goruldu IS 'Başvuru admin tarafından görüldü mü?';
