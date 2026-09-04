import React from 'react';
import type { Metadata } from 'next';
import { getDictionary } from '@/dictionaries';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as any);
  return {
    title: `${dictionary.datenschutzPage.title} | ElysonSweets`,
    description: 'Datenschutzerklärung der Elyson Sweets GmbH gemäß DSGVO.',
  };
}

export default async function DatenschutzPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as any);
  const t = dictionary.datenschutzPage;
  const isRtl = locale === 'ar';

  return (
    <div className="bg-secondary text-text-main" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="relative bg-primary text-secondary text-center py-16 sm:py-20 md:py-32 px-4 sm:px-6">
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-serif text-secondary">{t.title}</h1>
        <p className="text-secondary/60 mt-3 text-sm sm:text-lg">{t.subtitle}</p>
      </div>

      <section className="py-20 px-6">
        <div className="container mx-auto max-w-3xl font-sans">
          <div className="space-y-8 bg-white p-10 rounded-lg shadow-lg text-text-main">

            <div>
              <h2 className="text-xl font-bold font-serif text-primary mb-3">{t.section1Title}</h2>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">{t.section1Intro}</p>
              <div className="pl-4 border-l-2 border-accent text-sm text-gray-700 space-y-0.5">
                <p>Elyson Sweets GmbH</p>
                <p>Sirius Business Park</p>
                <p>Wilhelm-Ruppert-Straße 38 / F8</p>
                <p>51147 Köln</p>
                <p>{t.companyRepLabel} Ahmet Seker</p>
                <p>
                  E-Mail:{' '}
                  <a href="mailto:info@elysonsweets.de" className="hover:text-accent transition-colors">
                    info@elysonsweets.de
                  </a>
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold font-serif text-primary mb-3">{t.section2Title}</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{t.section2Text}</p>
            </div>

            <div>
              <h2 className="text-xl font-bold font-serif text-primary mb-3">{t.section3Title}</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{t.section3Text}</p>
            </div>

            <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">{t.lastUpdated}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
