// Script to fix Lezzet Dağıtım customers and link user properly
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🔧 Fixing Lezzet Dağıtım customer relationships...\n');

  // 1. Get Lezzet Dağıtım firma
  const { data: lezzetFirma, error: firmaErr } = await supabase
    .from('firmalar')
    .select('id, unvan, sahip_id')
    .eq('id', '53f726a2-ed56-4b59-a2bd-de5028df9457')
    .single();

  if (firmaErr) {
    console.error('❌ Error fetching Lezzet Dağıtım:', firmaErr);
    return;
  }

  console.log('✅ Found Lezzet Dağıtım:', lezzetFirma.unvan);

  // 2. Get Turgay Celen user
  const { data: turgayUser, error: userErr } = await supabase
    .from('profiller')
    .select('id, tam_ad, rol, firma_id')
    .eq('id', '642896a8-ec56-4a58-917d-eafe2831a104')
    .single();

  if (userErr) {
    console.error('❌ Error fetching Turgay user:', userErr);
    return;
  }

  console.log('✅ Found user:', turgayUser.tam_ad, '- Role:', turgayUser.rol);

  // 3. Link Turgay to Lezzet Dağıtım firma
  const { error: updateUserErr } = await supabase
    .from('profiller')
    .update({ 
      firma_id: lezzetFirma.id,
      rol: 'Alt Bayi' // Change role to Alt Bayi
    })
    .eq('id', turgayUser.id);

  if (updateUserErr) {
    console.error('❌ Error linking user to firma:', updateUserErr);
    return;
  }

  console.log('✅ Linked Turgay Celen to Lezzet Dağıtım and changed role to Alt Bayi');

  // 4. Update Lezzet Dağıtım firma's sahip_id
  const { error: updateFirmaErr } = await supabase
    .from('firmalar')
    .update({ sahip_id: turgayUser.id })
    .eq('id', lezzetFirma.id);

  if (updateFirmaErr) {
    console.error('❌ Error updating firma sahip_id:', updateFirmaErr);
    return;
  }

  console.log('✅ Set Lezzet Dağıtım sahip_id to Turgay');

  // 5. Get all customers with non-existent sahip_id
  const { data: orphanCustomers, error: orphanErr } = await supabase
    .from('firmalar')
    .select('id, unvan, sahip_id')
    .eq('ticari_tip', 'musteri')
    .eq('sahip_id', '7bcbf683-8445-41ab-a6af-17104d058273');

  if (orphanErr) {
    console.error('❌ Error fetching orphan customers:', orphanErr);
    return;
  }

  console.log(`\n✅ Found ${orphanCustomers?.length || 0} customers with invalid sahip_id`);

  // 6. Update Aliaha and any other orphan customers to belong to Turgay
  if (orphanCustomers && orphanCustomers.length > 0) {
    for (const customer of orphanCustomers) {
      const { error: updateCustomerErr } = await supabase
        .from('firmalar')
        .update({ sahip_id: turgayUser.id })
        .eq('id', customer.id);

      if (updateCustomerErr) {
        console.error(`❌ Error updating customer ${customer.unvan}:`, updateCustomerErr);
      } else {
        console.log(`✅ Updated ${customer.unvan} - sahip_id now: ${turgayUser.id}`);
      }
    }
  }

  console.log('\n✅ All customer relationships fixed!');
}

main().catch(console.error);
