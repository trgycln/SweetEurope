import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function globalSetup() {
  console.log('--- GLOBAL SETUP: Creating Test User and Company ---');
  
  let userId: string | undefined;
  
  // 1. Try to create User
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'test_e2e_dryrun@elysonsweets.de',
    password: 'TestPassword123!',
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes('already been registered') || authError.message.includes('already registered')) {
        console.log('Test user already exists, fetching existing user...');
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existing = users.find(u => u.email === 'test_e2e_dryrun@elysonsweets.de');
        userId = existing?.id;
    } else {
        console.error('Error creating user:', authError);
        throw authError;
    }
  } else {
      userId = authData?.user?.id;
  }
  
  if (userId) {
      // 2. Insert into profiller (without firma_id first to break circular dependency)
      const { error: profileError } = await supabase.from('profiller').upsert({
          id: userId,
          tam_ad: 'Test E2E',
          rol: 'Müşteri',
          firma_id: null
      });
      if (profileError) console.error('Error creating profile:', profileError);

      // 3. Insert into firmalar
      const { data: firmaData, error: firmaError } = await supabase.from('firmalar').insert({
          sahip_id: userId,
          unvan: 'E2E Test Firması',
          vergi_no: 'DE123456789',
          adres: 'Test Sokak 123',
          sehir: 'Berlin',
          posta_kodu: '10115',
          telefon: '+49123456789'
      }).select().single();
      
      if (firmaError) {
          console.error('Error creating firma:', firmaError);
      } else if (firmaData) {
          // 4. Update profiller with firma_id
          await supabase.from('profiller').update({ firma_id: firmaData.id }).eq('id', userId);
          
          // 5. Ensure products have stock for testing
          const { error: stockError } = await supabase.from('urunler').update({ stok_miktari: 100 }).not('id', 'is', null);
          if (stockError) console.error('Error updating stock:', stockError);
      }
      
      // 6. Create Admin User
      let adminId: string | undefined;
      const { data: adminAuthData, error: adminAuthError } = await supabase.auth.admin.createUser({
        email: 'admin_e2e_dryrun@elysonsweets.de',
        password: 'AdminPassword123!',
        email_confirm: true,
      });
      
      if (adminAuthError) {
        if (adminAuthError.message.includes('already been registered') || adminAuthError.message.includes('already registered')) {
            console.log('Test admin already exists, fetching existing admin...');
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const existingAdmin = users.find(u => u.email === 'admin_e2e_dryrun@elysonsweets.de');
            adminId = existingAdmin?.id;
        } else {
            console.error('Error creating admin:', adminAuthError);
        }
      } else {
          adminId = adminAuthData?.user?.id;
      }
      
      if (adminId) {
          await supabase.from('profiller').upsert({
              id: adminId,
              tam_ad: 'Test Admin',
              rol: 'Yönetici',
              firma_id: null
          });
      }
      
      // Update process.env to hold IDs for teardown if needed, but teardown can just query by email
      process.env.TEST_USER_ID = userId;
      if (firmaData) {
          process.env.TEST_FIRMA_ID = firmaData.id;
      }
      
      const fs = require('fs');
      const path = require('path');
      fs.writeFileSync(path.join(process.cwd(), '.test-env.json'), JSON.stringify({ userId, firmaId: firmaData?.id || null }));
      
      console.log('Test User and Company created successfully.');
  }
}

export default globalSetup;
