-- =====================================================
-- Gider Kategorileri ve Kalemlerini Çok Dilli Hale Getir
-- ad_translations JSON column ekleyerek TR/DE/EN/AR desteği
-- =====================================================

-- 1. gider_ana_kategoriler tablosuna translations ekleme
ALTER TABLE gider_ana_kategoriler 
ADD COLUMN IF NOT EXISTS ad_translations JSONB DEFAULT '{}'::jsonb;

-- 2. gider_kalemleri tablosuna translations ekleme
ALTER TABLE gider_kalemleri 
ADD COLUMN IF NOT EXISTS ad_translations JSONB DEFAULT '{}'::jsonb;

-- 3. Mevcut Almanca isimleri translations'a kopyala
-- Ana Kategoriler için
UPDATE gider_ana_kategoriler
SET ad_translations = jsonb_build_object(
    'de', ad,
    'tr', CASE ad
        WHEN 'Betriebskosten' THEN 'İşletme Giderleri'
        WHEN 'Personalkosten' THEN 'Personel Giderleri'
        WHEN 'Marketing & Werbung' THEN 'Pazarlama & Reklam'
        WHEN 'Verwaltungskosten' THEN 'Yönetim Giderleri'
        WHEN 'Sonstige Ausgaben' THEN 'Diğer Giderler'
        WHEN 'Steuern & Abgaben' THEN 'Vergiler & Harçlar'
        WHEN 'Finanzierungskosten' THEN 'Finansman Giderleri'
        ELSE ad
    END,
    'en', CASE ad
        WHEN 'Betriebskosten' THEN 'Operating Costs'
        WHEN 'Personalkosten' THEN 'Personnel Costs'
        WHEN 'Marketing & Werbung' THEN 'Marketing & Advertising'
        WHEN 'Verwaltungskosten' THEN 'Administrative Costs'
        WHEN 'Sonstige Ausgaben' THEN 'Other Expenses'
        WHEN 'Steuern & Abgaben' THEN 'Taxes & Fees'
        WHEN 'Finanzierungskosten' THEN 'Financing Costs'
        ELSE ad
    END,
    'ar', CASE ad
        WHEN 'Betriebskosten' THEN 'تكاليف التشغيل'
        WHEN 'Personalkosten' THEN 'تكاليف الموظفين'
        WHEN 'Marketing & Werbung' THEN 'التسويق والإعلان'
        WHEN 'Verwaltungskosten' THEN 'التكاليف الإدارية'
        WHEN 'Sonstige Ausgaben' THEN 'مصروفات أخرى'
        WHEN 'Steuern & Abgaben' THEN 'الضرائب والرسوم'
        WHEN 'Finanzierungskosten' THEN 'تكاليف التمويل'
        ELSE ad
    END
)
WHERE ad_translations = '{}'::jsonb OR ad_translations IS NULL;

