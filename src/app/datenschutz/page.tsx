import React from 'react';
import { dictionary } from '@/dictionaries/de';

export default function DatenschutzPage() {
  const content = dictionary.datenschutzPage;

  return (
    <div className="bg-secondary text-text-main">
      {/* Hero Section */}
      <div className="relative bg-primary text-secondary text-center py-20 md:py-32">
        <h1 className="text-5xl md:text-7xl font-serif text-secondary">{content.title}</h1>
        <p className="text-sm mt-4 opacity-80">{content.lastUpdated}</p>
      </div>

      {/* Content Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-3xl font-sans">
          <div className="space-y-8 bg-white p-10 rounded-lg shadow-lg leading-loose">
            <p>{content.p1}</p>
            <p>{content.p2}</p>
            
            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mt-8 mb-4">{content.sectionTitle1}</h2>
              <p>{content.responsibleBody}</p>
              <div className="mt-4 pl-4 border-l-2 border-accent">
                {content.companyDetails.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold font-serif text-primary mt-8 mb-4">{content.sectionTitle2}</h2>
              <p>{content.rightsIntro}</p>
              <ul className="list-disc list-inside mt-4 space-y-2">
                {content.rightsList.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              <p className="mt-4">{content.p3}</p>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
