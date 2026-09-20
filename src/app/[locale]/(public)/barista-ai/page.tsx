import type { Metadata } from 'next';
import BaristaAiClient from './client';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === 'tr' ? 'Barista AI - İmza Reçete Sihirbazı | Elysonsweets' : 'Barista AI - Signature Recipe Wizard | Elysonsweets';
  const description = locale === 'tr' 
    ? 'Kafeniz için yapay zeka destekli imza içecek reçeteleri oluşturun ve PDF menü olarak indirin. FO Şurupları ile profesyonel çözümler.' 
    : 'Erstellen Sie KI-gestützte Signature-Drink-Rezepte für Ihr Café und laden Sie diese als PDF-Menü herunter. Mit FO Sirupen.';

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.elysonsweets.de/${locale}/barista-ai`,
    }
  };
}

export default async function BaristaAiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Elysonsweets Barista AI & Recipe Wizard",
    "url": `https://www.elysonsweets.de/${locale}/barista-ai`,
    "description": "Ein KI-gestützter Rezeptgenerator für Cafés und Barkeeper. Erstellen Sie individuelle Signature Drinks und PDF-Menükarten mit FO Sirupen.",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "EUR"
    },
    "creator": {
      "@type": "Organization",
      "name": "Elysonsweets GmbH"
    },
    "featureList": [
      "AI Cocktail Recipe Generation",
      "Custom Cafe Menu Creation",
      "PDF Menu Export",
      "B2B Beverage Consulting"
    ]
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2">
            {locale === 'tr' ? 'Yapay Zeka Destekli' : 'KI-Gestützt'}
          </p>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-stone-900 mb-4">
            Barista AI <span className="text-amber-600">Recipe Wizard</span>
          </h1>
          <p className="text-stone-600 max-w-2xl mx-auto">
            {locale === 'tr' 
              ? 'Elinizdeki malzemeleri ve konseptinizi girin, yapay zeka baristanız FO şuruplarıyla kafenize özel imza içecekler tasarlasın. Menünüzü anında PDF olarak indirin.' 
              : 'Geben Sie Ihre Zutaten und Ihr Konzept ein. Unser KI-Barista kreiert exklusive Signature Drinks mit FO Sirupen für Ihr Café. Laden Sie Ihr Menü sofort als PDF herunter.'}
          </p>
        </div>

        <BaristaAiClient locale={locale} />
      </div>
    </div>
  );
}
