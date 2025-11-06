-- =====================================================
-- FIX: profiller tablosu RLS politikalarını düzelt
-- Kullanıcılar kendi profillerini güncelleyebilmeli
-- =====================================================

-- Önce mevcut politikaları kontrol et
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiller';

-- Eğer yoksa, profiller tablosu için RLS aktif mi kontrol et
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiller' AND schemaname = 'public';

-- RLS'i aktifleştir (zaten aktifse bir şey olmaz)
ALTER TABLE public.profiller ENABLE ROW LEVEL SECURITY;

-- Mevcut politikaları temizle (eğer varsa)
DROP POLICY IF EXISTS profiller_select_own ON public.profiller;
DROP POLICY IF EXISTS profiller_update_own ON public.profiller;
DROP POLICY IF EXISTS profiller_insert_own ON public.profiller;
DROP POLICY IF EXISTS profiller_admin_all ON public.profiller;

-- YENİ POLİTİKALAR: Kullanıcılar sadece kendi profillerini görebilir ve güncelleyebilir

-- 1. SELECT: Kendi profilini görebilir
CREATE POLICY profiller_select_own ON public.profiller
    FOR SELECT
    USING (auth.uid() = id);

-- 2. UPDATE: Kendi profilini güncelleyebilir
CREATE POLICY profiller_update_own ON public.profiller
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. INSERT: Yeni profil oluştururken kendi ID'sini kullanmalı
CREATE POLICY profiller_insert_own ON public.profiller
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Admin'ler için özel politika (opsiyonel - eğer adminler tüm profilleri görmek istiyorsa)
CREATE POLICY profiller_admin_all ON public.profiller
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiller p
            WHERE p.id = auth.uid() 
            AND p.rol IN ('Yönetici', 'Ekip Üyesi')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiller p
            WHERE p.id = auth.uid() 
            AND p.rol IN ('Yönetici', 'Ekip Üyesi')
        )
    );

-- Politikaları kontrol et
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'profiller'
ORDER BY policyname;
