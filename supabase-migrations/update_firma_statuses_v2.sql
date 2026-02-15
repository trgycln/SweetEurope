-- Migration: Reduce firmalar status set to the new CRM list
-- Date: 2026-02-15
-- Description: Adds 'NUMUNE VERİLDİ' and normalizes existing statuses

-- 1) Add the new enum value (if it does not exist)
DO $$
BEGIN
  ALTER TYPE public.firma_status ADD VALUE IF NOT EXISTS 'NUMUNE VERİLDİ';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Normalize all existing status values to the new set
UPDATE firmalar
SET status = CASE
  WHEN status::text IN ('Temas Kuruldu', 'TEMAS EDİLDİ') THEN 'TEMAS EDİLDİ'::firma_status
  WHEN status::text = 'NUMUNE VERİLDİ' THEN 'NUMUNE VERİLDİ'::firma_status
  WHEN status::text IN ('Müşteri', 'MÜŞTERİ') THEN 'MÜŞTERİ'::firma_status
  WHEN status::text IN ('Reddedildi', 'REDDEDİLDİ') THEN 'REDDEDİLDİ'::firma_status
  WHEN status::text IN ('Pasif', 'PASİF') THEN 'REDDEDİLDİ'::firma_status
  WHEN status::text IN ('ISITILIYOR', 'İLETİŞİMDE', 'POTANSİYEL', 'Takipte', 'İletişimde') THEN 'ADAY'::firma_status
  WHEN status::text IN ('Aday', 'ADAY') THEN 'ADAY'::firma_status
  ELSE 'ADAY'::firma_status
END;
