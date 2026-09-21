DROP TABLE IF EXISTS public.blog_yazilari CASCADE;

CREATE TABLE IF NOT EXISTS public.blog_yazilari (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    title JSONB NOT NULL DEFAULT '{"de": "", "en": "", "tr": "", "ar": ""}'::jsonb,
    excerpt JSONB NOT NULL DEFAULT '{"de": "", "en": "", "tr": "", "ar": ""}'::jsonb,
    content JSONB NOT NULL DEFAULT '{"de": "", "en": "", "tr": "", "ar": ""}'::jsonb,
    meta_title JSONB NOT NULL DEFAULT '{"de": "", "en": "", "tr": "", "ar": ""}'::jsonb,
    meta_description JSONB NOT NULL DEFAULT '{"de": "", "en": "", "tr": "", "ar": ""}'::jsonb,
    image_url TEXT,
    author_name VARCHAR(255) DEFAULT 'Elysonsweets B2B Team',
    published_at TIMESTAMPTZ DEFAULT NOW(),
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Politikaları
ALTER TABLE public.blog_yazilari ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published blog posts" 
ON public.blog_yazilari FOR SELECT 
USING (is_published = TRUE);
