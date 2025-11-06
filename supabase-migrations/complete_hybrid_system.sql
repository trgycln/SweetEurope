-- ========================================
-- COMPLETE HYBRID PRICING SYSTEM SETUP
-- Run this single file in Supabase Dashboard
-- ========================================

-- 1. SYSTEM SETTINGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key varchar(100) NOT NULL UNIQUE,
  setting_value text NOT NULL,
  setting_type varchar(20) NOT NULL DEFAULT 'text', -- 'number', 'text', 'boolean'
  description text,
  category varchar(50) DEFAULT 'general',
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- System settings indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);

-- System settings RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  BEGIN
    CREATE POLICY system_settings_admin_full ON public.system_settings
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
    CREATE POLICY system_settings_read_all ON public.system_settings
      FOR SELECT
      USING (auth.uid() IS NOT NULL);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$$;

-- System settings default values
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, category) VALUES
  ('pricing_shipping_per_box', '0.56', 'number', 'Kutu başı nakliye maliyeti (€)', 'pricing'),
  ('pricing_customs_percent', '7', 'number', 'Gümrük vergisi oranı (%)', 'pricing'),
  ('pricing_storage_per_box', '0.08', 'number', 'Kutu başı depolama maliyeti (€)', 'pricing'),
  ('pricing_operational_percent', '10', 'number', 'Operasyonel giderler oranı (%)', 'pricing'),
  ('pricing_distributor_margin', '25', 'number', 'Distribütör marjı (%)', 'pricing'),
  ('pricing_dealer_margin_default', '20', 'number', 'Varsayılan alt bayi marjı (%)', 'pricing'),
  ('pricing_round_step', '0.1', 'number', 'Fiyat yuvarlama adımı', 'pricing'),
  ('pricing_vat_rate', '7', 'number', 'KDV oranı (%)', 'pricing')
ON CONFLICT (setting_key) DO NOTHING;

-- System settings trigger
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER trigger_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- 2. CUSTOMER PROFILES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.musteri_profilleri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad varchar(100) NOT NULL UNIQUE, -- VIP, Normal, Yeni Müşteri, etc. (UNIQUE added!)
  aciklama text,
  genel_indirim_yuzdesi numeric(5,2) DEFAULT 0, -- -5.00 = %5 indirim, +2.00 = %2 artış
  aktif boolean DEFAULT true,
  sira_no integer DEFAULT 0, -- UI'da sıralama için
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Customer profiles indexes
CREATE INDEX IF NOT EXISTS idx_musteri_profilleri_aktif ON public.musteri_profilleri(aktif);
CREATE INDEX IF NOT EXISTS idx_musteri_profilleri_sira ON public.musteri_profilleri(sira_no);

-- Customer profiles RLS
ALTER TABLE public.musteri_profilleri ENABLE ROW LEVEL SECURITY;

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

-- Insert default customer profiles (with proper conflict handling)
INSERT INTO public.musteri_profilleri (ad, aciklama, genel_indirim_yuzdesi, aktif, sira_no) VALUES
  ('Normal', 'Standart müşteri profili', 0, true, 1),
  ('VIP', 'VIP müşteriler için özel indirim', -5.00, true, 2),
  ('Yeni Müşteri', 'Yeni müşteriler için hoşgeldin indirimi', -3.00, true, 3),
  ('Toptan', 'Büyük hacim alımları için özel fiyat', -8.00, true, 4)
ON CONFLICT (ad) DO NOTHING;

-- Customer profiles trigger
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

-- 3. CREATE PRICING RULES TABLE (if not exists)
-- ========================================
CREATE TABLE IF NOT EXISTS public.fiyat_kurallari (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad TEXT NOT NULL,
  aktif BOOLEAN NOT NULL DEFAULT true,
  kapsam TEXT NOT NULL CHECK (kapsam IN ('global','kategori','urun')),
  kategori_id UUID NULL REFERENCES public.kategoriler(id) ON DELETE CASCADE,
  urun_id UUID NULL REFERENCES public.urunler(id) ON DELETE CASCADE,
  kanal TEXT NOT NULL DEFAULT 'Müşteri',
  firma_id UUID NULL REFERENCES public.firmalar(id) ON DELETE CASCADE,
  min_adet INTEGER NOT NULL DEFAULT 0 CHECK (min_adet >= 0),
  yuzde_degisim NUMERIC(6,2) NOT NULL, -- -5.00 = %5 indirim, 2.00 = %2 artış
  oncelik INTEGER NOT NULL DEFAULT 100,
  baslangic_tarihi DATE NULL,
  bitis_tarihi DATE NULL,
  aciklama TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pricing rules indexes
CREATE INDEX IF NOT EXISTS idx_fk_aktif ON public.fiyat_kurallari(aktif);
CREATE INDEX IF NOT EXISTS idx_fk_kanal ON public.fiyat_kurallari(kanal);
CREATE INDEX IF NOT EXISTS idx_fk_oncelik ON public.fiyat_kurallari(oncelik);
CREATE INDEX IF NOT EXISTS idx_fk_kapsam ON public.fiyat_kurallari(kapsam);

-- Pricing rules RLS
ALTER TABLE public.fiyat_kurallari ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  BEGIN
    CREATE POLICY yoneticiler_fk_full ON public.fiyat_kurallari
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiller p
          WHERE p.id = auth.uid() AND p.rol IN ('Yönetici','Ekip Üyesi')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiller p
          WHERE p.id = auth.uid() AND p.rol IN ('Yönetici','Ekip Üyesi')
        )
      );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    CREATE POLICY auth_okur_aktif_kurallar ON public.fiyat_kurallari
      FOR SELECT
      USING (aktif = true);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$$;

-- 4. UPDATE PRICING RULES FOR HYBRID SYSTEM
-- ========================================
ALTER TABLE public.fiyat_kurallari 
ADD COLUMN IF NOT EXISTS musteri_profil_id uuid REFERENCES public.musteri_profilleri(id) ON DELETE CASCADE;

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_fiyat_kurallari_musteri_profil ON public.fiyat_kurallari(musteri_profil_id);

-- Update existing rules to work with new system
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

-- ========================================
-- SETUP COMPLETE! 
-- ========================================
-- You can now access:
-- 1. /admin/crm/musteri-profilleri - Manage customer profiles
-- 2. /admin/crm/profil-atamalari - Assign profiles to customers  
-- 3. /admin/ayarlar/sistem-ayarlari - Configure default pricing values
-- ========================================