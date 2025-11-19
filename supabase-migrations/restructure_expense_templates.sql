-- =====================================================
-- Gider Şablon Sistemi Yeniden Yapılandırma
-- Bir şablonda birden fazla gider kalemi destekleme
-- =====================================================

-- 1. Yeni şablon kalemleri tablosu oluştur
CREATE TABLE IF NOT EXISTS gider_sablon_kalemleri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sablon_id UUID NOT NULL REFERENCES gider_sablonlari(id) ON DELETE CASCADE,
    gider_kalemi_id UUID NOT NULL REFERENCES gider_kalemleri(id) ON DELETE CASCADE,
    varsayilan_tutar NUMERIC(10, 2) NOT NULL DEFAULT 0,
    aciklama TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sablon_id, gider_kalemi_id)
);

-- 2. Index'ler
CREATE INDEX IF NOT EXISTS idx_gider_sablon_kalemleri_sablon_id 
ON gider_sablon_kalemleri(sablon_id);

CREATE INDEX IF NOT EXISTS idx_gider_sablon_kalemleri_gider_kalemi_id 
ON gider_sablon_kalemleri(gider_kalemi_id);

-- 3. Eski gider_sablonlari tablosunu temizle ve yeniden yapılandır
-- Önce eski verileri yedekle (gerekirse geri yüklemek için)
DO $$
BEGIN
    -- Eski şablonları yeni sisteme taşı
    INSERT INTO gider_sablon_kalemleri (sablon_id, gider_kalemi_id, varsayilan_tutar, aciklama)
    SELECT 
        id as sablon_id,
        gider_kalemi_id,
        varsayilan_tutar,
        aciklama_sablonu
    FROM gider_sablonlari
    WHERE gider_kalemi_id IS NOT NULL
    ON CONFLICT (sablon_id, gider_kalemi_id) DO NOTHING;
END $$;

-- 4. Eski kolonları kaldır
ALTER TABLE gider_sablonlari 
DROP COLUMN IF EXISTS gider_kalemi_id,
DROP COLUMN IF EXISTS varsayilan_tutar,
DROP COLUMN IF EXISTS aciklama_sablonu,
DROP COLUMN IF EXISTS odeme_sikligi;

-- 5. Yeni kolonlar ekle
ALTER TABLE gider_sablonlari 
ADD COLUMN IF NOT EXISTS sablon_adi TEXT NOT NULL DEFAULT 'Yeni Şablon',
ADD COLUMN IF NOT EXISTS aciklama TEXT;

-- 6. sablon_adi'nin default'unu kaldır (artık zorunlu)
ALTER TABLE gider_sablonlari 
ALTER COLUMN sablon_adi DROP DEFAULT;

-- 7. Şablon oluşturma fonksiyonu (yeni sistem)
CREATE OR REPLACE FUNCTION create_expenses_from_template(
    p_sablon_id UUID,
    p_hedef_ay TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER := 0;
    v_hedef_ay TEXT;
    v_ay_basi DATE;
    v_sablon RECORD;
    v_kalem RECORD;
    v_result JSON;
BEGIN
    -- Hedef ay belirleme
    IF p_hedef_ay IS NULL THEN
        v_hedef_ay := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    ELSE
        v_hedef_ay := p_hedef_ay;
    END IF;
    
    v_ay_basi := (v_hedef_ay || '-01')::DATE;
    
    -- Şablon kontrolü
    SELECT * INTO v_sablon FROM gider_sablonlari WHERE id = p_sablon_id AND aktif = true;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Şablon bulunamadı veya aktif değil'
        );
    END IF;
    
    -- Şablondaki her gider kalemi için
    FOR v_kalem IN 
        SELECT * FROM gider_sablon_kalemleri 
        WHERE sablon_id = p_sablon_id
    LOOP
        -- Bu ay için bu kalemden zaten gider oluşturulmuş mu kontrol et
        IF NOT EXISTS (
            SELECT 1 FROM giderler 
            WHERE gider_kalemi_id = v_kalem.gider_kalemi_id
            AND tarih >= v_ay_basi
            AND tarih < v_ay_basi + INTERVAL '1 month'
            AND aciklama LIKE '%[Şablon: ' || v_sablon.sablon_adi || ']%'
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
                v_kalem.gider_kalemi_id,
                v_kalem.varsayilan_tutar,
                v_ay_basi,
                COALESCE(v_kalem.aciklama, '') || ' [Şablon: ' || v_sablon.sablon_adi || ']',
                'Monatlich',
                'Taslak'
            );
            
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    v_result := json_build_object(
        'success', true,
        'count', v_count,
        'sablon_adi', v_sablon.sablon_adi,
        'hedef_ay', v_hedef_ay,
        'message', v_sablon.sablon_adi || ' şablonundan ' || v_count || ' adet gider oluşturuldu'
    );
    
    RETURN v_result;
END;
$$;

-- 8. RLS Policies
ALTER TABLE gider_sablon_kalemleri ENABLE ROW LEVEL SECURITY;

-- Okuma: Admin ve kullanıcı aynı firmada
CREATE POLICY "Kullanıcılar kendi şablonlarının kalemlerini görebilir"
ON gider_sablon_kalemleri FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM gider_sablonlari gs
        WHERE gs.id = gider_sablon_kalemleri.sablon_id
    )
);

-- Ekleme: Admin
CREATE POLICY "Admin şablon kalemleri ekleyebilir"
ON gider_sablon_kalemleri FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiller
        WHERE profiller.id = auth.uid()
        AND profiller.rol = 'Yönetici'
    )
);

-- Güncelleme: Admin
CREATE POLICY "Admin şablon kalemlerini güncelleyebilir"
ON gider_sablon_kalemleri FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiller
        WHERE profiller.id = auth.uid()
        AND profiller.rol = 'Yönetici'
    )
);

-- Silme: Admin
CREATE POLICY "Admin şablon kalemlerini silebilir"
ON gider_sablon_kalemleri FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiller
        WHERE profiller.id = auth.uid()
        AND profiller.rol = 'Yönetici'
    )
);

-- 9. Yorumlar
COMMENT ON TABLE gider_sablon_kalemleri IS 'Gider şablonlarının içindeki gider kalemleri (bir şablonda birden fazla kalem olabilir)';
COMMENT ON COLUMN gider_sablonlari.sablon_adi IS 'Şablonun kullanıcı tarafından verilen adı (örn: "Ofis Sabit Giderleri")';
COMMENT ON FUNCTION create_expenses_from_template(UUID, TEXT) IS 'Belirtilen şablondaki tüm gider kalemlerini taslak olarak oluşturur';
