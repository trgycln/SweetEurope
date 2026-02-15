-- Migration: Update oncelik constraint to include 'D'
-- Date: 2026-02-15
-- Description: Allows oncelik field to accept 'D' category

ALTER TABLE firmalar
DROP CONSTRAINT firmalar_oncelik_check;

ALTER TABLE firmalar
ADD CONSTRAINT firmalar_oncelik_check CHECK (oncelik IN ('A', 'B', 'C', 'D'));
