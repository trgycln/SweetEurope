-- Add document_type column to documents table
-- This replaces the folder_id approach with a simple document_type field

-- Add document_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'document_type'
    ) THEN
        ALTER TABLE documents 
        ADD COLUMN document_type TEXT CHECK (document_type IN ('gelen', 'giden'));
        
        COMMENT ON COLUMN documents.document_type IS 'Type of document: gelen (incoming) or giden (outgoing)';
    END IF;
END $$;

-- Make folder_id nullable (for backward compatibility during transition)
ALTER TABLE documents 
ALTER COLUMN folder_id DROP NOT NULL;

-- Update existing records to have a default document_type if needed
-- You can customize this based on your existing folder structure
UPDATE documents 
SET document_type = 'gelen' 
WHERE document_type IS NULL AND folder_id IS NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_owner_type ON documents(owner_id, document_type);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'documents'
AND column_name IN ('document_type', 'folder_id')
ORDER BY column_name;
