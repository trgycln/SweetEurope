import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { BlogYazisi } from '@/types/blog';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  
  const titles: Record<string, string> = {
    de: 'B2B HORECA Blog & Branchen-News | Elysonsweets',
    en: 'B2B HORECA Blog & Industry News | Elysonsweets',
    tr: 'B2B HORECA Blog & Sektörel Haberler | Elysonsweets',
    ar: 'مدونة B2B HORECA وأخبار الصناعة | Elysonsweets'
  };

  const descriptions: Record<string, string> = {
    de: 'Aktuelle Trends, Cocktail-Rezepte und B2B-Insights für die Gastronomie.',
    en: 'Latest trends, cocktail recipes, and B2B insights for the gastronomy sector.',
    tr: 'Gastronomi sektörü için en son trendler, kokteyl tarifleri ve B2B içgörüleri.',
    ar: 'أحدث الاتجاهات ووصفات الكوكتيل ورؤى B2B لقطاع فن الطهو.'
  };

  return {
    title: titles[locale] || titles['de'],
    description: descriptions[locale] || descriptions['de'],
    alternates: {
      canonical: `https://elysonsweets.de/${locale}/blog`,
    }
  };
}

export default async function BlogListPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: posts, error } = await supabase
    .from('blog_yazilari')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Blog fetch error:', error);
    return <div className="container mx-auto py-12 text-center">Blog yazıları yüklenemedi.</div>;
  }

  return (
    <main className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
        {locale === 'de' ? 'B2B HORECA Wissen & News' : 
         locale === 'en' ? 'B2B HORECA Knowledge & News' : 
         locale === 'tr' ? 'B2B HORECA Bilgi & Haberler' : 'معرفة وأخبار B2B HORECA'}
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts?.map((post: BlogYazisi) => {
          const loc = locale as keyof typeof post.title;
          return (
            <article key={post.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 dark:border-gray-700">
              {post.image_url && (
                <Link href={`/${locale}/blog/${post.slug}`}>
                  <div className="relative h-56 w-full">
                    <Image 
                      src={post.image_url} 
                      alt={post.title[loc] || post.title['de']} 
                      fill 
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                </Link>
              )}
              <div className="p-6">
                <time className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">
                  {new Date(post.published_at).toLocaleDateString(locale)}
                </time>
                <Link href={`/${locale}/blog/${post.slug}`}>
                  <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white hover:text-blue-600 transition-colors line-clamp-2">
                    {post.title[loc] || post.title['de']}
                  </h2>
                </Link>
                <p className="text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">
                  {post.excerpt[loc] || post.excerpt['de']}
                </p>
                <Link 
                  href={`/${locale}/blog/${post.slug}`}
                  className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  {locale === 'de' ? 'Weiterlesen →' : 
                   locale === 'en' ? 'Read more →' : 
                   locale === 'tr' ? 'Devamını Oku →' : 'اقرأ المزيد ←'}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
