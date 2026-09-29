import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function setup() {
  console.log("Creating test company (firma)...");
  let firmaId;
  const { data: existingFirma } = await supabase
    .from('firmalar')
    .select('id')
    .eq('unvan', 'Test Customer Corporation')
    .maybeSingle();

  if (existingFirma) {
    firmaId = existingFirma.id;
    console.log(`Company exists with ID: ${firmaId}`);
  } else {
    const { data: newFirma, error: firmaError } = await supabase
      .from('firmalar')
      .insert({ unvan: 'Test Customer Corporation' })
      .select('id')
      .single();
    
    if (firmaError) {
      console.error("Error creating company:", firmaError);
      return;
    }
    firmaId = newFirma.id;
    console.log(`Created new company with ID: ${firmaId}`);
  }

  console.log("Creating test user test_musteri@elysonsweets.de...");
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: 'test_musteri@elysonsweets.de',
    password: 'password123',
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes('already') || authError.code === 'email_exists') {
       console.log("User already exists in auth.users.");
    } else {
       console.error("Error creating auth user:", authError);
       return;
    }
  }

  let userId = authUser?.user?.id;
  if (!userId) {
     const { data: usersData } = await supabase.auth.admin.listUsers();
     const user = usersData.users.find(u => u.email === 'test_musteri@elysonsweets.de');
     userId = user?.id;
  }

  if (userId) {
      console.log(`Ensuring profile exists for user ${userId}`);
      const { data: profile } = await supabase.from('profiller').select('id').eq('id', userId).maybeSingle();
      if (!profile) {
          console.log("Profile not found, creating one...");
          await supabase.from('profiller').insert({
              id: userId,
              email: 'test_musteri@elysonsweets.de',
              firma_id: firmaId,
              rol: 'Müşteri'
          });
      } else {
          console.log(`Updating profile for user ${userId} with firma_id = ${firmaId} and rol = Müşteri`);
          await supabase.from('profiller').update({ firma_id: firmaId, rol: 'Müşteri' }).eq('id', userId);
      }
      console.log("Test user setup complete!");
  } else {
      console.log("Could not find user in auth.users.");
  }
}

setup().catch(console.error);
