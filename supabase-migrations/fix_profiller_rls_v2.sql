-- =====================================================
-- FIX v2: profiller RLS - Infinite recursion çözümü
-- Admin politikasını kaldır, sadece kullanıcının kendi profili
-- =====================================================

-- Tüm politikaları temizle
DROP POLICY IF EXISTS profiller_select_own ON public.profiller;
DROP POLICY IF EXISTS profiller_update_own ON public.profiller;
DROP POLICY IF EXISTS profiller_insert_own ON public.profiller;
DROP POLICY IF EXISTS profiller_admin_all ON public.profiller;
DROP POLICY IF EXISTS "Kullanıcılar yalnızca kendi profilini okuyabilir" ON public.profiller;

-- BASİT VE GÜVENLİ POLİTİKALAR

-- 1. SELECT: Kendi profilini görebilir
CREATE POLICY profiller_select_own ON public.profiller
    FOR SELECT
    USING (auth.uid() = id);

-- 2. UPDATE: Kendi profilini güncelleyebilir (tercih_edilen_dil dahil)
CREATE POLICY profiller_update_own ON public.profiller
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. INSERT: Yeni profil oluştururken kendi ID'sini kullanmalı
CREATE POLICY profiller_insert_own ON public.profiller
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Politikaları kontrol et
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'profiller'
ORDER BY policyname;
