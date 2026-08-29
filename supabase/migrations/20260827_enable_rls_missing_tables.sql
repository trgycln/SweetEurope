-- Enable RLS for the 4 tables flagged by Supabase Security Advisor

-- 1. ithalat_partileri
ALTER TABLE public.ithalat_partileri ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'ithalat_partileri'
      AND policyname = 'ithalat_partileri_auth_all'
  ) THEN
    CREATE POLICY "ithalat_partileri_auth_all" ON public.ithalat_partileri
      FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 2. ithalat_parti_kalemleri
ALTER TABLE public.ithalat_parti_kalemleri ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'ithalat_parti_kalemleri'
      AND policyname = 'ithalat_parti_kalemleri_auth_all'
  ) THEN
    CREATE POLICY "ithalat_parti_kalemleri_auth_all" ON public.ithalat_parti_kalemleri
      FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 3. birim_donusumleri
ALTER TABLE public.birim_donusumleri ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'birim_donusumleri'
      AND policyname = 'birim_donusumleri_select_all'
  ) THEN
    CREATE POLICY "birim_donusumleri_select_all" ON public.birim_donusumleri
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'birim_donusumleri'
      AND policyname = 'birim_donusumleri_auth_modify'
  ) THEN
    CREATE POLICY "birim_donusumleri_auth_modify" ON public.birim_donusumleri
      FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 4. urun_stok_hareket_loglari
ALTER TABLE public.urun_stok_hareket_loglari ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'urun_stok_hareket_loglari'
      AND policyname = 'urun_stok_hareket_loglari_auth_all'
  ) THEN
    CREATE POLICY "urun_stok_hareket_loglari_auth_all" ON public.urun_stok_hareket_loglari
      FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
END $$;
