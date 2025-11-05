-- =====================================================
-- GÜVENLI BİLDİRİM FONKSİYONU
-- RLS'ten bağımsız bildirim oluşturma ve gönderme
-- =====================================================

-- 1) Tek kullanıcıya bildirim gönderme fonksiyonu
CREATE OR REPLACE FUNCTION public.send_notification_to_user(
    p_alici_id UUID,
    p_icerik TEXT,
    p_link TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- RLS bypass eder
SET search_path = public
AS $$
DECLARE
    v_bildirim_id UUID;
    v_user_language TEXT;
BEGIN
    -- Alıcı ID ve içerik kontrolü
    IF p_alici_id IS NULL OR p_icerik IS NULL OR p_icerik = '' THEN
        RAISE EXCEPTION 'Alıcı ID ve içerik gereklidir';
    END IF;

    -- Kullanıcının dil tercihini al
    SELECT COALESCE(tercih_edilen_dil, 'de') INTO v_user_language
    FROM public.profiller
    WHERE id = p_alici_id;

    -- Eğer kullanıcı bulunamazsa varsayılan dil
    IF v_user_language IS NULL THEN
        v_user_language := 'de';
    END IF;

    -- Bildirim ekle (dil bilgisiyle birlikte)
    INSERT INTO public.bildirimler (alici_id, icerik, link, okundu_mu)
    VALUES (p_alici_id, p_icerik, p_link, false)
    RETURNING id INTO v_bildirim_id;

    RETURN v_bildirim_id;
END;
$$;

-- 2) Rol bazlı bildirim gönderme fonksiyonu
-- Her kullanıcının dil tercihi ile mesaj oluşturma yapılacak, bu yüzden artık p_icerik yerine message key kullanacağız
CREATE OR REPLACE FUNCTION public.send_notification_to_role(
    p_roller TEXT[], -- Örn: ARRAY['Yönetici', 'Ekip Üyesi']
    p_icerik TEXT,
    p_link TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INT := 0;
    v_user_record RECORD;
BEGIN
    -- Roller ve içerik kontrolü
    IF p_roller IS NULL OR array_length(p_roller, 1) = 0 OR p_icerik IS NULL OR p_icerik = '' THEN
        RAISE EXCEPTION 'Roller ve içerik gereklidir';
    END IF;

    -- Belirtilen rollerdeki tüm kullanıcılara bildirim ekle
    FOR v_user_record IN 
        SELECT DISTINCT id 
        FROM public.profiller 
        WHERE rol = ANY(p_roller)
    LOOP
        INSERT INTO public.bildirimler (alici_id, icerik, link, okundu_mu)
        VALUES (v_user_record.id, p_icerik, p_link, false);
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count; -- Kaç kullanıcıya gönderildiğini döndür
END;
$$;

-- 3) Firma bazlı bildirim gönderme fonksiyonu (Portal kullanıcıları)
CREATE OR REPLACE FUNCTION public.send_notification_to_firma(
    p_firma_id UUID,
    p_icerik TEXT,
    p_link TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INT := 0;
    v_user_record RECORD;
BEGIN
    -- Firma ID ve içerik kontrolü
    IF p_firma_id IS NULL OR p_icerik IS NULL OR p_icerik = '' THEN
        RAISE EXCEPTION 'Firma ID ve içerik gereklidir';
    END IF;

    -- Firmadaki tüm portal kullanıcılarına bildirim ekle
    FOR v_user_record IN 
        SELECT DISTINCT id 
        FROM public.profiller 
        WHERE firma_id = p_firma_id 
        AND rol IN ('Müşteri', 'Alt Bayi')
    LOOP
        INSERT INTO public.bildirimler (alici_id, icerik, link, okundu_mu)
        VALUES (v_user_record.id, p_icerik, p_link, false);
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- =====================================================
-- ÇOK DİLLİ MESAJ OLUŞTURMA FONKSİYONU
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_notification_message(
    p_message_key TEXT,
    p_language TEXT,
    p_param1 TEXT DEFAULT NULL,
    p_param2 TEXT DEFAULT NULL,
    p_param3 TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- NEW_ORDER: Yeni sipariş bildirimi
    IF p_message_key = 'NEW_ORDER' THEN
        CASE p_language
            WHEN 'tr' THEN RETURN format('%s yeni bir sipariş oluşturdu (#%s)', p_param1, p_param2);
            WHEN 'en' THEN RETURN format('%s created a new order (#%s)', p_param1, p_param2);
            WHEN 'ar' THEN RETURN format('أنشأ %s طلباً جديداً (#%s)', p_param1, p_param2);
            ELSE RETURN format('%s hat eine neue Bestellung erstellt (#%s)', p_param1, p_param2);
        END CASE;
    
    -- ORDER_STATUS_CHANGED: Sipariş durum değişikliği
    ELSIF p_message_key = 'ORDER_STATUS_CHANGED' THEN
        CASE p_language
            WHEN 'tr' THEN RETURN format('Sipariş #%s durumunuz "%s" olarak güncellendi.', p_param1, p_param2);
            WHEN 'en' THEN RETURN format('Your order #%s status has been updated to "%s".', p_param1, p_param2);
            WHEN 'ar' THEN RETURN format('تم تحديث حالة طلبك #%s إلى "%s".', p_param1, p_param2);
            ELSE RETURN format('Ihr Bestellstatus #%s wurde auf "%s" aktualisiert.', p_param1, p_param2);
        END CASE;
    
    -- NEW_SAMPLE_REQUEST: Yeni numune talebi
    ELSIF p_message_key = 'NEW_SAMPLE_REQUEST' THEN
        CASE p_language
            WHEN 'tr' THEN RETURN format('%s, "%s" ürünü için yeni bir numune talebinde bulundu.', p_param1, p_param2);
            WHEN 'en' THEN RETURN format('%s requested a new sample for product "%s".', p_param1, p_param2);
            WHEN 'ar' THEN RETURN format('طلب %s عينة جديدة للمنتج "%s".', p_param1, p_param2);
            ELSE RETURN format('%s hat eine neue Musteranfrage für das Produkt "%s" gestellt.', p_param1, p_param2);
        END CASE;
    
    -- SAMPLE_STATUS_CHANGED: Numune talebi durum değişikliği
    ELSIF p_message_key = 'SAMPLE_STATUS_CHANGED' THEN
        CASE p_language
            WHEN 'tr' THEN RETURN format('"%s" ürünü için numune talebinizin durumu "%s" olarak güncellendi.', p_param1, p_param2);
            WHEN 'en' THEN RETURN format('Your sample request for "%s" has been updated to "%s".', p_param1, p_param2);
            WHEN 'ar' THEN RETURN format('تم تحديث حالة طلب العينة الخاص بك لـ "%s" إلى "%s".', p_param1, p_param2);
            ELSE RETURN format('Ihre Musteranfrage für "%s" wurde auf "%s" aktualisiert.', p_param1, p_param2);
        END CASE;
    
    -- NEW_PRODUCT_REQUEST: Yeni ürün talebi
    ELSIF p_message_key = 'NEW_PRODUCT_REQUEST' THEN
        CASE p_language
            WHEN 'tr' THEN RETURN format('%s yeni bir ürün talebi oluşturdu: "%s"', p_param1, p_param2);
            WHEN 'en' THEN RETURN format('%s created a new product request: "%s"', p_param1, p_param2);
            WHEN 'ar' THEN RETURN format('أنشأ %s طلب منتج جديد: "%s"', p_param1, p_param2);
            ELSE RETURN format('%s hat eine neue Produktanfrage erstellt: "%s"', p_param1, p_param2);
        END CASE;
    
    -- PRODUCT_REQUEST_STATUS_CHANGED: Yeni ürün talebi durum değişikliği
    ELSIF p_message_key = 'PRODUCT_REQUEST_STATUS_CHANGED' THEN
        CASE p_language
            WHEN 'tr' THEN RETURN format('"%s" ürün talebinizin durumu "%s" olarak güncellendi.', p_param1, p_param2);
            WHEN 'en' THEN RETURN format('Your product request for "%s" has been updated to "%s".', p_param1, p_param2);
            WHEN 'ar' THEN RETURN format('تم تحديث حالة طلب المنتج الخاص بك لـ "%s" إلى "%s".', p_param1, p_param2);
            ELSE RETURN format('Ihre Produktanfrage für "%s" wurde auf "%s" aktualisiert.', p_param1, p_param2);
        END CASE;
    
    ELSE
        RETURN 'Unknown message key';
    END IF;
END;
$$;

-- Sipariş durumu çeviri fonksiyonu
CREATE OR REPLACE FUNCTION public.translate_order_status(
    p_status TEXT,
    p_language TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    CASE p_status
        WHEN 'Beklemede' THEN
            CASE p_language
                WHEN 'tr' THEN RETURN 'Beklemede';
                WHEN 'en' THEN RETURN 'Pending';
                WHEN 'ar' THEN RETURN 'قيد الانتظار';
                ELSE RETURN 'Ausstehend';
            END CASE;
        WHEN 'Onaylandı' THEN
            CASE p_language
                WHEN 'tr' THEN RETURN 'Onaylandı';
                WHEN 'en' THEN RETURN 'Confirmed';
                WHEN 'ar' THEN RETURN 'مؤكد';
                ELSE RETURN 'Bestätigt';
            END CASE;
        WHEN 'Hazırlanıyor' THEN
            CASE p_language
                WHEN 'tr' THEN RETURN 'Hazırlanıyor';
                WHEN 'en' THEN RETURN 'Preparing';
                WHEN 'ar' THEN RETURN 'قيد التحضير';
                ELSE RETURN 'In Vorbereitung';
            END CASE;
        WHEN 'Yola Çıktı' THEN
            CASE p_language
                WHEN 'tr' THEN RETURN 'Yola Çıktı';
                WHEN 'en' THEN RETURN 'Shipped';
                WHEN 'ar' THEN RETURN 'تم الشحن';
                ELSE RETURN 'Versandt';
            END CASE;
        WHEN 'Teslim Edildi' THEN
            CASE p_language
                WHEN 'tr' THEN RETURN 'Teslim Edildi';
                WHEN 'en' THEN RETURN 'Delivered';
                WHEN 'ar' THEN RETURN 'تم التسليم';
                ELSE RETURN 'Geliefert';
            END CASE;
        WHEN 'İptal Edildi' THEN
            CASE p_language
                WHEN 'tr' THEN RETURN 'İptal Edildi';
                WHEN 'en' THEN RETURN 'Cancelled';
                WHEN 'ar' THEN RETURN 'تم الإلغاء';
                ELSE RETURN 'Storniert';
            END CASE;
        ELSE RETURN p_status;
    END CASE;
END;
$$;

-- 4) Sipariş oluşturma sonrası otomatik bildirim trigger fonksiyonu
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
    -- Firma adını al
    SELECT unvan INTO v_firma_unvan
    FROM public.firmalar
    WHERE id = NEW.firma_id;

    -- Sipariş numarasını kısalt
    v_siparis_no := substring(NEW.id::text from 1 for 8);
    
    -- Link oluştur
    v_link := format('/admin/operasyon/siparisler/%s', NEW.id);

    -- Her yöneticiye kendi dilinde bildirim gönder
    FOR v_user_record IN 
        SELECT id, COALESCE(tercih_edilen_dil, 'de') as dil
        FROM public.profiller 
        WHERE rol IN ('Yönetici', 'Ekip Üyesi')
    LOOP
        v_mesaj := get_notification_message(
            'NEW_ORDER',
            v_user_record.dil,
            COALESCE(v_firma_unvan, 'Bir müşteri'),
            v_siparis_no
        );
        
        INSERT INTO public.bildirimler (alici_id, icerik, link, okundu_mu)
        VALUES (v_user_record.id, v_mesaj, v_link, false);
    END LOOP;

    RETURN NEW;
END;
$$;

-- Trigger oluştur (eğer yoksa)
DROP TRIGGER IF EXISTS trigger_notify_admins_on_portal_order ON public.siparisler;
CREATE TRIGGER trigger_notify_admins_on_portal_order
    AFTER INSERT ON public.siparisler
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admins_on_portal_order();

-- 5) Sipariş durum değişikliği bildirim trigger fonksiyonu
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
    -- Sadece durum değişikliğinde
    IF NEW.siparis_durumu IS DISTINCT FROM OLD.siparis_durumu THEN
        v_siparis_no := substring(NEW.id::text from 1 for 8);
        v_link := format('/portal/siparisler/%s', NEW.id);

        -- Firmadaki her kullanıcıya kendi dilinde bildirim gönder
        FOR v_user_record IN 
            SELECT id, COALESCE(tercih_edilen_dil, 'de') as dil
            FROM public.profiller 
            WHERE firma_id = NEW.firma_id 
            AND rol IN ('Müşteri', 'Alt Bayi')
        LOOP
            -- Durumu kullanıcının diline çevir
            v_translated_status := translate_order_status(NEW.siparis_durumu, v_user_record.dil);
            
            v_mesaj := get_notification_message(
                'ORDER_STATUS_CHANGED',
                v_user_record.dil,
                v_siparis_no,
                v_translated_status
            );
            
            INSERT INTO public.bildirimler (alici_id, icerik, link, okundu_mu)
            VALUES (v_user_record.id, v_mesaj, v_link, false);
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger oluştur (eğer yoksa)
DROP TRIGGER IF EXISTS trigger_notify_customer_on_order_status_change ON public.siparisler;
CREATE TRIGGER trigger_notify_customer_on_order_status_change
    AFTER UPDATE ON public.siparisler
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_customer_on_order_status_change();

-- 6) Numune talebi oluşturma bildirim trigger
CREATE OR REPLACE FUNCTION public.notify_admins_on_sample_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_firma_unvan TEXT;
    v_urun_adi TEXT;
    v_link TEXT;
    v_user_record RECORD;
    v_mesaj TEXT;
