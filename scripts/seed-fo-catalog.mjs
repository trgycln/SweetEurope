import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const parentSlugs = ['coffee', 'sauces-and-ingredients', 'drinks'];

const categoriesToEnsure = [
  {
    parentSlug: 'coffee',
    slug: 'coffee-syrups',
    ad: {
      de: 'Kaffeesirupe',
      en: 'Coffee Syrups',
      tr: 'Kahve Şurupları',
      ar: 'شراب القهوة',
    },
  },
  {
    parentSlug: 'sauces-and-ingredients',
    slug: 'bakery-fillings',
    ad: {
      de: 'Backfüllungen',
      en: 'Bakery Fillings',
      tr: 'Pastane İç Dolguları',
      ar: 'حشوات المخبوزات',
    },
  },
  {
    parentSlug: 'sauces-and-ingredients',
    slug: 'specialty-sauces',
    ad: {
      de: 'Spezialsaucen',
      en: 'Specialty Sauces',
      tr: 'Özel Soslar',
      ar: 'صلصات متخصصة',
    },
  },
  {
    parentSlug: 'drinks',
    slug: 'drink-bases',
    ad: {
      de: 'Getränkebasen',
      en: 'Drink Bases',
      tr: 'İçecek Bazları',
      ar: 'قواعد المشروبات',
    },
  },
];

const templateRows = [
  {
    categorySlug: 'coffee',
    alan_adi: 'hacim_ml',
    alan_tipi: 'sayı',
    sira: 0,
    gosterim_adi: {
      de: 'Flaschenvolumen (ml)',
      en: 'Bottle Volume (ml)',
      tr: 'Şişe Hacmi (ml)',
      ar: 'حجم العبوة (مل)',
    },
  },
  {
    categorySlug: 'coffee',
    alan_adi: 'aroma_profili',
    alan_tipi: 'metin',
    sira: 1,
    gosterim_adi: {
      de: 'Aromaprofil',
      en: 'Aroma Profile',
      tr: 'Aroma Profili',
      ar: 'ملف النكهة',
    },
  },
  {
    categorySlug: 'coffee',
    alan_adi: 'kullanim_alani',
    alan_tipi: 'metin',
    sira: 2,
    gosterim_adi: {
      de: 'Empfohlene Nutzung',
      en: 'Recommended Use',
      tr: 'Kullanım Alanı',
      ar: 'مجال الاستخدام',
    },
  },
  {
    categorySlug: 'coffee',
    alan_adi: 'sertifikasyon',
    alan_tipi: 'metin',
    sira: 3,
    gosterim_adi: {
      de: 'Zertifizierung',
      en: 'Certification',
      tr: 'Sertifikasyon',
      ar: 'الشهادات',
    },
  },
  {
    categorySlug: 'sauces-and-ingredients',
    alan_adi: 'ambalaj_boyutu',
    alan_tipi: 'metin',
    sira: 0,
    gosterim_adi: {
      de: 'Verpackungsgröße',
      en: 'Pack Size',
      tr: 'Ambalaj Boyutu',
      ar: 'حجم العبوة',
    },
  },
  {
    categorySlug: 'sauces-and-ingredients',
    alan_adi: 'dogallik_notu',
    alan_tipi: 'metin',
    sira: 1,
    gosterim_adi: {
      de: 'Natürlichkeitsnotiz',
      en: 'Naturalness Note',
      tr: 'Doğallık Notu',
      ar: 'ملاحظة الطبيعة',
    },
  },
  {
    categorySlug: 'sauces-and-ingredients',
    alan_adi: 'katki_bilgisi',
    alan_tipi: 'metin',
    sira: 2,
    gosterim_adi: {
      de: 'Zusatzstoff-Info',
      en: 'Additive Note',
      tr: 'Katkı Bilgisi',
      ar: 'معلومات الإضافات',
    },
  },
  {
    categorySlug: 'sauces-and-ingredients',
    alan_adi: 'yogunluk_seviyesi',
    alan_tipi: 'metin',
    sira: 3,
    gosterim_adi: {
      de: 'Konsistenz',
      en: 'Texture / Density',
      tr: 'Yoğunluk',
      ar: 'الكثافة',
    },
  },
  {
    categorySlug: 'drinks',
    alan_adi: 'hacim_ml',
    alan_tipi: 'sayı',
    sira: 0,
    gosterim_adi: {
      de: 'Flaschenvolumen (ml)',
      en: 'Bottle Volume (ml)',
      tr: 'Şişe Hacmi (ml)',
      ar: 'حجم العبوة (مل)',
    },
  },
  {
    categorySlug: 'drinks',
    alan_adi: 'servis_orani',
    alan_tipi: 'metin',
    sira: 1,
    gosterim_adi: {
      de: 'Mischverhältnis',
      en: 'Serving Ratio',
      tr: 'Servis Oranı',
      ar: 'نسبة التحضير',
    },
  },
  {
    categorySlug: 'drinks',
    alan_adi: 'hazirlama_notu',
    alan_tipi: 'metin',
    sira: 2,
    gosterim_adi: {
      de: 'Zubereitung',
      en: 'Preparation Note',
      tr: 'Hazırlama Notu',
      ar: 'ملاحظة التحضير',
    },
  },
  {
    categorySlug: 'coffee-syrups',
    alan_adi: 'hacim_ml',
    alan_tipi: 'sayı',
    sira: 0,
    gosterim_adi: {
      de: 'Sirupvolumen (ml)',
      en: 'Syrup Volume (ml)',
      tr: 'Şurup Hacmi (ml)',
      ar: 'حجم الشراب (مل)',
    },
  },
  {
    categorySlug: 'coffee-syrups',
    alan_adi: 'aroma_profili',
    alan_tipi: 'metin',
    sira: 1,
    gosterim_adi: {
      de: 'Aromaprofil',
      en: 'Aroma Profile',
      tr: 'Aroma Profili',
      ar: 'ملف النكهة',
    },
  },
  {
    categorySlug: 'specialty-sauces',
    alan_adi: 'servis_orani',
    alan_tipi: 'metin',
    sira: 0,
    gosterim_adi: {
      de: 'Servierempfehlung',
      en: 'Serving Suggestion',
      tr: 'Servis Önerisi',
      ar: 'اقتراح التقديم',
    },
  },
  {
    categorySlug: 'bakery-fillings',
    alan_adi: 'uygulama_alani',
    alan_tipi: 'metin',
    sira: 0,
    gosterim_adi: {
      de: 'Anwendungsbereich',
      en: 'Application Area',
      tr: 'Kullanım Alanı',
      ar: 'مجال الاستخدام',
    },
  },
  {
    categorySlug: 'drink-bases',
    alan_adi: 'servis_orani',
    alan_tipi: 'metin',
    sira: 0,
    gosterim_adi: {
      de: 'Mischverhältnis',
      en: 'Serving Ratio',
      tr: 'Servis Oranı',
      ar: 'نسبة التحضير',
    },
  },
];

