-- ============================================================
-- Tedarikçi gerçek alış fiyat logu
-- Her onaylanan sipariş için standart vs gerçek fiyat karşılaştırması
-- ============================================================

CREATE TABLE IF NOT EXISTS tedarikci_fiyat_loglari (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  urun_id              uuid        REFERENCES urunler(id) ON DELETE SET NULL,
  siparis_id           uuid,                          -- sistem_settings kaydının id'si (UUID)
  tir_id               uuid        REFERENCES ithalat_partileri(id) ON DELETE SET NULL,
  standart_fiyat       numeric     NOT NULL,          -- distributor_alis_fiyati × çarpan
  gercek_fiyat         numeric     NOT NULL,          -- gerçek alış fiyatı × çarpan
  fark_yuzde           numeric,                       -- (gerçek - standart) / standart × 100
  indirim_aciklamasi   text,                          -- örn: "%20 + %8 çift kademeli indirim"
  tedarikci_id         uuid        REFERENCES tedarikciler(id) ON DELETE SET NULL,
  birim_turu           text,                          -- 'kutu' | 'koli' | 'palet'
  miktar               numeric,                       -- sipariş miktarı
  tarih                timestamptz DEFAULT now(),
  created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tedarikci_fiyat_loglari_urun_idx      ON tedarikci_fiyat_loglari(urun_id);
CREATE INDEX IF NOT EXISTS tedarikci_fiyat_loglari_siparis_idx   ON tedarikci_fiyat_loglari(siparis_id);
CREATE INDEX IF NOT EXISTS tedarikci_fiyat_loglari_tedarikci_idx ON tedarikci_fiyat_loglari(tedarikci_id);
CREATE INDEX IF NOT EXISTS tedarikci_fiyat_loglari_tarih_idx     ON tedarikci_fiyat_loglari(tarih);

ALTER TABLE tedarikci_fiyat_loglari ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tedarikci_fiyat_loglari_auth" ON tedarikci_fiyat_loglari
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- giderler tablosuna satın alma siparişi kaynağı desteği
-- (kaynak='satin_alma_siparisi' değerini desteklemek için yorum güncelleme)
-- kaynak kolonu zaten text tipinde, yeni değerlere hazır.

-- EAN/barkod için urunler tablosuna index (eğer yoksa)
CREATE INDEX IF NOT EXISTS urunler_ean_gtin_idx ON urunler(ean_gtin) WHERE ean_gtin IS NOT NULL;
