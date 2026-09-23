-- recipes tablosundaki tek dilli string ve array kolonlarını JSONB çoklu dil yapısına dönüştüren migration

-- 1. Yeni JSONB kolonlarını ekle
ALTER TABLE recipes
  ADD COLUMN title_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN description_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN ingredients_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN instructions_json JSONB DEFAULT '{}'::jsonb;

-- 2. Mevcut verileri locale (tr, en, de, vb.) bazında JSONB objelerine dönüştür
UPDATE recipes SET
  title_json = jsonb_build_object(locale, title),
  description_json = CASE WHEN description IS NOT NULL THEN jsonb_build_object(locale, description) ELSE '{}'::jsonb END,
  ingredients_json = jsonb_build_object(locale, ingredients),
  instructions_json = jsonb_build_object(locale, instructions);

-- 3. Eski kolonları sil
ALTER TABLE recipes
  DROP COLUMN title,
  DROP COLUMN description,
  DROP COLUMN ingredients,
  DROP COLUMN instructions;

-- 4. Yeni JSONB kolonlarının adlarını eskileriyle değiştir
ALTER TABLE recipes
  RENAME COLUMN title_json TO title;

ALTER TABLE recipes
  RENAME COLUMN description_json TO description;

ALTER TABLE recipes
  RENAME COLUMN ingredients_json TO ingredients;

ALTER TABLE recipes
  RENAME COLUMN instructions_json TO instructions;

-- Not: 'locale' kolonu bilerek bırakılmıştır. Reçetenin ilk oluşturulduğu (orijinal) dili temsil etmek üzere kullanılabilir.
