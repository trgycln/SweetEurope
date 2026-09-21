import { Metadata } from 'next';
import MarginCalculator from '@/components/tools/MarginCalculator';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elysonsweets.de';
  const currentUrl = `${baseUrl}/${locale}/tools/margin-calculator`;

  return {
    title: 'B2B Beverage Profit Margin Calculator | Elysonsweets',
    description: 'Calculate your exact cost per drink and profit margins using FO Syrups. Essential tool for cafes, bars, and restaurants.',
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

  // Not: Gerçek projede bu dict objesini i18n JSON dosyalarından çekebilirsin.
  // Şimdilik yapı bozulmasın diye basit bir switch-case veya statik obje kullanıyoruz.
  const dict = {
    title: locale === 'de' ? 'Gewinnmargen-Rechner' : 'Profit Margin Calculator',
    syrupPrice: locale === 'de' ? 'Sirup Flaschenpreis' : 'Syrup Bottle Price',
    bottleVolume: locale === 'de' ? 'Flaschenvolumen' : 'Bottle Volume',
    usagePerDrink: locale === 'de' ? 'Verbrauch pro Getränk' : 'Usage per Drink',
    otherCosts: locale === 'de' ? 'Sonstige Kosten (Kaffee, Milch)' : 'Other Costs (Coffee, Milk)',
    sellingPrice: locale === 'de' ? 'Verkaufspreis' : 'Selling Price',
    costPerDrink: locale === 'de' ? 'Kosten pro Getränk' : 'Cost per Drink',
    profitPerDrink: locale === 'de' ? 'Gewinn pro Getränk' : 'Profit per Drink',
    profitMargin: locale === 'de' ? 'Gewinnmarge' : 'Profit Margin',
  };

  return (
    <main className="container mx-auto px-4 py-12 bg-gray-50 min-h-screen">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          {locale === 'de' ? 'B2B Getränke-Kalkulator' : 'B2B Beverage Calculator'}
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {locale === 'de' 
            ? 'Berechnen Sie Ihre exakten Kosten und Gewinnmargen für Cocktails und Kaffeespezialitäten mit FO Sirupen.' 
            : 'Calculate your exact costs and profit margins for cocktails and specialty coffees using FO Syrups.'}
        </p>
      </div>
      
      <MarginCalculator dict={dict} />
    </main>
  );
}
