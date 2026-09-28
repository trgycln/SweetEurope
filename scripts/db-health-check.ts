import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// .env dosyasını yükle
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseHealth() {
  console.log("Starting Database Health Check (Orphaned Data Check)...");
  
  let hasErrors = false;

  // 1. Yetim Siparişler (Firması silinmiş olan siparişler)
  const { data: siparisler, error: siparisError } = await supabase
    .from('siparisler')
    .select('id, firma_id');
    
  if (siparisError) {
    console.error("Error fetching siparisler:", siparisError);
    hasErrors = true;
  } else if (siparisler) {
    const firmaIds = siparisler.map(s => s.firma_id).filter(Boolean);
    const uniqueFirmaIds = [...new Set(firmaIds)];
    
    if (uniqueFirmaIds.length > 0) {
        const { data: firmalar, error: firmaError } = await supabase
          .from('firmalar')
          .select('id')
          .in('id', uniqueFirmaIds);
          
        if (firmaError) {
          console.error("Error fetching firmalar:", firmaError);
          hasErrors = true;
        } else if (firmalar) {
          const validFirmaIds = firmalar.map(f => f.id);
          const orphanedOrders = siparisler.filter(s => s.firma_id && !validFirmaIds.includes(s.firma_id));
          
          if (orphanedOrders.length > 0) {
            console.error(`FOUND ORPHANED RECORDS: ${orphanedOrders.length} siparisler records point to missing firmalar.`);
            hasErrors = true;
          } else {
            console.log("OK: No orphaned siparisler -> firmalar.");
          }
        }
    }
  }

  // 2. Eğer alt_bayi_stoklari veya siparis_icerikleri (siparis_kalemleri) gibi tablolar varsa
  // buraya eklenebilir. Proje domain'ine göre (siparis_kalemleri -> urunler kontrolü)
  // Şimdilik test planındaki kaba taslağa uygun basit kontrollerle tamamlıyoruz.

  if (hasErrors) {
    console.error("Database Health: FAILED.");
    process.exit(1);
  } else {
    console.log("Database Health: 100% OK.");
    process.exit(0);
  }
}

checkDatabaseHealth();
