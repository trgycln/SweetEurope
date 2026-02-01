// scripts/check-storage-bucket.mjs
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Umgebungsvariablen fehlen!');
    console.error('Benötigt: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndCreateBucket() {
    console.log('🔍 Prüfe Storage Bucket "documents"...\n');

    // Prüfe, ob Bucket existiert
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
        console.error('❌ Fehler beim Abrufen der Buckets:', listError);
        return;
    }

    const documentsBucket = buckets.find(b => b.name === 'documents');

    if (documentsBucket) {
        console.log('✅ Storage Bucket "documents" existiert bereits!');
        console.log(`   ID: ${documentsBucket.id}`);
        console.log(`   Public: ${documentsBucket.public}`);
        console.log(`   Erstellt: ${documentsBucket.created_at}\n`);

        // Prüfe Policies
        console.log('🔍 Prüfe Storage Policies...\n');
        console.log('ℹ️  Policies müssen manuell im Supabase Dashboard überprüft werden.');
        console.log('   Storage → documents → Policies\n');
        
        return;
    }

    console.log('❌ Storage Bucket "documents" existiert NICHT!\n');
    console.log('📋 Manuell erstellen:');
    console.log('   1. Gehe zu Supabase Dashboard → Storage');
    console.log('   2. Klicke "New Bucket"');
    console.log('   3. Name: documents');
    console.log('   4. Public: NEIN (privat!)');
    console.log('   5. File size limit: 52428800 (50 MB)');
    console.log('   6. Allowed MIME types: * (alle erlauben)\n');

    console.log('📋 Policies hinzufügen (im SQL Editor):');
    console.log(`
-- Benutzer können eigene Dokumente hochladen
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Benutzer können eigene Dokumente lesen
CREATE POLICY "Users can read their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Benutzer können eigene Dokumente löschen
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
`);
}

async function checkTables() {
    console.log('🔍 Prüfe Datenbank-Tabellen...\n');

    // Prüfe document_folders
    const { data: folders, error: foldersError } = await supabase
        .from('document_folders')
        .select('id')
        .limit(1);

    if (foldersError) {
        console.error('❌ Tabelle "document_folders" existiert nicht oder ist nicht zugänglich!');
        console.error('   Fehler:', foldersError.message);
        console.log('   → Führe die SQL-Migration aus: supabase-migrations/create_documents_table.sql\n');
    } else {
        console.log('✅ Tabelle "document_folders" existiert');
    }

    // Prüfe documents
    const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('id, document_subject, sender, recipient, reference_number, document_date')
        .limit(1);

    if (docsError) {
        console.error('❌ Tabelle "documents" hat Fehler!');
        console.error('   Fehler:', docsError.message);
        
        if (docsError.message.includes('column') && docsError.message.includes('does not exist')) {
            console.log('   → Die neuen Spalten fehlen!');
            console.log('   → Führe die SQL-Migration erneut aus: supabase-migrations/create_documents_table.sql\n');
        }
    } else {
        console.log('✅ Tabelle "documents" existiert mit allen Spalten\n');
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('   Dokumentenverwaltung - System-Check');
    console.log('═══════════════════════════════════════════════════\n');

    await checkTables();
    await checkAndCreateBucket();

    console.log('═══════════════════════════════════════════════════');
    console.log('   Check abgeschlossen!');
    console.log('═══════════════════════════════════════════════════\n');
}

main().catch(console.error);
