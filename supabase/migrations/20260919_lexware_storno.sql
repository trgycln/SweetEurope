-- Lexware Storno ve Fatura Durumu Ek Kolonları
ALTER TABLE siparisler 
ADD COLUMN IF NOT EXISTS lexware_storno_id TEXT,
ADD COLUMN IF NOT EXISTS lexware_storno_no TEXT,
ADD COLUMN IF NOT EXISTS lexware_storno_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS fatura_durumu TEXT DEFAULT 'bekliyor';
