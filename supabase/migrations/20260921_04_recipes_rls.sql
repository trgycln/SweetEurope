-- recipes tablosu için RLS (Row Level Security) politikaları
-- Bu SQL'i Supabase SQL Editor'de çalıştırın

-- Önce RLS'yi etkinleştir
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Herkes reçeteleri okuyabilir (public)
CREATE POLICY "recipes_select_public"
  ON recipes FOR SELECT
  USING (true);

-- Herkes reçete ekleyebilir (server action'lardan)
CREATE POLICY "recipes_insert_public"
  ON recipes FOR INSERT
  WITH CHECK (true);

-- Update için de izin ver
CREATE POLICY "recipes_update_public"
  ON recipes FOR UPDATE
  USING (true);
