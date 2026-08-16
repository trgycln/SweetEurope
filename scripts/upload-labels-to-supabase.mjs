import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = 'urun-etiketleri';
const LABELS_DIR = path.resolve('public', 'Ürün Etiketleri');

function sanitizePathKey(relativePath) {
  // Convert backslashes to forward slashes
  return relativePath
    .split(/[/\\]+/)
    .map(segment => {
      return segment
        .replace(/ı/g, 'i')
        .replace(/İ/g, 'I')
        .replace(/ğ/g, 'g')
        .replace(/Ğ/g, 'G')
        .replace(/ü/g, 'u')
        .replace(/Ü/g, 'U')
        .replace(/ş/g, 's')
        .replace(/Ş/g, 'S')
        .replace(/ö/g, 'o')
        .replace(/Ö/g, 'O')
        .replace(/ç/g, 'c')
        .replace(/Ç/g, 'C')
        .replace(/ä/g, 'a')
        .replace(/Ä/g, 'A')
        .replace(/ß/g, 'ss')
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9.\-_]/g, '');
    })
    .join('/');
}

function getAllFiles(dir, baseDir = dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, baseDir));
    } else if (item.toLowerCase().endsWith('.pdf')) {
      const relPath = path.relative(baseDir, fullPath);
      results.push({ fullPath, relPath, size: stat.size });
    }
  }
  return results;
}

async function uploadAll() {
  console.log(`Searching files in: ${LABELS_DIR}`);
  const files = getAllFiles(LABELS_DIR);
  console.log(`Found ${files.length} PDF files.`);

  const labelMapping = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const cleanStorageKey = sanitizePathKey(file.relPath);
    console.log(`[${i + 1}/${files.length}] Uploading: ${cleanStorageKey} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);

    const fileBuffer = fs.readFileSync(file.fullPath);

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(cleanStorageKey, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      console.error(`❌ Error uploading ${cleanStorageKey}:`, error.message);
      errorCount++;
      continue;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(cleanStorageKey);

    const publicUrl = urlData.publicUrl;

    labelMapping.push({
      originalName: path.basename(file.relPath),
      storageKey: cleanStorageKey,
      publicUrl: publicUrl,
      rawPath: file.relPath
    });

    successCount++;
  }

  console.log(`\nUpload complete: ${successCount} successful, ${errorCount} errors.`);

  // Save the mapping to src/lib/label-files.json
  const outputPath = path.resolve('src', 'lib', 'label-files.json');
  fs.writeFileSync(outputPath, JSON.stringify(labelMapping, null, 2), 'utf-8');
  console.log(`Saved label mapping to: ${outputPath}`);
}

uploadAll().catch(err => {
  console.error('Fatal error during upload:', err);
  process.exit(1);
});
