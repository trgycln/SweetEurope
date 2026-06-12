import { Locale } from '@/lib/utils';
import { getDictionary } from '@/dictionaries';
import { BLOG_POSTS } from '@/lib/blog-data';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { FiArrowLeft, FiCalendar, FiUser, FiTag } from 'react-icons/fi';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale, slug: string }> }): Promise<Metadata> {
    const { locale, slug } = await params;
    const post = BLOG_POSTS.find(p => p.slug === slug);
    if (!post) return { title: 'Post Not Found' };

    return {
        title: `${post.title[locale as keyof typeof post.title] || post.title.tr} | ElysonSweets Blog`,
        description: post.excerpt[locale as keyof typeof post.excerpt] || post.excerpt.tr,
        openGraph: {
            type: 'article',
            publishedTime: post.date,
        }
    };
}

export default async function BlogPostPage({ params }: { params: Promise<{ locale: Locale, slug: string }> }) {
    const { locale, slug } = await params;
    const post = BLOG_POSTS.find(p => p.slug === slug);

    if (!post) {
        return notFound();
    }

    const title = post.title[locale as keyof typeof post.title] || post.title.tr;
    const content = post.content[locale as keyof typeof post.content] || post.content.tr;

    const articleSchema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": title,
        "datePublished": post.date,
        "author": [{
            "@type": "Person",
            "name": post.author
        }]
    };

    return (
        <div className="min-h-screen bg-white pt-24 pb-20">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
            
            <div className="container mx-auto px-4 max-w-3xl">
                <Link href={`/${locale}/blog`} className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-medium mb-10 transition-colors">
                    <FiArrowLeft /> {locale === 'tr' ? 'Bloga Dön' : locale === 'en' ? 'Back to Blog' : 'Zurück zum Blog'}
                </Link>

                <article>
                    <header className="mb-10 text-center">
                        <div className="flex items-center justify-center gap-4 text-sm text-slate-500 mb-6 font-medium">
                            <span className="flex items-center gap-1.5"><FiCalendar /> {new Date(post.date).toLocaleDateString(locale)}</span>
                            <span className="flex items-center gap-1.5"><FiUser /> {post.author}</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">
                            {title}
                        </h1>
                        <div className="flex flex-wrap justify-center gap-2">
                            {post.tags.map(tag => (
                                <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                                    <FiTag size={10} /> {tag}
                                </span>
                            ))}
                        </div>
                    </header>

                    <div className="h-64 md:h-96 bg-slate-100 rounded-3xl mb-12 relative overflow-hidden flex items-center justify-center">
                        {/* Placeholder for real image */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50"></div>
                        <span className="text-6xl relative z-10 opacity-30">☕</span>
                    </div>

                    <div 
                        className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-img:rounded-2xl"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                </article>

                <div className="mt-16 pt-8 border-t border-slate-100">
                    <div className="bg-slate-50 rounded-2xl p-8 text-center">
                        <h3 className="text-xl font-bold text-slate-800 mb-3">
                            {locale === 'tr' ? 'Toptan Sipariş Verin' : 'Order Wholesale'}
                        </h3>
                        <p className="text-slate-600 mb-6">
                            {locale === 'tr' ? 'Fo kahve şuruplarını ve diğer premium ürünlerimizi incelemek için ürün kataloğumuza göz atın.' : 'Check out our product catalog to view Fo coffee syrups and other premium products.'}
                        </p>
                        <Link href={`/${locale}/products`} className="inline-block px-8 py-3 bg-slate-900 text-white rounded-full font-bold hover:bg-blue-600 transition-colors">
                            {locale === 'tr' ? 'Ürünlere Git' : 'Go to Products'}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
