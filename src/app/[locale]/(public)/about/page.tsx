// src/app/[locale]/(public)/about/page.tsx (Korrigiert)
import React from 'react';
import Image from 'next/image';
// KORREKTUR: Dynamischen Dictionary-Loader importieren
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/lib/utils'; // Annahme: Locale ist in utils.ts
import type { Metadata } from 'next';

// Diese Komponente bleibt unverändert
const DecorativeSeparator = () => (
  <div className="w-24 h-px bg-accent mx-auto my-6 relative">
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-secondary rotate-45 border border-accent"></div>
  </div>
);

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const dictionary = await getDictionary(params.locale);
  
  return {
    title: dictionary.seo?.about?.title || 'About Us | Elysion Sweets',
    description: dictionary.seo?.about?.description || '',
    openGraph: {
      title: dictionary.seo?.about?.title || 'About Us | Elysion Sweets',
      description: dictionary.seo?.about?.description || '',
      locale: params.locale,
      type: 'website',
    },
  };
}

// KORREKTUR: Die Seite muss 'async' sein und 'params' empfangen
export default async function AboutPage({ params }: { params: { locale: Locale } }) {
  // KORREKTUR: Wörterbuch dynamisch basierend auf der URL-Locale laden
  const dictionary = await getDictionary(params.locale);
  const content = dictionary.ueberUnsPage || {};

  return (
    <div className="bg-secondary text-text-main">
      {/* Hero Section */}
      <div className="relative bg-primary text-secondary text-center py-20 md:py-32">
        <p className="font-sans tracking-widest uppercase">{content?.heroSubtitle}</p>
        <h1 className="text-5xl md:text-7xl font-serif mt-4">{content.title}</h1>
      </div>

      {/* Story Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-serif mb-4">{content.storyTitle}</h2>
            <p className="font-sans text-lg leading-loose mb-4">{content.storyP1}</p>
            <p className="font-sans text-lg leading-loose">{content.storyP2}</p>
          </div>
          <div className="relative h-96 rounded-lg overflow-hidden shadow-xl">
            <Image
              src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1932&auto=format&fit=crop"
              alt={content.image1Alt}
              fill // 'layout="fill"' ist veraltet, 'fill' verwenden
              className="object-cover" // 'objectFit' ist veraltet, Tailwind-Klasse verwenden
            />
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="bg-bg-subtle py-20 px-6">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="relative h-96 rounded-lg overflow-hidden shadow-xl md:order-2">
              <Image
                src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1974&auto=format&fit=crop"
                alt={content.image2Alt}
                fill
                className="object-cover"
              />
          </div>
          <div className="md:order-1">
            <h2 className="text-4xl font-serif mb-4">{content.missionTitle}</h2>
              <p className="font-sans text-lg leading-loose">{content.missionP1}</p>
          </div>
        </div>
      </section>
    </div>
  );
}