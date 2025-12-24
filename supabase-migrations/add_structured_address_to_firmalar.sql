-- Add structured address fields to firmalar table safely
ALTER TABLE public.firmalar ADD COLUMN IF NOT EXISTS sehir text;
ALTER TABLE public.firmalar ADD COLUMN IF NOT EXISTS ilce text;
ALTER TABLE public.firmalar ADD COLUMN IF NOT EXISTS posta_kodu text;

-- Add comments
COMMENT ON COLUMN public.firmalar.sehir IS 'City/Province (e.g. Berlin)';
COMMENT ON COLUMN public.firmalar.ilce IS 'District/Region (e.g. Mitte)';
COMMENT ON COLUMN public.firmalar.posta_kodu IS 'Postal/Zip Code';
