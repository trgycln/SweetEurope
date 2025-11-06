-- Update pricing rules table for hybrid system
-- Add customer profile support to existing fiyat_kurallari table

ALTER TABLE public.fiyat_kurallari 
ADD COLUMN IF NOT EXISTS musteri_profil_id uuid REFERENCES public.musteri_profilleri(id) ON DELETE CASCADE;

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_fiyat_kurallari_musteri_profil ON public.fiyat_kurallari(musteri_profil_id);

-- Update existing rules to work with new system
-- Set default values for existing records if needed
UPDATE public.fiyat_kurallari 
SET musteri_profil_id = NULL 
WHERE musteri_profil_id IS NULL AND kapsam IN ('global', 'kategori', 'urun');

-- Insert example hybrid rules for VIP customers
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
    -- VIP customers get extra discount on pasta category
    INSERT INTO public.fiyat_kurallari (
      ad, kapsam, kanal, kategori_id, musteri_profil_id, 
      yuzde_degisim, oncelik, aktif, aciklama
    ) 
    SELECT 
      'VIP Pasta İndirimi', 'kategori', 'Müşteri', k.id, vip_profil_id,
      -3.00, 10, true, 'VIP müşteriler için pasta kategorisinde ek %3 indirim'
    FROM kategoriler k 
    WHERE k.ad->>'tr' ILIKE '%pasta%' OR k.ad->>'de' ILIKE '%kuchen%'
    LIMIT 1
    ON CONFLICT DO NOTHING;
  END IF;
END
$$;