import Link from 'next/link';
import Image from 'next/image';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

type RelatedProductsProps = {
  locale: string;
  categoryId: string;
  currentProductId: string;
};

export default async function RelatedProducts({ locale, categoryId, currentProductId }: RelatedProductsProps) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  
  const { data: products } = await supabase
    .from('urunler')
    .select('id, slug, ana_resim_url, ad')
    .eq('kategori_id', categoryId)
    .eq('aktif', true)
    .neq('id', currentProductId)
    .limit(4);

  if (!products || products.length === 0) return null;

  return (
    <section className="mt-16 border-t pt-8">
      <h2 className="text-2xl font-bold mb-6">
        {locale === 'tr' ? 'İlgili Ürünler' : locale === 'ar' ? 'منتجات ذات صله' : 'Ähnliche Produkte'}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product) => {
          const adJson = product.ad as Record<string, string> | null;
          const productName = adJson?.[locale] ?? adJson?.['de'] ?? adJson?.['tr'] ?? 'Product';
          const imageUrl = product.ana_resim_url || '/default-og-image.jpg';

          return (
            <Link 
              key={product.id} 
              href={`/${locale}/products/${product.slug || product.id}`}
              className="group block"
            >
              <div className="relative aspect-square bg-white border border-gray-100 rounded-lg overflow-hidden mb-3 shadow-sm group-hover:shadow-md transition-shadow">
                <Image
                  src={imageUrl}
                  alt={productName}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
              <h3 className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors line-clamp-2">
                {productName}
              </h3>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