async function ensureSupplier() {
  const existing = await supabase
    .from('tedarikciler')
    .select('id, unvan')
    .ilike('unvan', 'FO')
    .limit(1);

  if (existing.error) throw existing.error;

  const hasSupplier = Array.isArray(existing.data) && existing.data.length > 0;
  if (hasSupplier) return false;

  const insert = await supabase.from('tedarikciler').insert({
    unvan: 'FO',
    yetkili_kisi: 'FO Product Line',
    email: null,
    telefon: null,
  });

  if (insert.error) throw insert.error;
  return true;
}

async function main() {
  const parentRes = await supabase
    .from('kategoriler')
    .select('id, slug')
    .in('slug', parentSlugs);

  if (parentRes.error) throw parentRes.error;

  const parentRows = Array.isArray(parentRes.data) ? parentRes.data : [];
  const parentMap = Object.fromEntries(parentRows.map((row) => [row.slug, row.id]));

  let createdCategories = 0;
  for (const category of categoriesToEnsure) {
    const parentId = parentMap[category.parentSlug];
    if (!parentId) continue;

    const existing = await supabase
      .from('kategoriler')
      .select('id')
      .eq('slug', category.slug)
      .maybeSingle();

    if (existing.error) throw existing.error;

    if (!existing.data) {
      const insert = await supabase.from('kategoriler').insert({
        ad: category.ad,
        slug: category.slug,
        ust_kategori_id: parentId,
      });

      if (insert.error) throw insert.error;
      createdCategories += 1;
    }
  }

  const relevantSlugs = parentSlugs.concat(categoriesToEnsure.map((category) => category.slug));
  const categoryRes = await supabase
    .from('kategoriler')
    .select('id, slug')
    .in('slug', relevantSlugs);

  if (categoryRes.error) throw categoryRes.error;

  const categoryRows = Array.isArray(categoryRes.data) ? categoryRes.data : [];
  const categoryMap = Object.fromEntries(categoryRows.map((row) => [row.slug, row.id]));

  let createdTemplates = 0;
  for (const row of templateRows) {
    const kategori_id = categoryMap[row.categorySlug];
    if (!kategori_id) continue;

    const existing = await supabase
      .from('kategori_ozellik_sablonlari')
      .select('id')
      .eq('kategori_id', kategori_id)
      .eq('alan_adi', row.alan_adi)
      .maybeSingle();

    if (existing.error) throw existing.error;

    if (!existing.data) {
      const insert = await supabase.from('kategori_ozellik_sablonlari').insert({
        kategori_id,
        alan_adi: row.alan_adi,
        alan_tipi: row.alan_tipi,
        gosterim_adi: row.gosterim_adi,
        sira: row.sira,
        public_gorunur: true,
        musteri_gorunur: true,
        alt_bayi_gorunur: true,
      });

      if (insert.error) throw insert.error;
      createdTemplates += 1;
    }
  }

  const supplierCreated = await ensureSupplier();

  console.log(JSON.stringify({
    supplierCreated,
    createdCategories,
    createdTemplates,
    ensuredParents: Object.keys(parentMap),
  }, null, 2));
}

main().catch((error) => {
  console.error('❌ FO catalog seed failed:', error);
  process.exit(1);
});
