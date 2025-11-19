-- =====================================================
-- Sample Requests (Numune Talepleri) Şeması
-- =====================================================

-- 1) Ana tablo: sample_requests
CREATE TABLE IF NOT EXISTS public.sample_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    waitlist_id UUID NOT NULL REFERENCES public.waitlist(id) ON DELETE CASCADE,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'beklemede' CHECK (status IN ('beklemede','gorusuldu','gonderildi','iptal')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Kalemler: sample_request_items
CREATE TABLE IF NOT EXISTS public.sample_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.sample_requests(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.urunler(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) Indexler
CREATE INDEX IF NOT EXISTS idx_sample_requests_waitlist ON public.sample_requests(waitlist_id);
CREATE INDEX IF NOT EXISTS idx_sample_requests_status ON public.sample_requests(status);
CREATE INDEX IF NOT EXISTS idx_sample_requests_created ON public.sample_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sample_request_items_request ON public.sample_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_sample_request_items_product ON public.sample_request_items(product_id);

-- 4) Yorumlar
COMMENT ON TABLE public.sample_requests IS 'Ziyaretçilerin numune taleplerinin başlık kayıtları';
COMMENT ON TABLE public.sample_request_items IS 'Numune talepleri içindeki ürün kalemleri';

-- 5) RLS Etkinleştir
ALTER TABLE public.sample_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_request_items ENABLE ROW LEVEL SECURITY;

-- 6) Politikalar
-- Kamuya açık ekleme (landing/public): anonim kullanıcılar server action ile ekleyebilsin
DROP POLICY IF EXISTS sample_requests_public_insert ON public.sample_requests;
CREATE POLICY sample_requests_public_insert ON public.sample_requests
    FOR INSERT
    TO public
    WITH CHECK (true);

DROP POLICY IF EXISTS sample_request_items_public_insert ON public.sample_request_items;
CREATE POLICY sample_request_items_public_insert ON public.sample_request_items
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Yalnızca adminler görüntüleyebilsin
DROP POLICY IF EXISTS sample_requests_admin_select ON public.sample_requests;
CREATE POLICY sample_requests_admin_select ON public.sample_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiller p
            WHERE p.id = auth.uid() AND p.rol IN ('Yönetici','Ekip Üyesi')
        )
    );

DROP POLICY IF EXISTS sample_request_items_admin_select ON public.sample_request_items;
CREATE POLICY sample_request_items_admin_select ON public.sample_request_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiller p
            WHERE p.id = auth.uid() AND p.rol IN ('Yönetici','Ekip Üyesi')
        )
    );

-- Yalnızca adminler güncelleyebilsin
DROP POLICY IF EXISTS sample_requests_admin_update ON public.sample_requests;
CREATE POLICY sample_requests_admin_update ON public.sample_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiller p
            WHERE p.id = auth.uid() AND p.rol IN ('Yönetici','Ekip Üyesi')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiller p
            WHERE p.id = auth.uid() AND p.rol IN ('Yönetici','Ekip Üyesi')
        )
    );

-- 7) updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_on_sample_requests ON public.sample_requests;
CREATE TRIGGER set_timestamp_on_sample_requests
BEFORE UPDATE ON public.sample_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
