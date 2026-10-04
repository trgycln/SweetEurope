-- Migration: Add Proforma and Storno columns to siparisler
ALTER TABLE siparisler
  ADD COLUMN IF NOT EXISTS lexware_proforma_id TEXT,
  ADD COLUMN IF NOT EXISTS lexware_proforma_no TEXT,
  ADD COLUMN IF NOT EXISTS lexware_proforma_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS proforma_durumu TEXT,
  ADD COLUMN IF NOT EXISTS proforma_gonderildi_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fatura_durumu TEXT,
  ADD COLUMN IF NOT EXISTS lexware_storno_id TEXT,
  ADD COLUMN IF NOT EXISTS lexware_storno_no TEXT,
  ADD COLUMN IF NOT EXISTS lexware_storno_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS storno_gonderildi_at TIMESTAMPTZ;
