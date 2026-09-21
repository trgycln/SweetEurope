ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Sıralama performansı için index ekleyelim
CREATE INDEX IF NOT EXISTS idx_recipes_featured_likes ON recipes(is_featured, likes_count DESC);
