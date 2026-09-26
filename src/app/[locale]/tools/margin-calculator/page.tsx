import { Metadata } from 'next';
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
    otherCosts: t({ de: 'Sonstige Kosten (Kaffee, Milch)', en: 'Other Costs (Coffee, Milk)', tr: 'Diğer Maliyetler (Kahve, Süt)', ar: 'تكاليف أخرى (قهوة، حليب)' }),
    sellingPrice: t({ de: 'Verkaufspreis', en: 'Selling Price', tr: 'Satış Fiyatı', ar: 'سعر البيع' }),
    costPerDrink: t({ de: 'Kosten pro Getränk', en: 'Cost per Drink', tr: 'İçecek Başı Maliyet', ar: 'تكلفة المشروب' }),
    profitPerDrink: t({ de: 'Gewinn pro Getränk', en: 'Profit per Drink', tr: 'İçecek Başı Kâr', ar: 'الربح لكل مشروب' }),
    profitMargin: t({ de: 'Gewinnmarge', en: 'Profit Margin', tr: 'Kâr Marjı', ar: 'هامش الربح' }),
  };

  const pageTitle = t({
    de: 'B2B Gewinnmargen-Rechner für die Gastronomie',
    en: 'B2B Profit Margin Calculator for Gastronomy',
    tr: 'Gastronomi için B2B Kâr Marjı Hesaplayıcı',
    ar: 'حاسبة هامش الربح B2B لفن الطهو'
  });

  const pageDesc = t({
    de: 'Berechnen Sie Ihre exakten Kosten und Gewinnmargen für Cocktails und Kaffeespezialitäten mit FO Sirupen.',
    en: 'Calculate your exact costs and profit margins for cocktails and specialty coffees using FO Syrups.',
    tr: 'FO Şurupları kullanarak kokteyl ve spesiyal kahveleriniz için kesin maliyet ve kâr marjınızı hesaplayın.',
    ar: 'احسب تكاليفك الدقيقة وهوامش الربح للكوكتيلات والقهوة المتخصصة باستخدام شراب FO.'
  });

  return (
    <main className="container mx-auto px-4 pt-32 pb-12 bg-secondary min-h-screen">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-primary mb-4 font-serif">
          {pageTitle}
        </h1>
        <p className="text-lg text-primary/80 max-w-2xl mx-auto">
          {pageDesc}
        </p>
      </div>
      
      <MarginCalculator dict={dict} />
    </main>
  );
}
