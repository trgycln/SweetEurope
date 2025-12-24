-- Fix Trigger: Auto-update son_etkilesim_tarihi
-- Date: 2025-11-23
-- Description: Fix column name in trigger function (olusturma_tarihi -> created_at)

-- Create or replace the trigger function with correct column name
CREATE OR REPLACE FUNCTION update_firma_son_etkilesim()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the last interaction date for the related firma
    UPDATE firmalar
    SET son_etkilesim_tarihi = NEW.created_at
    WHERE id = NEW.firma_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
