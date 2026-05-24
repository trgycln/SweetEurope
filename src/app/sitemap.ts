import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { buildHiddenPublicCategoryIds } from '@/lib/public-category-visibility';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const locales = ['de', 'en', 'tr', 'ar'];
const baseUrl = 'https://www.elysonsweets.de';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  console.log('[sitemap] supabaseUrl:', supabaseUrl ? 'defined' : 'MISSING');
  console.log('[sitemap] supabaseServiceKey:', supabaseServiceKey ? 'defined' : 'MISSING');

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const [productsRes, categoriesRes] = await Promise.all([
    supabase
      .from('urunler')
      .select('slug, updated_at, kategori_id')
      .eq('aktif', true),
    supabase
      .from('kategoriler')
      .select('id, slug, updated_at, ust_kategori_id'),
  ]);

  if (productsRes.error) {
    console.error('[sitemap] products query error:', productsRes.error.message);
  }
  if (categoriesRes.error) {
    console.error('[sitemap] categories query error:', categoriesRes.error.message);
  }

  console.log('[sitemap] products count:', productsRes.data?.length ?? 0);
  console.log('[sitemap] categories count:', categoriesRes.data?.length ?? 0);

  const products = productsRes.data ?? [];
  const categories = categoriesRes.data ?? [];

  const hiddenKategoriIds = buildHiddenPublicCategoryIds(categories as any[]);

  const visibleProducts = products.filter(
    (p) => p.slug && !hiddenKategoriIds.has(p.kategori_id ?? '')
  );

  const visibleCategories = categories.filter(
    (c) => c.slug && !hiddenKategoriIds.has(c.id)
  );

  console.log('[sitemap] visibleProducts:', visibleProducts.length);
  console.log('[sitemap] visibleCategories:', visibleCategories.length);

  const sitemap: MetadataRoute.Sitemap = [];

  // Statik sayfalar
  const staticPages = ['', '/products', '/about', '/contact', '/impressum', '/datenschutz'];
  locales.forEach((locale) => {
    staticPages.forEach((page) => {
      sitemap.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority: page === '' ? 1 : 0.8,
      });
    });
  });

  // Ürün sayfaları
  locales.forEach((locale) => {
    visibleProducts.forEach((product) => {
      sitemap.push({
        url: `${baseUrl}/${locale}/products/${product.slug}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });
  });

  // Kategori sayfaları
  locales.forEach((locale) => {
    visibleCategories.forEach((category) => {
      sitemap.push({
        url: `${baseUrl}/${locale}/products?kategori=${category.slug}`,
        lastModified: category.updated_at ? new Date(category.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    });
  });

  return sitemap;
}
