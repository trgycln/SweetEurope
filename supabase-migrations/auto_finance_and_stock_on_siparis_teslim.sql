-- ─── Sipariş "Teslim Edildi" → Otomatik Finans & Stok Kaydı ────────────────────
--
-- DURUM 1 — Alt Bayinin kendi siparişi teslim edildiğinde:
--   • alt_bayi_giderleri'ne gider kaydı eklenir  (tutar = toplam_tutar_net)
--   • Stok artışı fn_increment_subdealer_stock_on_delivery trigger'ı tarafından yapılır
--
-- DURUM 2 — Müşteri siparişi teslim edildiğinde:
--   • alt_bayi_gelirleri'ne gelir kaydı eklenir  (tutar = toplam_tutar_net)
--   • alt_bayi_stoklari'ndan sipariş kalemleri düşülür
--
-- Aynı sipariş için iki kez kayıt girilmesini önlemek için
-- gider/gelir tablolarına siparis_id kolonu ve unique index eklenir.
-- ───────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Finance tablolarına siparis_id kolonu ekle (idempotent)
ALTER TABLE public.alt_bayi_giderleri
  ADD COLUMN IF NOT EXISTS siparis_id UUID
    REFERENCES public.siparisler(id) ON DELETE SET NULL;

ALTER TABLE public.alt_bayi_gelirleri
  ADD COLUMN IF NOT EXISTS siparis_id UUID
    REFERENCES public.siparisler(id) ON DELETE SET NULL;

-- Unique index: aynı sipariş için iki kez kayıt oluşmasın
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_alt_bayi_gider_siparis
  ON public.alt_bayi_giderleri(siparis_id)
  WHERE siparis_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_alt_bayi_gelir_siparis
  ON public.alt_bayi_gelirleri(siparis_id)
  WHERE siparis_id IS NOT NULL;

-- 2. Trigger fonksiyonu
CREATE OR REPLACE FUNCTION public.fn_siparis_teslim_finans_ve_stok()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alt_bayi_id       UUID;
  v_alt_bayi_firma_id UUID;
  v_siparis_tutar     NUMERIC;
  v_musteri_unvan     TEXT;
BEGIN
  -- Sadece 'Teslim Edildi' / 'delivered' geçişinde çalış
  IF NOT (
    TG_OP = 'UPDATE'
    AND NEW.siparis_durumu IN ('Teslim Edildi', 'delivered')
    AND OLD.siparis_durumu IS DISTINCT FROM NEW.siparis_durumu
  ) THEN
    RETURN NEW;
  END IF;

  v_siparis_tutar := COALESCE(NEW.toplam_tutar_net, 0);

  -- ── DURUM 1: Alt Bayinin kendi siparişi (tedarikçiden aldığı) ───────────────
  -- Kriter: siparişi oluşturan kullanıcı Alt Bayi rolünde
  --         VE sipariş o kişinin kendi firmasına ait
  SELECT p.id, p.firma_id
  INTO   v_alt_bayi_id, v_alt_bayi_firma_id
  FROM   public.profiller p
  WHERE  p.id  = NEW.olusturan_kullanici_id
    AND  p.rol = 'Alt Bayi';

  IF FOUND AND v_alt_bayi_firma_id = NEW.firma_id THEN

    INSERT INTO public.alt_bayi_giderleri
      (sahip_id, tarih, kategori, aciklama, tutar, siparis_id)
    VALUES (
      v_alt_bayi_id,
      CURRENT_DATE,
      'Tedarik',
      'Sipariş #' || upper(substring(NEW.id::text, 1, 8)),
      v_siparis_tutar,
      NEW.id
    )
    ON CONFLICT (siparis_id) DO NOTHING;

    -- Not: stok artışı fn_increment_subdealer_stock_on_delivery trigger'ı tarafından yapılır
    RETURN NEW;
  END IF;

  -- ── DURUM 2: Müşteri siparişi (alt bayinin müşterisinden gelen) ─────────────
  -- Kriter: siparişin firma_id'si, ust_bayi_firma_id'si olan bir müşteri firmasına ait
  SELECT p.id
  INTO   v_alt_bayi_id
  FROM   public.firmalar f
  JOIN   public.profiller p
    ON   p.firma_id = f.ust_bayi_firma_id
    AND  p.rol      = 'Alt Bayi'
  WHERE  f.id                 = NEW.firma_id
    AND  f.ust_bayi_firma_id  IS NOT NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Müşteri firma adını al
  SELECT unvan INTO v_musteri_unvan
  FROM   public.firmalar
  WHERE  id = NEW.firma_id;

  -- Gelir kaydet
  INSERT INTO public.alt_bayi_gelirleri
    (sahip_id, tarih, musteri_adi, aciklama, tutar, siparis_id)
  VALUES (
    v_alt_bayi_id,
    CURRENT_DATE,
    v_musteri_unvan,
    'Sipariş #' || upper(substring(NEW.id::text, 1, 8)),
    v_siparis_tutar,
    NEW.id
  )
  ON CONFLICT (siparis_id) DO NOTHING;

  -- Stok düş: her ürün için alt_bayi_stoklari'nı güncelle (sıfırın altına düşürme)
  UPDATE public.alt_bayi_stoklari AS s
  SET
    miktar     = GREATEST(0, s.miktar - agg.toplam_miktar),
    updated_at = now()
  FROM (
    SELECT urun_id, SUM(miktar)::int AS toplam_miktar
    FROM   public.siparis_detay
    WHERE  siparis_id = NEW.id
    GROUP  BY urun_id
  ) AS agg
  WHERE s.sahip_id = v_alt_bayi_id
    AND s.urun_id  = agg.urun_id;

  RETURN NEW;
END;
$$;

-- 3. Trigger: siparisler tablosunda AFTER UPDATE
DROP TRIGGER IF EXISTS trg_siparis_teslim_finans_ve_stok ON public.siparisler;
CREATE TRIGGER trg_siparis_teslim_finans_ve_stok
  AFTER UPDATE ON public.siparisler
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_siparis_teslim_finans_ve_stok();

COMMIT;
