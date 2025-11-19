-- Sample Requests schema migration (idempotent)
-- Creates sample_requests and sample_request_items tables + RLS policies
-- Safe to re-run.

-- Ensure pgcrypto for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- sample_requests table
CREATE TABLE IF NOT EXISTS public.sample_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    waitlist_id uuid NOT NULL REFERENCES public.waitlist(id) ON DELETE CASCADE,
    note text,
    status text NOT NULL DEFAULT 'beklemede' CHECK (status IN ('beklemede','gorusuldu','gonderildi','iptal')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- sample_request_items table
CREATE TABLE IF NOT EXISTS public.sample_request_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid NOT NULL REFERENCES public.sample_requests(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.urunler(id) ON DELETE RESTRICT,
    quantity integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sample_requests_waitlist ON public.sample_requests(waitlist_id);
CREATE INDEX IF NOT EXISTS idx_sample_requests_status ON public.sample_requests(status);
CREATE INDEX IF NOT EXISTS idx_sample_requests_created ON public.sample_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sample_request_items_request ON public.sample_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_sample_request_items_product ON public.sample_request_items(product_id);

-- Enable RLS
ALTER TABLE public.sample_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_request_items ENABLE ROW LEVEL SECURITY;

-- Insert policies (public can insert)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sample_requests' AND policyname = 'sample_requests_public_insert'
  ) THEN
    CREATE POLICY sample_requests_public_insert ON public.sample_requests FOR INSERT TO public WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sample_request_items' AND policyname = 'sample_request_items_public_insert'
  ) THEN
    CREATE POLICY sample_request_items_public_insert ON public.sample_request_items FOR INSERT TO public WITH CHECK (true);
  END IF;
END $$;

-- Admin select policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sample_requests' AND policyname = 'sample_requests_admin_select'
  ) THEN
    CREATE POLICY sample_requests_admin_select ON public.sample_requests FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.profiller p WHERE p.id = auth.uid() AND p.rol IN ('Yönetici','Ekip Üyesi')
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sample_request_items' AND policyname = 'sample_request_items_admin_select'
  ) THEN
    CREATE POLICY sample_request_items_admin_select ON public.sample_request_items FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.profiller p WHERE p.id = auth.uid() AND p.rol IN ('Yönetici','Ekip Üyesi')
      )
    );
  END IF;
END $$;

-- Admin update policy for sample_requests
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sample_requests' AND policyname = 'sample_requests_admin_update'
  ) THEN
    CREATE POLICY sample_requests_admin_update ON public.sample_requests FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.profiller p WHERE p.id = auth.uid() AND p.rol IN ('Yönetici','Ekip Üyesi')
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiller p WHERE p.id = auth.uid() AND p.rol IN ('Yönetici','Ekip Üyesi')
      )
    );
  END IF;
END $$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_on_sample_requests ON public.sample_requests;
CREATE TRIGGER set_timestamp_on_sample_requests BEFORE UPDATE ON public.sample_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
