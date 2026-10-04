
-- Dahili Stok Hareketleri Tablosu
CREATE TABLE public.dahili_stok_hareketleri (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    urun_id UUID NOT NULL REFERENCES public.urunler(id),
    miktar INTEGER NOT NULL CHECK (miktar > 0),
    neden_kodu VARCHAR(50) NOT NULL, -- '101_numune', '102_ofis_tuketim', '103_sahsi_kullanim', '104_fire', '105_diger'
    firma_id UUID REFERENCES public.firmalar(id), -- Numune verildiyse hangi firmaya verildi? (Opsiyonel)
    aciklama TEXT,
    olusturan_kullanici_id UUID REFERENCES auth.users(id),
    lexware_belge_id VARCHAR(255),
    lexware_belge_no VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Politikaları
ALTER TABLE public.dahili_stok_hareketleri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Yöneticiler ve personeller tüm hareketleri görebilir" 
    ON public.dahili_stok_hareketleri FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiller
            WHERE profiller.id = auth.uid() 
            AND profiller.rol IN ('Yönetici', 'Personel')
        )
    );

CREATE POLICY "Sadece personeller ve yöneticiler ekleyebilir" 
    ON public.dahili_stok_hareketleri FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiller
            WHERE profiller.id = auth.uid() 
            AND profiller.rol IN ('Yönetici', 'Personel')
        )
    );

-- Stok Düşümü İçin Trigger
CREATE OR REPLACE FUNCTION dahili_cikis_stok_dus()
RETURNS TRIGGER AS \$\$
BEGIN
    -- Urunler tablosundaki stoğu düş
    UPDATE public.urunler
    SET stok_miktari = GREATEST(0, stok_miktari - NEW.miktar)
    WHERE id = NEW.urun_id;
    
    RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

CREATE TRIGGER tr_dahili_cikis_stok_dus
AFTER INSERT ON public.dahili_stok_hareketleri
FOR EACH ROW
EXECUTE FUNCTION dahili_cikis_stok_dus();
