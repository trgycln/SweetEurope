// Test script: Profil güncelleme test et
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Service role key ile bağlan (RLS bypass eder)
const supabase = createClient(url, serviceRoleKey);

const TEST_USER_ID = '642896a8-ec56-4a58-917d-eafe2831a104'; // Turgay'ın ID'si

console.log('🔍 Mevcut profil durumu:');
const { data: before, error: beforeError } = await supabase
  .from('profiller')
  .select('id, tam_ad, tercih_edilen_dil')
  .eq('id', TEST_USER_ID)
  .single();

if (beforeError) {
  console.error('❌ Okuma hatası:', beforeError);
} else {
  console.log('   ID:', before.id);
  console.log('   Ad:', before.tam_ad);
  console.log('   Mevcut dil:', before.tercih_edilen_dil);
}

console.log('\n💾 Dil güncelleniyor: en');
const { data: updated, error: updateError } = await supabase
  .from('profiller')
  .update({ tercih_edilen_dil: 'en' })
  .eq('id', TEST_USER_ID)
  .select()
  .single();

if (updateError) {
  console.error('❌ Güncelleme hatası:', updateError);
  console.error('   Code:', updateError.code);
  console.error('   Message:', updateError.message);
  console.error('   Details:', updateError.details);
  console.error('   Hint:', updateError.hint);
} else {
  console.log('✅ Güncelleme başarılı');
  console.log('   Yeni değer:', updated.tercih_edilen_dil);
}

console.log('\n🔍 Verify - tekrar oku:');
const { data: after, error: afterError } = await supabase
  .from('profiller')
  .select('id, tam_ad, tercih_edilen_dil')
  .eq('id', TEST_USER_ID)
  .single();

if (afterError) {
  console.error('❌ Verify hatası:', afterError);
} else {
  console.log('   Güncel dil:', after.tercih_edilen_dil);
  
  if (after.tercih_edilen_dil === 'en') {
    console.log('   ✅ Değişiklik başarılı!');
  } else {
    console.log('   ❌ Değişiklik BAŞARISIZ - hala:', after.tercih_edilen_dil);
  }
}

// Geri TR'ye çevir
console.log('\n🔄 Geri TR ye çeviriliyor...');
await supabase
  .from('profiller')
  .update({ tercih_edilen_dil: 'tr' })
  .eq('id', TEST_USER_ID);

console.log('✅ Test tamamlandı');
