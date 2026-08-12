-- Migration: Add onemli_mi column to sirket_resmi_bilgiler

ALTER TABLE public.sirket_resmi_bilgiler ADD COLUMN onemli_mi BOOLEAN DEFAULT false;
