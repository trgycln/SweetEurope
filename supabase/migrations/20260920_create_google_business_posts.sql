-- Create the google_business_posts table
CREATE TABLE public.google_business_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    post_type TEXT NOT NULL DEFAULT 'STANDARD', -- STANDARD, EVENT, OFFER
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, FAILED
    language TEXT NOT NULL DEFAULT 'de',
    image_url TEXT,
    google_post_id TEXT, -- ID returned from Google API after publishing
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS (Row Level Security) - Admin only access
ALTER TABLE public.google_business_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can read all google business posts"
ON public.google_business_posts
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin users can insert google business posts"
ON public.google_business_posts
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin users can update google business posts"
ON public.google_business_posts
FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin users can delete google business posts"
ON public.google_business_posts
FOR DELETE
USING (auth.role() = 'authenticated');

-- Function and Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_google_business_posts
BEFORE UPDATE ON public.google_business_posts
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
