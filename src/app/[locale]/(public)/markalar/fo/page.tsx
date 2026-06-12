import { Locale } from '@/lib/utils';
import { getDictionary } from '@/dictionaries';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { FiCheckCircle, FiCoffee, FiGlobe, FiAward, FiArrowRight } from 'react-icons/fi';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
    const { locale } = await params;
    return {
        title: locale === 'tr' ? 'Fo Kahve Şurupları ve Pastacılık Ürünleri | ElysonSweets' : locale === 'en' ? 'Fo Coffee Syrups & Pastry Products | ElysonSweets' : 'Fo Kaffeesirupe & Konditoreiprodukte | ElysonSweets',
        description: locale === 'tr' ? '1988\'den beri pastacılık ve içecek sektörüne yön veren Türk markası Fo. Baristaların ilk tercihi kahve şurupları ve toptan tedarik imkanı ElysonSweets\'te.' : 
                     'Fo, shaping the pastry and beverage industry since 1988. The first choice of baristas for coffee syrups, available wholesale at ElysonSweets.',
        keywords: ['Fo şurup', 'Fo kahve şurubu', 'toptan kahve şurubu', 'barista şurubu', 'Fo pastry', 'Özmer', 'Fümer', 'Almanya Fo distribütör'],
        openGraph: {
            type: 'article',
        }
    };
}

