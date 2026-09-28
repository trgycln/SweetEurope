const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function uploadImage() {
  const barcode = '8691123462909';
  const imagePath = 'C:/Users/User/.gemini/antigravity-ide/brain/a91ba895-1a20-4a44-84ef-9840e99a0c20/.user_uploaded/media_1790629241527.png';
  
  if (!fs.existsSync(imagePath)) {
    console.error('File not found:', imagePath);
    return;
  }
  
  const fileBuffer = fs.readFileSync(imagePath);
  const fileName = `meta-standard/meta_std_${Date.now()}_${barcode}.png`;
  
  console.log(`Uploading to bucket 'urun-gorselleri' as ${fileName}...`);
  
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('urun-gorselleri')
    .upload(fileName, fileBuffer, {
      contentType: 'image/png',
      upsert: true
    });
    
  if (uploadError) {
    console.error('Upload error:', uploadError);
    return;
  }
  
  console.log('Upload successful:', uploadData);
  
  const { data: publicUrlData } = supabase
    .storage
    .from('urun-gorselleri')
    .getPublicUrl(fileName);
    
  const publicUrl = publicUrlData.publicUrl;
  console.log('Public URL:', publicUrl);
  
  console.log('Updating database...');
  const { error: dbError } = await supabase
    .from('urunler')
    .update({ ana_resim_url: publicUrl })
    .eq('ean_gtin', barcode);
    
  if (dbError) {
    console.error('DB update error:', dbError);
  } else {
    console.log('Database updated successfully with image URL!');
  }
}

uploadImage();
