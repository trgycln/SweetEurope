-- ============================================================
-- Giderler tablosu - yeni kolonlar
-- Supabase Dashboard > SQL Editor'da çalıştırın
-- ============================================================

-- Ana kaynak takip kolonları
ALTER TABLE giderler ADD COLUMN IF NOT EXISTS kaynak text DEFAULT 'manuel';
ALTER TABLE giderler ADD COLUMN IF NOT EXISTS kaynak_id uuid;
ALTER TABLE giderler ADD COLUMN IF NOT EXISTS tir_id uuid REFERENCES ithalat_partileri(id) ON DELETE SET NULL;
ALTER TABLE giderler ADD COLUMN IF NOT EXISTS otomatik_eklendi boolean DEFAULT false;
ALTER TABLE giderler ADD COLUMN IF NOT EXISTS tekrar_tipi text DEFAULT 'tek_seferlik';
ALTER TABLE giderler ADD COLUMN IF NOT EXISTS sablon_id uuid;

-- kaynak: 'manuel' | 'tir' | 'sablon'
-- tekrar_tipi: 'tek_seferlik' | 'aylik' | 'yillik'

-- Index for fast TIR lookups
CREATE INDEX IF NOT EXISTS giderler_tir_id_idx ON giderler(tir_id);
CREATE INDEX IF NOT EXISTS giderler_kaynak_idx ON giderler(kaynak);

-- Gider şablonları - tutar ve kategori ekle (tablo zaten varsa)
ALTER TABLE gider_sablonlari ADD COLUMN IF NOT EXISTS tutar numeric DEFAULT 0;
ALTER TABLE gider_sablonlari ADD COLUMN IF NOT EXISTS kategori text;

-- ============================================================
-- Sabit gider şablonları tablosu (eğer yoksa tam yapıyla oluştur)
-- ============================================================
CREATE TABLE IF NOT EXISTS gider_sablonlari (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sablon_adi      text        NOT NULL,
  tutar           numeric     NOT NULL DEFAULT 0,
  kategori        text,
  tekrar_tipi     text        DEFAULT 'aylik',
  donem_tipi      text        DEFAULT 'Aylık',
  aktif           boolean     DEFAULT true,
  aciklama        text,
  olusturma_tarihi timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE gider_sablonlari ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'gider_sablonlari'
      AND policyname = 'gider_sablonlari_select'
  ) THEN
    CREATE POLICY "gider_sablonlari_select" ON gider_sablonlari
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'gider_sablonlari'
      AND policyname = 'gider_sablonlari_all'
  ) THEN
    CREATE POLICY "gider_sablonlari_all" ON gider_sablonlari
      FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
END $$;
