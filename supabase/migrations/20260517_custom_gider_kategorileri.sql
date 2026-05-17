-- ============================================================
-- Kullanıcı Tanımlı Gider Kategorileri
-- ============================================================

CREATE TABLE IF NOT EXISTS alt_bayi_gider_kategorileri (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sahip_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ad TEXT NOT NULL,
    renk TEXT DEFAULT '#64748b',
    olusturulma_tarihi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sahip_id, ad)
);

CREATE INDEX IF NOT EXISTS alt_bayi_gider_kategorileri_sahip_id_idx ON alt_bayi_gider_kategorileri(sahip_id);

ALTER TABLE alt_bayi_gider_kategorileri ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='alt_bayi_gider_kategorileri' AND policyname='users_see_own_categories') THEN
        CREATE POLICY "users_see_own_categories" ON alt_bayi_gider_kategorileri
            FOR SELECT USING (sahip_id = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='alt_bayi_gider_kategorileri' AND policyname='users_insert_own_categories') THEN
        CREATE POLICY "users_insert_own_categories" ON alt_bayi_gider_kategorileri
            FOR INSERT WITH CHECK (sahip_id = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='alt_bayi_gider_kategorileri' AND policyname='users_delete_own_categories') THEN
        CREATE POLICY "users_delete_own_categories" ON alt_bayi_gider_kategorileri
            FOR DELETE USING (sahip_id = auth.uid());
    END IF;
END $$;
