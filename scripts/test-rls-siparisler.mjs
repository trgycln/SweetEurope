// Test mit Service Role Key (umgeht RLS)
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    console.error('❌ Supabase URL fehlt');
    process.exit(1);
}

async function testWithServiceRole() {
    if (!supabaseServiceKey) {
        console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY nicht gefunden, überspringe Service Role Test\n');
    } else {
        console.log('🔑 Teste mit Service Role Key (umgeht RLS)...\n');
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error, count } = await supabaseAdmin
            .from('siparisler')
            .select('*', { count: 'exact' })
            .limit(3);
        
        if (error) {
            console.error('❌ Service Role Fehler:', JSON.stringify(error, null, 2));
        } else {
            console.log(`✅ Service Role: ${count} Bestellungen gefunden`);
            if (data && data.length > 0) {
                console.log('Beispiel-Felder:', Object.keys(data[0]));
            }
        }
    }
}

async function testWithAnonKey() {
    console.log('\n🔓 Teste mit Anon Key (respektiert RLS)...\n');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error, count } = await supabase
        .from('siparisler')
        .select('*', { count: 'exact' })
        .limit(3);
    
    if (error) {
        console.error('❌ Anon Key Fehler:', JSON.stringify(error, null, 2));
    } else {
        console.log(`✅ Anon Key: ${count} Bestellungen gefunden`);
        if (data && data.length > 0) {
            console.log('Beispiel-Felder:', Object.keys(data[0]));
        } else {
            console.log('⚠️  Keine Daten zurückgegeben - möglicherweise RLS-Problem');
        }
    }
}

async function checkFirmalarTable() {
    console.log('\n📋 Prüfe Firmalar-Tabelle...\n');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error, count } = await supabase
        .from('firmalar')
        .select('id, unvan', { count: 'exact' })
        .limit(3);
    
    if (error) {
        console.error('❌ Firmalar Fehler:', JSON.stringify(error, null, 2));
    } else {
        console.log(`✅ ${count} Firmen gefunden`);
        if (data && data.length > 0) {
            console.log('Beispiel:', data[0]);
        }
    }
}

async function runTests() {
    await testWithServiceRole();
    await testWithAnonKey();
    await checkFirmalarTable();
}

runTests().catch(console.error);