BEGIN
    -- Firma ve ürün bilgilerini al
    SELECT f.unvan INTO v_firma_unvan
    FROM public.firmalar f
    WHERE f.id = NEW.firma_id;

    SELECT u.ad->>'de' INTO v_urun_adi
    FROM public.urunler u
    WHERE u.id = NEW.urun_id;

    v_link := format('/admin/operasyon/numune-talepleri?q=%s', NEW.id);

    -- Her yöneticiye kendi dilinde bildirim gönder
    FOR v_user_record IN 
        SELECT id, COALESCE(tercih_edilen_dil, 'de') as dil
        FROM public.profiller 
        WHERE rol IN ('Yönetici', 'Ekip Üyesi')
    LOOP
        v_mesaj := get_notification_message(
            'NEW_SAMPLE_REQUEST',
            v_user_record.dil,
            COALESCE(v_firma_unvan, 'Bir müşteri'),
            COALESCE(v_urun_adi, 'Ürün')
        );
        
        INSERT INTO public.bildirimler (alici_id, icerik, link, okundu_mu)
        VALUES (v_user_record.id, v_mesaj, v_link, false);
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_admins_on_sample_request ON public.numune_talepleri;
CREATE TRIGGER trigger_notify_admins_on_sample_request
    AFTER INSERT ON public.numune_talepleri
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admins_on_sample_request();

