-- Fix companies to work with profile assignment system

-- STEP 1: Check current categories
SELECT DISTINCT kategori FROM public.firmalar;

-- STEP 2: Convert some companies to "Müşteri" category (for profile assignments)
UPDATE public.firmalar 
SET kategori = 'Müşteri' 
WHERE kategori IN ('Kafe', 'Restoran') 
AND status IN ('Anlaşma Sağlandı', 'Potansiyel');

-- STEP 3: Add sample customer companies
INSERT INTO public.firmalar (unvan, kategori, status, telefon, email, adres) VALUES
  ('ABC Trading GmbH', 'Müşteri', 'Anlaşma Sağlandı', '+49-30-12345678', 'info@abctrading.de', 'Berlin, Germany'),
  ('XYZ Import Ltd', 'Müşteri', 'Anlaşma Sağlandı', '+49-40-87654321', 'contact@xyzimport.de', 'Hamburg, Germany'),  
  ('Demo Restaurant Chain', 'Müşteri', 'Potansiyel', '+49-89-11111111', 'orders@demorestaurant.de', 'Munich, Germany')
ON CONFLICT DO NOTHING;

-- STEP 4: Verify customers are available for profile assignment
SELECT unvan, kategori, status, musteri_profil_id FROM public.firmalar WHERE kategori = 'Müşteri';