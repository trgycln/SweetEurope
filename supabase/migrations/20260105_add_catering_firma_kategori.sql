-- Add new category value 'Catering' to firma_kategori enum if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'firma_kategori'
          AND e.enumlabel = 'Catering'
    ) THEN
        ALTER TYPE public.firma_kategori ADD VALUE 'Catering';
    END IF;
END
$$;
