import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import sharp from 'sharp';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function downloadBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'facebookexternalhit/1.1' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function convertToStandardJpg(buf) {
  // Convert any image to true 1080x1080 square JPEG with white background
  return await sharp(buf)
    .resize(1080, 1080, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}

async function run() {
  const { data: products, error } = await supabase
    .from('urunler')
    .select('id, ad, ana_resim_url, ean_gtin')
    .eq('aktif', true);

  if (error) {
    console.error('Supabase error:', error);
    return;
  }

  console.log(`Auditing all ${products.length} active products...`);

  let convertedCount = 0;
  let alreadyGoodCount = 0;
  let failedCount = 0;

  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    if (!prod.ana_resim_url) {
      console.log(`[${i+1}/${products.length}] No image for ${prod.id}`);
      continue;
    }

    try {
      const buf = await downloadBuffer(prod.ana_resim_url);
      const metadata = await sharp(buf).metadata();

      const isTrueJpeg = metadata.format === 'jpeg';
      const isSquare = metadata.width === metadata.height;
      const isHighRes = metadata.width >= 600 && metadata.height >= 600;

      // If it's not a real JPEG, or not square, or not at least 600x600, convert it!
      if (!isTrueJpeg || !isSquare || !isHighRes) {
        console.log(`[${i+1}/${products.length}] FIXING ${prod.id}: format=${metadata.format}, size=${metadata.width}x${metadata.height}`);
        
        const jpgBuf = await convertToStandardJpg(buf);
        const fileName = `meta_std_${prod.id.slice(0, 8)}_${prod.ean_gtin || 'item'}.jpg`;
        const filePath = `meta-standard/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('urun-gorselleri')
          .upload(filePath, jpgBuf, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadErr) {
          console.error(`  Upload error: ${uploadErr.message}`);
          failedCount++;
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from('urun-gorselleri')
          .getPublicUrl(filePath);

        const newUrl = publicUrlData.publicUrl;

        const { error: updateErr } = await supabase
          .from('urunler')
          .update({ ana_resim_url: newUrl })
          .eq('id', prod.id);

        if (updateErr) {
          console.error(`  DB update error: ${updateErr.message}`);
          failedCount++;
        } else {
          console.log(`  -> SUCCESS: ${newUrl}`);
          convertedCount++;
        }
      } else {
        alreadyGoodCount++;
      }
    } catch (err) {
      console.error(`[${i+1}/${products.length}] ERROR on ${prod.id}: ${err.message}`);
      failedCount++;
    }
  }

  console.log(`\n=== AUDIT SUMMARY ===`);
  console.log(`Total Products: ${products.length}`);
  console.log(`Already Perfect (True Square JPEG): ${alreadyGoodCount}`);
  console.log(`Fixed & Converted to True 1080x1080 JPEG: ${convertedCount}`);
  console.log(`Failed: ${failedCount}`);
}

run();
