import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Coffee } from 'lucide-react';
import MarginCalculator from '@/components/tools/MarginCalculator';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elysonsweets.de';
  const currentUrl = `${baseUrl}/${locale}/tools/margin-calculator`;

  const title = locale === 'de' ? 'B2B Gewinnmargen-Rechner | Elysonsweets' 
    : locale === 'tr' ? 'B2B Kâr Marjı Hesaplayıcı | Elysonsweets'
    : locale === 'ar' ? 'حاسبة هامش الربح B2B | Elysonsweets'
    : 'B2B Beverage Profit Margin Calculator | Elysonsweets';
    
  const desc = locale === 'de' ? 'Berechnen Sie Ihre exakten Kosten und Gewinnmargen mit FO Sirupen.'
    : locale === 'tr' ? 'FO Şurupları ile içecek başı maliyet ve kâr marjınızı hesaplayın.'
    : locale === 'ar' ? 'احسب تكلفة المشروب وهوامش الربح باستخدام شراب FO.'
    : 'Calculate your exact cost per drink and profit margins using FO Syrups.';

  return {
    title: title,
    description: desc,
    alternates: {
      canonical: currentUrl,
      languages: {
        de: `${baseUrl}/de/tools/margin-calculator`,
        en: `${baseUrl}/en/tools/margin-calculator`,
        tr: `${baseUrl}/tr/tools/margin-calculator`,
        ar: `${baseUrl}/ar/tools/margin-calculator`,
        'x-default': `${baseUrl}/de/tools/margin-calculator`,
      },
    },
  };
}

