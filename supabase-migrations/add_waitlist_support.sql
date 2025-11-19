-- =====================================================
-- Waitlist için profiller tablosuna kayit_tipi sütunu ekle
-- Ön kayıt olan müşterileri ayırt edebilmek için
-- =====================================================

-- kayit_tipi sütununu ekle (eğer yoksa)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiller' 
        AND column_name = 'kayit_tipi'
    ) THEN
        ALTER TABLE public.profiller 
        ADD COLUMN kayit_tipi TEXT DEFAULT 'normal' CHECK (kayit_tipi IN ('normal', 'on_kayit', 'waitlist'));
        
        COMMENT ON COLUMN public.profiller.kayit_tipi IS 'Kayıt türü: normal (normal kayıt), on_kayit (ön kayıt - landing page), waitlist (bekleme listesi)';
    END IF;
END $$;

-- Mevcut kayıtları 'normal' olarak işaretle
UPDATE public.profiller 
SET kayit_tipi = 'normal' 
WHERE kayit_tipi IS NULL;

-- Ön kayıt yapan kullanıcılar için özel bir RLS politikası gerekmez
-- Çünkü bunlar henüz auth.users tablosunda yok
-- Bu yüzden INSERT için anonim erişim izni vermeliyiz

-- Anonim kullanıcıların ön kayıt yapabilmesi için politika
DROP POLICY IF EXISTS profiller_waitlist_insert ON public.profiller;

CREATE POLICY profiller_waitlist_insert ON public.profiller
    FOR INSERT
    WITH CHECK (
        kayit_tipi IN ('on_kayit', 'waitlist')
        AND aktif = false
    );

-- Kontrol
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiller'
AND column_name = 'kayit_tipi';

-- Politikaları kontrol et
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'profiller'
ORDER BY policyname;
