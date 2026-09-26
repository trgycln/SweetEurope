-- Migration: 20261001_smart_dms_columns.sql
-- Description: Add AI and Google Drive related columns to belgeler table for Smart DMS integration

ALTER TABLE belgeler
ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
ADD COLUMN IF NOT EXISTS drive_url TEXT,
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_tags TEXT[],
ADD COLUMN IF NOT EXISTS ai_metadata JSONB;

-- Update the view or any related functions if necessary (none required for simple column addition)
