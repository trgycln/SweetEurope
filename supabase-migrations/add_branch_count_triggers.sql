-- Migration: Add triggers to automatically update sube_sayisi
-- Date: 2026-02-21
-- Description: Maintains sube_sayisi count for parent companies

-- Trigger function to update parent firm's sube_sayisi when a branch is added/removed/updated
CREATE OR REPLACE FUNCTION public.update_parent_sube_count()
RETURNS TRIGGER AS $$
BEGIN
  -- When inserting or updating a branch (parent_firma_id is set)
  IF NEW.parent_firma_id IS NOT NULL THEN
    -- Update the parent firma's sube_sayisi
    UPDATE public.firmalar 
    SET sube_sayisi = (
      SELECT COUNT(*) 
      FROM public.firmalar 
      WHERE parent_firma_id = NEW.parent_firma_id
    )
    WHERE id = NEW.parent_firma_id;
  END IF;

  -- When deleting or updating a branch to remove parent relationship
  IF OLD.parent_firma_id IS NOT NULL AND (TG_OP = 'DELETE' OR NEW.parent_firma_id IS NULL) THEN
    -- Update the old parent firma's sube_sayisi
    UPDATE public.firmalar 
    SET sube_sayisi = (
      SELECT COUNT(*) 
      FROM public.firmalar 
      WHERE parent_firma_id = OLD.parent_firma_id
    )
    WHERE id = OLD.parent_firma_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT events
DROP TRIGGER IF EXISTS tr_update_sube_count_insert ON public.firmalar;
CREATE TRIGGER tr_update_sube_count_insert
AFTER INSERT ON public.firmalar
FOR EACH ROW
EXECUTE FUNCTION public.update_parent_sube_count();

-- Create trigger for UPDATE events
DROP TRIGGER IF EXISTS tr_update_sube_count_update ON public.firmalar;
CREATE TRIGGER tr_update_sube_count_update
AFTER UPDATE ON public.firmalar
FOR EACH ROW
EXECUTE FUNCTION public.update_parent_sube_count();

-- Create trigger for DELETE events
DROP TRIGGER IF EXISTS tr_update_sube_count_delete ON public.firmalar;
CREATE TRIGGER tr_update_sube_count_delete
AFTER DELETE ON public.firmalar
FOR EACH ROW
EXECUTE FUNCTION public.update_parent_sube_count();
