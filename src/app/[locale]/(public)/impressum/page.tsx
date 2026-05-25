import React from 'react';
import type { Metadata } from 'next';
import { getDictionary } from '@/dictionaries';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as any);
  return {
    title: `${dictionary.impressumPage.title} | ElysonSweets`,
    description: 'Impressum der Elyson Sweets GmbH i.G. gemäß § 5 TMG.',
  };
}

export default async function ImpressumPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as any);
  const t = dictionary.impressumPage;
  const isRtl = locale === 'ar';

  return (
    <div className="bg-secondary text-text-main" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="relative bg-primary text-secondary text-center py-20 md:py-32">
        <h1 className="text-5xl md:text-7xl font-serif text-secondary">{t.title}</h1>
      </div>

      <section className="py-20 px-6">
        <div className="container mx-auto max-w-3xl font-sans">
          <div className="space-y-8 bg-white p-10 rounded-lg shadow-lg text-text-main">

            <div>
              <h2 className="text-xl font-bold font-serif text-primary mb-3">{t.legalNote}</h2>
              <p>Elyson Sweets GmbH i.G.</p>
              <p>Sirius Business Park</p>
              <p>Wilhelm-Ruppert-Straße 38 F8</p>
              <p>51147 Köln</p>
              <p>Deutschland</p>
            </div>

            <div>
              <h2 className="text-xl font-bold font-serif text-primary mb-3">{t.managingDirectorLabel}</h2>
              <p>Ahmet Seker</p>
            </div>

            <div>
              <h2 className="text-xl font-bold font-serif text-primary mb-3">{t.contactLabel}</h2>
              <p>Telefon: <a href="tel:+4917641533653" className="hover:text-accent transition-colors">+49 176 41533653</a></p>
              <p>E-Mail: <a href="mailto:info@elysonsweets.de" className="hover:text-accent transition-colors">info@elysonsweets.de</a></p>
              <p>Website: <a href="https://www.elysonsweets.de" className="hover:text-accent transition-colors">www.elysonsweets.de</a></p>
            </div>

            <div>
              <h2 className="text-xl font-bold font-serif text-primary mb-3">{t.registerLabel}</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{t.registerPending}</p>
              <p className="text-sm text-gray-700">{t.registerCourt}</p>
              <p className="text-sm text-gray-500 italic">{t.registerNumberPending}</p>
            </div>

            <div>
              <h2 className="text-xl font-bold font-serif text-primary mb-3">{t.vatLabel}</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{t.vatText}</p>
              <p className="text-sm text-gray-500 italic">{t.vatPending}</p>
            </div>

            <div>
              <h2 className="text-xl font-bold font-serif text-primary mb-3">{t.disputeLabel}</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{t.disputeText}</p>
            </div>

            <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">{t.lastUpdated}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
