-- =====================================================
-- Waitlist tablosuna firma_id kolonu ekle
-- Waitlist kaydı yapıldığında otomatik firmalar tablosuna da kayıt yapılacak
-- =====================================================

-- firma_id kolonunu ekle
ALTER TABLE public.waitlist 
ADD COLUMN IF NOT EXISTS firma_id UUID REFERENCES public.firmalar(id) ON DELETE SET NULL;

-- Index ekle
CREATE INDEX IF NOT EXISTS idx_waitlist_firma_id ON public.waitlist(firma_id);

-- Yorum ekle
COMMENT ON COLUMN public.waitlist.firma_id IS 'Waitlist kaydı yapıldığında oluşturulan potansiyel firma kaydının ID si';
