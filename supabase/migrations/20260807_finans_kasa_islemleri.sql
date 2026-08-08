-- 1. Finans ve Gider verilerinin sıfırlanması
TRUNCATE TABLE giderler CASCADE;
TRUNCATE TABLE gider_sablonlari CASCADE;

-- 2. Giderler tablosuna yeni kolonlar
ALTER TABLE giderler ADD COLUMN IF NOT EXISTS kategori_ad text;
ALTER TABLE giderler ADD COLUMN IF NOT EXISTS kasa_tipi text DEFAULT 'Banka';

-- 3. Siparişler tablosuna ödeme durumu
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS odeme_durumu text DEFAULT 'Ödenmedi';
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS odeme_kasa_tipi text DEFAULT 'Banka';

-- 4. Finans Kasa İşlemleri (Sermaye, Borç vb.)
CREATE TABLE IF NOT EXISTS finans_kasa_islemleri (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  islem_tipi text NOT NULL, -- 'sermaye_girisi', 'sermaye_cikisi', 'borc_alma', 'borc_odeme', 'transfer'
  kasa_tipi text NOT NULL, -- 'Banka' veya 'Nakit'
  hedef_kasa_tipi text, -- transfer işlemi için
  tutar numeric NOT NULL,
  tarih timestamp with time zone DEFAULT now(),
  aciklama text,
  karsi_taraf text, -- Borç alınan kişi/kurum veya Sermaye yatıran ortak
  islem_yapan_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE finans_kasa_islemleri ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'finans_kasa_islemleri'
      AND policyname = 'finans_kasa_islemleri_all'
  ) THEN
    CREATE POLICY "finans_kasa_islemleri_all" ON finans_kasa_islemleri
      FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 5. Kasa Özeti RPC
CREATE OR REPLACE FUNCTION get_kasa_ozeti()
RETURNS TABLE (
  toplam_satis numeric,
  toplam_gider numeric,
  net_sermaye numeric,
  net_borc numeric,
  banka_bakiye numeric,
  nakit_bakiye numeric
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_banka_satis numeric := 0;
  v_nakit_satis numeric := 0;
  
  v_banka_gider numeric := 0;
  v_nakit_gider numeric := 0;
  
  v_banka_sermaye numeric := 0;
  v_nakit_sermaye numeric := 0;
  
  v_banka_borc numeric := 0;
  v_nakit_borc numeric := 0;
  
  v_banka_transfer_giris numeric := 0;
  v_banka_transfer_cikis numeric := 0;
  
  v_nakit_transfer_giris numeric := 0;
  v_nakit_transfer_cikis numeric := 0;
BEGIN
  -- Satışlar (Sadece 'Ödendi' olan siparişlerin toplam_tutar'ı)
  SELECT 
    COALESCE(SUM(CASE WHEN odeme_kasa_tipi = 'Banka' THEN toplam_tutar_net ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN odeme_kasa_tipi = 'Nakit' THEN toplam_tutar_net ELSE 0 END), 0)
  INTO v_banka_satis, v_nakit_satis
  FROM siparisler
  WHERE odeme_durumu = 'Ödendi';

  -- Giderler (Sadece Onaylanmış olanlar)
  SELECT 
    COALESCE(SUM(CASE WHEN kasa_tipi = 'Banka' THEN tutar ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN kasa_tipi = 'Nakit' THEN tutar ELSE 0 END), 0)
  INTO v_banka_gider, v_nakit_gider
  FROM giderler
  WHERE durum = 'Onaylandı';

  -- Finans Kasa İşlemleri (Banka)
  SELECT 
    COALESCE(SUM(CASE WHEN islem_tipi = 'sermaye_girisi' THEN tutar WHEN islem_tipi = 'sermaye_cikisi' THEN -tutar ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN islem_tipi = 'borc_alma' THEN tutar WHEN islem_tipi = 'borc_odeme' THEN -tutar ELSE 0 END), 0)
  INTO v_banka_sermaye, v_banka_borc
  FROM finans_kasa_islemleri
  WHERE kasa_tipi = 'Banka';

  -- Finans Kasa İşlemleri (Nakit)
  SELECT 
    COALESCE(SUM(CASE WHEN islem_tipi = 'sermaye_girisi' THEN tutar WHEN islem_tipi = 'sermaye_cikisi' THEN -tutar ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN islem_tipi = 'borc_alma' THEN tutar WHEN islem_tipi = 'borc_odeme' THEN -tutar ELSE 0 END), 0)
  INTO v_nakit_sermaye, v_nakit_borc
  FROM finans_kasa_islemleri
  WHERE kasa_tipi = 'Nakit';
  
  -- Transferler
  SELECT 
    COALESCE(SUM(CASE WHEN islem_tipi = 'transfer' AND hedef_kasa_tipi = 'Banka' THEN tutar ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN islem_tipi = 'transfer' AND kasa_tipi = 'Banka' THEN tutar ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN islem_tipi = 'transfer' AND hedef_kasa_tipi = 'Nakit' THEN tutar ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN islem_tipi = 'transfer' AND kasa_tipi = 'Nakit' THEN tutar ELSE 0 END), 0)
  INTO v_banka_transfer_giris, v_banka_transfer_cikis, v_nakit_transfer_giris, v_nakit_transfer_cikis
  FROM finans_kasa_islemleri;

  RETURN QUERY SELECT 
    (v_banka_satis + v_nakit_satis) as toplam_satis,
    (v_banka_gider + v_nakit_gider) as toplam_gider,
    (v_banka_sermaye + v_nakit_sermaye) as net_sermaye,
    (v_banka_borc + v_nakit_borc) as net_borc,
    (v_banka_satis - v_banka_gider + v_banka_sermaye + v_banka_borc + v_banka_transfer_giris - v_banka_transfer_cikis) as banka_bakiye,
    (v_nakit_satis - v_nakit_gider + v_nakit_sermaye + v_nakit_borc + v_nakit_transfer_giris - v_nakit_transfer_cikis) as nakit_bakiye;
END;
$$;
