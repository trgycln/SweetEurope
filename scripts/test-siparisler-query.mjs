// Test-Skript für Siparisler Query
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env.local laden
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase URL oder Key fehlt in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQueries() {
    console.log('🔍 Teste verschiedene Query-Syntaxen...\n');

    // Test 1: Einfache Query ohne Join
    console.log('Test 1: Ohne Join');
    const { data: test1, error: error1 } = await supabase
        .from('siparisler')
        .select('id, siparis_tarihi, firma_id, toplam_tutar_brut')
        .limit(2);
    
    if (error1) {
        console.error('❌ Fehler:', JSON.stringify(error1, null, 2));
    } else {
        console.log('✅ Erfolg! Anzahl:', test1?.length);
        console.log('Beispiel:', test1?.[0]);
    }

    // Test 2: Join mit firmalar (automatisch)
    console.log('\nTest 2: Join mit firmalar (automatisch)');
    const { data: test2, error: error2 } = await supabase
        .from('siparisler')
        .select(`
            id,
            siparis_tarihi,
            firmalar (
                unvan
            )
        `)
        .limit(2);
    
    if (error2) {
        console.error('❌ Fehler:', JSON.stringify(error2, null, 2));
    } else {
        console.log('✅ Erfolg! Anzahl:', test2?.length);
        console.log('Beispiel:', JSON.stringify(test2?.[0], null, 2));
    }

    // Test 3: Join mit explizitem Foreign Key
    console.log('\nTest 3: Join mit firmalar!firma_id');
    const { data: test3, error: error3 } = await supabase
        .from('siparisler')
        .select(`
            id,
            siparis_tarihi,
            firmalar!firma_id (
                unvan
            )
        `)
        .limit(2);
    
    if (error3) {
        console.error('❌ Fehler:', JSON.stringify(error3, null, 2));
    } else {
        console.log('✅ Erfolg! Anzahl:', test3?.length);
        console.log('Beispiel:', JSON.stringify(test3?.[0], null, 2));
    }

    // Test 4: Alle Felder mit Join
    console.log('\nTest 4: Alle Felder (*) mit Join');
    const { data: test4, error: error4 } = await supabase
        .from('siparisler')
        .select(`
            *,
            firmalar (
                unvan
            )
        `)
        .limit(2);
    
    if (error4) {
        console.error('❌ Fehler:');
        console.error('Message:', error4.message);
        console.error('Details:', error4.details);
        console.error('Hint:', error4.hint);
        console.error('Code:', error4.code);
        console.error('Full:', JSON.stringify(error4, null, 2));
    } else {
        console.log('✅ Erfolg! Anzahl:', test4?.length);
        if (test4?.[0]) {
            console.log('Felder:', Object.keys(test4[0]));
            console.log('Firma-Daten:', test4[0].firmalar);
        }
    }

    // Test 5: Prüfen ob firmalar Tabelle existiert
    console.log('\nTest 5: Firmen-Tabelle direkt');
    const { data: test5, error: error5 } = await supabase
        .from('firmalar')
        .select('id, unvan')
        .limit(2);
    
    if (error5) {
        console.error('❌ Fehler:', JSON.stringify(error5, null, 2));
    } else {
        console.log('✅ Erfolg! Anzahl:', test5?.length);
        console.log('Beispiel:', test5?.[0]);
    }
}

testQueries().catch(console.error);
