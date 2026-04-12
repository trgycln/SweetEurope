-- Ekip Üyesi rolünü aktif kullanımdan çıkarıp mevcut kayıtları Personel rolüne taşır.
-- Not: PostgreSQL enum değerini kaldırmak ayrı bir operasyon gerektirir; uygulama tarafında artık yeni Ekip Üyesi oluşturulmaz.

BEGIN;

UPDATE public.profiller
SET rol = 'Personel'
WHERE rol = 'Ekip Üyesi';

COMMIT;
