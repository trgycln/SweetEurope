-- ============================================================
-- belge_klasorleri tablosuna Google Drive klasör ID kolonu ekle
-- Her belge kategorisi kendi Drive alt klasörüne yüklenir
-- ============================================================

ALTER TABLE public.belge_klasorleri
ADD COLUMN IF NOT EXISTS drive_folder_id TEXT DEFAULT NULL;

COMMENT ON COLUMN public.belge_klasorleri.drive_folder_id IS 
  'Google Drive''daki karşılık gelen alt klasörün ID''si. NULL ise ana GOOGLE_DRIVE_FOLDER_ID kullanılır.';
