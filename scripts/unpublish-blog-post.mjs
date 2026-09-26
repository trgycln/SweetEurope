import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function unpublishPost() {
  const { error: updateError } = await supabase
    .from('blog_yazilari')
    .update({ 
      is_published: false 
    })
    .eq('id', 'e020617d-aa9c-4dfb-8661-60d0b99cbd97');

  if (updateError) {
    console.error('Update error:', updateError);
    process.exit(1);
  }

  console.log('Post unpublished successfully');
}

unpublishPost();