-- 7) Numune talebi durum değişikliği bildirim trigger
CREATE OR REPLACE FUNCTION public.notify_customer_on_sample_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_urun_adi TEXT;
    v_link TEXT;
    v_user_record RECORD;
    v_mesaj TEXT;
BEGIN
    -- Sadece durum değişikliğinde
    IF NEW.durum IS DISTINCT FROM OLD.durum THEN
        SELECT u.ad->>'de' INTO v_urun_adi
        FROM public.urunler u
        WHERE u.id = NEW.urun_id;

        v_link := '/portal/taleplerim';

        -- Firmadaki her kullanıcıya kendi dilinde bildirim gönder
        FOR v_user_record IN 
            SELECT id, COALESCE(tercih_edilen_dil, 'de') as dil
            FROM public.profiller 
            WHERE firma_id = NEW.firma_id 
            AND rol IN ('Müşteri', 'Alt Bayi')
        LOOP
            v_mesaj := get_notification_message(
                'SAMPLE_STATUS_CHANGED',
                v_user_record.dil,
                COALESCE(v_urun_adi, 'Ürün'),
                NEW.durum
            );
            
            INSERT INTO public.bildirimler (alici_id, icerik, link, okundu_mu)
            VALUES (v_user_record.id, v_mesaj, v_link, false);
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_customer_on_sample_status_change ON public.numune_talepleri;
CREATE TRIGGER trigger_notify_customer_on_sample_status_change
    AFTER UPDATE ON public.numune_talepleri
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_customer_on_sample_status_change();

