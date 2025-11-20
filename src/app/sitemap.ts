import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const locales = ['de', 'en', 'tr', 'ar'];
const baseUrl = 'https://www.elysonsweets.de';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Fetch active products
  const { data: products } = await supabase
    .from('urunler')
    .select('slug, updated_at')
    .eq('aktif', true);

  // Fetch categories
  const { data: categories } = await supabase
    .from('kategoriler')
    .select('slug, updated_at');

  const sitemap: MetadataRoute.Sitemap = [];

  // Static pages for each locale
  const staticPages = [
    '',           // homepage
    '/products',
    '/about',
    '/contact',
    '/impressum',
    '/datenschutz',
  ];

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

  // Product pages for each locale
  if (products) {
    locales.forEach((locale) => {
      products.forEach((product) => {
        sitemap.push({
          url: `${baseUrl}/${locale}/products/${product.slug}`,
          lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      });
    });
  }

  // Category pages for each locale
  if (categories) {
    locales.forEach((locale) => {
      categories.forEach((category) => {
        if (category.slug) {
          sitemap.push({
            url: `${baseUrl}/${locale}/products?kategori=${category.slug}`,
            lastModified: category.updated_at ? new Date(category.updated_at) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.6,
          });
        }
      });
    });
  }

  return sitemap;
}
