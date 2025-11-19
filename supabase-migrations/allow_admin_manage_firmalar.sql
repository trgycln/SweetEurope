-- Adminlerin firmalar üzerinde UPDATE/DELETE yetkisi
BEGIN;

-- Mevcut varsa temizle
DROP POLICY IF EXISTS "Yöneticiler firmaları güncelleyebilir" ON public.firmalar;
DROP POLICY IF EXISTS "Yöneticiler firmaları silebilir" ON public.firmalar;

-- Adminler tüm firmaları UPDATE edebilir
CREATE POLICY "Yöneticiler firmaları güncelleyebilir" ON public.firmalar
FOR UPDATE USING (get_my_role() = 'Yönetici') WITH CHECK (get_my_role() = 'Yönetici');

-- Adminler tüm firmaları DELETE edebilir
CREATE POLICY "Yöneticiler firmaları silebilir" ON public.firmalar
FOR DELETE USING (get_my_role() = 'Yönetici');

COMMIT;
