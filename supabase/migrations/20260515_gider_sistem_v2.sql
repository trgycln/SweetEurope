-- ============================================================
-- GİDER SİSTEMİ V2 - Profesyonel yeniden yapılandırma
-- - Şablonlara süreli/taksitli destek
-- - Default kategoriler (Almanya B2B)
-- - Otomatik üretim için son_olusturma_tarihi takibi
-- Supabase Dashboard > SQL Editor'da çalıştırın
-- ============================================================

-- ── 1) gider_sablonlari yeni kolonlar ───────────────────────
ALTER TABLE gider_sablonlari
    ADD COLUMN IF NOT EXISTS gider_kalemi_id   uuid REFERENCES gider_kalemleri(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS tip               text DEFAULT 'sureli_tekrar',
    ADD COLUMN IF NOT EXISTS baslangic_tarihi  date,
    ADD COLUMN IF NOT EXISTS bitis_tarihi      date,
    ADD COLUMN IF NOT EXISTS taksit_sayisi     int,
    ADD COLUMN IF NOT EXISTS tekrar_periyodu   text DEFAULT 'aylik',
    ADD COLUMN IF NOT EXISTS son_olusturma_tarihi date,
    ADD COLUMN IF NOT EXISTS notlar            text,
    ADD COLUMN IF NOT EXISTS varsayilan_tutar  numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS odeme_sikligi     text;

-- tip: 'sureli_tekrar' (süresiz) | 'sureli_sozlesme' (start+end) | 'taksitli' (start+count)
-- tekrar_periyodu: 'aylik' | 'ceyreklik' | 'yarim_yillik' | 'yillik'

CREATE INDEX IF NOT EXISTS gider_sablonlari_aktif_idx ON gider_sablonlari(aktif);
CREATE INDEX IF NOT EXISTS gider_sablonlari_tip_idx ON gider_sablonlari(tip);

-- ── 2) giderler tablosunda sablon_id index ──────────────────
CREATE INDEX IF NOT EXISTS giderler_sablon_id_idx ON giderler(sablon_id);

-- ── 3) Default kategoriler (Ana kategoriler) ────────────────
-- Sadece tablo boşsa ekle (idempotent)
INSERT INTO gider_ana_kategoriler (ad, ad_translations)
SELECT * FROM (VALUES
    ('Personel',         '{"de":"Personal","tr":"Personel"}'::jsonb),
    ('Kira ve Aidat',    '{"de":"Miete & Nebenkosten","tr":"Kira ve Aidat"}'::jsonb),
    ('Versorgung',       '{"de":"Versorgung (Strom/Gas/Wasser)","tr":"Versorgung"}'::jsonb),
    ('Lojistik & Gümrük','{"de":"Logistik & Zoll","tr":"Lojistik & Gümrük"}'::jsonb),
    ('Pazarlama',        '{"de":"Marketing & Werbung","tr":"Pazarlama"}'::jsonb),
    ('Sigorta',          '{"de":"Versicherung","tr":"Sigorta"}'::jsonb),
    ('Vergi & Harçlar',  '{"de":"Steuern & Gebühren","tr":"Vergi & Harçlar"}'::jsonb),
    ('Büro & Yönetim',   '{"de":"Büro & Verwaltung","tr":"Büro & Yönetim"}'::jsonb),
    ('Danışmanlık',      '{"de":"Beratung","tr":"Danışmanlık"}'::jsonb),
    ('Seyahat',          '{"de":"Reisen","tr":"Seyahat"}'::jsonb),
    ('Bakım & Onarım',   '{"de":"Wartung & Reparatur","tr":"Bakım & Onarım"}'::jsonb),
    ('Banka & Finans',   '{"de":"Bank & Finanzen","tr":"Banka & Finans"}'::jsonb),
    ('Yazılım & IT',     '{"de":"Software & IT","tr":"Yazılım & IT"}'::jsonb),
    ('Diğer',            '{"de":"Sonstiges","tr":"Diğer"}'::jsonb)
) AS v(ad, ad_translations)
WHERE NOT EXISTS (SELECT 1 FROM gider_ana_kategoriler WHERE ad = v.ad);

