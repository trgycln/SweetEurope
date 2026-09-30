import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function globalTeardown() {
  console.log('--- GLOBAL TEARDOWN: Cleaning up Test User and Company ---');
  
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(process.cwd(), '.test-env.json');
  
  if (!fs.existsSync(envPath)) {
    console.log('Test env file not found, skipping teardown.');
    return;
  }
  
  const { userId, firmaId } = JSON.parse(fs.readFileSync(envPath, 'utf8'));

  if (userId) {
    console.log(`Found test user with ID: ${userId}, cleaning up...`);

    // 1. Delete Orders (siparisler) -> this might cascade to siparis_kalemleri
    await supabase.from('siparisler').delete().eq('kullanici_id', userId);

    // 2. Delete Firmalar
    if (firmaId) {
      await supabase.from('firmalar').delete().eq('id', firmaId);
    }

    // 3. Delete Profile
    await supabase.from('profiller').delete().eq('id', userId);

    // 4. Delete Auth User
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
        console.error('Error deleting auth user:', error);
    } else {
        console.log('Test user deleted from auth successfully.');
    }
    
    // Cleanup file
    fs.unlinkSync(envPath);
    
    // 5. Cleanup Test Admin User
    const { data: { users: adminUsers } } = await supabase.auth.admin.listUsers();
    const testAdmin = adminUsers.find(u => u.email === 'admin_e2e_dryrun@elysonsweets.de');
    if (testAdmin) {
        console.log(`Found test admin with ID: ${testAdmin.id}, cleaning up...`);
        const { error: adminDelError } = await supabase.auth.admin.deleteUser(testAdmin.id);
        if (adminDelError) console.error('Error deleting admin user:', adminDelError);
        else console.log('Test admin deleted from auth successfully.');
    }
  } else {
    console.log('Test user ID not found in file, skipping teardown.');
  }
}

export default globalTeardown;