-- Gider Kalemleri için (yaygın olanlar)
UPDATE gider_kalemleri
SET ad_translations = jsonb_build_object(
    'de', ad,
    'tr', CASE ad
        -- Betriebskosten alt kalemleri
        WHEN 'Miete' THEN 'Kira'
        WHEN 'Nebenkosten' THEN 'Yan Giderler'
        WHEN 'Strom' THEN 'Elektrik'
        WHEN 'Wasser' THEN 'Su'
        WHEN 'Internet & Telefon' THEN 'İnternet & Telefon'
        WHEN 'Versicherungen' THEN 'Sigortalar'
        WHEN 'Reparaturen & Wartung' THEN 'Onarım & Bakım'
        
        -- Personalkosten alt kalemleri
        WHEN 'Gehälter & Löhne' THEN 'Maaşlar & Ücretler'
        WHEN 'Sozialabgaben' THEN 'Sosyal Güvenlik Primleri'
        WHEN 'Schulungen' THEN 'Eğitimler'
        WHEN 'Personalessen' THEN 'Personel Yemekleri'
        
        -- Marketing alt kalemleri
        WHEN 'Online-Werbung' THEN 'Online Reklam'
        WHEN 'Social Media' THEN 'Sosyal Medya'
        WHEN 'Printmedien' THEN 'Basılı Medya'
        WHEN 'Veranstaltungen' THEN 'Etkinlikler'
        
        -- Verwaltung alt kalemleri
        WHEN 'Büromaterial' THEN 'Büro Malzemeleri'
        WHEN 'Software-Lizenzen' THEN 'Yazılım Lisansları'
        WHEN 'Buchhaltung' THEN 'Muhasebe'
        WHEN 'Rechtsberatung' THEN 'Hukuk Danışmanlığı'
        
        ELSE ad
    END,
    'en', CASE ad
        -- Betriebskosten
        WHEN 'Miete' THEN 'Rent'
        WHEN 'Nebenkosten' THEN 'Utility Costs'
        WHEN 'Strom' THEN 'Electricity'
        WHEN 'Wasser' THEN 'Water'
        WHEN 'Internet & Telefon' THEN 'Internet & Phone'
        WHEN 'Versicherungen' THEN 'Insurance'
        WHEN 'Reparaturen & Wartung' THEN 'Repairs & Maintenance'
        
        -- Personalkosten
        WHEN 'Gehälter & Löhne' THEN 'Salaries & Wages'
        WHEN 'Sozialabgaben' THEN 'Social Security Contributions'
        WHEN 'Schulungen' THEN 'Training'
        WHEN 'Personalessen' THEN 'Staff Meals'
        
        -- Marketing
        WHEN 'Online-Werbung' THEN 'Online Advertising'
        WHEN 'Social Media' THEN 'Social Media'
        WHEN 'Printmedien' THEN 'Print Media'
        WHEN 'Veranstaltungen' THEN 'Events'
        
        -- Verwaltung
        WHEN 'Büromaterial' THEN 'Office Supplies'
        WHEN 'Software-Lizenzen' THEN 'Software Licenses'
        WHEN 'Buchhaltung' THEN 'Accounting'
        WHEN 'Rechtsberatung' THEN 'Legal Consulting'
        
        ELSE ad
    END,
    'ar', CASE ad
        -- Betriebskosten
        WHEN 'Miete' THEN 'الإيجار'
        WHEN 'Nebenkosten' THEN 'التكاليف الإضافية'
        WHEN 'Strom' THEN 'الكهرباء'
        WHEN 'Wasser' THEN 'الماء'
        WHEN 'Internet & Telefon' THEN 'الإنترنت والهاتف'
        WHEN 'Versicherungen' THEN 'التأمين'
        WHEN 'Reparaturen & Wartung' THEN 'الإصلاح والصيانة'
        
        -- Personalkosten
        WHEN 'Gehälter & Löhne' THEN 'الرواتب والأجور'
        WHEN 'Sozialabgaben' THEN 'مساهمات الضمان الاجتماعي'
        WHEN 'Schulungen' THEN 'التدريب'
        WHEN 'Personalessen' THEN 'وجبات الموظفين'
        
        -- Marketing
        WHEN 'Online-Werbung' THEN 'الإعلان عبر الإنترنت'
        WHEN 'Social Media' THEN 'وسائل التواصل الاجتماعي'
        WHEN 'Printmedien' THEN 'الإعلام المطبوع'
        WHEN 'Veranstaltungen' THEN 'الفعاليات'
        
        -- Verwaltung
        WHEN 'Büromaterial' THEN 'مستلزمات المكتب'
        WHEN 'Software-Lizenzen' THEN 'تراخيص البرمجيات'
        WHEN 'Buchhaltung' THEN 'المحاسبة'
        WHEN 'Rechtsberatung' THEN 'الاستشارات القانونية'
        
        ELSE ad
    END
)
WHERE ad_translations = '{}'::jsonb OR ad_translations IS NULL;

-- 4. Helper function: Kategorileri locale'e göre getir
CREATE OR REPLACE FUNCTION get_expense_categories_localized(p_locale TEXT DEFAULT 'de')
RETURNS TABLE (
    id UUID,
    ad TEXT,
    ad_localized TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gak.id,
        gak.ad,
        COALESCE(
            gak.ad_translations->>p_locale,
            gak.ad_translations->>'de',
            gak.ad
        ) as ad_localized,
        gak.created_at
    FROM gider_ana_kategoriler gak
    ORDER BY ad_localized;
END;
$$ LANGUAGE plpgsql;

-- 5. Helper function: Gider kalemlerini locale'e göre getir
CREATE OR REPLACE FUNCTION get_expense_items_localized(
    p_locale TEXT DEFAULT 'de',
    p_category_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    ad TEXT,
    ad_localized TEXT,
    ana_kategori_id UUID,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gk.id,
        gk.ad,
        COALESCE(
            gk.ad_translations->>p_locale,
            gk.ad_translations->>'de',
            gk.ad
        ) as ad_localized,
        gk.ana_kategori_id,
        gk.created_at
    FROM gider_kalemleri gk
    WHERE p_category_id IS NULL OR gk.ana_kategori_id = p_category_id
    ORDER BY ad_localized;
END;
$$ LANGUAGE plpgsql;

-- 6. Yorum ekle
COMMENT ON COLUMN gider_ana_kategoriler.ad_translations IS 'Çok dilli kategori isimleri: {"tr": "...", "de": "...", "en": "...", "ar": "..."}';
COMMENT ON COLUMN gider_kalemleri.ad_translations IS 'Çok dilli kalem isimleri: {"tr": "...", "de": "...", "en": "...", "ar": "..."}';
COMMENT ON FUNCTION get_expense_categories_localized(TEXT) IS 'Gider kategorilerini belirtilen dilde getirir';
COMMENT ON FUNCTION get_expense_items_localized(TEXT, UUID) IS 'Gider kalemlerini belirtilen dilde getirir';
