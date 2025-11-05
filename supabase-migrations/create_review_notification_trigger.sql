-- =====================================================
-- YENİ ÜRÜN DEĞERLENDİRMESİ BİLDİRİM TRİGGERI
-- Müşteri değerlendirme gönderdiğinde yöneticilere bildirim
-- =====================================================

CREATE OR REPLACE FUNCTION public.notify_admins_on_new_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_urun_adi TEXT;
    v_kullanici_adi TEXT;
    v_admin_record RECORD;
    v_mesaj TEXT;
BEGIN
    -- Ürün adını al (Almanca)
    SELECT ad->>'de' INTO v_urun_adi
    FROM public.urunler
    WHERE id = NEW.urun_id;

    -- Kullanıcı adını al
    SELECT tam_ad INTO v_kullanici_adi
    FROM public.profiller
    WHERE id = NEW.kullanici_id;

    -- Varsayılan değerler
    v_urun_adi := COALESCE(v_urun_adi, 'Ürün');
    v_kullanici_adi := COALESCE(v_kullanici_adi, 'Müşteri');

    -- Tüm yöneticilere bildirim gönder
    FOR v_admin_record IN 
        SELECT id, COALESCE(tercih_edilen_dil, 'de') as dil
        FROM public.profiller 
        WHERE rol IN ('Yönetici', 'Ekip Üyesi')
    LOOP
        -- Dile göre mesaj oluştur
        CASE v_admin_record.dil
            WHEN 'de' THEN
                v_mesaj := v_kullanici_adi || ' hat eine neue Bewertung für "' || v_urun_adi || '" abgegeben (' || NEW.puan || ' Sterne)';
            WHEN 'en' THEN
                v_mesaj := v_kullanici_adi || ' submitted a new review for "' || v_urun_adi || '" (' || NEW.puan || ' stars)';
            WHEN 'tr' THEN
                v_mesaj := v_kullanici_adi || ' "' || v_urun_adi || '" için yeni değerlendirme gönderdi (' || NEW.puan || ' yıldız)';
            ELSE
                v_mesaj := v_kullanici_adi || ' hat eine neue Bewertung für "' || v_urun_adi || '" abgegeben (' || NEW.puan || ' Sterne)';
        END CASE;

        -- Bildirim ekle
        INSERT INTO public.bildirimler (
            alici_id,
            icerik,
            link,
            okundu_mu
        ) VALUES (
            v_admin_record.id,
            v_mesaj,
            '/admin/urun-yonetimi/degerlendirmeler',
            false
        );
    END LOOP;

    RETURN NEW;
END;
$$;

-- Trigger'ı oluştur (sadece yeni değerlendirmelerde)
DROP TRIGGER IF EXISTS trigger_notify_admins_on_new_review ON public.urun_degerlendirmeleri;
CREATE TRIGGER trigger_notify_admins_on_new_review
    AFTER INSERT ON public.urun_degerlendirmeleri
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_admins_on_new_review();

-- =====================================================
-- YORUMLAR
-- =====================================================

COMMENT ON FUNCTION public.notify_admins_on_new_review() IS 
'Yeni ürün değerlendirmesi geldiğinde tüm yöneticilere bildirim gönderir.';
