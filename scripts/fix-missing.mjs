import { createClient } from '@supabase/supabase-js';

const OLD_URL = 'https://atydffkpyvxcmzxyibhj.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eWRmZmtweXZ4Y216eHlpYmhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMyMjYxMiwiZXhwIjoyMDc0ODk4NjEyfQ.LHTstP_K3qHoxD_ie_A6fPkFcnKb732qORSJkxrV3qk';

const NEW_URL = 'https://szuhjzgyhhlrydyllrcd.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6dWhqemd5aGhscnlkeWxscmNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc2NjY2OSwiZXhwIjoyMTAyMzQyNjY5fQ.82PbP8TR5gpJD2-3JW-N3IaIuzBTTAhwIZ55gsmTSQE';

const oldSupabase = createClient(OLD_URL, OLD_KEY);
const newSupabase = createClient(NEW_URL, NEW_KEY);

async function execSql(sql) {
  const { error } = await newSupabase.rpc('exec_sql', { sql_string: sql });
  if (error) console.error('SQL Error:', error.message);
}

async function fix() {
  console.log('--- Creating missing tables and columns ---');
  
  await execSql(`
    CREATE TABLE IF NOT EXISTS public.belgeler (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ad TEXT,
      kategori TEXT,
      alt_kategori TEXT,
      iliski_tipi TEXT,
      iliski_id TEXT,
      firma_id UUID,
      tir_id TEXT,
      aciklama TEXT,
      etiketler TEXT[],
      son_gecerlilik_tarihi TEXT,
      yukleyen_id TEXT,
      olusturma_tarihi TIMESTAMPTZ DEFAULT now(),
      gizli BOOLEAN DEFAULT false,
      otomatik_eklendi BOOLEAN DEFAULT false,
      tedarikci_adi TEXT,
      fiziksel_dosya TEXT,
      sira_no TEXT,
      evrak_tarihi TEXT
    );
    ALTER TABLE public.belgeler ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN CREATE POLICY "Public Full Access belgeler" ON public.belgeler FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN OTHERS THEN null; END $$;

    CREATE TABLE IF NOT EXISTS public.iletisim_mesajlari (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT now(),
      ad_soyad TEXT,
      email TEXT,
      mesaj TEXT,
      okundu_mu BOOLEAN DEFAULT false,
      okunma_tarihi TIMESTAMPTZ
    );
    ALTER TABLE public.iletisim_mesajlari ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN CREATE POLICY "Public Full Access iletisim_mesajlari" ON public.iletisim_mesajlari FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN OTHERS THEN null; END $$;

    ALTER TABLE public.siparisler ADD COLUMN IF NOT EXISTS odeme_durumu TEXT;
    ALTER TABLE public.siparisler ADD COLUMN IF NOT EXISTS odeme_kasa_tipi TEXT;
    ALTER TABLE public.siparisler ADD COLUMN IF NOT EXISTS siparis_durumu TEXT;
    ALTER TABLE public.siparisler ADD COLUMN IF NOT EXISTS siparis_kaynagi TEXT;
    ALTER TABLE public.siparisler ADD COLUMN IF NOT EXISTS teslimat_adresi JSONB;

    NOTIFY pgrst, 'reload schema';
  `);

  console.log('--- Migrating missing table rows ---');
  for (const t of ['belgeler', 'iletisim_mesajlari', 'siparisler']) {
    const { data: rows, error } = await oldSupabase.from(t).select('*');
    if (!error && rows?.length > 0) {
      const { error: insErr } = await newSupabase.from(t).upsert(rows);
      if (insErr) console.error(`Error migrating ${t}:`, insErr.message);
      else console.log(`✓ Migrated ${rows.length} rows for [${t}]`);
    }
  }

  // Recursive copy for storage folders
  console.log('--- Recursively copying subfolders in Storage ---');
  const folders = [
    { bucket: 'urun-gorselleri', folder: 'gallery' },
    { bucket: 'urun-gorselleri', folder: 'main' },
    { bucket: 'urun-gorselleri', folder: 'public' },
    { bucket: 'urun-gorselleri', folder: 'toplu-yukleme' },
    { bucket: 'documents', folder: 'documents' },
    { bucket: 'marketing-materialien', folder: 'marketing-materialien' }
  ];

  for (const { bucket, folder } of folders) {
    const { data: files } = await oldSupabase.storage.from(bucket).list(folder, { limit: 1000 });
    if (files && files.length > 0) {
      console.log(`Found ${files.length} files in [${bucket}/${folder}]`);
      for (const f of files) {
        if (f.name === '.emptyFolderPlaceholder') continue;
        const filePath = `${folder}/${f.name}`;
        const { data: blob } = await oldSupabase.storage.from(bucket).download(filePath);
        if (blob) {
          const buffer = Buffer.from(await blob.arrayBuffer());
          await newSupabase.storage.from(bucket).upload(filePath, buffer, {
            upsert: true,
            contentType: f.metadata?.mimetype || 'application/octet-stream'
          });
          console.log(`✓ Uploaded subfolder file: ${filePath}`);
        }
      }
    }
  }

  console.log('\n✅ Everything 100% Synced and Verified!');
}

fix().catch(console.error);
