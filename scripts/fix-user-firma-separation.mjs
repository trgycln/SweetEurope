// Script to separate admin user from alt bayi firma
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🔧 Fixing user-firma separation...\n');

  // 1. Restore Turgay Celen as admin (no firma linkage)
  const { error: restoreTurgayErr } = await supabase
    .from('profiller')
    .update({ 
      firma_id: null,
      rol: 'Yönetici'
    })
    .eq('id', '642896a8-ec56-4a58-917d-eafe2831a104');

  if (restoreTurgayErr) {
    console.error('❌ Error restoring Turgay as admin:', restoreTurgayErr);
    return;
  }

  console.log('✅ Restored Turgay Celen as admin (no firma linkage)');

  // 2. Find altbayi1@system.com auth user
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
  
  if (authErr) {
    console.error('❌ Error fetching auth users:', authErr);
    return;
  }

  const altBayiAuthUser = authUsers.users.find(u => u.email === 'altbayi1@system.com');
  
  if (!altBayiAuthUser) {
    console.log('⚠️ altbayi1@system.com auth user not found. Need to create it.');
    console.log('Available auth users:');
    authUsers.users.forEach(u => console.log(`  - ${u.email} (ID: ${u.id})`));
    return;
  }

  console.log(`✅ Found altbayi1@system.com auth user: ${altBayiAuthUser.id}`);

  // 3. Check if profile exists for this auth user
  const { data: altBayiProfile, error: profileErr } = await supabase
    .from('profiller')
    .select('id, tam_ad, rol, firma_id')
    .eq('id', altBayiAuthUser.id)
    .maybeSingle();

  if (profileErr) {
    console.error('❌ Error checking profile:', profileErr);
    return;
  }

  if (!altBayiProfile) {
    // Create profile for alt bayi user
    const { error: createProfileErr } = await supabase
      .from('profiller')
      .insert({
        id: altBayiAuthUser.id,
        tam_ad: 'Lezzet Dağıtım Kullanıcı',
        rol: 'Alt Bayi',
        firma_id: '53f726a2-ed56-4b59-a2bd-de5028df9457'
      });

    if (createProfileErr) {
      console.error('❌ Error creating profile:', createProfileErr);
      return;
    }

    console.log('✅ Created profile for altbayi1@system.com and linked to Lezzet Dağıtım');
  } else {
    // Update existing profile
    const { error: updateProfileErr } = await supabase
      .from('profiller')
      .update({
        rol: 'Alt Bayi',
        firma_id: '53f726a2-ed56-4b59-a2bd-de5028df9457'
      })
      .eq('id', altBayiAuthUser.id);

    if (updateProfileErr) {
      console.error('❌ Error updating profile:', updateProfileErr);
      return;
    }

    console.log('✅ Updated altbayi1@system.com profile and linked to Lezzet Dağıtım');
  }

  // 4. Update Lezzet Dağıtım firma sahip_id to point to alt bayi user
  const { error: updateFirmaErr } = await supabase
    .from('firmalar')
    .update({ sahip_id: altBayiAuthUser.id })
    .eq('id', '53f726a2-ed56-4b59-a2bd-de5028df9457');

  if (updateFirmaErr) {
    console.error('❌ Error updating firma sahip_id:', updateFirmaErr);
    return;
  }

  console.log('✅ Set Lezzet Dağıtım sahip_id to altbayi1@system.com user');

  // 5. Update Aliaha customer to belong to alt bayi user
  const { error: updateAliahaErr } = await supabase
    .from('firmalar')
    .update({ sahip_id: altBayiAuthUser.id })
    .eq('id', '834be055-c141-4d41-ad22-ecb9a898328a');

  if (updateAliahaErr) {
    console.error('❌ Error updating Aliaha customer:', updateAliahaErr);
    return;
  }

  console.log('✅ Updated Aliaha customer to belong to altbayi1@system.com user');

  console.log('\n✅ All separations fixed!');
  console.log('\n📝 Summary:');
  console.log('  - Turgay Celen: Yönetici (admin), no firma linkage');
  console.log('  - altbayi1@system.com: Alt Bayi, linked to Lezzet Dağıtım A.Ş.');
  console.log('  - Aliaha: Customer owned by altbayi1@system.com user');
}

main().catch(console.error);
