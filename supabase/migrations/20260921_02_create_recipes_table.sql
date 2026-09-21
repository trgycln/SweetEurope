CREATE TABLE IF NOT EXISTS recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  locale TEXT NOT NULL, -- 'de', 'en', 'tr', 'ar'
  title TEXT NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL, -- Array of strings
  instructions JSONB NOT NULL, -- Array of strings
  prep_time_minutes INTEGER DEFAULT 5,
  product_id UUID REFERENCES urunler(id) ON DELETE SET NULL,
  category TEXT NOT NULL, -- 'coffee', 'cocktail', 'mocktail', 'smoothie'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performans için indexler
CREATE INDEX idx_recipes_locale ON recipes(locale);
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_product ON recipes(product_id);
