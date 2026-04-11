-- Migration: Add parent company relationship for multi-branch companies
-- Date: 2026-02-21
-- Description: Supports multi-branch/multi-location companies

-- Add parent_firma_id column for branch relationships
ALTER TABLE public.firmalar 
ADD COLUMN IF NOT EXISTS parent_firma_id UUID REFERENCES public.firmalar(id) ON DELETE CASCADE;

-- Add branch count column for caching
ALTER TABLE public.firmalar 
ADD COLUMN IF NOT EXISTS sube_sayisi INTEGER DEFAULT 0;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_firmalar_parent_firma_id ON public.firmalar(parent_firma_id);

-- Comments
COMMENT ON COLUMN public.firmalar.parent_firma_id IS 'References parent/main company if this is a branch. NULL if this is a main company.';
COMMENT ON COLUMN public.firmalar.sube_sayisi IS 'Number of branches for this company (cached value for performance)';