-- 8) Yeni ürün talebi oluşturma bildirim trigger
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

    -- Her yöneticiye kendi dilinde bildirim gönder
    FOR v_user_record IN 
        SELECT id, COALESCE(tercih_edilen_dil, 'de') as dil
        FROM public.profiller 
        WHERE rol IN ('Yönetici', 'Ekip Üyesi')
    LOOP
        v_mesaj := get_notification_message(
            'NEW_PRODUCT_REQUEST',
            v_user_record.dil,
            COALESCE(v_firma_unvan, 'Bir müşteri'),
            COALESCE(NEW.urun_adi, 'Ürün adı belirtilmedi')
        );
        
        INSERT INTO public.bildirimler (alici_id, icerik, link, okundu_mu)
        VALUES (v_user_record.id, v_mesaj, v_link, false);
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_admins_on_product_request ON public.yeni_urun_talepleri;
CREATE TRIGGER trigger_notify_admins_on_product_request
    AFTER INSERT ON public.yeni_urun_talepleri
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admins_on_product_request();

-- 9) Yeni ürün talebi durum değişikliği bildirim trigger
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
    IF NEW.durum IS DISTINCT FROM OLD.durum THEN
        v_link := '/portal/taleplerim';

        -- Firmadaki her kullanıcıya kendi dilinde bildirim gönder
        FOR v_user_record IN 
            SELECT id, COALESCE(tercih_edilen_dil, 'de') as dil
            FROM public.profiller 
            WHERE firma_id = NEW.firma_id 
            AND rol IN ('Müşteri', 'Alt Bayi')
        LOOP
            v_mesaj := get_notification_message(
                'PRODUCT_REQUEST_STATUS_CHANGED',
                v_user_record.dil,
                COALESCE(NEW.urun_adi, 'Ürün'),
                NEW.durum
            );
            
            INSERT INTO public.bildirimler (alici_id, icerik, link, okundu_mu)
            VALUES (v_user_record.id, v_mesaj, v_link, false);
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_customer_on_product_request_status_change ON public.yeni_urun_talepleri;
CREATE TRIGGER trigger_notify_customer_on_product_request_status_change
    AFTER UPDATE ON public.yeni_urun_talepleri
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_customer_on_product_request_status_change();

-- =====================================================
-- YORUM: Trigger'lar otomatik çalışacak
-- Server action'lardan da manuel çağrılabilir:
-- SELECT send_notification_to_user(...)
-- SELECT send_notification_to_role(...)
-- SELECT send_notification_to_firma(...)
-- =====================================================

COMMENT ON FUNCTION public.send_notification_to_user IS 
'RLS bypass ile tek kullanıcıya bildirim gönderir. Bildirim ID döndürür.';

COMMENT ON FUNCTION public.send_notification_to_role IS 
'RLS bypass ile belirtilen rollerdeki tüm kullanıcılara bildirim gönderir. Alıcı sayısını döndürür.';

COMMENT ON FUNCTION public.send_notification_to_firma IS 
'RLS bypass ile firmadaki tüm portal kullanıcılarına bildirim gönderir. Alıcı sayısını döndürür.';

-- Tüm fonksiyonlar ve trigger'lar başarıyla oluşturuldu
