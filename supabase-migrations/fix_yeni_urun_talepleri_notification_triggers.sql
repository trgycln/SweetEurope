-- Fix outdated notification trigger functions for public.yeni_urun_talepleri
-- The table uses `produkt_name` and `status`, not `urun_adi` and `durum`.

CREATE OR REPLACE FUNCTION public.notify_admins_on_product_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_firma_unvan TEXT;
    v_link TEXT;
    v_user_record RECORD;
    v_mesaj TEXT;
BEGIN
    SELECT unvan INTO v_firma_unvan
    FROM public.firmalar
    WHERE id = NEW.firma_id;

    v_link := format('/admin/pazarlama/yeni-urun-talepleri/%s', NEW.id);

    FOR v_user_record IN
        SELECT id, COALESCE(tercih_edilen_dil, 'de') as dil
        FROM public.profiller
        WHERE rol IN ('Yönetici', 'Personel', 'Ekip Üyesi')
    LOOP
        v_mesaj := get_notification_message(
            'NEW_PRODUCT_REQUEST',
            v_user_record.dil,
            COALESCE(v_firma_unvan, 'Bir müşteri'),
            COALESCE(NEW.produkt_name, 'Ürün adı belirtilmedi')
        );

        INSERT INTO public.bildirimler (alici_id, icerik, link, okundu_mu)
        VALUES (v_user_record.id, v_mesaj, v_link, false);
    END LOOP;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_customer_on_product_request_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_link TEXT;
    v_user_record RECORD;
    v_mesaj TEXT;
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        v_link := '/portal/taleplerim';

        FOR v_user_record IN
            SELECT id, COALESCE(tercih_edilen_dil, 'de') as dil
            FROM public.profiller
            WHERE firma_id = NEW.firma_id
              AND rol IN ('Müşteri', 'Alt Bayi')
        LOOP
            v_mesaj := get_notification_message(
                'PRODUCT_REQUEST_STATUS_CHANGED',
                v_user_record.dil,
                COALESCE(NEW.produkt_name, 'Ürün'),
                COALESCE(NEW.status::text, 'güncellendi')
            );

            INSERT INTO public.bildirimler (alici_id, icerik, link, okundu_mu)
            VALUES (v_user_record.id, v_mesaj, v_link, false);
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;