-- Add stok_tukenme_tarihi column
ALTER TABLE public.urunler ADD COLUMN IF NOT EXISTS stok_tukenme_tarihi TIMESTAMP WITH TIME ZONE;

-- Create function to automatically update stok_tukenme_tarihi
CREATE OR REPLACE FUNCTION update_stok_tukenme_tarihi()
RETURNS TRIGGER AS $$
BEGIN
    -- If stock is newly updated to 0 or less
    IF NEW.stok_miktari <= 0 AND (OLD.stok_miktari IS NULL OR OLD.stok_miktari > 0) THEN
        NEW.stok_tukenme_tarihi = NOW();
    END IF;

    -- If stock is updated to greater than 0
    IF NEW.stok_miktari > 0 THEN
        NEW.stok_tukenme_tarihi = NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS trg_urunler_stok_tukenme ON public.urunler;

-- Create trigger on urunler
CREATE TRIGGER trg_urunler_stok_tukenme
    BEFORE UPDATE OF stok_miktari ON public.urunler
    FOR EACH ROW
    EXECUTE FUNCTION update_stok_tukenme_tarihi();
