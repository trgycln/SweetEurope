# Supabase Setup für Dokumentenverwaltung

## 1. SQL Migration ausführen

Gehen Sie zum **SQL Editor** im Supabase Dashboard und führen Sie die Datei aus:
- `supabase-migrations/create_documents_table.sql`

Das erstellt alle notwendigen Tabellen und Spalten.

## 2. Storage Bucket erstellen

**WICHTIG:** Der Bucket muss existieren, sonst schlägt der Upload fehl!

### Schritte:
1. Gehen Sie zu **Storage** im Supabase Dashboard
2. Klicken Sie auf **New Bucket**
3. Bucket-Name: `documents`
4. **Public:** NEIN (Bucket muss privat sein!)
5. Klicken Sie auf **Create Bucket**

### Storage Policy erstellen

Nach dem Erstellen des Buckets müssen Sie RLS-Policies hinzufügen:

```sql
-- Policy: Benutzer können eigene Dokumente hochladen
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Benutzer können eigene Dokumente lesen
CREATE POLICY "Users can read their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Benutzer können eigene Dokumente löschen
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## 3. Prüfen, ob alles funktioniert

### Tabellen prüfen:
```sql
SELECT * FROM public.document_folders;
SELECT * FROM public.documents;
```

### Storage Bucket prüfen:
```sql
SELECT * FROM storage.buckets WHERE name = 'documents';
```

## Häufige Fehler

### "Upload failed: Storage error"
- **Ursache:** Bucket "documents" existiert nicht
- **Lösung:** Bucket erstellen (siehe Schritt 2)

### "Folder not found"
- **Ursache:** Kein Ordner erstellt oder Ordner gehört anderem Benutzer
- **Lösung:** Erst einen Ordner erstellen in der Dokumentenverwaltung

### "Database error: column does not exist"
- **Ursache:** SQL-Migration wurde nicht ausgeführt
- **Lösung:** SQL-Migration ausführen (siehe Schritt 1)

### "permission denied for table documents"
- **Ursache:** RLS-Policies fehlen
- **Lösung:** SQL-Migration enthält bereits alle Policies - erneut ausführen

## Test-Workflow

1. ✅ SQL Migration ausführen
2. ✅ Storage Bucket "documents" erstellen
3. ✅ Storage Policies hinzufügen
4. ✅ In der App: Ordner erstellen
5. ✅ Dokument hochladen
6. ✅ Im Supabase Storage prüfen: `documents/[user_id]/[folder_id]/`

## Zusätzliche Informationen

- Maximale Dateigröße: **50 MB**
- Unterstützte Formate: **Alle** (PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, ZIP, etc.)
- Speicherpfad: `documents/{user_id}/{folder_id}/{timestamp}-{filename}`
