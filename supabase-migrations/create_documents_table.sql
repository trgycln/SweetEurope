-- =====================================================
-- Documents Management (Belge Yönetimi) Şeması
-- =====================================================

-- 1) Ana tablo: document_folders (Belgeler Klasörleri)
CREATE TABLE IF NOT EXISTS public.document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('gelen', 'gonderilen', 'diger')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Belgeler tablosu: documents
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL REFERENCES public.document_folders(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    description TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    downloaded_count INTEGER NOT NULL DEFAULT 0
);

-- Füge neue Spalten hinzu, falls die Tabelle bereits existiert
DO $$ 
BEGIN
    -- Erweiterte Metadaten
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'documents' 
                   AND column_name = 'document_subject') THEN
        ALTER TABLE public.documents ADD COLUMN document_subject TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'documents' 
                   AND column_name = 'sender') THEN
        ALTER TABLE public.documents ADD COLUMN sender TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'documents' 
                   AND column_name = 'recipient') THEN
        ALTER TABLE public.documents ADD COLUMN recipient TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'documents' 
                   AND column_name = 'reference_number') THEN
        ALTER TABLE public.documents ADD COLUMN reference_number TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'documents' 
                   AND column_name = 'document_date') THEN
        ALTER TABLE public.documents ADD COLUMN document_date DATE;
    END IF;
    
    -- Volltextsuche Spalte
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'documents' 
                   AND column_name = 'search_vector') THEN
        ALTER TABLE public.documents ADD COLUMN search_vector TSVECTOR 
        GENERATED ALWAYS AS (
            setweight(to_tsvector('german', coalesce(file_name, '')), 'A') ||
            setweight(to_tsvector('german', coalesce(document_subject, '')), 'A') ||
            setweight(to_tsvector('german', coalesce(description, '')), 'B') ||
            setweight(to_tsvector('german', coalesce(sender, '')), 'C') ||
            setweight(to_tsvector('german', coalesce(recipient, '')), 'C') ||
            setweight(to_tsvector('german', coalesce(reference_number, '')), 'D')
        ) STORED;
    END IF;
END $$;

-- 3) Document Activity Log (İsteğe bağlı - audit trail için)
CREATE TABLE IF NOT EXISTS public.document_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('uploaded', 'downloaded', 'deleted', 'moved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Indexler
CREATE INDEX IF NOT EXISTS idx_document_folders_owner ON public.document_folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_category ON public.document_folders(category);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON public.documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_created ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON public.documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_document_date ON public.documents(document_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_reference ON public.documents(reference_number);

-- Volltextsuche Index (SEHR WICHTIG für schnelle Suche)
CREATE INDEX IF NOT EXISTS idx_documents_search_vector ON public.documents USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_activity_log_document ON public.document_activity_log(document_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.document_activity_log(user_id);

-- =====================================================
-- Kommentare für Dokumentation
-- =====================================================
COMMENT ON TABLE public.document_folders IS 'Ordner für Dokumentenverwaltung (eingegangen, gesendet, sonstige)';
COMMENT ON TABLE public.documents IS 'Hochgeladene Dokumente mit Metadaten und Volltextsuche';
COMMENT ON TABLE public.document_activity_log IS 'Aktivitätsprotokoll für Dokumentenzugriffe';

COMMENT ON COLUMN public.document_folders.category IS 'Ordnerkategorie: gelen (eingegangen), gonderilen (gesendet), diger (sonstige)';
COMMENT ON COLUMN public.documents.tags IS 'Tags und Kategorien für Dokumente';
COMMENT ON COLUMN public.documents.description IS 'Hauptbeschreibung des Dokuments für Suche und Organisation';
COMMENT ON COLUMN public.documents.document_subject IS 'Betreff oder Titel des Dokuments';
COMMENT ON COLUMN public.documents.sender IS 'Absender (bei eingehenden Dokumenten)';
COMMENT ON COLUMN public.documents.recipient IS 'Empfänger (bei ausgehenden Dokumenten)';
COMMENT ON COLUMN public.documents.reference_number IS 'Referenz- oder Vorgangsnummer (z.B. Rechnungsnummer, Aktenzeichen)';
COMMENT ON COLUMN public.documents.document_date IS 'Datum des Dokuments selbst (nicht Upload-Datum)';
COMMENT ON COLUMN public.documents.search_vector IS 'Automatisch generierter Volltextsuch-Index mit gewichteten Feldern';

-- 6) RLS Etkinleştir
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_activity_log ENABLE ROW LEVEL SECURITY;

-- 7) Politikalar - Document Folders
DROP POLICY IF EXISTS document_folders_user_select ON public.document_folders;
CREATE POLICY document_folders_user_select ON public.document_folders
    FOR SELECT
    TO authenticated
    USING (owner_id = auth.uid());

DROP POLICY IF EXISTS document_folders_user_insert ON public.document_folders;
CREATE POLICY document_folders_user_insert ON public.document_folders
    FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS document_folders_user_update ON public.document_folders;
CREATE POLICY document_folders_user_update ON public.document_folders
    FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS document_folders_user_delete ON public.document_folders;
CREATE POLICY document_folders_user_delete ON public.document_folders
    FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid());

