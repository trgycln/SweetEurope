-- Adım 1: Veritabanı Şema ve Ayar Güncellemeleri

-- ithalat_partileri tablosuna yeni kolonlar
ALTER TABLE public.ithalat_partileri
ADD COLUMN IF NOT EXISTS indirim_1_yuzde numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS indirim_2_yuzde numeric DEFAULT 0;

-- ithalat_parti_kalemleri tablosuna yeni kolonlar
ALTER TABLE public.ithalat_parti_kalemleri
ADD COLUMN IF NOT EXISTS indirimli_alis_fiyati numeric DEFAULT 0;

-- koli_sayisi: Kullanıcının girdiği tek input (Master Data Driven)
-- miktarAdet = koli_sayisi × koli_ici_adet (otomatik hesaplanır)
ALTER TABLE public.ithalat_parti_kalemleri
ADD COLUMN IF NOT EXISTS koli_sayisi integer DEFAULT 1;

-- system_settings tablosuna LUCID ayarı
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, category)
VALUES ('pricing_lucid_per_kg_eur', '0.02', 'number', 'LUCID Ambalaj Sicili KG başı tahmini maliyet (€)', 'pricing')
ON CONFLICT (setting_key) DO NOTHING;

-- Adım 2: Atomik Mal Kabul Fonksiyonu (Supabase RPC)
CREATE OR REPLACE FUNCTION public.complete_import_batch(p_batch_id UUID, p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_status text;
    v_item RECORD;
    v_mevcut_fiyat numeric;
BEGIN
    -- 1. Partinin durumunu kontrol et
    SELECT durum INTO v_status FROM public.ithalat_partileri WHERE id = p_batch_id FOR UPDATE;
    
    IF v_status = 'Tamamlandı' THEN
        RAISE EXCEPTION 'Bu ithalat partisi zaten tamamlanmış.';
    END IF;

    -- 2. Partinin durumunu 'Tamamlandı' yap
    UPDATE public.ithalat_partileri
    SET durum = 'Tamamlandı',
        updated_at = NOW()
    WHERE id = p_batch_id;

    -- 3. Kalemleri dön ve işlemleri yap
    FOR v_item IN (SELECT * FROM public.ithalat_parti_kalemleri WHERE ithalat_partisi_id = p_batch_id) LOOP
        -- Stok miktarını ve son iniş maliyetini güncelle
        UPDATE public.urunler
        SET stok_miktari = COALESCE(stok_miktari, 0) + v_item.miktar_adet,
            son_gercek_inis_maliyeti_net = v_item.gercek_inis_maliyeti_net,
            updated_at = NOW()
        WHERE id = v_item.urun_id;

        -- Stok hareket logu
        INSERT INTO public.urun_stok_hareket_loglari (
            urun_id, 
            hareket_tipi, 
            miktar, 
            kaynak, 
            kaynak_id, 
            kullanici_id,
            aciklama
        ) VALUES (
            v_item.urun_id,
            'stok_artisi',
            v_item.miktar_adet,
            'ithalat_partisi',
            p_batch_id::text,
            p_user_id,
            'İthalat partisi mal kabulü'
        );

        -- Tedarikçi fiyat logu
        SELECT distributor_alis_fiyati INTO v_mevcut_fiyat FROM public.urunler WHERE id = v_item.urun_id;
        
        INSERT INTO public.tedarikci_fiyat_loglari (
            urun_id,
            tir_id,
            standart_fiyat,
            gercek_fiyat,
            fark_yuzde,
            indirim_aciklamasi,
            miktar
        ) VALUES (
            v_item.urun_id,
            p_batch_id,
            COALESCE(v_mevcut_fiyat, 0),
            COALESCE(v_item.gercek_inis_maliyeti_net, 0),
            CASE WHEN COALESCE(v_mevcut_fiyat, 0) > 0 THEN ((COALESCE(v_item.gercek_inis_maliyeti_net, 0) - COALESCE(v_mevcut_fiyat, 0)) / COALESCE(v_mevcut_fiyat, 0) * 100) ELSE 0 END,
            'Mal kabul sonrası gerçekleşen maliyet vs standart fiyat',
            v_item.miktar_adet
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
