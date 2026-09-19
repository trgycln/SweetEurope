-- ====================================================================
-- ATOMİK STOK OPERASYONLARI & GÜVENLİK (DATABASE HARDENING)
-- ====================================================================

-- 1. Sipariş İptal Edildiğinde Stokları Geri Yükleyen Fonksiyon (Stok İadesi)
CREATE OR REPLACE FUNCTION restore_order_stock(p_siparis_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_restored_count INT := 0;
  v_siparis_durumu TEXT;
BEGIN
  -- Sipariş durumunu kontrol et
  SELECT siparis_durumu INTO v_siparis_durumu
  FROM siparisler
  WHERE id = p_siparis_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Siparis bulunamadi');
  END IF;

  -- Ön siparişler zaten stoktan düşmediği için sadece stoklu siparişleri iade et
  IF v_siparis_durumu = 'Ön Sipariş' THEN
    RETURN jsonb_build_object('success', true, 'message', 'On siparis oldugu icin stok iadesi gerekmedi', 'restored_count', 0);
  END IF;

  -- Sipariş detayındaki kalemleri döngüyle atomik olarak stoğa ekle
  FOR v_item IN
    SELECT urun_id, miktar
    FROM siparis_detay
    WHERE siparis_id = p_siparis_id
  LOOP
    IF v_item.urun_id IS NOT NULL AND v_item.miktar > 0 THEN
      UPDATE urunler
      SET stok_miktari = COALESCE(stok_miktari, 0) + v_item.miktar
      WHERE id = v_item.urun_id;

      v_restored_count := v_restored_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'restored_count', v_restored_count,
    'message', 'Stoklar basariyla iade edildi'
  );
END;
$$;

-- 2. Atomik Stok Düşüm Fonksiyonu (Yarış Durumlarına Karşı Koruma)
CREATE OR REPLACE FUNCTION deduct_single_product_stock(
  p_urun_id UUID,
  p_miktar INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock INT;
  v_new_stock INT;
BEGIN
  -- Satır kilidi ile stok çek (FOR UPDATE)
  SELECT stok_miktari INTO v_current_stock
  FROM urunler
  WHERE id = p_urun_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Urun bulunamadi');
  END IF;

  IF COALESCE(v_current_stock, 0) < p_miktar THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Yetersiz stok',
      'current_stock', COALESCE(v_current_stock, 0),
      'requested', p_miktar
    );
  END IF;

  v_new_stock := v_current_stock - p_miktar;

  UPDATE urunler
  SET stok_miktari = v_new_stock
  WHERE id = p_urun_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_stock', v_new_stock
  );
END;
$$;
