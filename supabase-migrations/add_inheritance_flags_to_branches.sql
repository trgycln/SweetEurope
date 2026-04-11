-- Migration: Add inheritance flags for branch companies
-- Date: 2026-02-21
-- Description: Allows branches to inherit digital assets from parent company while maintaining independence

-- Add inheritance flags for digital assets
ALTER TABLE public.firmalar 
ADD COLUMN IF NOT EXISTS inherit_web_url BOOLEAN DEFAULT true;

ALTER TABLE public.firmalar 
ADD COLUMN IF NOT EXISTS inherit_instagram_url BOOLEAN DEFAULT true;

ALTER TABLE public.firmalar 
ADD COLUMN IF NOT EXISTS inherit_linkedin_url BOOLEAN DEFAULT true;

ALTER TABLE public.firmalar 
ADD COLUMN IF NOT EXISTS inherit_facebook_url BOOLEAN DEFAULT true;

ALTER TABLE public.firmalar 
ADD COLUMN IF NOT EXISTS inherit_google_maps_url BOOLEAN DEFAULT false;

-- Comments
COMMENT ON COLUMN public.firmalar.inherit_web_url IS 'If true (for branches), use parent company web_url';
COMMENT ON COLUMN public.firmalar.inherit_instagram_url IS 'If true (for branches), use parent company instagram_url';
COMMENT ON COLUMN public.firmalar.inherit_linkedin_url IS 'If true (for branches), use parent company linkedin_url';
COMMENT ON COLUMN public.firmalar.inherit_facebook_url IS 'If true (for branches), use parent company facebook_url';
COMMENT ON COLUMN public.firmalar.inherit_google_maps_url IS 'If true (for branches), use parent company google_maps_url';