export default async function MarginCalculatorPage({ params }: Props) {
  const { locale } = await params;

  const t = (text: Record<string, string>) => text[locale] || text['en'];

  const dict = {
    title: t({ de: 'Gewinnmargen-Rechner', en: 'Profit Margin Calculator', tr: 'Kâr Marjı Hesaplayıcı', ar: 'حاسبة هامش الربح' }),
    syrupPrice: t({ de: 'Sirup Flaschenpreis', en: 'Syrup Bottle Price', tr: 'Şurup Şişe Fiyatı', ar: 'سعر زجاجة الشراب' }),
    bottleVolume: t({ de: 'Flaschenvolumen', en: 'Bottle Volume', tr: 'Şişe Hacmi', ar: 'حجم الزجاجة' }),
    usagePerDrink: t({ de: 'Verbrauch pro Getränk', en: 'Usage per Drink', tr: 'İçecek Başı Kullanım', ar: 'الاستخدام لكل مشروب' }),
    otherCosts: t({ de: 'Sonstige Zutaten (Kaffee, Milch)', en: 'Other Ingredients (Coffee, Milk)', tr: 'Diğer Malzemeler (Kahve, Süt)', ar: 'مكونات أخرى (قهوة، حليب)' }),
    sellingPrice: t({ de: 'Verkaufspreis', en: 'Selling Price', tr: 'Satış Fiyatı', ar: 'سعر البيع' }),
    costPerDrink: t({ de: 'Kosten pro Getränk', en: 'Cost per Drink', tr: 'İçecek Başı Maliyet', ar: 'تكلفة المشروب' }),
    profitPerDrink: t({ de: 'Gewinn pro Getränk', en: 'Profit per Drink', tr: 'İçecek Başı Kâr', ar: 'الربح لكل مشروب' }),
    profitMargin: t({ de: 'Kâr Marjı (Brüt)', en: 'Profit Margin (Gross)', tr: 'Kâr Marjı (Brüt)', ar: 'هامش الربح' }),
    syrupCostLabel: t({ de: 'Sirup pro Portion', en: 'Syrup per Serving', tr: 'Porsiyon Başı Şurup', ar: 'الشراب لكل حصة' }),
    profitMultiplier: t({ de: 'Kalkulationsaufschlag', en: 'Profit Multiplier', tr: 'Kâr Çarpanı', ar: 'مضاعف الربح' }),
    profitMultiplierSub: t({ de: 'facher Wareneinsatz', en: 'times ingredient cost', tr: 'katı kazanç', ar: 'أضعاف تكلفة المواد' }),
    marginSub: t({ de: 'des Umsatzes verbleibt im Betrieb', en: 'of revenue remains in business', tr: 'cironun kasada kalan payı', ar: 'من الإيرادات تبقى في المنشأة' }),
    bottleProfit: t({ de: 'Ertrag pro Flasche', en: 'Profit per Bottle', tr: '1 Şişeden Toplam Kâr', ar: 'إجمالي الربح لكل زجاجة' }),
    bottleProfitSub: t({ de: 'Portionen aus 1 Flasche', en: 'servings from 1 bottle', tr: 'porsiyon içecekten net katkı', ar: 'حصة من الزجاجة' }),
    disclaimer: t({ 
      de: '* Berechnungen basieren auf dem Wareneinsatz (Rohertrag). Allgemeine Betriebs-, Personal-, Miet- und Steuerkosten sind nicht enthalten.', 
      en: '* Calculations are based on raw ingredient costs (gross margin). Overhead, staff, rent, and taxes are excluded.', 
      tr: '* Hesaplamalar hammadde katkı payıdır (brüt kâr). Kira, personel, vergi ve genel işletme giderleri hariçtir.', 
      ar: '* الحسابات مبنية على تكلفة المواد الخام. لا تشمل الإيجار، الرواتب والضرائب.' 
    }),
  };

  const backText = t({
    de: 'Zurück zum Blog',
    en: 'Back to Blog',
    tr: 'Bloga Geri Dön',
    ar: 'العودة إلى المدونة'
  });

  const categoryBadge = t({
    de: 'GASTRONOMIE & B2B RECHNER',
    en: 'GASTRONOMY & B2B CALCULATOR',
    tr: 'GASTRONOMİ & B2B HESAPLAMA ARACI',
    ar: 'حاسبة المطاعم والأعمال B2B'
  });

  const pageTitle = t({
    de: 'Getränke-Kalkulator & Ertragsrechner',
    en: 'Beverage & Profit Margin Calculator',
    tr: 'İçecek Maliyet & Kâr Hesaplayıcı',
    ar: 'حاسبة تكلفة المشروبات وهامش الربح'
  });

  const pageDesc = t({
    de: 'Berechnen Sie den genauen Wareneinsatz, den Kalkulationsaufschlag und den Gesamtertrag pro Flasche für Ihre Kaffee- und Barspezialitäten.',
    en: 'Calculate the exact ingredient cost, profit multiplier, and total profit per bottle for your coffee and bar menu items.',
    tr: 'Menünüzdeki spesiyal kahve ve kokteyller için porsiyon başı hammadde maliyetini, kâr çarpanını ve 1 şişeden elde edeceğiniz toplam kazancı hesaplayın.',
    ar: 'احسب تكلفة المكونات الدقيقة، مضاعف الربح، وإجمالي العائد لكل زجاجة لقائمة مشروباتك.'
  });

  const ctaTitle = t({
    de: 'Möchten Sie Ihre Bar-Marge mit FO Sirupen maximieren?',
    en: 'Ready to maximize your bar margins with FO Syrups?',
    tr: 'FO Şurupları ile Menü Kârlılığınızı Artırmaya Hazır mısınız?',
    ar: 'هل أنت مستعد لزيادة أرباحك باستخدام شراب FO؟'
  });

  const ctaDesc = t({
    de: 'Entdecken Sie über 40 Sorten Premium-Sirupe zu Großhandelspreisen für Cafés, Bars und Hotels.',
    en: 'Discover over 40 varieties of premium syrups at wholesale prices for cafes, bars, and hotels.',
    tr: 'Kafeler, barlar ve oteller için toptan fiyat avantajıyla 40\'tan fazla premium FO şurup çeşidini keşfedin.',
    ar: 'اكتشف أكثر من 40 نوعاً من العصائر الفاخرة بأسعار الجملة للمقاهي والفنادق.'
  });

  const exploreProducts = t({
    de: 'Produkte ansehen',
    en: 'Explore Products',
    tr: 'Ürünleri İncele',
    ar: 'استكشف المنتجات'
  });

  const exploreRecipes = t({
    de: 'Rezeptideen',
    en: 'View Recipes',
    tr: 'Örnek Reçeteler',
    ar: 'وصفات المشروبات'
  });

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-900 pb-20 selection:bg-amber-900/20 selection:text-stone-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 max-w-5xl">
        {/* Navigasyon / Geri Dön Butonu */}
        <div className="mb-8">
          <Link
            href={`/${locale}/blog`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-stone-200 text-stone-700 hover:text-stone-900 hover:border-amber-800/40 shadow-sm text-sm font-medium transition-all group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>{backText}</span>
          </Link>
        </div>

        {/* Başlık ve Tanıtım Alanı */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-800 mb-3 inline-block">
            {categoryBadge}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black text-stone-900 tracking-tight leading-tight mb-4">
            {pageTitle}
          </h1>
          <p className="text-base sm:text-lg text-stone-600 leading-relaxed font-sans">
            {pageDesc}
          </p>
        </div>

        {/* Hesaplama Aracı Bileşeni */}
        <div className="mb-14">
          <MarginCalculator dict={dict} />
        </div>

        {/* Alt Bilgi & Site İçi Entegrasyon Kartı */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl font-bold font-serif text-stone-900">
              {ctaTitle}
            </h3>
            <p className="text-sm text-stone-600 max-w-xl">
              {ctaDesc}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 justify-center md:justify-end shrink-0">
            <Link
              href={`/${locale}/products`}
              className="inline-flex items-center gap-2 bg-primary text-white hover:bg-black px-5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm"
            >
              <Coffee className="w-4 h-4 text-accent" />
              <span>{exploreProducts}</span>
            </Link>
            <Link
              href={`/${locale}/recipes`}
              className="inline-flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors border border-stone-200"
            >
              <BookOpen className="w-4 h-4 text-stone-500" />
              <span>{exploreRecipes}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
