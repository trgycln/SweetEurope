-- ============================================================
-- Belge Yönetimi Tablosu
-- Supabase Dashboard > SQL Editor'da çalıştırın
-- ============================================================

CREATE TABLE IF NOT EXISTS belgeler (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ad                    text        NOT NULL,
  kategori              text        NOT NULL,
  alt_kategori          text,
  dosya_url             text,
  dosya_boyutu          integer,
  dosya_tipi            text,
  iliski_tipi           text,       -- 'siparis' | 'tir' | 'firma' | 'genel'
  iliski_id             uuid,
  firma_id              uuid        REFERENCES firmalar(id) ON DELETE SET NULL,
  tir_id                uuid        REFERENCES ithalat_partileri(id) ON DELETE SET NULL,
  aciklama              text,
  etiketler             text[],
  son_gecerlilik_tarihi date,
  yukleyen_id           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  olusturma_tarihi      timestamptz DEFAULT now(),
  gizli                 boolean     DEFAULT false,
  otomatik_eklendi      boolean     DEFAULT false
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS belgeler_kategori_idx ON belgeler(kategori);
CREATE INDEX IF NOT EXISTS belgeler_firma_id_idx ON belgeler(firma_id);
CREATE INDEX IF NOT EXISTS belgeler_tir_id_idx ON belgeler(tir_id);
CREATE INDEX IF NOT EXISTS belgeler_olusturma_tarihi_idx ON belgeler(olusturma_tarihi DESC);
CREATE INDEX IF NOT EXISTS belgeler_son_gecerlilik_idx ON belgeler(son_gecerlilik_tarihi);

-- RLS
ALTER TABLE belgeler ENABLE ROW LEVEL SECURITY;

-- View policy: users see non-hidden docs; hidden docs only for admins/own
CREATE POLICY "belgeler_select" ON belgeler FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      gizli = false
      OR yukleyen_id = auth.uid()
    )
  );

CREATE POLICY "belgeler_insert" ON belgeler FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "belgeler_update" ON belgeler FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "belgeler_delete" ON belgeler FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Storage bucket (run via Supabase Dashboard > Storage > New Bucket)
-- Bucket name: belgeler
-- Public: false

-- ============================================================
-- Almanya yasal uyarısı:
-- §257 HGB: Ticari belgeler 10 yıl saklanmalıdır.
-- Gümrük belgeleri: 5 yıl
-- ============================================================
