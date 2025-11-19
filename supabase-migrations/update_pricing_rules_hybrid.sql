-- Update pricing rules table for hybrid system
-- Add customer profile support to existing fiyat_kurallari table
-- Add multilingual support for rule name and description (ad_i18n, aciklama_i18n)

ALTER TABLE public.fiyat_kurallari 
ADD COLUMN IF NOT EXISTS musteri_profil_id uuid REFERENCES public.musteri_profilleri(id) ON DELETE CASCADE;

-- Create i18n columns for rule name and description
ALTER TABLE public.fiyat_kurallari 
ADD COLUMN IF NOT EXISTS ad_i18n jsonb;

ALTER TABLE public.fiyat_kurallari 
ADD COLUMN IF NOT EXISTS aciklama_i18n jsonb;

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_fiyat_kurallari_musteri_profil ON public.fiyat_kurallari(musteri_profil_id);

-- Backfill i18n columns from legacy text columns where missing
UPDATE public.fiyat_kurallari
SET 
  ad_i18n = COALESCE(ad_i18n, jsonb_build_object('tr', ad, 'de', ad, 'en', ad)),
  aciklama_i18n = COALESCE(aciklama_i18n, CASE WHEN aciklama IS NOT NULL THEN jsonb_build_object('tr', aciklama, 'de', aciklama, 'en', aciklama) ELSE NULL END)
WHERE ad IS NOT NULL;

-- Update existing rules to work with new system
-- Set default values for existing records if needed
UPDATE public.fiyat_kurallari 
SET musteri_profil_id = NULL 
WHERE musteri_profil_id IS NULL AND kapsam IN ('global', 'kategori', 'urun');

-- Insert example hybrid rules for VIP customers (with multilingual labels)
DO $$
DECLARE
  vip_profil_id uuid;
  normal_profil_id uuid;
BEGIN
  -- Get VIP profile ID
  SELECT id INTO vip_profil_id FROM public.musteri_profilleri WHERE ad = 'VIP' LIMIT 1;
  -- Get Normal profile ID  
  SELECT id INTO normal_profil_id FROM public.musteri_profilleri WHERE ad = 'Normal' LIMIT 1;
  
  IF vip_profil_id IS NOT NULL THEN
    -- VIP customers get extra discount on pasta/cake category
    INSERT INTO public.fiyat_kurallari (
      ad, ad_i18n, kapsam, kanal, kategori_id, musteri_profil_id, 
      yuzde_degisim, oncelik, aktif, aciklama, aciklama_i18n
    ) 
    SELECT 
      'VIP Pasta İndirimi',
      jsonb_build_object(
        'tr', 'VIP Pasta İndirimi',
        'de', 'VIP Kuchen-Rabatt',
        'en', 'VIP Cake Discount'
      ),
      'kategori', 'Müşteri', k.id, vip_profil_id,
      -3.00, 10, true,
      'VIP müşteriler için pasta kategorisinde ek %3 indirim',
      jsonb_build_object(
        'tr', 'VIP müşteriler için pasta kategorisinde ek %3 indirim',
        'de', 'Zusätzliche 3% Rabatt für VIP-Kunden in der Kuchen-Kategorie',
        'en', 'Extra 3% discount for VIP customers on the cake category'
      )
    FROM kategoriler k 
    WHERE (k.ad->>'tr' ILIKE '%pasta%' OR k.ad->>'de' ILIKE '%kuchen%' OR k.ad->>'en' ILIKE '%cake%')
    LIMIT 1
    ON CONFLICT DO NOTHING;
  END IF;
END
$$;