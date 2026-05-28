import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('HATA: Supabase env değişkenleri eksik!');
    process.exit(1);
}

// Create a client with NO AUTH TOKEN (Anonymous)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
});

const TABLES_TO_TEST = ['profiller', 'siparisler', 'firmalar'];

async function runTests() {
    console.log('--- Başlatılıyor: Veritabanı RLS (Row Level Security) Testleri ---\n');
    let passed = 0;
    
    for (const table of TABLES_TO_TEST) {
        console.log(`[TEST] Anonim (Giriş Yapılmamış) Erişim Deneniyor: Tablo -> ${table}`);
        
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);

            if (error) {
                // If the error is related to RLS, it's a pass
                console.log(`✅ BAŞARILI: Erişim veritabanı tarafından engellendi. Hata: ${error.message}\n`);
                passed++;
            } else if (data && data.length === 0) {
                // RLS often returns empty array instead of throwing an error for SELECT
                console.log(`✅ BAŞARILI: Veri sızmadı (RLS politikası nedeniyle 0 satır döndü).\n`);
                passed++;
            } else {
                console.log(`❌ KRİTİK HATA: Anonim kullanıcı ${data.length} adet gizli veri okudu!\n`);
                console.log(data);
            }
        } catch (error) {
            console.error(`❌ HATA: İstek atılamadı:`, error.message, '\n');
        }
    }
    
    console.log(`Testler tamamlandı. Başarılı: ${passed}/${TABLES_TO_TEST.length}`);
}

runTests();
