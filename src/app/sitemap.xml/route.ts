import { createClient } from '@supabase/supabase-js';
import { buildHiddenPublicCategoryIds } from '@/lib/public-category-visibility';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const locales = ['de', 'en', 'tr', 'ar'];
const baseUrl = 'https://www.elysonsweets.de';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const diag: string[] = [];
  diag.push(`supabaseUrl=${supabaseUrl ? 'set' : 'MISSING'}`);
  diag.push(`supabaseServiceKey=${supabaseServiceKey ? `set(len=${supabaseServiceKey.length})` : 'MISSING'}`);

  console.log('[sitemap]', diag.join(' | '));

  let products: any[] = [];
  let categories: any[] = [];

  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      });

      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('urunler').select('slug, created_at, kategori_id').eq('aktif', true),
        supabase.from('kategoriler').select('id, slug, created_at, ust_kategori_id'),
      ]);

      if (productsRes.error) {
        console.error('[sitemap] products error:', productsRes.error);
        diag.push(`productsError=${productsRes.error.message}`);
      }
      if (categoriesRes.error) {
        console.error('[sitemap] categories error:', categoriesRes.error);
        diag.push(`categoriesError=${categoriesRes.error.message}`);
      }

      products = productsRes.data ?? [];
      categories = categoriesRes.data ?? [];

      diag.push(`productsRaw=${products.length}`);
      diag.push(`categoriesRaw=${categories.length}`);
      console.log('[sitemap] productsRaw:', products.length, 'categoriesRaw:', categories.length);
    } catch (err: any) {
      console.error('[sitemap] exception:', err);
      diag.push(`exception=${err?.message ?? String(err)}`);
    }
  }

  const hiddenIds = buildHiddenPublicCategoryIds(categories as any[]);
  diag.push(`hiddenIds=${hiddenIds.size}`);

  const visibleProducts = products.filter(
    (p) => p.slug && !hiddenIds.has(p.kategori_id ?? '')
  );
  const visibleCategories = categories.filter(
    (c) => c.slug && !hiddenIds.has(c.id)
  );

  diag.push(`visibleProducts=${visibleProducts.length}`);
  diag.push(`visibleCategories=${visibleCategories.length}`);
  console.log('[sitemap] visibleProducts:', visibleProducts.length, 'visibleCategories:', visibleCategories.length);

  const urls: string[] = [];

  const staticPages = ['', '/products', '/about', '/contact', '/impressum', '/datenschutz'];
  locales.forEach((locale) => {
    staticPages.forEach((page) => {
      urls.push(`
  <url>
    <loc>${baseUrl}/${locale}${page}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page === '' ? 'daily' : 'weekly'}</changefreq>
    <priority>${page === '' ? '1.0' : '0.8'}</priority>
  </url>`);
    });
  });

  locales.forEach((locale) => {
    visibleProducts.forEach((product) => {
      urls.push(`
  <url>
    <loc>${baseUrl}/${locale}/products/${product.slug}</loc>
    <lastmod>${product.created_at ? new Date(product.created_at).toISOString() : new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
    });
  });

  locales.forEach((locale) => {
    visibleCategories.forEach((category) => {
      urls.push(`
  <url>
    <loc>${baseUrl}/${locale}/products?kategori=${category.slug}</loc>
    <lastmod>${category.created_at ? new Date(category.created_at).toISOString() : new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
    });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- diag: ${diag.join(' | ')} -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
