-- Add free-text nutritional info column.
-- The structured naehrwerte JSONB column is kept for backward compatibility.
ALTER TABLE urunler
  ADD COLUMN IF NOT EXISTS besin_degerleri text;
