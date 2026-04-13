-- EUR-only procurement flow + supplier-order relation on import batches
-- Date: 2026-04-12

BEGIN;

ALTER TABLE public.ithalat_partileri
  ADD COLUMN IF NOT EXISTS supplier_order_plan_record_id text;

CREATE INDEX IF NOT EXISTS idx_ithalat_partileri_supplier_order_plan_record_id
  ON public.ithalat_partileri (supplier_order_plan_record_id);

-- EUR is now fixed for this flow; remove mutable currency fields.
ALTER TABLE public.ithalat_partileri
  DROP COLUMN IF EXISTS para_birimi,
  DROP COLUMN IF EXISTS kur_orani;

COMMIT;
