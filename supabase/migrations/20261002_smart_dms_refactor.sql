-- 1. Create a sequence for dosya_no
CREATE SEQUENCE IF NOT EXISTS belgeler_dosya_no_seq START 1000;

-- 2. Add dosya_no and other new columns
ALTER TABLE belgeler 
  ADD COLUMN IF NOT EXISTS dosya_no INTEGER DEFAULT nextval('belgeler_dosya_no_seq'),
  ADD COLUMN IF NOT EXISTS evrak_turu TEXT,
  ADD COLUMN IF NOT EXISTS kritik_bilgiler TEXT,
  ADD COLUMN IF NOT EXISTS ai_ozet TEXT,
  ADD COLUMN IF NOT EXISTS ai_etiketler TEXT[];

-- Ensure evrak_tarihi exists (type DATE). If it already exists as text, this won't change it unless we cast, but typically it exists as date or text.
-- We use DO block to add safely if not exists.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='belgeler' AND column_name='evrak_tarihi') THEN
        ALTER TABLE belgeler ADD COLUMN evrak_tarihi DATE;
    END IF;
END $$;

-- 3. We can drop the previous ai_summary and ai_tags since they are being replaced
ALTER TABLE belgeler 
  DROP COLUMN IF EXISTS ai_summary,
  DROP COLUMN IF EXISTS ai_tags;

-- 4. Create RPC to get next sequence value
CREATE OR REPLACE FUNCTION get_next_dosya_no()
RETURNS integer AS $$
BEGIN
  RETURN nextval('belgeler_dosya_no_seq');
END;
$$ LANGUAGE plpgsql;
