-- Allow admin/team to read all profiles (including Personel list)
BEGIN;

ALTER TABLE public.profiller ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and Ekip can view all profiller" ON public.profiller;
CREATE POLICY "Admin and Ekip can view all profiller" ON public.profiller
FOR SELECT TO authenticated
USING (
  get_my_role() IN ('Yönetici', 'Ekip Üyesi')
);

COMMIT;
