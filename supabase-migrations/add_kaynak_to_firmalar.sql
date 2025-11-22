-- Migration: Add kaynak (source) column to firmalar
-- Purpose: Track origin of company records (web form, admin panel, referral, import, etc.)
-- Idempotent: Only adds if not exists

ALTER TABLE public.firmalar
ADD COLUMN IF NOT EXISTS kaynak TEXT;

-- Optional simple constraint (allow only known sources). Uncomment when stable.
-- ALTER TABLE public.firmalar
-- ADD CONSTRAINT firmalar_kaynak_check CHECK (kaynak IN ('web','admin','referral','import','other'));

CREATE INDEX IF NOT EXISTS idx_firmalar_kaynak ON public.firmalar(kaynak);

COMMENT ON COLUMN public.firmalar.kaynak IS 'Kayıt kaynağı: web, admin, referral, import vb.';
