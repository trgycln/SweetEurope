import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { BlogYazisi } from '@/types/blog';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Metadata } from 'next';
import Script from 'next/script';
import BlogPostContent from '@/components/blog/BlogPostContent';

export async function generateMetadata({ params }: { params: Promise<{ locale: string, slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const decodedSlug = decodeURIComponent(slug);
  let { data: post } = await supabase
    .from('blog_yazilari')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (!post && decodedSlug !== slug) {
    const res = await supabase
      .from('blog_yazilari')
      .select('*')
      .eq('slug', decodedSlug)
      .eq('is_published', true)
      .maybeSingle();
    post = res.data;
  }

  if (!post) return { title: 'Not Found' };

  const loc = locale as keyof typeof post.title;
  const title = post.meta_title[loc] || post.meta_title['de'] || post.title[loc] || post.title['de'];
  const description = post.meta_description[loc] || post.meta_description['de'] || post.excerpt[loc] || post.excerpt['de'];

  return {
    title,
    description,
    alternates: {
      canonical: `https://elysonsweets.de/${locale}/blog/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.published_at,
      authors: [post.author_name],
      images: post.image_url ? [post.image_url] : [],
    }
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ locale: string, slug: string }> }) {
  const { locale, slug } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const decodedSlug = decodeURIComponent(slug);
  let { data: post } = await supabase
    .from('blog_yazilari')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (!post && decodedSlug !== slug) {
    const res = await supabase
      .from('blog_yazilari')
      .select('*')
      .eq('slug', decodedSlug)
      .eq('is_published', true)
      .maybeSingle();
    post = res.data;
  }

  if (!post) {
    notFound();
  }

  const loc = locale as keyof typeof post.title;
  const title = post.title[loc] || post.title['de'];
  const content = post.content[loc] || post.content['de'];
  const excerpt = post.excerpt[loc] || post.excerpt['de'];

  // GEO & SEO: Article JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": excerpt,
    "image": post.image_url ? [post.image_url] : [],
    "datePublished": post.published_at,
    "dateModified": post.updated_at,
    "author": [{
        "@type": "Person",
        "name": post.author_name,
        "url": "https://elysonsweets.de/about"
    }],
    "publisher": {
      "@type": "Organization",
      "name": "Elysonsweets GmbH",
      "logo": {
        "@type": "ImageObject",
        "url": "https://elysonsweets.de/logo.png"
      }
    }
  };

  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <Script
        id={`json-ld-article-${post.id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <article>
        <header className="mb-10 text-center">
          <time className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-4 block">
            {new Date(post.published_at).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
          </time>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
            {title}
          </h1>
          <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
            <span>By {post.author_name}</span>
          </div>
        </header>

        {post.image_url && (
          <div className="relative w-full h-[400px] md:h-[500px] rounded-3xl overflow-hidden mb-12 shadow-lg">
            <Image 
              src={post.image_url} 
              alt={title} 
              fill 
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1024px"
            />
          </div>
        )}

        <BlogPostContent content={content} locale={locale} />
      </article>
    </main>
  );
}
