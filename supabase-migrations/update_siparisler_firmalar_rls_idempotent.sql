-- Idempotente Aktualisierung der RLS-Policies für siparisler und firmalar
-- Ausführbar beliebig oft: nutzt DROP POLICY IF EXISTS vor CREATE POLICY
-- Datum: 2025-11-09

------------------------------------------------------------
-- siparisler
------------------------------------------------------------
ALTER TABLE public.siparisler ENABLE ROW LEVEL SECURITY;

-- SELECT (lesen)
DROP POLICY IF EXISTS "Admin und Ekip sehen alle Bestellungen" ON public.siparisler;
CREATE POLICY "Admin und Ekip sehen alle Bestellungen"
ON public.siparisler
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiller
    WHERE profiller.id = auth.uid()
      AND profiller.rol IN ('Yönetici', 'Ekip Üyesi')
  )
);

DROP POLICY IF EXISTS "Kunden sehen eigene Firma Bestellungen" ON public.siparisler;
CREATE POLICY "Kunden sehen eigene Firma Bestellungen"
ON public.siparisler
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiller
    WHERE profiller.id = auth.uid()
      AND profiller.rol IN ('Müşteri', 'Alt Bayi')
      AND profiller.firma_id = siparisler.firma_id
  )
);

-- INSERT (erstellen)
DROP POLICY IF EXISTS "Admin und Ekip können Bestellungen erstellen" ON public.siparisler;
CREATE POLICY "Admin und Ekip können Bestellungen erstellen"
ON public.siparisler
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiller
    WHERE profiller.id = auth.uid()
      AND profiller.rol IN ('Yönetici', 'Ekip Üyesi')
  )
);

-- UPDATE (aktualisieren)
DROP POLICY IF EXISTS "Admin und Ekip können Bestellungen aktualisieren" ON public.siparisler;
CREATE POLICY "Admin und Ekip können Bestellungen aktualisieren"
ON public.siparisler
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiller
    WHERE profiller.id = auth.uid()
      AND profiller.rol IN ('Yönetici', 'Ekip Üyesi')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiller
    WHERE profiller.id = auth.uid()
      AND profiller.rol IN ('Yönetici', 'Ekip Üyesi')
  )
);

-- DELETE (löschen)
DROP POLICY IF EXISTS "Admin kann Bestellungen löschen" ON public.siparisler;
CREATE POLICY "Admin kann Bestellungen löschen"
ON public.siparisler
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiller
    WHERE profiller.id = auth.uid()
      AND profiller.rol = 'Yönetici'
  )
);

------------------------------------------------------------
-- firmalar (nur deutsch benannte Policies; bestehende TR-Policies bleiben)
------------------------------------------------------------
ALTER TABLE public.firmalar ENABLE ROW LEVEL SECURITY;

-- SELECT (lesen)
DROP POLICY IF EXISTS "Admin und Ekip sehen alle Firmen" ON public.firmalar;
CREATE POLICY "Admin und Ekip sehen alle Firmen"
ON public.firmalar
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiller
    WHERE profiller.id = auth.uid()
      AND profiller.rol IN ('Yönetici', 'Ekip Üyesi')
  )
);

DROP POLICY IF EXISTS "Kunden sehen eigene Firma" ON public.firmalar;
CREATE POLICY "Kunden sehen eigene Firma"
ON public.firmalar
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiller
    WHERE profiller.id = auth.uid()
      AND profiller.rol IN ('Müşteri', 'Alt Bayi')
      AND profiller.firma_id = firmalar.id
  )
);

-- ALL (verwalten = SELECT/INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "Admin und Ekip können Firmen verwalten" ON public.firmalar;
CREATE POLICY "Admin und Ekip können Firmen verwalten"
ON public.firmalar
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiller
    WHERE profiller.id = auth.uid()
      AND profiller.rol IN ('Yönetici', 'Ekip Üyesi')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiller
    WHERE profiller.id = auth.uid()
      AND profiller.rol IN ('Yönetici', 'Ekip Üyesi')
  )
);

-- Hinweise:
-- 1) Dieses Skript ist idempotent: DROP POLICY IF EXISTS verhindert Fehler 42710.
-- 2) Bereits existierende anders benannte Policies (z.B. türkische) bleiben unberührt.
-- 3) Bei Bedarf kannst du einzelne Bereiche (nur siparisler) selektiv ausführen.
