-- Update gbp_settings and google_business_posts tables

ALTER TABLE public.gbp_settings ADD COLUMN IF NOT EXISTS default_post_image_url TEXT;
ALTER TABLE public.google_business_posts ADD COLUMN IF NOT EXISTS error_message TEXT;
