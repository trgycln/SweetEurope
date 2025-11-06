-- Create customer pricing profiles for hybrid pricing system
CREATE TABLE IF NOT EXISTS public.musteri_profilleri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad varchar(100) NOT NULL, -- VIP, Normal, Yeni Müşteri, etc.
  aciklama text,
  genel_indirim_yuzdesi numeric(5,2) DEFAULT 0, -- -5.00 = %5 indirim, +2.00 = %2 artış
  aktif boolean DEFAULT true,
  sira_no integer DEFAULT 0, -- UI'da sıralama için
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_musteri_profilleri_aktif ON public.musteri_profilleri(aktif);
CREATE INDEX IF NOT EXISTS idx_musteri_profilleri_sira ON public.musteri_profilleri(sira_no);

-- Enable RLS
ALTER TABLE public.musteri_profilleri ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  BEGIN
    CREATE POLICY musteri_profilleri_admin_full ON public.musteri_profilleri
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiller p
          WHERE p.id = auth.uid() AND p.rol = 'Yönetici'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiller p
          WHERE p.id = auth.uid() AND p.rol = 'Yönetici'
        )
      );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    CREATE POLICY musteri_profilleri_read_all ON public.musteri_profilleri
      FOR SELECT
      USING (auth.uid() IS NOT NULL);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$$;

-- Add customer profile reference to firmalar table
ALTER TABLE public.firmalar 
ADD COLUMN IF NOT EXISTS musteri_profil_id uuid REFERENCES public.musteri_profilleri(id) ON DELETE SET NULL;

-- Create index for the foreign key
CREATE INDEX IF NOT EXISTS idx_firmalar_musteri_profil ON public.firmalar(musteri_profil_id);

-- Insert default customer profiles
INSERT INTO public.musteri_profilleri (ad, aciklama, genel_indirim_yuzdesi, aktif, sira_no) VALUES
  ('Normal', 'Standart müşteri profili', 0, true, 1),
  ('VIP', 'VIP müşteriler için özel indirim', -5.00, true, 2),
  ('Yeni Müşteri', 'Yeni müşteriler için hoşgeldin indirimi', -3.00, true, 3),
  ('Toptan', 'Büyük hacim alımları için özel fiyat', -8.00, true, 4)
ON CONFLICT DO NOTHING;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_musteri_profilleri_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_musteri_profilleri_updated_at ON public.musteri_profilleri;
CREATE TRIGGER trigger_musteri_profilleri_updated_at
  BEFORE UPDATE ON public.musteri_profilleri
  FOR EACH ROW
  EXECUTE FUNCTION update_musteri_profilleri_updated_at();