-- 8) Politikalar - Documents
DROP POLICY IF EXISTS documents_user_select ON public.documents;
CREATE POLICY documents_user_select ON public.documents
    FOR SELECT
    TO authenticated
    USING (owner_id = auth.uid());

DROP POLICY IF EXISTS documents_user_insert ON public.documents;
CREATE POLICY documents_user_insert ON public.documents
    FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS documents_user_update ON public.documents;
CREATE POLICY documents_user_update ON public.documents
    FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS documents_user_delete ON public.documents;
CREATE POLICY documents_user_delete ON public.documents
    FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid());

-- 9) Politikalar - Activity Log (users can only see their own)
DROP POLICY IF EXISTS activity_log_user_select ON public.document_activity_log;
CREATE POLICY activity_log_user_select ON public.document_activity_log
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS activity_log_user_insert ON public.document_activity_log;
CREATE POLICY activity_log_user_insert ON public.document_activity_log
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- Trigger für automatische Timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_document_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_document_folders_updated_at
BEFORE UPDATE ON public.document_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_document_folders_updated_at();

CREATE OR REPLACE FUNCTION public.update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_documents_updated_at();

-- =====================================================
-- Volltextsuche Funktion für einfache Verwendung
-- =====================================================
CREATE OR REPLACE FUNCTION public.search_documents(
    p_owner_id UUID,
    p_search_term TEXT,
    p_folder_id UUID DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    file_name TEXT,
    description TEXT,
    document_subject TEXT,
    sender TEXT,
    recipient TEXT,
    reference_number TEXT,
    document_date DATE,
    tags TEXT[],
    created_at TIMESTAMPTZ,
    similarity_rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.file_name,
        d.description,
        d.document_subject,
        d.sender,
        d.recipient,
        d.reference_number,
        d.document_date,
        d.tags,
        d.created_at,
        ts_rank(d.search_vector, to_tsquery('german', p_search_term)) AS similarity_rank
    FROM public.documents d
    WHERE d.owner_id = p_owner_id
        AND (p_folder_id IS NULL OR d.folder_id = p_folder_id)
        AND (p_date_from IS NULL OR d.document_date >= p_date_from)
        AND (p_date_to IS NULL OR d.document_date <= p_date_to)
        AND (p_tags IS NULL OR d.tags && p_tags)
        AND (
            p_search_term IS NULL 
            OR p_search_term = '' 
            OR d.search_vector @@ to_tsquery('german', p_search_term)
        )
    ORDER BY similarity_rank DESC, d.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.search_documents IS 'Volltextsuche für Dokumente mit Filterung nach Ordner, Datum und Tags';

