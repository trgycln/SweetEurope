-- is_ortaklari: Kargo firmaları ve genel irtibatlar
CREATE TABLE IF NOT EXISTS is_ortaklari (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tip              text        NOT NULL,                          -- 'kargo' | 'irtibat'
  ad               text        NOT NULL,
  sirket_adi       text,
  unvan            text,
  kategori         text,                                          -- 'gumruk_musaviri' | 'muhasebeci' | 'avukat' | 'sigorta' | 'diger'
  telefon          text,
  email            text,
  sehir            text,
  notlar           text,
  degerlendirme    integer     CHECK (degerlendirme BETWEEN 1 AND 5),
  durum            text        NOT NULL DEFAULT 'aktif',          -- 'aktif' | 'gorusuluyor' | 'pasif'
  olusturma_tarihi timestamptz NOT NULL DEFAULT now()
);

-- kargo_teklifleri: Kargo firma fiyat teklifleri
CREATE TABLE IF NOT EXISTS kargo_teklifleri (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  firma_id           uuid        NOT NULL REFERENCES is_ortaklari(id) ON DELETE CASCADE,
  teklif_tarihi      date        NOT NULL,
  gecerlilik_tarihi  date,
  fiyat_kg           numeric,
  min_agirlik        numeric,
  transit_sure       text,
  tasima_tipi        text        NOT NULL DEFAULT 'donuk',        -- 'donuk' | 'kuru' | 'karma'
  notlar             text,
  belge_url          text,
  aktif              boolean     NOT NULL DEFAULT true,
  olusturma_tarihi   timestamptz NOT NULL DEFAULT now()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_is_ortaklari_tip    ON is_ortaklari(tip);
CREATE INDEX IF NOT EXISTS idx_is_ortaklari_durum  ON is_ortaklari(durum);
CREATE INDEX IF NOT EXISTS idx_kargo_teklifleri_firma ON kargo_teklifleri(firma_id);

-- RLS (Row Level Security) — sadece authenticated kullanıcılar
ALTER TABLE is_ortaklari    ENABLE ROW LEVEL SECURITY;
ALTER TABLE kargo_teklifleri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "is_ortaklari_auth" ON is_ortaklari
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "kargo_teklifleri_auth" ON kargo_teklifleri
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
