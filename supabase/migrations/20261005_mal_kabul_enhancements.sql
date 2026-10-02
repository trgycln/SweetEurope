-- 20261005_mal_kabul_enhancements.sql
-- Mal Kabul ve İthalat Takip İyileştirmeleri (Lot, SKT, Hasar Fire ve Resmi Evraklar)

-- 1. ithalat_partileri tablosuna resmi evrak takip alanları ekle
ALTER TABLE public.ithalat_partileri
ADD COLUMN IF NOT EXISTS fatura_no text,
ADD COLUMN IF NOT EXISTS cmr_no text,
ADD COLUMN IF NOT EXISTS gumruk_beyanname_no text,
ADD COLUMN IF NOT EXISTS lieferschein_no text;

-- 2. ithalat_parti_kalemleri tablosuna Lot, SKT ve Hasar takip alanları ekle
ALTER TABLE public.ithalat_parti_kalemleri
ADD COLUMN IF NOT EXISTS lot_no text,
ADD COLUMN IF NOT EXISTS skt_tarihi date,
ADD COLUMN IF NOT EXISTS hasarli_adet integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS kabul_edilen_adet integer;

-- 3. complete_import_batch fonksiyonunu güncelle
CREATE OR REPLACE FUNCTION public.complete_import_batch(p_batch_id UUID, p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_status text;
    v_item RECORD;
    v_onceki_stok numeric;
    v_standart_maliyet numeric;
    v_kabul_edilen integer;
    v_hasarli integer;
    v_sapma numeric;
BEGIN
    -- 1. Partiyi kilitle ve durum kontrolü yap
    SELECT durum INTO v_status 
    FROM public.ithalat_partileri 
    WHERE id = p_batch_id 
    FOR UPDATE;

    IF v_status = 'Tamamlandı' THEN
        RAISE EXCEPTION 'Bu ithalat partisi zaten tamamlanmış.';
    END IF;

    -- 2. Parti durumunu güncelle
    UPDATE public.ithalat_partileri
    SET durum = 'Tamamlandı'
    WHERE id = p_batch_id;

    -- 3. Kalemleri döngüyle işle
    FOR v_item IN (SELECT * FROM public.ithalat_parti_kalemleri WHERE parti_id = p_batch_id) LOOP
        
        -- Önceki stok ve standart maliyet
        SELECT COALESCE(stok_miktari, 0), COALESCE(standart_inis_maliyeti_net, 0)
        INTO v_onceki_stok, v_standart_maliyet
        FROM public.urunler 
        WHERE id = v_item.urun_id;

        -- Hasarlı ve kabul edilen net adet hesabı (Varsayılan: firesiz tam miktar)
        v_hasarli := COALESCE(v_item.hasarli_adet, 0);
        v_kabul_edilen := COALESCE(v_item.kabul_edilen_adet, GREATEST(0, v_item.miktar_adet - v_hasarli));

        -- Maliyet sapma yüzdesi hesabı (Sadece analiz/kokpit için)
        IF v_standart_maliyet > 0 AND v_item.gercek_inis_maliyeti_net IS NOT NULL THEN
            v_sapma := ROUND(((v_item.gercek_inis_maliyeti_net - v_standart_maliyet) / v_standart_maliyet) * 100, 2);
        ELSE
            v_sapma := COALESCE(v_item.maliyet_sapma_yuzde, 0);
        END IF;

        -- Ürün kartını güncelle: Stok + Gerçek İniş Maliyeti + Sapma Alarmı (FİYATLAR DEĞİŞTİRİLMEZ)
        UPDATE public.urunler
        SET 
            stok_miktari = v_onceki_stok + v_kabul_edilen,
            son_gercek_inis_maliyeti_net = v_item.gercek_inis_maliyeti_net,
            son_maliyet_sapma_yuzde = v_sapma,
            karlilik_alarm_aktif = (ABS(v_sapma) >= 5)
        WHERE id = v_item.urun_id;

        -- Stok hareket logunu Lot, SKT ve Hasar bilgileriyle oluştur
        INSERT INTO public.urun_stok_hareket_loglari (
            urun_id,
            hareket_tipi,
            miktar,
            kaynak,
            referans_kayit_id,
            yapan_user_id,
            onceki_stok,
            sonraki_stok,
            aciklama,
            extra
        ) VALUES (
            v_item.urun_id,
            'stok_artisi',
            v_kabul_edilen,
            'ithalat_partisi',
            p_batch_id::text,
            p_user_id,
            v_onceki_stok,
            v_onceki_stok + v_kabul_edilen,
            CASE 
                WHEN v_hasarli > 0 THEN 
                    format('İthalat partisi mal kabulü (%s adet sağlam, %s adet hasarlı)', v_kabul_edilen, v_hasarli)
                ELSE 
                    'İthalat partisi mal kabulü (Tam teslimat)'
            END,
            jsonb_build_object(
                'parti_id', p_batch_id,
                'lot_no', v_item.lot_no,
                'skt_tarihi', v_item.skt_tarihi,
                'beklenen_adet', v_item.miktar_adet,
                'kabul_edilen_adet', v_kabul_edilen,
                'hasarli_adet', v_hasarli,
                'gercek_inis_maliyeti_net', v_item.gercek_inis_maliyeti_net,
                'maliyet_sapma_yuzde', v_sapma
            )
        );

    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