export default async function FoBrandPage({ params }: { params: Promise<{ locale: Locale }> }) {
    const { locale } = await params;
    const dict = await getDictionary(locale);

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": locale === 'tr' ? "Fo kahve şurubu nerede üretiliyor?" : "Where is Fo coffee syrup produced?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": locale === 'tr' ? "Fo markası, 1988 yılında kurulan Özmer A.Ş. bünyesinde yüksek teknoloji laboratuvarlarda ve el değmeden Türkiye'de üretilmektedir. ElysonSweets, bu eşsiz lezzeti Almanya başta olmak üzere Avrupa'ya toptan olarak ulaştırmaktadır." : "Fo brand is produced untouched in high-tech laboratories in Turkey under Özmer A.Ş., founded in 1988. ElysonSweets delivers this unique taste wholesale to Europe, especially Germany."
                }
            },
            {
                "@type": "Question",
                "name": locale === 'tr' ? "Kafeler için en çok tercih edilen Fo şurup aromaları hangileridir?" : "What are the most preferred Fo syrup flavors for cafes?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": locale === 'tr' ? "Baristalar tarafından en çok tercih edilen aromalar arasında Vanilya, Karamel, Fındık (Hazelnut), Çikolata, İrlanda Kremi (Irish Cream) ve Beyaz Çikolata bulunmaktadır. Bu şuruplar hem sıcak hem soğuk kahvelerde mükemmel uyum sağlar." : "The most preferred flavors by baristas include Vanilla, Caramel, Hazelnut, Chocolate, Irish Cream, and White Chocolate. These syrups blend perfectly in both hot and cold coffees."
                }
            },
            {
                "@type": "Question",
                "name": locale === 'tr' ? "Almanya'da toptan Fo şurubu nereden satın alınır?" : "Where to buy wholesale Fo syrup in Germany?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": locale === 'tr' ? "ElysonSweets, Almanya'daki kafe, otel ve pastaneler (HORECA) için toptan Fo şurubu ve pastacılık ürünleri tedarik etmektedir. Geniş depolama ve hızlı lojistik ağımızla hizmetinizdeyiz." : "ElysonSweets supplies wholesale Fo syrups and pastry products for cafes, hotels, and bakeries (HORECA) in Germany. We are at your service with our wide storage and fast logistics network."
                }
            }
        ]
    };

    return (
        <div className="min-h-screen bg-white">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
            
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 bg-slate-900 overflow-hidden">
                <div className="absolute inset-0 bg-[url('/img/pattern.svg')] opacity-10"></div>
                <div className="container mx-auto px-4 max-w-5xl relative z-10 text-center">
                    <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                        <span className="text-4xl font-black text-blue-600 tracking-tighter">FO</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                        {locale === 'tr' ? 'Lezzet ve Kalitenin Buluşma Noktası' : 'Where Taste Meets Quality'}
                    </h1>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
                        {locale === 'tr' ? '1988 yılından beri pastacılık ve içecek sektörüne yön veren atılımların ve yeniliklerin gücüyle üretilen, 100\'den fazla ülkeye ihraç edilen küresel marka.' : 
                         'A global brand produced with the power of breakthroughs and innovations shaping the pastry and beverage sector since 1988, exported to over 100 countries.'}
                    </p>
                </div>
            </section>

            {/* İçerik Bölümü */}
            <section className="py-20 bg-slate-50">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-800">
                                {locale === 'tr' ? 'Dünya Standartlarında Üretim' : 'World-Class Production'}
                            </h2>
                            <p className="text-lg text-slate-600 leading-relaxed">
                                {locale === 'tr' ? 'Fümer adıyla başladığı yolculuğuna bugün Özmer A.Ş. çatısı altında devam eden marka; alanında uzman ekibiyle, son teknoloji ile donatılmış laboratuvarlarında el değmeden üretim yapmaktadır.' : 
                                 'Continuing its journey, which started as Fümer, under the roof of Özmer A.Ş. today; the brand produces untouched in laboratories equipped with the latest technology.'}
                            </p>
                            <p className="text-lg text-slate-600 leading-relaxed">
                                {locale === 'tr' ? 'ElysonSweets olarak, Türkiye\'nin bu gurur markasını Almanya ve Avrupa\'daki değerli HORECA (Otel, Restoran, Kafe) işletmeleriyle toptan düzeyde buluşturuyoruz.' : 
                                 'As ElysonSweets, we bring this proud brand of Turkey together with valuable HORECA (Hotel, Restaurant, Cafe) businesses in Germany and Europe at a wholesale level.'}
                            </p>
                            <div className="pt-4">
                                <Link href={`/${locale}/products`} className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
                                    {locale === 'tr' ? 'Tüm Ürünleri İncele' : 'View All Products'} <FiArrowRight size={20} />
                                </Link>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                                    <FiGlobe size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">100+</h3>
                                <p className="text-slate-600 font-medium">{locale === 'tr' ? 'Ülkeye İhracat' : 'Export Countries'}</p>
                            </div>
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center translate-y-8">
                                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-6">
                                    <FiCoffee size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">1500+</h3>
                                <p className="text-slate-600 font-medium">{locale === 'tr' ? 'Ürün Çeşidi' : 'Product Varieties'}</p>
                            </div>
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6">
                                    <FiCheckCircle size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">{locale === 'tr' ? 'El Değmeden' : 'Untouched'}</h3>
                                <p className="text-slate-600 font-medium">{locale === 'tr' ? 'Temiz Üretim' : 'Clean Production'}</p>
                            </div>
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center translate-y-8">
                                <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-6">
                                    <FiAward size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">1988</h3>
                                <p className="text-slate-600 font-medium">{locale === 'tr' ? 'Kuruluş Yılı' : 'Founded In'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sıkça Sorulan Sorular */}
            <section className="py-24 bg-white border-t border-slate-100">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-800 mb-4">{locale === 'tr' ? 'Sıkça Sorulan Sorular' : 'Frequently Asked Questions'}</h2>
                        <p className="text-slate-500">{locale === 'tr' ? 'Fo markası ve kahve şurupları hakkında merak edilenler' : 'Questions about the Fo brand and coffee syrups'}</p>
                    </div>
                    <div className="space-y-6">
                        {faqSchema.mainEntity.map((faq, idx) => (
                            <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800 mb-3">{faq.name}</h3>
                                <p className="text-slate-600 leading-relaxed">{faq.acceptedAnswer.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
