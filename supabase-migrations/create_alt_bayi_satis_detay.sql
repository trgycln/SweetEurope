-- alt_bayi_satis_detay tablosunu oluştur
CREATE TABLE IF NOT EXISTS public.alt_bayi_satis_detay (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    satis_id uuid NOT NULL,
    urun_id uuid NOT NULL,
    adet integer NOT NULL,
    birim_fiyat_net numeric NOT NULL,
    toplam_fiyat_net numeric GENERATED ALWAYS AS ((adet * birim_fiyat_net)) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT alt_bayi_satis_detay_pkey PRIMARY KEY (id),
    CONSTRAINT alt_bayi_satis_detay_satis_id_fkey FOREIGN KEY (satis_id) REFERENCES alt_bayi_satislar(id) ON DELETE CASCADE,
    CONSTRAINT alt_bayi_satis_detay_urun_id_fkey FOREIGN KEY (urun_id) REFERENCES urunler(id)
);

-- RLS'i etkinleştir
ALTER TABLE public.alt_bayi_satis_detay ENABLE ROW LEVEL SECURITY;

-- Satış detaylarını sadece ilgili bayi ve ana bayi görebilir
CREATE POLICY "select_alt_bayi_satis_detay"
ON public.alt_bayi_satis_detay
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM alt_bayi_satislar satis
    WHERE satis.id = alt_bayi_satis_detay.satis_id AND satis.bayi_firma_id = auth.uid()
  )
);

-- Bayi kendi satış detaylarını ekleyebilir
CREATE POLICY "insert_alt_bayi_satis_detay"
ON public.alt_bayi_satis_detay
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM alt_bayi_satislar satis
    WHERE satis.id = alt_bayi_satis_detay.satis_id AND satis.bayi_firma_id = auth.uid()
  )
);

-- Not: Update ve Delete policy'leri şimdilik eklenmemiştir. 
-- Bu işlemler genellikle daha karmaşık iş kuralları gerektirir (örn: iade).
