-- 4) Sipariş oluşturma sonrası otomatik bildirim trigger fonksiyonu - Bypass eklendi
CREATE OR REPLACE FUNCTION public.notify_admins_on_portal_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_firma_unvan TEXT;
    v_siparis_no TEXT;
    v_link TEXT;
    v_user_record RECORD;
    v_mesaj TEXT;
BEGIN
    -- Test siparişi ise bildirim gönderme
    IF NEW.is_test = true THEN
        RETURN NEW;
    END IF;

    -- Firma adını al
    SELECT unvan INTO v_firma_unvan
    FROM public.firmalar
    WHERE id = NEW.firma_id;

    v_siparis_no := substring(NEW.id::text from 1 for 8);
    v_link := format('/admin/crm/firmalar/%s/siparisler/%s', NEW.firma_id, NEW.id);
    v_mesaj := format('%s firmasından yeni bir sipariş geldi (No: %s).', v_firma_unvan, v_siparis_no);

    -- Admin rolündeki tüm kullanıcıları bul ve bildirim oluştur
    FOR v_user_record IN 
        SELECT id FROM public.profiller WHERE rol = 'Yönetici'
    LOOP
        INSERT INTO public.bildirimler (kullanici_id, baslik, icerik, link, tip, okundu_mu)
        VALUES (
            v_user_record.id,
            'Yeni Sipariş Alındı',
            v_mesaj,
            v_link,
            'siparis',
            false
        );
    END LOOP;

    RETURN NEW;
END;
$$;

-- 5) Sipariş durum değişikliği bildirim trigger fonksiyonu - Bypass eklendi
CREATE OR REPLACE FUNCTION public.notify_customer_on_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_siparis_no TEXT;
    v_link TEXT;
    v_user_record RECORD;
    v_mesaj TEXT;
    v_translated_status TEXT;
BEGIN
    -- Test siparişi ise bildirim gönderme
    IF NEW.is_test = true THEN
        RETURN NEW;
    END IF;

    -- Sadece durum değişikliğinde
    IF NEW.siparis_durumu IS DISTINCT FROM OLD.siparis_durumu THEN
        v_siparis_no := substring(NEW.id::text from 1 for 8);
        v_link := format('/portal/siparisler/%s', NEW.id);

        -- Durumu Türkçeye/Almancaya göre dinamik yapmıyoruz şimdilik, 
        -- DB seviyesinde basit bir mapping veya olduğu gibi durum adını basıyoruz
        v_translated_status := NEW.siparis_durumu;

        v_mesaj := format('%s numaralı siparişinizin durumu güncellendi: %s', v_siparis_no, v_translated_status);

        -- Siparişi oluşturan kullanıcıya bildirim at
        IF NEW.olusturan_kullanici_id IS NOT NULL THEN
            INSERT INTO public.bildirimler (kullanici_id, baslik, icerik, link, tip, okundu_mu)
            VALUES (
                NEW.olusturan_kullanici_id,
                'Sipariş Durumu Güncellendi',
                v_mesaj,
                v_link,
                'siparis',
                false
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;
