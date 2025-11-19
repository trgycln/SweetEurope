-- =====================================================
-- Waitlist/Ön Kayıt için ayrı tablo oluştur
-- Henüz kayıtlı kullanıcı olmayan potansiyel müşteriler için
-- =====================================================

-- waitlist tablosunu oluştur
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firma_adi TEXT NOT NULL,
    yetkili_kisi TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefon TEXT,
    notlar TEXT,
    kayit_tarihi TIMESTAMPTZ DEFAULT NOW(),
    durum TEXT DEFAULT 'beklemede' CHECK (durum IN ('beklemede', 'iletisim_kuruldu', 'musteri_oldu', 'iptal')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndeks ekle
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_durum ON public.waitlist(durum);
CREATE INDEX IF NOT EXISTS idx_waitlist_kayit_tarihi ON public.waitlist(kayit_tarihi DESC);

-- Yorumlar ekle
COMMENT ON TABLE public.waitlist IS 'Landing page üzerinden ön kayıt yapan potansiyel müşteriler';
COMMENT ON COLUMN public.waitlist.durum IS 'beklemede: Henüz iletişim kurulmadı, iletisim_kuruldu: İletişim kuruldu, musteri_oldu: Müşteri kaydı oluşturuldu, iptal: İptal edildi';

-- RLS aktif
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Herkes ekleme yapabilir (anonim kullanıcılar için)
DROP POLICY IF EXISTS waitlist_public_insert ON public.waitlist;
CREATE POLICY waitlist_public_insert ON public.waitlist
    FOR INSERT
    WITH CHECK (true);

-- Sadece adminler okuyabilir
DROP POLICY IF EXISTS waitlist_admin_select ON public.waitlist;
CREATE POLICY waitlist_admin_select ON public.waitlist
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiller p
            WHERE p.id = auth.uid() 
            AND p.rol IN ('Yönetici', 'Ekip Üyesi')
        )
    );

-- Sadece adminler güncelleyebilir
DROP POLICY IF EXISTS waitlist_admin_update ON public.waitlist;
CREATE POLICY waitlist_admin_update ON public.waitlist
    FOR UPDATE
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

-- Kontrol
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'waitlist'
ORDER BY ordinal_position;

-- Politikaları kontrol et
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'waitlist'
ORDER BY policyname;
