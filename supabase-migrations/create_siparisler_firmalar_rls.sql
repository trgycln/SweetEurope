-- Migration: RLS Policies für siparisler und firmalar Tabellen
-- Datum: 2025-11-09
-- Beschreibung: Ermöglicht Admin und Ekip Üyesi Zugriff auf alle Bestellungen,
--               Kunden sehen nur ihre eigenen Bestellungen

-- ============================================================
-- 1. RLS für siparisler aktivieren (falls noch nicht aktiv)
-- ============================================================
ALTER TABLE siparisler ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Policy: Admin und Ekip Üyesi sehen alle Bestellungen
-- ============================================================
CREATE POLICY "Admin und Ekip sehen alle Bestellungen"
ON siparisler
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiller
        WHERE profiller.id = auth.uid()
        AND profiller.rol IN ('Yönetici', 'Ekip Üyesi')
    )
);

-- ============================================================
-- 3. Policy: Kunden sehen nur Bestellungen ihrer Firma
-- ============================================================
CREATE POLICY "Kunden sehen eigene Firma Bestellungen"
ON siparisler
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiller
        WHERE profiller.id = auth.uid()
        AND profiller.rol IN ('Müşteri', 'Alt Bayi')
        AND profiller.firma_id = siparisler.firma_id
    )
);

-- ============================================================
-- 4. Policy: Admin und Ekip können Bestellungen erstellen
-- ============================================================
CREATE POLICY "Admin und Ekip können Bestellungen erstellen"
ON siparisler
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiller
        WHERE profiller.id = auth.uid()
        AND profiller.rol IN ('Yönetici', 'Ekip Üyesi')
    )
);

-- ============================================================
-- 5. Policy: Admin und Ekip können Bestellungen aktualisieren
-- ============================================================
CREATE POLICY "Admin und Ekip können Bestellungen aktualisieren"
ON siparisler
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiller
        WHERE profiller.id = auth.uid()
        AND profiller.rol IN ('Yönetici', 'Ekip Üyesi')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiller
        WHERE profiller.id = auth.uid()
        AND profiller.rol IN ('Yönetici', 'Ekip Üyesi')
    )
);

-- ============================================================
-- 6. Policy: Admin kann Bestellungen löschen
-- ============================================================
CREATE POLICY "Admin kann Bestellungen löschen"
ON siparisler
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiller
        WHERE profiller.id = auth.uid()
        AND profiller.rol = 'Yönetici'
    )
);

-- ============================================================
-- 7. RLS für firmalar aktivieren (falls noch nicht aktiv)
-- ============================================================
ALTER TABLE firmalar ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. Policy: Admin und Ekip sehen alle Firmen
-- ============================================================
CREATE POLICY "Admin und Ekip sehen alle Firmen"
ON firmalar
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiller
        WHERE profiller.id = auth.uid()
        AND profiller.rol IN ('Yönetici', 'Ekip Üyesi')
    )
);

-- ============================================================
-- 9. Policy: Kunden sehen nur ihre eigene Firma
-- ============================================================
CREATE POLICY "Kunden sehen eigene Firma"
ON firmalar
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiller
        WHERE profiller.id = auth.uid()
        AND profiller.rol IN ('Müşteri', 'Alt Bayi')
        AND profiller.firma_id = firmalar.id
    )
);

-- ============================================================
-- 10. Policy: Admin und Ekip können Firmen verwalten
-- ============================================================
CREATE POLICY "Admin und Ekip können Firmen verwalten"
ON firmalar
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiller
        WHERE profiller.id = auth.uid()
        AND profiller.rol IN ('Yönetici', 'Ekip Üyesi')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiller
        WHERE profiller.id = auth.uid()
        AND profiller.rol IN ('Yönetici', 'Ekip Üyesi')
    )
);

-- ============================================================
-- HINWEIS: Diese Migration muss in Supabase ausgeführt werden
-- über das SQL Editor in der Supabase Console oder via CLI
-- ============================================================
