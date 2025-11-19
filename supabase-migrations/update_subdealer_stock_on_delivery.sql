-- Update sub-dealer stock when an order is delivered
BEGIN;

-- Function: increment sub-dealer stock on delivered orders
CREATE OR REPLACE FUNCTION public.fn_increment_subdealer_stock_on_delivery()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
BEGIN
  -- Only run when status transitions to delivered
  IF TG_OP = 'UPDATE' AND NEW.siparis_durumu IN ('Teslim Edildi','delivered') AND (OLD.siparis_durumu IS DISTINCT FROM NEW.siparis_durumu) THEN
    v_creator := NEW.olusturan_kullanici_id;
    IF v_creator IS NULL THEN
      RETURN NEW;
    END IF;

    -- Ensure the creator is an Alt Bayi
    IF NOT EXISTS (
      SELECT 1 FROM public.profiller p WHERE p.id = v_creator AND p.rol = 'Alt Bayi'
    ) THEN
      RETURN NEW;
    END IF;

    -- Aggregate order items and upsert into alt_bayi_stoklari
    INSERT INTO public.alt_bayi_stoklari (sahip_id, urun_id, miktar, updated_at)
    SELECT v_creator, sd.urun_id, SUM(sd.miktar)::int AS miktar, now()
    FROM public.siparis_detay sd
    WHERE sd.siparis_id = NEW.id
    GROUP BY sd.urun_id
    ON CONFLICT (sahip_id, urun_id)
    DO UPDATE SET miktar = public.alt_bayi_stoklari.miktar + EXCLUDED.miktar,
                  updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on siparisler table
DROP TRIGGER IF EXISTS trg_increment_subdealer_stock_on_delivery ON public.siparisler;
CREATE TRIGGER trg_increment_subdealer_stock_on_delivery
AFTER UPDATE ON public.siparisler
FOR EACH ROW
EXECUTE FUNCTION public.fn_increment_subdealer_stock_on_delivery();

COMMIT;