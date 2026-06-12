import { Locale } from '@/lib/utils';
import { getDictionary } from '@/dictionaries';
import { BLOG_POSTS } from '@/lib/blog-data';
import Link from 'next/link';
import type { Metadata } from 'next';
import { FiArrowRight, FiCalendar, FiUser } from 'react-icons/fi';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
    const { locale } = await params;
    return {
        title: locale === 'tr' ? 'Blog & Haberler | ElysonSweets' : locale === 'en' ? 'Blog & News | ElysonSweets' : 'Blog & Neuigkeiten | ElysonSweets',
        description: locale === 'tr' ? 'Pastacılık, kahve kültürü ve gastronomi dünyasından en güncel haberler, ipuçları ve trendler.' : 'Latest news, tips, and trends from the world of pastry, coffee culture, and gastronomy.',
    };
}

export default async function BlogIndexPage({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params;

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-20">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
                        {locale === 'tr' ? 'Blog & Rehber' : locale === 'en' ? 'Blog & Guide' : 'Blog & Ratgeber'}
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        {locale === 'tr' ? 'Gastronomi profesyonelleri için rehber içerikler, trendler ve ürün incelemeleri.' : 
                         'Guide content, trends, and product reviews for gastronomy professionals.'}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {BLOG_POSTS.map(post => (
                        <article key={post.slug} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 flex flex-col">
                            <div className="h-48 bg-slate-200 relative">
                                {/* Eğer gerçek görsel eklenecekse buraya Image componenti gelecek */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                                    <span className="text-4xl opacity-20">📝</span>
                                </div>
                            </div>
                            <div className="p-8 flex flex-col flex-1">
                                <div className="flex items-center gap-4 text-xs text-slate-400 mb-4 font-medium">
                                    <span className="flex items-center gap-1"><FiCalendar /> {new Date(post.date).toLocaleDateString(locale)}</span>
                                    <span className="flex items-center gap-1"><FiUser /> {post.author}</span>
                                </div>
                                <h2 className="text-xl font-bold text-slate-800 mb-3 line-clamp-2">
                                    {post.title[locale as keyof typeof post.title] || post.title.tr}
                               </h2>
                                <p className="text-slate-600 mb-6 line-clamp-3 text-sm leading-relaxed flex-1">
                                    {post.excerpt[locale as keyof typeof post.excerpt] || post.excerpt.tr}
                                </p>
                                <Link href={`/${locale}/blog/${post.slug}`} className="inline-flex items-center gap-2 text-blue-600 font-bold hover:gap-3 transition-all text-sm mt-auto">
                                    {locale === 'tr' ? 'Devamını Oku' : locale === 'en' ? 'Read More' : 'Weiterlesen'} <FiArrowRight />
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
}
