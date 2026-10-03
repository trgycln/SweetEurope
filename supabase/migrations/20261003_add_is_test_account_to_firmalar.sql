-- 1) firmalar tablosuna is_test_account kolonu ekle
ALTER TABLE public.firmalar ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN DEFAULT false;

-- 2) "Test GmbH" (veya içinde 'Test' geçen) firmaları otomatik olarak test hesabı yap
UPDATE public.firmalar 
SET is_test_account = true 
WHERE unvan ILIKE '%Test GmbH%' OR unvan ILIKE '%Test Firmas%';
