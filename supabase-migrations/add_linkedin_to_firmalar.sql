-- Migration: Add LinkedIn URL column to firmalar table
-- Date: 2026-02-21
-- Description: Adds linkedin_url field to store company LinkedIn profile links

-- Add linkedin_url column
ALTER TABLE public.firmalar 
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

COMMENT ON COLUMN public.firmalar.linkedin_url IS 'LinkedIn company profile URL';
