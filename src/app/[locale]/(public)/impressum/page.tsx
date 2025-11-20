import React from 'react';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/lib/utils';

export default async function ImpressumPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as Locale);
  const content = dictionary.impressumPage;

  return (
    <div className="bg-secondary text-text-main">
      {/* Hero Section */}
      <div className="relative bg-primary text-secondary text-center py-20 md:py-32">
        {/* Başlığın rengi düzeltildi */}
        <h1 className="text-5xl md:text-7xl font-serif text-secondary">{content.title}</h1>
      </div>

      {/* Content Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-3xl font-sans">
          <div className="space-y-8 bg-white p-10 rounded-lg shadow-lg">
            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-2">{content.section1Title}</h2>
              {content.address.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
            
            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-2">{content.section2Title}</h2>
              <p>{content.managingDirector}</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-2">{content.section3Title}</h2>
              <p>{content.email}</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-2">{content.section4Title}</h2>
              <p className="text-sm text-gray-600 italic">{content.registerNote}</p>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-2">{content.section5Title}</h2>
              <p className="text-sm text-gray-600 italic">{content.vatNote}</p>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mb-2">{content.section6Title}</h2>
              <p className="text-sm italic">{content.disclaimerText}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

