import type { Metadata } from 'next';
import BaristaAiClient from './client';
import { recipeWizardT, Locale } from '@/lib/i18n/pages';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = recipeWizardT[(locale as Locale)] ?? recipeWizardT.de;

  return {
    title: t.metaTitle,
    description: t.metaDesc,
    alternates: {
      canonical: `https://www.elysonsweets.de/${locale}/barista-ai`,
    }
  };
}

export default async function BaristaAiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = recipeWizardT[(locale as Locale)] ?? recipeWizardT.de;

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": t.schemaName,
    "url": `https://www.elysonsweets.de/${locale}/barista-ai`,
    "description": t.schemaDesc,
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
      "Signature Cocktail & Coffee Creation",
      "Custom Cafe Menu Creation",
      "PDF Menu Export",
      "B2B Beverage Consulting"
    ]
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] pt-32 pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
      
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2">
            {t.badgeLabel}
          </p>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-stone-900 mb-4">
            {t.headline1}<span className="text-amber-600">{t.headline2}</span>
          </h1>
          <p className="text-stone-600 max-w-2xl mx-auto">
            {t.subline}
          </p>
        </div>

        <BaristaAiClient locale={locale} />
      </div>
    </div>
  );
}
