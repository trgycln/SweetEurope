DROP TYPE IF EXISTS public.satis_detay_input CASCADE;
CREATE TYPE public.satis_detay_input AS (
    urun_id uuid,
    adet integer,
    birim_fiyat_net numeric
);

CREATE OR REPLACE FUNCTION public.alt_bayi_satis_olustur_ve_stok_dus(
    p_bayi_firma_id uuid,
    p_musteri_id uuid,
    p_satis_detaylari public.satis_detay_input[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sahip_id uuid := auth.uid();
    v_satis_id uuid;
    v_toplam_tutar numeric := 0;
    detay public.satis_detay_input;
    v_stok_kaydi record;
BEGIN
    -- 1. Toplam tutarı hesapla
    FOREACH detay IN ARRAY p_satis_detaylari
    LOOP
        v_toplam_tutar := v_toplam_tutar + (detay.adet * detay.birim_fiyat_net);
    END LOOP;

    -- 2. Ana satış kaydını (alt_bayi_satislar) oluştur
    INSERT INTO public.alt_bayi_satislar (bayi_firma_id, musteri_id, toplam_net, aciklama)
    VALUES (p_bayi_firma_id, p_musteri_id, v_toplam_tutar, 'Alt Bayi Portal Satışı')
    RETURNING id INTO v_satis_id;

    -- 3. Satış detaylarını (alt_bayi_satis_detay) ve stok güncellemesini döngü içinde yap
    FOREACH detay IN ARRAY p_satis_detaylari
    LOOP
        -- Satış detayını ekle
        INSERT INTO public.alt_bayi_satis_detay (satis_id, urun_id, adet, birim_fiyat_net)
        VALUES (v_satis_id, detay.urun_id, detay.adet, detay.birim_fiyat_net);

        -- Stok kontrolü ve güncelleme
        SELECT * INTO v_stok_kaydi
        FROM public.alt_bayi_stoklari
        WHERE sahip_id = v_sahip_id AND urun_id = detay.urun_id
        FOR UPDATE; -- Satırı kilitle

        IF v_stok_kaydi IS NULL OR v_stok_kaydi.miktar < detay.adet THEN
            RAISE EXCEPTION 'Yetersiz stok: Ürün ID % için yeterli stok bulunmuyor.', detay.urun_id;
        END IF;

        UPDATE public.alt_bayi_stoklari
        SET miktar = miktar - detay.adet
        WHERE id = v_stok_kaydi.id;
    END LOOP;

    -- 4. Oluşturulan satışın ID'sini döndür
    RETURN v_satis_id;
END;
$$;
