-- Clean up duplicate customer profiles
-- Keep only the first record for each profile name

WITH duplicates AS (
  SELECT 
    id,
    ad,
    ROW_NUMBER() OVER (PARTITION BY ad ORDER BY created_at ASC) as rn
  FROM public.musteri_profilleri
)
DELETE FROM public.musteri_profilleri 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add unique constraint if not exists
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.musteri_profilleri 
    ADD CONSTRAINT musteri_profilleri_ad_unique UNIQUE (ad);
  EXCEPTION WHEN duplicate_object THEN 
    -- Constraint already exists
    NULL;
  END;
END
$$;

-- Verify the cleanup
SELECT ad, COUNT(*) as count 
FROM public.musteri_profilleri 
GROUP BY ad 
ORDER BY ad;