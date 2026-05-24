import { createClient } from '@supabase/supabase-js';
import { buildHiddenPublicCategoryIds } from '@/lib/public-category-visibility';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const locales = ['de', 'en', 'tr', 'ar'];
const baseUrl = 'https://www.elysonsweets.de';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from('urunler').select('slug, updated_at, kategori_id').eq('aktif', true),
    supabase.from('kategoriler').select('id, slug, updated_at, ust_kategori_id'),
  ]);

  const hiddenIds = buildHiddenPublicCategoryIds((categories || []) as any[]);

  const visibleProducts = (products || []).filter(
    (p) => p.slug && !hiddenIds.has(p.kategori_id ?? '')
  );
  const visibleCategories = (categories || []).filter(
    (c) => c.slug && !hiddenIds.has(c.id)
  );

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
    <lastmod>${product.updated_at ? new Date(product.updated_at).toISOString() : new Date().toISOString()}</lastmod>
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
    <lastmod>${category.updated_at ? new Date(category.updated_at).toISOString() : new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
    });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
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
