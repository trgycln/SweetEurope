-- Remove existing check constraints
ALTER TABLE urunler DROP CONSTRAINT IF EXISTS urunler_urun_gami_check;
ALTER TABLE kategoriler DROP CONSTRAINT IF EXISTS kategoriler_urun_gami_check;

-- Change the type of urun_gami from text to text[]
-- It will automatically convert existing non-null values into a 1-element array
ALTER TABLE urunler 
ALTER COLUMN urun_gami TYPE text[] 
USING CASE 
  WHEN urun_gami IS NOT NULL AND urun_gami != '' THEN ARRAY[urun_gami] 
  ELSE '{}'::text[] 
END;

ALTER TABLE kategoriler 
ALTER COLUMN urun_gami TYPE text[] 
USING CASE 
  WHEN urun_gami IS NOT NULL AND urun_gami != '' THEN ARRAY[urun_gami] 
  ELSE '{}'::text[] 
END;

-- Optional: add a new check constraint if you want to limit the allowed array items
-- But we can also enforce this at the application level.
