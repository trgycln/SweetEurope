-- Bayi hedefleri: her bayi (firma) kendi aylık hedeflerini saklar ve düzenler
CREATE TABLE IF NOT EXISTS public.bayi_hedefleri (
  firma_id UUID PRIMARY KEY REFERENCES public.firmalar(id) ON DELETE CASCADE,
  hedef_ciro NUMERIC(12, 2) NOT NULL DEFAULT 10000,
  hedef_musteri INTEGER NOT NULL DEFAULT 3,
  hedef_siparis INTEGER NOT NULL DEFAULT 10,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bayi_hedefleri ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  BEGIN
    CREATE POLICY bayi_hedefleri_admin_full ON public.bayi_hedefleri
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiller p
          WHERE p.id = auth.uid() AND p.rol = 'Yönetici'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiller p
          WHERE p.id = auth.uid() AND p.rol = 'Yönetici'
        )
      );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    CREATE POLICY bayi_hedefleri_select_own ON public.bayi_hedefleri
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiller p
          WHERE p.id = auth.uid() AND p.firma_id = bayi_hedefleri.firma_id
        )
      );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    CREATE POLICY bayi_hedefleri_insert_own ON public.bayi_hedefleri
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiller p
          WHERE p.id = auth.uid() AND p.firma_id = bayi_hedefleri.firma_id
        )
      );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    CREATE POLICY bayi_hedefleri_update_own ON public.bayi_hedefleri
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiller p
          WHERE p.id = auth.uid() AND p.firma_id = bayi_hedefleri.firma_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiller p
          WHERE p.id = auth.uid() AND p.firma_id = bayi_hedefleri.firma_id
        )
      );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$$;

CREATE OR REPLACE FUNCTION update_bayi_hedefleri_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bayi_hedefleri_updated_at ON public.bayi_hedefleri;
CREATE TRIGGER trigger_bayi_hedefleri_updated_at
  BEFORE UPDATE ON public.bayi_hedefleri
  FOR EACH ROW
  EXECUTE FUNCTION update_bayi_hedefleri_updated_at();
