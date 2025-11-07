// Ensure the six curated main categories exist with proper names
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MAIN_CATEGORIES = [
  {
    slug: 'coffee',
    ad: { tr: 'Kahve', de: 'Kaffee', en: 'Coffee' },
  },
  {
    slug: 'drinks',
    ad: { tr: 'İçecekler', de: 'Getränke', en: 'Drinks' },
  },
  {
    slug: 'cakes-and-tarts',
    ad: { tr: 'Pastalar & Kekler', de: 'Torten & Kuchen', en: 'Cakes & Tarts' },
  },
  {
    slug: 'cookies-and-muffins',
    ad: { tr: 'Kurabiye & Muffinler', de: 'Kekse & Muffins', en: 'Cookies & Muffins' },
  },
  {
    slug: 'pizza-and-fast-food',
    ad: { tr: 'Pizza & Fast Food', de: 'Pizza & Fast Food', en: 'Pizza & Fast Food' },
  },
  {
    slug: 'sauces-and-ingredients',
    ad: { tr: 'Soslar & Malzemeler', de: 'Saucen & Zutaten', en: 'Sauces & Ingredients' },
  },
];

async function ensureCategory({ slug, ad }) {
  const { data: existing, error } = await sb
    .from('kategoriler')
    .select('id, ust_kategori_id')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;

  if (existing) {
    // Update names if needed and ensure it's a main category (ust_kategori_id = null)
    const { error: updErr } = await sb
      .from('kategoriler')
      .update({ ad, ust_kategori_id: null })
      .eq('id', existing.id);
    if (updErr) throw updErr;
    console.log(`↻ Updated ${slug}`);
    return existing.id;
  } else {
    const { data: created, error: insErr } = await sb
      .from('kategoriler')
      .insert({ slug, ad, ust_kategori_id: null })
      .select('id')
      .single();
    if (insErr) throw insErr;
    console.log(`✓ Created ${slug}`);
    return created.id;
  }
}

async function main() {
  console.log('🔧 Ensuring six main categories...');
  for (const cat of MAIN_CATEGORIES) {
    await ensureCategory(cat);
  }

  const { data: legacy } = await sb
    .from('kategoriler')
    .select('id')
    .eq('slug', 'coffee-and-drinks')
    .is('ust_kategori_id', null)
    .maybeSingle();

  if (legacy) {
    console.log('ℹ️ coffee-and-drinks exists as a main category. Homepage will ignore it. You can remove it later if desired.');
  }

  console.log('✅ Done.');
}

main().catch((e) => {
  console.error('❌ Error:', e.message || e);
  process.exit(1);
});
