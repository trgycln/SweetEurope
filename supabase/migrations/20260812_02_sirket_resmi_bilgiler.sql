-- Migration: Create sirket_resmi_bilgiler table for Secure Company Vault

CREATE TABLE IF NOT EXISTS public.sirket_resmi_bilgiler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kategori TEXT NOT NULL,
    baslik TEXT NOT NULL,
    deger TEXT NOT NULL,
    sira INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sirket_resmi_bilgiler ENABLE ROW LEVEL SECURITY;

-- Policy: Only 'Yönetici' can SELECT
CREATE POLICY "Yöneticiler sirket resmi bilgilerini görebilir"
ON public.sirket_resmi_bilgiler
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiller
        WHERE id = auth.uid() AND rol = 'Yönetici'
    )
);

-- Policy: Only 'Yönetici' can INSERT
CREATE POLICY "Yöneticiler sirket resmi bilgisi ekleyebilir"
ON public.sirket_resmi_bilgiler
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiller
        WHERE id = auth.uid() AND rol = 'Yönetici'
    )
);

-- Policy: Only 'Yönetici' can UPDATE
CREATE POLICY "Yöneticiler sirket resmi bilgilerini güncelleyebilir"
ON public.sirket_resmi_bilgiler
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiller
        WHERE id = auth.uid() AND rol = 'Yönetici'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiller
        WHERE id = auth.uid() AND rol = 'Yönetici'
    )
);

-- Policy: Only 'Yönetici' can DELETE
CREATE POLICY "Yöneticiler sirket resmi bilgilerini silebilir"
ON public.sirket_resmi_bilgiler
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiller
        WHERE id = auth.uid() AND rol = 'Yönetici'
    )
);
