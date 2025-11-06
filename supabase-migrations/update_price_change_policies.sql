-- This script now guards for table existence to avoid errors if run before the table is created

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'fiyat_degisim_talepleri'
  ) THEN
    BEGIN
      CREATE POLICY fiyat_talep_admin_select ON public.fiyat_degisim_talepleri
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.profiller p
            WHERE p.id = auth.uid() AND p.rol IN ('Yönetici','Ekip Üyesi')
          )
        );
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      CREATE POLICY fiyat_talep_admin_update ON public.fiyat_degisim_talepleri
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM public.profiller p
            WHERE p.id = auth.uid() AND p.rol IN ('Yönetici','Ekip Üyesi')
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiller p
            WHERE p.id = auth.uid() AND p.rol IN ('Yönetici','Ekip Üyesi')
          )
        );
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END
$$;
