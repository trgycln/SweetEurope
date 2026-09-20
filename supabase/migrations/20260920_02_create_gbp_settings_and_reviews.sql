-- Create gbp_settings table
CREATE TABLE public.gbp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id TEXT,
    location_id TEXT,
    refresh_token TEXT,
    business_name TEXT,
    business_category TEXT,
    target_keywords TEXT, -- Can be comma separated list of keywords
    target_locations TEXT, -- Can be comma separated list of locations
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure there is only one row in settings (optional, but good practice for global settings)
CREATE UNIQUE INDEX gbp_settings_single_row ON public.gbp_settings ((1));

-- Create google_business_reviews table
CREATE TABLE public.google_business_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id TEXT NOT NULL UNIQUE,
    reviewer_name TEXT,
    star_rating INTEGER,
    comment TEXT,
    reply_text TEXT,
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for both tables
ALTER TABLE public.gbp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_business_reviews ENABLE ROW LEVEL SECURITY;

-- RLS for gbp_settings
CREATE POLICY "Admin users can read gbp_settings"
ON public.gbp_settings
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin users can insert gbp_settings"
ON public.gbp_settings
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin users can update gbp_settings"
ON public.gbp_settings
FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin users can delete gbp_settings"
ON public.gbp_settings
FOR DELETE
USING (auth.role() = 'authenticated');

-- RLS for google_business_reviews
CREATE POLICY "Admin users can read google_business_reviews"
ON public.google_business_reviews
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin users can insert google_business_reviews"
ON public.google_business_reviews
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin users can update google_business_reviews"
ON public.google_business_reviews
FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Admin users can delete google_business_reviews"
ON public.google_business_reviews
FOR DELETE
USING (auth.role() = 'authenticated');

-- Triggers for updated_at
CREATE TRIGGER set_timestamp_gbp_settings
BEFORE UPDATE ON public.gbp_settings
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_google_business_reviews
BEFORE UPDATE ON public.google_business_reviews
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
