import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve('.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('blog_yazilari')
    .select('slug, title, excerpt, content')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error("DB Error:", error);
    return;
  }

  const post = data[0];
  console.log("Slug:", post.slug);
  console.log("Title DE:", post.title?.de);
  console.log("Title TR:", post.title?.tr);
  console.log("Title AR:", post.title?.ar);
  
  console.log("Content TR snippet:", post.content?.tr?.substring(0, 50));
  console.log("Content AR snippet:", post.content?.ar?.substring(0, 50));
}

check();
