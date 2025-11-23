-- Trigger: Auto-update son_etkilesim_tarihi when new activity is created
-- Date: 2025-11-23
-- Description: Automatically update the last interaction date in firmalar table when a new etkinlik is inserted

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_firma_son_etkilesim()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the last interaction date for the related firma
    UPDATE firmalar
    SET son_etkilesim_tarihi = NEW.olusturma_tarihi
    WHERE id = NEW.firma_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_firma_son_etkilesim ON etkinlikler;

CREATE TRIGGER trigger_update_firma_son_etkilesim
    AFTER INSERT ON etkinlikler
    FOR EACH ROW
    EXECUTE FUNCTION update_firma_son_etkilesim();

-- Add comment
COMMENT ON FUNCTION update_firma_son_etkilesim() IS 'Auto-updates firmalar.son_etkilesim_tarihi when new etkinlik is created';
