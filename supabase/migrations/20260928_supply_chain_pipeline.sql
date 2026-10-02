-- ============================================================
-- Supply Chain Pipeline Migration
-- Tüm tablo/sütun isimleri Supabase DB şemasıyla doğrulanmıştır.
-- ============================================================

-- Adım 1: Veritabanı Şema ve Ayar Güncellemeleri

ALTER TABLE public.ithalat_partileri
ADD COLUMN IF NOT EXISTS indirim_1_yuzde numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS indirim_2_yuzde numeric DEFAULT 0;

ALTER TABLE public.ithalat_parti_kalemleri
ADD COLUMN IF NOT EXISTS indirimli_alis_fiyati numeric DEFAULT 0;

ALTER TABLE public.ithalat_parti_kalemleri
ADD COLUMN IF NOT EXISTS koli_sayisi integer DEFAULT 1;

INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, category)
VALUES ('pricing_lucid_per_kg_eur', '0.02', 'number', 'LUCID Ambalaj Sicili KG basi tahmini maliyet', 'pricing')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================
-- Adım 2: Atomik Mal Kabul Fonksiyonu (Supabase RPC)
--
-- Kullanılan tablolar/sütunlar (DB şemasıyla doğrulandı):
--   ithalat_partileri        : id, durum
--   ithalat_parti_kalemleri  : parti_id, urun_id, miktar_adet, gercek_inis_maliyeti_net
--   urunler                  : id, stok_miktari, son_gercek_inis_maliyeti_net
--   urun_stok_hareket_loglari: urun_id, hareket_tipi, miktar, kaynak,
--                              referans_kayit_id, yapan_user_id,
--                              onceki_stok, sonraki_stok, aciklama
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_import_batch(p_batch_id UUID, p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_status text;
    v_item RECORD;
    v_onceki_stok numeric;
BEGIN
    SELECT durum INTO v_status FROM public.ithalat_partileri WHERE id = p_batch_id FOR UPDATE;

    IF v_status = 'Tamamlandi' THEN
        RAISE EXCEPTION 'Bu ithalat partisi zaten tamamlanmis.';
    END IF;

    UPDATE public.ithalat_partileri
    SET durum = 'Tamamlandi'
    WHERE id = p_batch_id;

    FOR v_item IN (SELECT * FROM public.ithalat_parti_kalemleri WHERE parti_id = p_batch_id) LOOP

        SELECT COALESCE(stok_miktari, 0) INTO v_onceki_stok
        FROM public.urunler WHERE id = v_item.urun_id;

        UPDATE public.urunler
        SET stok_miktari = v_onceki_stok + v_item.miktar_adet,
            son_gercek_inis_maliyeti_net = v_item.gercek_inis_maliyeti_net
        WHERE id = v_item.urun_id;

        INSERT INTO public.urun_stok_hareket_loglari (
            urun_id,
            hareket_tipi,
            miktar,
            kaynak,
            referans_kayit_id,
            yapan_user_id,
            onceki_stok,
            sonraki_stok,
            aciklama
        ) VALUES (
            v_item.urun_id,
            'stok_artisi',
            v_item.miktar_adet,
            'ithalat_partisi',
            p_batch_id::text,
            p_user_id,
            v_onceki_stok,
            v_onceki_stok + v_item.miktar_adet,
            'Ithalat partisi mal kabulu'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
