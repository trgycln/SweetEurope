import { createClient } from '@supabase/supabase-js';

const OLD_URL = 'https://atydffkpyvxcmzxyibhj.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eWRmZmtweXZ4Y216eHlpYmhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMyMjYxMiwiZXhwIjoyMDc0ODk4NjEyfQ.LHTstP_K3qHoxD_ie_A6fPkFcnKb732qORSJkxrV3qk';

const NEW_URL = 'https://szuhjzgyhhlrydyllrcd.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6dWhqemd5aGhscnlkeWxscmNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc2NjY2OSwiZXhwIjoyMTAyMzQyNjY5fQ.82PbP8TR5gpJD2-3JW-N3IaIuzBTTAhwIZ55gsmTSQE';

const oldSupabase = createClient(OLD_URL, OLD_KEY);
const newSupabase = createClient(NEW_URL, NEW_KEY);

async function execSql(sql) {
  const { error } = await newSupabase.rpc('exec_sql', { sql_string: sql });
  if (error) {
    console.error('execSql error:', error.message, 'SQL:', sql);
  }
}

async function migrateUsers() {
  console.log('\n--- 1. Migrating Auth Users ---');
  const { data: { users }, error } = await oldSupabase.auth.admin.listUsers();
  if (error) {
    console.error('Error fetching old users:', error);
    return;
  }

  console.log(`Found ${users.length} users in old Auth.`);
  for (const u of users) {
    try {
      const email = u.email && u.email.includes('@') ? u.email : `user_${u.id.substring(0,8)}@elysonsweets.de`;
      const { error: createErr } = await newSupabase.auth.admin.createUser({
        id: u.id,
        email: email,
        email_confirm: true,
        user_metadata: u.user_metadata,
        app_metadata: u.app_metadata,
        phone: u.phone,
        phone_confirm: true,
        password: 'TemporaryPassword123!'
      });
      if (createErr) {
        if (createErr.message.includes('already exists') || createErr.message.includes('duplicate')) {
          console.log(`User [${email}] already exists in new Auth.`);
        } else {
          console.log(`User [${email}] create status: ${createErr.message}`);
        }
      } else {
        console.log(`✓ User [${email}] (ID: ${u.id}) migrated.`);
      }
    } catch (e) {
      console.log(`User error: ${e.message}`);
    }
  }
}

async function syncTableColumns(tableName, sampleRow) {
  if (!sampleRow) return;
  const colSqls = [];
  for (const [key, val] of Object.entries(sampleRow)) {
    if (key === 'id') continue;
    let type = 'TEXT';
    if (typeof val === 'number') type = 'NUMERIC';
    else if (typeof val === 'boolean') type = 'BOOLEAN';
    else if (Array.isArray(val)) type = 'TEXT[]';
    else if (typeof val === 'object' && val !== null) type = 'JSONB';
    
    colSqls.push(`ALTER TABLE public."${tableName}" ADD COLUMN IF NOT EXISTS "${key}" ${type};`);
  }
  if (colSqls.length > 0) {
    await execSql(colSqls.join('\n'));
    await execSql(`NOTIFY pgrst, 'reload schema';`);
  }
}

async function migrateTable(tableName, batchSize = 250) {
  // Check sample row to sync columns first
  const { data: sampleRows, error: sampleErr } = await oldSupabase.from(tableName).select('*').limit(1);
  if (sampleErr) {
    return; // table not in old db
  }
  if (sampleRows && sampleRows[0]) {
    await syncTableColumns(tableName, sampleRows[0]);
  }

  let from = 0;
  let totalMigrated = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: rows, error } = await oldSupabase
      .from(tableName)
      .select('*')
      .range(from, from + batchSize - 1);

    if (error) {
      console.error(`Error fetching from ${tableName}:`, error.message);
      break;
    }

    if (!rows || rows.length === 0) {
      hasMore = false;
      break;
    }

    const { error: insertErr } = await newSupabase
      .from(tableName)
      .upsert(rows, { ignoreDuplicates: false });

    if (insertErr) {
      console.error(`Error inserting into ${tableName}:`, insertErr.message);
      let singleSuccess = 0;
      for (const row of rows) {
        const { error: sErr } = await newSupabase.from(tableName).upsert([row]);
        if (!sErr) singleSuccess++;
      }
      totalMigrated += singleSuccess;
      console.log(`Fallback for ${tableName}: ${singleSuccess}/${rows.length} rows.`);
    } else {
      totalMigrated += rows.length;
    }

    if (rows.length < batchSize) {
      hasMore = false;
    } else {
      from += batchSize;
    }
  }

  if (totalMigrated > 0) {
    console.log(`✓ [${tableName}] ${totalMigrated} rows migrated.`);
  }
}