-- ── 4) Default kalemler (Alt kategoriler) ───────────────────
DO $$
DECLARE
    rec RECORD;
    kat_id uuid;
BEGIN
    -- Personel
    SELECT id INTO kat_id FROM gider_ana_kategoriler WHERE ad = 'Personel';
    IF kat_id IS NOT NULL THEN
        FOR rec IN VALUES
            ('Maaş', '{"de":"Gehalt"}'::jsonb),
            ('SGK / Sozialversicherung', '{"de":"Sozialversicherung"}'::jsonb),
            ('İkramiye / Prim', '{"de":"Bonus/Prämie"}'::jsonb),
            ('Stajyer / Mini-Job', '{"de":"Praktikum/Mini-Job"}'::jsonb)
        LOOP
            INSERT INTO gider_kalemleri (ad, ana_kategori_id, ad_translations)
            SELECT rec.column1, kat_id, rec.column2
            WHERE NOT EXISTS (SELECT 1 FROM gider_kalemleri WHERE ad = rec.column1 AND ana_kategori_id = kat_id);
        END LOOP;
    END IF;

    -- Kira ve Aidat
    SELECT id INTO kat_id FROM gider_ana_kategoriler WHERE ad = 'Kira ve Aidat';
    IF kat_id IS NOT NULL THEN
        FOR rec IN VALUES
            ('Ofis Kirası', '{"de":"Büromiete"}'::jsonb),
            ('Depo Kirası', '{"de":"Lagermiete"}'::jsonb),
            ('Aidat / Nebenkosten', '{"de":"Nebenkosten"}'::jsonb),
            ('Garaj / Otopark', '{"de":"Garage/Stellplatz"}'::jsonb)
        LOOP
            INSERT INTO gider_kalemleri (ad, ana_kategori_id, ad_translations)
            SELECT rec.column1, kat_id, rec.column2
            WHERE NOT EXISTS (SELECT 1 FROM gider_kalemleri WHERE ad = rec.column1 AND ana_kategori_id = kat_id);
        END LOOP;
    END IF;

    -- Versorgung
    SELECT id INTO kat_id FROM gider_ana_kategoriler WHERE ad = 'Versorgung';
    IF kat_id IS NOT NULL THEN
        FOR rec IN VALUES
            ('Elektrik', '{"de":"Strom"}'::jsonb),
            ('Gaz', '{"de":"Gas"}'::jsonb),
            ('Su', '{"de":"Wasser"}'::jsonb),
            ('Internet', '{"de":"Internet"}'::jsonb),
            ('Telefon / Mobil', '{"de":"Telefon/Mobilfunk"}'::jsonb),
            ('Çöp / Müll', '{"de":"Müllgebühr"}'::jsonb)
        LOOP
            INSERT INTO gider_kalemleri (ad, ana_kategori_id, ad_translations)
            SELECT rec.column1, kat_id, rec.column2
            WHERE NOT EXISTS (SELECT 1 FROM gider_kalemleri WHERE ad = rec.column1 AND ana_kategori_id = kat_id);
        END LOOP;
    END IF;

    -- Lojistik & Gümrük (TIR otomatik aktarılan kalemler dahil)
    SELECT id INTO kat_id FROM gider_ana_kategoriler WHERE ad = 'Lojistik & Gümrük';
    IF kat_id IS NOT NULL THEN
        FOR rec IN VALUES
            ('Navlun (Soğuk)', '{"de":"Frachtkosten (Kühl)"}'::jsonb),
            ('Navlun (Kuru)', '{"de":"Frachtkosten (Trocken)"}'::jsonb),
            ('Gümrük Vergisi', '{"de":"Zoll"}'::jsonb),
            ('TRACES / Numune', '{"de":"TRACES/Probe"}'::jsonb),
            ('Ardiye', '{"de":"Lagergebühr"}'::jsonb),
            ('Liman / Terminal', '{"de":"Hafen/Terminal"}'::jsonb),
            ('Forklift / Yükleme', '{"de":"Stapler/Verladung"}'::jsonb)
        LOOP
            INSERT INTO gider_kalemleri (ad, ana_kategori_id, ad_translations)
            SELECT rec.column1, kat_id, rec.column2
            WHERE NOT EXISTS (SELECT 1 FROM gider_kalemleri WHERE ad = rec.column1 AND ana_kategori_id = kat_id);
        END LOOP;
    END IF;

    -- Pazarlama
    SELECT id INTO kat_id FROM gider_ana_kategoriler WHERE ad = 'Pazarlama';
    IF kat_id IS NOT NULL THEN
        FOR rec IN VALUES
            ('Online Reklam (Google/Meta)', '{"de":"Online-Werbung"}'::jsonb),
            ('Print Reklam', '{"de":"Printwerbung"}'::jsonb),
            ('Fuar / Messe', '{"de":"Messe"}'::jsonb),
            ('Hediyelik / Promosyon', '{"de":"Werbegeschenke"}'::jsonb),
            ('Web Hosting', '{"de":"Webhosting"}'::jsonb),
            ('Tasarım / Grafik', '{"de":"Design/Grafik"}'::jsonb)
        LOOP
            INSERT INTO gider_kalemleri (ad, ana_kategori_id, ad_translations)
            SELECT rec.column1, kat_id, rec.column2
            WHERE NOT EXISTS (SELECT 1 FROM gider_kalemleri WHERE ad = rec.column1 AND ana_kategori_id = kat_id);
        END LOOP;
    END IF;

    -- Sigorta
    SELECT id INTO kat_id FROM gider_ana_kategoriler WHERE ad = 'Sigorta';
    IF kat_id IS NOT NULL THEN
        FOR rec IN VALUES
            ('Araç Sigortası', '{"de":"KFZ-Versicherung"}'::jsonb),
            ('İşyeri Sigortası', '{"de":"Betriebsversicherung"}'::jsonb),
            ('Sorumluluk / Haftpflicht', '{"de":"Haftpflichtversicherung"}'::jsonb),
            ('Sağlık / Krankenversicherung', '{"de":"Krankenversicherung"}'::jsonb)
        LOOP
            INSERT INTO gider_kalemleri (ad, ana_kategori_id, ad_translations)
            SELECT rec.column1, kat_id, rec.column2
            WHERE NOT EXISTS (SELECT 1 FROM gider_kalemleri WHERE ad = rec.column1 AND ana_kategori_id = kat_id);
        END LOOP;
    END IF;

    -- Vergi & Harçlar
    SELECT id INTO kat_id FROM gider_ana_kategoriler WHERE ad = 'Vergi & Harçlar';
    IF kat_id IS NOT NULL THEN
        FOR rec IN VALUES
            ('USt-Vorauszahlung (KDV)', '{"de":"Umsatzsteuer-Vorauszahlung"}'::jsonb),
            ('Gewerbesteuer', '{"de":"Gewerbesteuer"}'::jsonb),
            ('IHK Aidat', '{"de":"IHK-Beitrag"}'::jsonb),
            ('Kammerbeitrag', '{"de":"Kammerbeitrag"}'::jsonb),
            ('Noter / Notargebühr', '{"de":"Notargebühr"}'::jsonb)
        LOOP
            INSERT INTO gider_kalemleri (ad, ana_kategori_id, ad_translations)
            SELECT rec.column1, kat_id, rec.column2
            WHERE NOT EXISTS (SELECT 1 FROM gider_kalemleri WHERE ad = rec.column1 AND ana_kategori_id = kat_id);
        END LOOP;
    END IF;

    -- Büro & Yönetim
    SELECT id INTO kat_id FROM gider_ana_kategoriler WHERE ad = 'Büro & Yönetim';
    IF kat_id IS NOT NULL THEN
        FOR rec IN VALUES
            ('Kırtasiye', '{"de":"Büromaterial"}'::jsonb),
            ('Mobilya / Ekipman', '{"de":"Möbel/Ausstattung"}'::jsonb),
            ('Temizlik', '{"de":"Reinigung"}'::jsonb),
            ('Posta / Versand', '{"de":"Porto/Versand"}'::jsonb)
        LOOP
            INSERT INTO gider_kalemleri (ad, ana_kategori_id, ad_translations)
            SELECT rec.column1, kat_id, rec.column2
            WHERE NOT EXISTS (SELECT 1 FROM gider_kalemleri WHERE ad = rec.column1 AND ana_kategori_id = kat_id);
        END LOOP;
    END IF;

    -- Danışmanlık
    SELECT id INTO kat_id FROM gider_ana_kategoriler WHERE ad = 'Danışmanlık';
    IF kat_id IS NOT NULL THEN
        FOR rec IN VALUES
            ('Muhasebe / Steuerberater', '{"de":"Steuerberater"}'::jsonb),
            ('Hukuk / Rechtsanwalt', '{"de":"Rechtsanwalt"}'::jsonb),
            ('IT Danışman', '{"de":"IT-Berater"}'::jsonb),
            ('Lohnabrechnung', '{"de":"Lohnabrechnung"}'::jsonb)
        LOOP
            INSERT INTO gider_kalemleri (ad, ana_kategori_id, ad_translations)
            SELECT rec.column1, kat_id, rec.column2
            WHERE NOT EXISTS (SELECT 1 FROM gider_kalemleri WHERE ad = rec.column1 AND ana_kategori_id = kat_id);
        END LOOP;
    END IF;

    -- Seyahat
    SELECT id INTO kat_id FROM gider_ana_kategoriler WHERE ad = 'Seyahat';
    IF kat_id IS NOT NULL THEN
        FOR rec IN VALUES
            ('Yakıt / Benzin', '{"de":"Kraftstoff"}'::jsonb),
            ('Otel', '{"de":"Hotel"}'::jsonb),
            ('Tren / Uçak', '{"de":"Bahn/Flug"}'::jsonb),
            ('Otopark / Parken', '{"de":"Parkgebühren"}'::jsonb),
            ('Yemek (Geschäftsessen)', '{"de":"Geschäftsessen"}'::jsonb)
        LOOP
            INSERT INTO gider_kalemleri (ad, ana_kategori_id, ad_translations)
            SELECT rec.column1, kat_id, rec.column2
            WHERE NOT EXISTS (SELECT 1 FROM gider_kalemleri WHERE ad = rec.column1 AND ana_kategori_id = kat_id);
        END LOOP;
    END IF;

    -- Bakım & Onarım
    SELECT id INTO kat_id FROM gider_ana_kategoriler WHERE ad = 'Bakım & Onarım';
    IF kat_id IS NOT NULL THEN
        FOR rec IN VALUES
            ('Araç Bakım', '{"de":"KFZ-Wartung"}'::jsonb),
            ('Depo Bakım', '{"de":"Lagerwartung"}'::jsonb),
            ('IT Onarım', '{"de":"IT-Reparatur"}'::jsonb),
            ('Klima / Soğutma', '{"de":"Klima/Kühlung"}'::jsonb)
        LOOP
            INSERT INTO gider_kalemleri (ad, ana_kategori_id, ad_translations)
            SELECT rec.column1, kat_id, rec.column2
            WHERE NOT EXISTS (SELECT 1 FROM gider_kalemleri WHERE ad = rec.column1 AND ana_kategori_id = kat_id);
        END LOOP;
    END IF;

    -- Banka & Finans
    SELECT id INTO kat_id FROM gider_ana_kategoriler WHERE ad = 'Banka & Finans';
    IF kat_id IS NOT NULL THEN
        FOR rec IN VALUES
            ('Hesap Ücreti / Kontoführung', '{"de":"Kontoführung"}'::jsonb),
            ('Havale / Überweisung', '{"de":"Überweisung"}'::jsonb),
            ('Kredi Faizi', '{"de":"Kreditzinsen"}'::jsonb),
            ('Kart Aidatı', '{"de":"Kartengebühr"}'::jsonb),
            ('Leasing Taksiti', '{"de":"Leasing-Rate"}'::jsonb)
        LOOP
            INSERT INTO gider_kalemleri (ad, ana_kategori_id, ad_translations)
            SELECT rec.column1, kat_id, rec.column2
            WHERE NOT EXISTS (SELECT 1 FROM gider_kalemleri WHERE ad = rec.column1 AND ana_kategori_id = kat_id);
        END LOOP;
    END IF;

    -- Yazılım & IT
    SELECT id INTO kat_id FROM gider_ana_kategoriler WHERE ad = 'Yazılım & IT';
    IF kat_id IS NOT NULL THEN
        FOR rec IN VALUES
            ('SaaS Abonelik', '{"de":"SaaS-Abo"}'::jsonb),
            ('Yazılım Lisansı', '{"de":"Software-Lizenz"}'::jsonb),
            ('Hosting / Sunucu', '{"de":"Hosting/Server"}'::jsonb),
            ('Domain', '{"de":"Domain"}'::jsonb),
            ('IT Hardware', '{"de":"IT-Hardware"}'::jsonb)
        LOOP
            INSERT INTO gider_kalemleri (ad, ana_kategori_id, ad_translations)
            SELECT rec.column1, kat_id, rec.column2
            WHERE NOT EXISTS (SELECT 1 FROM gider_kalemleri WHERE ad = rec.column1 AND ana_kategori_id = kat_id);
        END LOOP;
    END IF;

    -- Diğer
    SELECT id INTO kat_id FROM gider_ana_kategoriler WHERE ad = 'Diğer';
    IF kat_id IS NOT NULL THEN
        FOR rec IN VALUES
            ('Bağış / Spende', '{"de":"Spende"}'::jsonb),
            ('Hediye / Geschenk', '{"de":"Geschenk"}'::jsonb),
            ('Diğer / Sonstiges', '{"de":"Sonstiges"}'::jsonb)
        LOOP
            INSERT INTO gider_kalemleri (ad, ana_kategori_id, ad_translations)
            SELECT rec.column1, kat_id, rec.column2
            WHERE NOT EXISTS (SELECT 1 FROM gider_kalemleri WHERE ad = rec.column1 AND ana_kategori_id = kat_id);
        END LOOP;
    END IF;
END $$;

-- ── 5) RLS politikaları (kategoriler için CRUD) ─────────────
ALTER TABLE gider_ana_kategoriler ENABLE ROW LEVEL SECURITY;
ALTER TABLE gider_kalemleri ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gider_ana_kategoriler' AND policyname='ana_kat_select') THEN
        CREATE POLICY "ana_kat_select" ON gider_ana_kategoriler FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gider_ana_kategoriler' AND policyname='ana_kat_all') THEN
        CREATE POLICY "ana_kat_all" ON gider_ana_kategoriler FOR ALL USING (
            EXISTS (SELECT 1 FROM profiller WHERE id = auth.uid() AND rol = 'Yönetici')
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gider_kalemleri' AND policyname='kalem_select') THEN
        CREATE POLICY "kalem_select" ON gider_kalemleri FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gider_kalemleri' AND policyname='kalem_all') THEN
        CREATE POLICY "kalem_all" ON gider_kalemleri FOR ALL USING (
            EXISTS (SELECT 1 FROM profiller WHERE id = auth.uid() AND rol = 'Yönetici')
        );
    END IF;
END $$;
