import { Locale } from '@/lib/utils';
import { getDictionary } from '@/dictionaries';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { FiArrowRight } from 'react-icons/fi';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
    const { locale } = await params;
    return {
        title: locale === 'tr' ? 'Markalarımız | ElysonSweets' : locale === 'en' ? 'Our Brands | ElysonSweets' : 'Unsere Marken | ElysonSweets',
        description: locale === 'tr' ? 'Dünya çapında bilinen premium pastacılık ve içecek markalarımız.' : 'Our world-renowned premium pastry and beverage brands.',
    };
}

export default async function MarkalarPage({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params;
    const dict = await getDictionary(locale);

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-20">
            <div className="container mx-auto px-4 max-w-7xl">
                {/* Hero */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6">
                        {locale === 'tr' ? 'Dünya Çapında Profesyonellerin Tercihi' : locale === 'en' ? 'The Choice of Professionals Worldwide' : 'Die Wahl der Profis Weltweit'}
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        {locale === 'tr' ? 'Kafeler, oteller ve A tipi pastaneler için dünyanın en kaliteli ve güvenilir markalarını sunuyoruz.' : 
                         locale === 'en' ? 'We offer the world\'s highest quality and most reliable brands for cafes, hotels, and premium patisseries.' : 
                         'Wir bieten die hochwertigsten und zuverlässigsten Marken der Welt für Cafés, Hotels und Premium-Konditoreien.'}
                    </p>
                </div>

                {/* Brands Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* FO Brand Card */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group">
                        <div className="h-40 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl flex items-center justify-center mb-8 relative overflow-hidden">
                            <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 tracking-tighter">FO</h2>
                            <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-3">FO Syrups & Ingredients</h3>
                        <p className="text-slate-600 mb-8 line-clamp-3">
                            {locale === 'tr' ? '1988 yılından beri pastacılık ve içecek sektörüne yön veren, 100\'den fazla ülkeye ihracat yapan global bir marka. Baristaların bir numaralı tercihi kahve şurupları ve profesyonel soslar.' :
                             locale === 'en' ? 'A global brand shaping the pastry and beverage sector since 1988, exporting to over 100 countries. The number one choice of baristas for coffee syrups and professional sauces.' :
                             'Eine globale Marke, die seit 1988 den Gebäck- und Getränkesektor prägt und in über 100 Länder exportiert. Die erste Wahl für Baristas bei Kaffeesirupen und professionellen Saucen.'}
                        </p>
                        <Link href={`/${locale}/markalar/fo`} className="inline-flex items-center gap-2 text-blue-600 font-bold hover:gap-3 transition-all">
                            {locale === 'tr' ? 'Markayı İncele' : locale === 'en' ? 'View Brand' : 'Marke Ansehen'} <FiArrowRight />
                        </Link>
                    </div>

                    {/* Diğer markalar için yer tutucular (LİMPO, CORE, FÜMER vs) */}
                    {['LİMPO', 'REPO', 'CORE', 'FÜMER'].map(brand => (
                        <div key={brand} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                            <div className="h-40 bg-slate-50 rounded-2xl flex items-center justify-center mb-8">
                                <h2 className="text-4xl font-bold text-slate-300 tracking-tighter">{brand}</h2>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-3">{brand}</h3>
                            <p className="text-slate-500 mb-8">
                                {locale === 'tr' ? 'Çok yakında detaylı marka profilimiz eklenecektir.' : 'Detailed brand profile will be added soon.'}
                            </p>
                            <span className="inline-flex items-center gap-2 text-slate-400 font-bold">
                                {locale === 'tr' ? 'Çok Yakında' : 'Coming Soon'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
