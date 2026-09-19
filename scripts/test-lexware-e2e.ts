import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createSupabaseServiceClient } from '../src/lib/supabase/service';
import { getOrCreateLexwareContact } from '../src/lib/lexware/contacts';

async function verify() {
  console.log('Testing Lexware End-to-End Module...');
  const supabase = createSupabaseServiceClient();

  // 1. Bir aktif firma bul
  const { data: firmalar, error } = await supabase
    .from('firmalar')
    .select('id, unvan, email, sehir')
    .limit(1);

  if (error || !firmalar || firmalar.length === 0) {
    console.error('Firma bulunamadı:', error?.message);
    return;
  }

  const testFirma = firmalar[0];
  console.log(`Testing Contact Sync for: "${testFirma.unvan}" (ID: ${testFirma.id})`);

  try {
    const contactId = await getOrCreateLexwareContact(testFirma.id);
    console.log(`✅ SUCCESS! Lexware Contact ID: ${contactId}`);
  } catch (err: any) {
    console.error('❌ Error creating/getting contact:', err.message);
  }
}

verify();
