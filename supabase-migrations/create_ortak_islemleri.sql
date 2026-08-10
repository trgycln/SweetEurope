CREATE TABLE IF NOT EXISTS public.ortak_islemleri (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ortak_id UUID NOT NULL REFERENCES public.profiller(id) ON DELETE CASCADE,
    tarih DATE NOT NULL DEFAULT CURRENT_DATE,
    islem_tipi TEXT NOT NULL CHECK (islem_tipi IN ('Sermaye Ekleme', 'Maaş Tahakkuku', 'Şirket İçin Cepten Harcama', 'Şahsi Harcama / Avans', 'Maaş / Nakit Çıkışı', 'Kar Payı / Temettü', 'Sermaye Çıkışı')),
    tutar DECIMAL(12, 2) NOT NULL,
    aciklama TEXT,
    islem_yapan_kullanici_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.ortak_islemleri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Yöneticiler her şeyi görebilir ve düzenleyebilir" 
ON public.ortak_islemleri
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiller
        WHERE profiller.id = auth.uid() AND profiller.rol = 'Yönetici'
    )
);

CREATE POLICY "Kullanıcılar kendi işlemlerini görebilir" 
ON public.ortak_islemleri
FOR SELECT 
TO authenticated 
USING (
    ortak_id = auth.uid() OR islem_yapan_kullanici_id = auth.uid()
);
