import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import sharp from 'sharp';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function downloadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function convertAndUpload(sourceUrl, filename, fit = 'contain') {
  const originalBuf = await downloadBuffer(sourceUrl);
  
  // Convert to 1080x1080 JPG with white background
  const processedBuf = await sharp(originalBuf)
    .resize(1080, 1080, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  const filePath = `meta-fixed/${filename}.jpg`;

  const { error: uploadErr } = await supabase.storage
    .from('urun-gorselleri')
    .upload(filePath, processedBuf, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadErr) {
    throw new Error(`Upload error for ${filePath}: ${uploadErr.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('urun-gorselleri')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

async function main() {
  console.log('=== 1. FIXING BLUE CURACAO IMAGE ===');
  const blueCuracaoId = 'b3b08244-8d02-41b5-ad8f-7de99d05558a';
  const blueCuracaoUrl = 'https://szuhjzgyhhlrydyllrcd.supabase.co/storage/v1/object/public/urun-gorselleri/main/1789305659828-imgi-64-fo-surup-fo-blue-curaco-turunc-aromali-kokteyl-surubu-70-cl-66f1539c3a635.png';

  try {
    console.log('Processing Blue Curacao (1200x4597 -> 1080x1080 square JPG)...');
    const newBlueUrl = await convertAndUpload(blueCuracaoUrl, 'fo_blue_curacao_70cl_1080x1080');
    console.log('New Blue Curacao URL:', newBlueUrl);

    const { error: updateErr } = await supabase
      .from('urunler')
      .update({ ana_resim_url: newBlueUrl })
      .eq('id', blueCuracaoId);

    if (updateErr) console.error('DB update error for Blue Curacao:', updateErr);
    else console.log('Successfully updated Blue Curacao in DB!');
  } catch (err) {
    console.error('Error fixing Blue Curacao:', err);
  }

  console.log('\n=== 2. FIXING 11 WEBP IMAGES FOR META CATALOG ===');
  const { data: webpProducts, error: fetchErr } = await supabase
    .from('urunler')
    .select('id, ana_resim_url, ad')
    .eq('aktif', true);

  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    return;
  }

  const targets = webpProducts.filter(p => p.ana_resim_url && p.ana_resim_url.endsWith('.webp'));
  console.log(`Found ${targets.length} products with .webp images.`);

  for (let i = 0; i < targets.length; i++) {
    const prod = targets[i];
    const safeTitle = (prod.ad?.de || 'product').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    const filename = `prod_${prod.id.slice(0, 8)}_${safeTitle}`;
    console.log(`[${i + 1}/${targets.length}] Converting ${prod.id} (${safeTitle})...`);

    try {
      const newJpgUrl = await convertAndUpload(prod.ana_resim_url, filename);
      const { error: dbErr } = await supabase
        .from('urunler')
        .update({ ana_resim_url: newJpgUrl })
        .eq('id', prod.id);

      if (dbErr) {
        console.error(`DB update failed for ${prod.id}:`, dbErr);
      } else {
        console.log(` -> OK: ${newJpgUrl}`);
      }
    } catch (err) {
      console.error(` -> Failed for ${prod.id}:`, err.message);
    }
  }

  console.log('\n=== ALL IMAGES PROCESSED ===');
}

main();
