import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { BlogYazisi } from '@/types/blog';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { blogListingT, Locale } from '@/lib/i18n/pages';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = blogListingT[(locale as Locale)] ?? blogListingT.de;

  return {
    title: `${t.metaTitle} | Elysonsweets Magazine`,
    description: t.metaDesc,
    alternates: {
      canonical: `https://elysonsweets.de/${locale}/blog`,
    }
  };
}

export default async function BlogListPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const t = blogListingT[(locale as Locale)] ?? blogListingT.de;

  const { data: posts, error } = await supabase
    .from('blog_yazilari')
    .select('id, slug, title, excerpt, image_url, published_at, author_name')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Blog fetch error:', error);
    return <div className="container mx-auto py-12 text-center text-stone-500 font-serif italic">Yazılar yüklenemedi.</div>;
  }

  const featuredPost = posts?.[0];
  const recentPosts = posts?.slice(1, 4);
  const otherPosts = posts?.slice(4);

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-900 pb-24 selection:bg-amber-900/20 selection:text-stone-900">
      
      <div className="pt-8 md:pt-12 lg:pt-16 pb-12 px-4 md:px-8 max-w-[90rem] mx-auto">
        {/* Editorial Header */}
        <header className="mb-16 md:mb-24 flex flex-col lg:flex-row lg:items-end justify-between gap-8 lg:gap-16 border-b border-stone-300 pb-12 md:pb-16 relative">
          <div className="max-w-4xl relative z-10">
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-amber-800 mb-6 flex items-center gap-4">
              <span className="w-8 h-[1px] bg-amber-800 block"></span>
              ElysonSweets Journal
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-[6rem] font-serif font-black text-stone-900 tracking-tighter uppercase leading-[0.9]">
              {t.pageTitle}
            </h1>
          </div>
          <div className="max-w-md lg:pb-4 relative z-10">
            <p className="text-stone-500 font-serif italic text-lg md:text-xl leading-relaxed">
              {t.pageSubtitle}
            </p>
          </div>
          
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-[600px] h-[300px] bg-amber-900/5 blur-[100px] rounded-full pointer-events-none -z-10" />
        </header>

        {posts && posts.length > 0 ? (
          <div className="flex flex-col gap-24 md:gap-32">
            
            {/* Featured Hero Article */}
            {featuredPost && (
              <section aria-label="Featured Story" className="group">
                <article className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-0">
                  
                  <div className="lg:col-span-8 relative">
                    {featuredPost.image_url && (
                      <Link href={`/${locale}/blog/${featuredPost.slug}`} className="block relative aspect-[4/3] lg:aspect-[16/10] overflow-hidden">
                        <div className="absolute inset-0 bg-stone-900/10 group-hover:bg-transparent transition-colors duration-700 z-10" />
                        <Image 
                          src={featuredPost.image_url} 
                          alt={featuredPost.title[locale as keyof typeof featuredPost.title] || featuredPost.title['de']} 
                          fill 
                          className="object-cover scale-100 group-hover:scale-105 transition-transform duration-[2s] ease-out"
                          priority
                          sizes="(max-width: 1024px) 100vw, 70vw"
                        />
                      </Link>
                    )}
                  </div>

                  <div className="lg:col-span-4 flex flex-col justify-center lg:pl-12 xl:pl-16 relative z-20 bg-[#FBF9F5] lg:-ml-12 lg:mt-24 lg:pb-12 border-l border-stone-200 lg:border-none pl-6 md:pl-8">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-900 bg-amber-900/5 px-3 py-1.5 border border-amber-900/10">
                        Featured
                      </span>
                      <time className="text-[10px] font-bold tracking-[0.2em] uppercase text-stone-500">
                        {new Date(featuredPost.published_at).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </time>
                    </div>
                    
                    <Link href={`/${locale}/blog/${featuredPost.slug}`}>
                      <h2 className="text-4xl md:text-5xl font-serif font-bold leading-[1.05] mb-6 text-stone-900 group-hover:text-amber-800 transition-colors">
                        {featuredPost.title[locale as keyof typeof featuredPost.title] || featuredPost.title['de']}
                      </h2>
                    </Link>
                    
                    <div 
                      className="text-base md:text-lg text-stone-600 mb-8 leading-relaxed font-serif prose prose-stone prose-p:my-0 prose-a:text-amber-800 hover:prose-a:underline line-clamp-4"
                      dangerouslySetInnerHTML={{ __html: featuredPost.excerpt[locale as keyof typeof featuredPost.excerpt] || featuredPost.excerpt['de'] }}
                    />
                    
                    <div>
                      <Link 
                        href={`/${locale}/blog/${featuredPost.slug}`}
                        className="inline-flex items-center text-xs font-bold uppercase tracking-[0.2em] text-stone-900 hover:text-amber-800 transition-colors group/link pb-2 border-b border-stone-900 hover:border-amber-800"
                      >
                        {t.readMore} 
                        <span className="ml-3 transition-transform group-hover/link:translate-x-2">→</span>
                      </Link>
                    </div>
                  </div>
                </article>
              </section>
            )}

            {/* Editor's Picks Grid */}
            {recentPosts && recentPosts.length > 0 && (
              <section className="border-t border-stone-300 pt-16 md:pt-24">
                <div className="flex flex-col md:flex-row items-baseline justify-between mb-16 gap-6">
                   <h2 className="text-3xl md:text-5xl font-serif font-black text-stone-900 tracking-tighter uppercase">
                     {t.editorsPicks}
                   </h2>
                   <span className="text-xs md:text-sm italic font-serif text-stone-500">
                     {t.latestUpdates}
                   </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 lg:gap-x-12 gap-y-16">
                  {recentPosts.map((post: BlogYazisi) => {
                    const loc = locale as keyof typeof post.title;
                    return (
                      <article key={post.id} className="group flex flex-col h-full">
                        {post.image_url && (
                          <Link href={`/${locale}/blog/${post.slug}`} className="relative aspect-[3/4] w-full mb-8 overflow-hidden block bg-stone-100">
                            <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/10 transition-colors duration-500 z-10" />
                            <Image 
                              src={post.image_url} 
                              alt={post.title[loc] || post.title['de']} 
                              fill 
                              className="object-cover transition-transform duration-700 group-hover:scale-105"
                              sizes="(max-width: 768px) 100vw, 33vw"
                            />
                          </Link>
                        )}
                        <div className="flex-grow flex flex-col">
                          <time className="text-[10px] font-bold tracking-[0.2em] uppercase text-stone-400 mb-4 block border-b border-stone-200 pb-4">
                            {new Date(post.published_at).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}
                          </time>
                          <Link href={`/${locale}/blog/${post.slug}`}>
                            <h3 className="text-2xl lg:text-3xl font-serif font-bold mb-4 text-stone-900 group-hover:text-amber-800 transition-colors leading-tight">
                              {post.title[loc] || post.title['de']}
                            </h3>
                          </Link>
                          <div 
                            className="text-sm md:text-base text-stone-600 line-clamp-3 mb-8 flex-grow font-serif prose-sm prose-stone prose-p:my-0"
                            dangerouslySetInnerHTML={{ __html: post.excerpt[loc] || post.excerpt['de'] }}
                          />
                          <div className="mt-auto">
                             <Link 
                              href={`/${locale}/blog/${post.slug}`}
                              className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.2em] text-stone-900 hover:text-amber-800 transition-colors"
                            >
                              {t.readMore} <span className="ml-2">→</span>
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Compact Archive List */}
            {otherPosts && otherPosts.length > 0 && (
              <section className="bg-stone-900 text-[#FBF9F5] rounded-[2rem] p-8 md:p-16 lg:p-24 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-900/20 blur-[120px] rounded-full pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-6 mb-16 border-b border-stone-800 pb-8">
                    <h2 className="text-3xl md:text-5xl font-serif font-black tracking-tighter uppercase text-stone-100">
                      {t.archive}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-12">
                    {otherPosts.map((post: BlogYazisi) => {
                      const loc = locale as keyof typeof post.title;
                      return (
                        <article key={post.id} className="group flex items-start gap-6">
                          <div className="w-20 h-20 shrink-0 relative overflow-hidden rounded-full border border-stone-700 opacity-70 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105">
                             {post.image_url && (
                               <Image src={post.image_url} alt="" fill className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                             )}
                          </div>
                          <div className="flex-1 pt-1">
                             <time className="text-[10px] font-bold tracking-[0.2em] uppercase text-amber-900/80 mb-2 block">
                              {new Date(post.published_at).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </time>
                            <Link href={`/${locale}/blog/${post.slug}`} className="block">
                              <h3 className="text-lg font-serif font-bold text-stone-200 group-hover:text-white transition-colors leading-snug line-clamp-2">
                                {post.title[loc] || post.title['de']}
                              </h3>
                            </Link>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}
            
          </div>
        ) : (
          <div className="text-center py-32 border-t border-stone-200">
            <p className="text-2xl text-stone-400 font-serif italic">The journal is currently empty.</p>
          </div>
        )}
      </div>
    </div>
  );
}

