-- Add 'mahalle' column to firmalar table for granular location filtering (Stadtteil/Veedel)
ALTER TABLE public.firmalar 
ADD COLUMN IF NOT EXISTS mahalle text;

COMMENT ON COLUMN public.firmalar.mahalle IS 'Neighborhood/Stadtteil/Veedel (e.g. Weidenpesch, Deutz)';
