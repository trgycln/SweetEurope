import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createBucket() {
  const bucketName = 'urun-etiketleri';
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.find(b => b.name === bucketName);
  
  if (!exists) {
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 52428800 // 50MB
    });
    if (error) {
      console.error('Error creating bucket:', error);
      return;
    }
    console.log('Created bucket successfully:', data);
  } else {
    console.log('Bucket already exists:', bucketName);
  }
}

createBucket();
