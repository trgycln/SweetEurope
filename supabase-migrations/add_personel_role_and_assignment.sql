-- Add Personel role, assignment fields, and RLS policies
-- NOTE: New enum values must be committed before use.
BEGIN;

-- 1) Extend user_role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role'
      AND e.enumlabel = 'Personel'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'Personel';
  END IF;
END $$;

COMMIT;

BEGIN;

-- 2) Assignments on orders
ALTER TABLE public.siparisler
  ADD COLUMN IF NOT EXISTS atanan_kisi_id uuid REFERENCES public.profiller(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS siparisler_atanan_kisi_id_idx
  ON public.siparisler (atanan_kisi_id);

-- 3) Audit fields on firmalar
ALTER TABLE public.firmalar
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiller(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiller(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS firmalar_created_by_idx ON public.firmalar (created_by);
CREATE INDEX IF NOT EXISTS firmalar_updated_by_idx ON public.firmalar (updated_by);

-- 4) RLS: siparisler for Personel
ALTER TABLE public.siparisler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personel assigned orders select" ON public.siparisler;
CREATE POLICY "Personel assigned orders select" ON public.siparisler
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiller p
    WHERE p.id = auth.uid()
      AND p.rol = 'Personel'
  )
  AND atanan_kisi_id = auth.uid()
);

DROP POLICY IF EXISTS "Personel assigned orders update" ON public.siparisler;
CREATE POLICY "Personel assigned orders update" ON public.siparisler
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiller p
    WHERE p.id = auth.uid()
      AND p.rol = 'Personel'
  )
  AND atanan_kisi_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiller p
    WHERE p.id = auth.uid()
      AND p.rol = 'Personel'
  )
  AND atanan_kisi_id = auth.uid()
);

-- 5) RLS: firmalar for Personel (assigned firms only)
ALTER TABLE public.firmalar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personel sees assigned firms" ON public.firmalar;
CREATE POLICY "Personel sees assigned firms" ON public.firmalar
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiller p
    WHERE p.id = auth.uid()
      AND p.rol = 'Personel'
  )
  AND (
    EXISTS (
      SELECT 1 FROM public.siparisler s
      WHERE s.firma_id = firmalar.id
        AND s.atanan_kisi_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.gorevler g
      WHERE g.ilgili_firma_id = firmalar.id
        AND g.atanan_kisi_id = auth.uid()
    )
  )
);

-- 6) RLS: gorevler for Personel (assigned tasks only)
ALTER TABLE public.gorevler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personel manages own tasks" ON public.gorevler;
CREATE POLICY "Personel manages own tasks" ON public.gorevler
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiller p
    WHERE p.id = auth.uid()
      AND p.rol = 'Personel'
  )
  AND atanan_kisi_id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiller p
    WHERE p.id = auth.uid()
      AND p.rol = 'Personel'
  )
  AND atanan_kisi_id = auth.uid()
);

-- 7) RLS: firmalar_finansal
ALTER TABLE public.firmalar_finansal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and Ekip manage firmalar_finansal" ON public.firmalar_finansal;
CREATE POLICY "Admin and Ekip manage firmalar_finansal" ON public.firmalar_finansal
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiller p
    WHERE p.id = auth.uid()
      AND p.rol IN ('Yönetici', 'Ekip Üyesi')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiller p
    WHERE p.id = auth.uid()
      AND p.rol IN ('Yönetici', 'Ekip Üyesi')
  )
);

DROP POLICY IF EXISTS "Customers see own firmalar_finansal" ON public.firmalar_finansal;
CREATE POLICY "Customers see own firmalar_finansal" ON public.firmalar_finansal
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiller p
    WHERE p.id = auth.uid()
      AND p.rol IN ('Müşteri', 'Alt Bayi')
      AND p.firma_id = firmalar_finansal.firma_id
  )
);

DROP POLICY IF EXISTS "Personel see assigned firmalar_finansal" ON public.firmalar_finansal;
CREATE POLICY "Personel see assigned firmalar_finansal" ON public.firmalar_finansal
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiller p
    WHERE p.id = auth.uid()
      AND p.rol = 'Personel'
  )
  AND (
    EXISTS (
      SELECT 1 FROM public.siparisler s
      WHERE s.firma_id = firmalar_finansal.firma_id
        AND s.atanan_kisi_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.gorevler g
      WHERE g.ilgili_firma_id = firmalar_finansal.firma_id
        AND g.atanan_kisi_id = auth.uid()
    )
  )
);

COMMIT;
