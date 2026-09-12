import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkCategories() {
  const { data, error } = await supabase.from('kategoriler').select('*');
  if (error) {
    console.error('Error fetching categories:', error);
    return;
  }
  console.log('Categories in DB:');
  data.forEach(c => console.log(`ID: ${c.id} | Slug: ${c.slug} | Name:`, JSON.stringify(c.ad)));
}

checkCategories();