async function migrateStorage() {
  console.log('\n--- 3. Migrating Storage Buckets & Files ---');
  const { data: buckets, error } = await oldSupabase.storage.listBuckets();
  if (error) {
    console.error('Error listing old buckets:', error);
    return;
  }

  for (const bucket of buckets) {
    // Ensure bucket exists in new
    await newSupabase.storage.createBucket(bucket.name, {
      public: bucket.public
    }).catch(() => {});

    // List all files in old bucket
    const { data: files, error: fErr } = await oldSupabase.storage.from(bucket.name).list('', {
      limit: 1000
    });

    if (fErr || !files || files.length === 0) {
      continue;
    }

    console.log(`\nFound ${files.length} items in Bucket [${bucket.name}]. Downloading & Uploading...`);
    let uploadedCount = 0;

    for (const file of files) {
      if (file.name === '.emptyFolderPlaceholder') continue;
      
      try {
        const { data: blob, error: dlErr } = await oldSupabase.storage.from(bucket.name).download(file.name);
        if (dlErr) {
          console.error(`Failed to download ${file.name}:`, dlErr.message);
          continue;
        }

        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: upErr } = await newSupabase.storage.from(bucket.name).upload(file.name, buffer, {
          upsert: true,
          contentType: file.metadata?.mimetype || 'application/octet-stream'
        });

        if (upErr) {
          console.error(`Failed to upload ${file.name}:`, upErr.message);
        } else {
          uploadedCount++;
          if (uploadedCount % 25 === 0 || uploadedCount === files.length) {
            console.log(`Uploaded ${uploadedCount}/${files.length} files in [${bucket.name}]...`);
          }
        }
      } catch (e) {
        console.error(`Exception on file ${file.name}:`, e.message);
      }
    }

    console.log(`✓ Bucket [${bucket.name}] finished: ${uploadedCount} files transferred.`);
  }
}

async function main() {
  console.log('========================================');
  console.log('STARTING COMPLETE SUPABASE MIGRATION');
  console.log('========================================');

  // Reload PostgREST schema cache
  await execSql(`NOTIFY pgrst, 'reload schema';`);

  // 1. Users
  await migrateUsers();

  // 2. All tables in safe order
  const allTables = [
    'kategoriler',
    'firmalar',
    'profiller',
    'urunler',
    'birimler',
    'birim_donusumleri',
    'system_settings',
    'siparisler',
    'siparis_ogeleri',
    'siparis_detay',
    'etkinlikler',
    'giderler',
    'gider_ana_kategoriler',
    'gider_kalemleri',
    'gider_sablonlari',
    'gider_sablon_kalemleri',
    'waitlist',
    'iletisim_mesajlari',
    'belgeler',
    'document_folders',
    'documents',
    'document_activity_log',
    'sirket_resmi_bilgiler',
    'alt_bayi_satislar',
    'alt_bayi_satis_detay',
    'alt_bayi_satis_kayitlari',
    'alt_bayi_satis_detaylari',
    'alt_bayi_stoklari',
    'alt_bayi_gelirleri',
    'alt_bayi_giderleri',
    'numune_talepleri',
    'sample_requests',
    'sample_request_items',
    'yeni_urun_talepleri',
    'fiyat_degisim_talepleri',
    'fiyat_kurallari',
    'firmalar_finansal',
    'dis_kontaklar',
    'duyurular',
    'bildirimler',
    'blog_yazilari',
    'gorevler',
    'ithalat_partileri',
    'ithalat_parti_kalemleri',
    'kategori_ozellik_sablonlari',
    'musteri_profilleri',
    'ortak_islemleri',
    'pazarlama_materyalleri',
    'tedarikciler',
    'urun_degerlendirmeleri',
    'urun_stok_hareket_loglari',
    'favori_urunler',
    'degerlendirme_oylari',
    'faturalar'
  ];

  console.log('\n--- 2. Migrating All Table Data ---');
  for (const tbl of allTables) {
    try {
      await migrateTable(tbl);
    } catch (e) {
      console.error(`Error migrating table ${tbl}:`, e);
    }
  }

  // 3. Storage
  await migrateStorage();

  console.log('\n========================================');
  console.log('🎉 FULL DATA & STORAGE MIGRATION FINISHED!');
  console.log('========================================');
}

main().catch(console.error);
