-- ============================================================
-- Belge Yönetimi Dinamik Klasörler Tablosu
-- ============================================================

CREATE TABLE IF NOT EXISTS public.belge_klasorleri (
    id VARCHAR(100) PRIMARY KEY,
    label TEXT NOT NULL,
    icon VARCHAR(20) NOT NULL DEFAULT '📁',
    sira INTEGER DEFAULT 100,
    varsayilan BOOLEAN DEFAULT false,
    olusturma_tarihi TIMESTAMPTZ DEFAULT now(),
    olusturan_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- İndeksler
CREATE INDEX IF NOT EXISTS belge_klasorleri_sira_idx ON public.belge_klasorleri(sira);

-- RLS
ALTER TABLE public.belge_klasorleri ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='belge_klasorleri' AND policyname='belge_klasorleri_select') THEN
        CREATE POLICY "belge_klasorleri_select" ON public.belge_klasorleri
            FOR SELECT USING (auth.uid() IS NOT NULL);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='belge_klasorleri' AND policyname='belge_klasorleri_insert') THEN
        CREATE POLICY "belge_klasorleri_insert" ON public.belge_klasorleri
            FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='belge_klasorleri' AND policyname='belge_klasorleri_update') THEN
        CREATE POLICY "belge_klasorleri_update" ON public.belge_klasorleri
            FOR UPDATE USING (auth.uid() IS NOT NULL);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='belge_klasorleri' AND policyname='belge_klasorleri_delete') THEN
        CREATE POLICY "belge_klasorleri_delete" ON public.belge_klasorleri
            FOR DELETE USING (auth.uid() IS NOT NULL AND varsayilan = false);
    END IF;
END $$;

-- Başlangıç Standart Klasörleri + Yeni Araç Dosyası Klasörü
INSERT INTO public.belge_klasorleri (id, label, icon, sira, varsayilan)
VALUES 
    ('gelen_evrak_dosyasi', 'Gelen Evrak Dosyası', '📥', 10, true),
    ('giden_evrak_dosyasi', 'Giden Evrak Dosyası', '📤', 20, true),
    ('sozlesmeler_dosyasi', 'Sözleşmeler Dosyası', '📋', 30, true),
    ('arac_dosyasi', 'Araç Dosyası & Evrakları', '🚗', 35, true),
    ('kurulus_evraklari', 'Resmi Kuruluş Evrakları', '🏛️', 40, true),
    ('personel_ozluk_dosyalari', 'Personel Özlük Dosyaları', '👥', 50, true),
    ('sertifikalar', 'Sertifikalar (HACCP vs.)', '🏅', 60, true),
    ('diger', 'Diğer Klasörler', '📁', 999, true)
ON CONFLICT (id) DO UPDATE SET 
    label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    sira = EXCLUDED.sira;
