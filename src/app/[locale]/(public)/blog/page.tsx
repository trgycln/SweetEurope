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
    <main className="min-h-screen bg-[#FBF9F5] text-stone-900 pb-24">
      {/* Editorial Header */}
      <header className="pt-20 pb-16 md:pt-32 md:pb-24 text-center border-b border-stone-200/60 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-amber-900/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-amber-800 mb-6 block">
            The Journal
          </span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-black mb-6 text-stone-900 tracking-tighter uppercase leading-[0.9]">
            {t.pageTitle}
          </h1>
          <p className="text-stone-500 font-serif italic text-lg md:text-xl max-w-2xl mx-auto">
            {t.pageSubtitle}
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-7xl pt-16">
        {posts && posts.length > 0 ? (
          <div className="flex flex-col gap-24">
            
            {/* Featured Hero Article */}
            {featuredPost && (
              <section aria-label="Featured Story" className="relative">
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-stone-200 -z-10 hidden lg:block" />
                <article className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
                  
                  <div className="lg:col-span-7 relative group">
                    {featuredPost.image_url && (
                      <Link href={`/${locale}/blog/${featuredPost.slug}`} className="block relative aspect-[4/3] lg:aspect-[3/4] overflow-hidden">
                        <div className="absolute inset-0 bg-stone-900/10 group-hover:bg-transparent transition-colors duration-500 z-10" />
                        <Image 
                          src={featuredPost.image_url} 
                          alt={featuredPost.title[locale as keyof typeof featuredPost.title] || featuredPost.title['de']} 
                          fill 
                          className="object-cover scale-100 group-hover:scale-105 transition-transform duration-[1.5s] ease-out"
                          priority
                          sizes="(max-width: 1024px) 100vw, 60vw"
                        />
                      </Link>
                    )}
                    <div className="absolute -bottom-6 -right-6 md:-bottom-8 md:-right-8 w-32 h-32 md:w-48 md:h-48 bg-[#FBF9F5] rounded-full border border-stone-200 hidden md:flex items-center justify-center p-4">
                      <div className="w-full h-full border border-amber-900/20 rounded-full flex items-center justify-center animate-[spin_30s_linear_infinite]">
                        <svg viewBox="0 0 100 100" className="w-full h-full text-amber-900/60 uppercase tracking-[0.2em] font-semibold text-[8px]">
                          <path id="textPath" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="none" />
                          <text>
                            <textPath href="#textPath" startOffset="0%">• READ THE FULL STORY • ELYSONSWEETS MAGAZINE </textPath>
                          </text>
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 flex flex-col justify-center bg-[#FBF9F5] py-8 lg:py-16 lg:pr-8 relative z-20">
                    <div className="flex items-center gap-3 mb-8">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900 border-b border-amber-900/30 pb-1">
                        Featured
                      </span>
                      <span className="text-stone-300">•</span>
                      <time className="text-[10px] font-bold tracking-[0.2em] uppercase text-stone-500">
                        {new Date(featuredPost.published_at).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </time>
                    </div>
                    
                    <Link href={`/${locale}/blog/${featuredPost.slug}`} className="group">
                      <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-[1.1] mb-6 text-stone-900 group-hover:text-amber-800 transition-colors">
                        {featuredPost.title[locale as keyof typeof featuredPost.title] || featuredPost.title['de']}
                      </h2>
                    </Link>
                    
                    <div 
                      className="text-lg md:text-xl text-stone-600 mb-10 leading-relaxed font-serif prose prose-stone prose-p:my-0 prose-a:text-amber-800 hover:prose-a:underline"
                      dangerouslySetInnerHTML={{ __html: featuredPost.excerpt[locale as keyof typeof featuredPost.excerpt] || featuredPost.excerpt['de'] }}
                    />
                    
                    <div>
                      <Link 
                        href={`/${locale}/blog/${featuredPost.slug}`}
                        className="inline-flex items-center text-xs font-bold uppercase tracking-[0.2em] text-stone-900 hover:text-amber-800 transition-colors group/link pb-2 border-b-2 border-stone-900 hover:border-amber-800"
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
              <section className="border-t border-stone-200/80 pt-16">
                <div className="flex items-end justify-between mb-12 border-b border-stone-200/80 pb-6">
                   <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 tracking-tight">
                     {t.editorsPicks}
                   </h2>
                   <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-semibold hidden md:block">
                     {t.latestUpdates}
                   </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-16">
                  {recentPosts.map((post: BlogYazisi) => {
                    const loc = locale as keyof typeof post.title;
                    return (
                      <article key={post.id} className="group flex flex-col h-full">
                        {post.image_url && (
                          <Link href={`/${locale}/blog/${post.slug}`} className="relative aspect-[4/5] w-full mb-6 overflow-hidden block bg-stone-100">
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
                          <time className="text-[10px] font-bold tracking-[0.2em] uppercase text-stone-400 mb-3 block">
                            {new Date(post.published_at).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}
                          </time>
                          <Link href={`/${locale}/blog/${post.slug}`}>
                            <h3 className="text-2xl font-serif font-bold mb-4 text-stone-900 group-hover:text-amber-800 transition-colors leading-tight">
                              {post.title[loc] || post.title['de']}
                            </h3>
                          </Link>
                          <div 
                            className="text-sm text-stone-600 line-clamp-3 mb-6 flex-grow font-serif prose-sm prose-stone prose-p:my-0"
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
              <section className="bg-stone-900 text-white rounded-3xl p-8 md:p-16">
                <h2 className="text-2xl md:text-3xl font-serif font-bold mb-12 border-b border-stone-800 pb-6 text-amber-50">
                  {t.archive}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {otherPosts.map((post: BlogYazisi) => {
                    const loc = locale as keyof typeof post.title;
                    return (
                      <article key={post.id} className="group border-b border-stone-800 pb-6 flex items-center justify-between">
                        <div className="flex-1 pr-6">
                           <time className="text-[10px] font-bold tracking-[0.2em] uppercase text-stone-500 mb-2 block">
                            {new Date(post.published_at).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </time>
                          <Link href={`/${locale}/blog/${post.slug}`} className="block">
                            <h3 className="text-lg font-serif font-bold text-stone-200 group-hover:text-amber-400 transition-colors leading-snug line-clamp-2">
                              {post.title[loc] || post.title['de']}
                            </h3>
                          </Link>
                        </div>
                        <div className="w-16 h-16 shrink-0 relative overflow-hidden rounded-full border border-stone-700 opacity-50 group-hover:opacity-100 transition-opacity">
                           {post.image_url && (
                             <Image src={post.image_url} alt="" fill className="object-cover" />
                           )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
            
          </div>
        ) : (
          <div className="text-center py-32">
            <p className="text-2xl text-stone-400 font-serif italic">The journal is currently empty.</p>
          </div>
        )}
      </div>
    </main>
  );
}

