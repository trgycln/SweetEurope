-- =====================================================
-- Gider Şablon Sistemi İyileştirmesi
-- Şablonlara isim ve dönem bazlı yönetim ekleme
-- =====================================================

-- 1. gider_sablonlari tablosuna yeni alanlar ekle
ALTER TABLE gider_sablonlari 
ADD COLUMN IF NOT EXISTS sablon_adi TEXT,
ADD COLUMN IF NOT EXISTS donem_tipi TEXT CHECK (donem_tipi IN ('aylik', 'yillik', 'tek_sefer')) DEFAULT 'aylik';

-- 2. Mevcut şablonları güncelle (dönem sıklığına göre)
UPDATE gider_sablonlari
SET 
    donem_tipi = CASE 
        WHEN odeme_sikligi = 'Monatlich' THEN 'aylik'
        WHEN odeme_sikligi = 'Jährlich' THEN 'yillik'
        WHEN odeme_sikligi = 'Einmalig' THEN 'tek_sefer'
        ELSE 'aylik'
    END,
    sablon_adi = COALESCE(
        aciklama_sablonu,
        (SELECT ad FROM gider_kalemleri WHERE id = gider_kalemi_id)
    )
WHERE sablon_adi IS NULL;

-- 3. Constraint ekle: sablon_adi zorunlu
ALTER TABLE gider_sablonlari 
ALTER COLUMN sablon_adi SET NOT NULL;

-- 4. Index ekle performans için
CREATE INDEX IF NOT EXISTS idx_gider_sablonlari_donem_tipi ON gider_sablonlari(donem_tipi);
CREATE INDEX IF NOT EXISTS idx_gider_sablonlari_aktif ON gider_sablonlari(aktif) WHERE aktif = true;

-- 5. Yeni RPC: Dönem tipine göre şablon getir ve gider oluştur
CREATE OR REPLACE FUNCTION create_expenses_from_templates(
    p_donem_tipi TEXT DEFAULT 'aylik',
    p_hedef_ay TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER := 0;
    v_hedef_ay TEXT;
    v_template RECORD;
    v_ay_basi DATE;
    v_result JSON;
BEGIN
    -- Hedef ay belirleme
    IF p_hedef_ay IS NULL THEN
        v_hedef_ay := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    ELSE
        v_hedef_ay := p_hedef_ay;
    END IF;
    
    v_ay_basi := (v_hedef_ay || '-01')::DATE;
    
    -- Belirtilen dönem tipindeki aktif şablonları işle
    FOR v_template IN 
        SELECT * FROM gider_sablonlari 
        WHERE aktif = true 
        AND donem_tipi = p_donem_tipi
        AND gider_kalemi_id IS NOT NULL
    LOOP
        -- Bu ay için bu şablondan zaten gider oluşturulmuş mu kontrol et
        IF NOT EXISTS (
            SELECT 1 FROM giderler 
            WHERE gider_kalemi_id = v_template.gider_kalemi_id
            AND tarih >= v_ay_basi
            AND tarih < v_ay_basi + INTERVAL '1 month'
            AND aciklama LIKE '%[Şablon: ' || v_template.sablon_adi || ']%'
        ) THEN
            -- Yeni gider oluştur
            INSERT INTO giderler (
                gider_kalemi_id,
                tutar,
                tarih,
                aciklama,
                odeme_sikligi,
                durum
            ) VALUES (
                v_template.gider_kalemi_id,
                v_template.varsayilan_tutar,
                v_ay_basi,
                COALESCE(v_template.aciklama_sablonu, '') || ' [Şablon: ' || v_template.sablon_adi || ']',
                v_template.odeme_sikligi,
                'Taslak'
            );
            
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    v_result := json_build_object(
        'success', true,
        'count', v_count,
        'donem_tipi', p_donem_tipi,
        'hedef_ay', v_hedef_ay,
        'message', v_count || ' adet ' || p_donem_tipi || ' gider şablonu oluşturuldu'
    );
    
    RETURN v_result;
END;
$$;

-- 6. Eski fonksiyonu güncelle (geriye uyumluluk için)
CREATE OR REPLACE FUNCTION create_giderler_from_templates(target_month TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
BEGIN
    -- Yeni fonksiyonu çağır (aylik dönem)
    RETURN create_expenses_from_templates('aylik', target_month);
END;
$$;

-- 7. Yorumlar ekle
COMMENT ON COLUMN gider_sablonlari.sablon_adi IS 'Şablonun tanımlayıcı adı';
COMMENT ON COLUMN gider_sablonlari.donem_tipi IS 'Şablon dönemi: aylik (her ay), yillik (yılda bir), tek_sefer (bir kez)';
COMMENT ON FUNCTION create_expenses_from_templates(TEXT, TEXT) IS 'Belirtilen dönem tipindeki şablonlardan gider oluşturur (aylik/yillik/tek_sefer)';
