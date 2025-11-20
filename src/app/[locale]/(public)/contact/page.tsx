// src/app/[locale]/(public)/contact/page.tsx (Korrigiert)

// KORREKTUR: 'use client' entfernt. Dies ist eine Server-Komponente.
import React from 'react';
// KORREKTUR: Dynamischen Loader importieren
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/lib/utils'; // Annahme: Locale ist in utils.ts
import { FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const dictionary = await getDictionary(params.locale);
  
  return {
    title: dictionary.seo?.contact?.title || 'Contact | Elysion Sweets',
    description: dictionary.seo?.contact?.description || '',
    openGraph: {
      title: dictionary.seo?.contact?.title || 'Contact | Elysion Sweets',
      description: dictionary.seo?.contact?.description || '',
      locale: params.locale,
      type: 'website',
    },
  };
}

// KORREKTUR: Die Seite muss 'async' sein und 'params' empfangen
export default async function KontaktPage({ params }: { params: { locale: Locale } }) {
  // KORREKTUR: Wörterbuch dynamisch laden
  const dictionary = await getDictionary(params.locale);
  const content = dictionary.contactPage;

  return (
    <div className="bg-secondary text-text-main">
      {/* Hero Section */}
      <div className="relative bg-primary text-secondary text-center py-20 md:py-32">
        <p className="font-sans tracking-widest uppercase">{content.heroSubtitle}</p>
        <h1 className="text-5xl md:text-7xl font-serif mt-4">{content.title}</h1>
      </div>

      {/* Content Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
            
            {/* Left Column: Contact Details */}
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h2 className="text-3xl font-serif text-primary mb-6">{content.detailsTitle}</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <FaMapMarkerAlt className="text-accent text-2xl mt-1" />
                  <div>
                    <h3 className="font-bold font-sans text-primary">Standort</h3>
                    <p className="font-sans">Köln, Deutschland</p>
                    <p className="font-sans text-xs text-gray-500 mt-1">Vollständige Lageradresse wird in Kürze bekannt gegeben</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <FaEnvelope className="text-accent text-2xl mt-1" />
                  <div>
                    <h3 className="font-bold font-sans text-primary">E-Mail</h3>
                    <a href={`mailto:${content.email}`} className="font-sans hover:text-accent transition-colors">{content.email}</a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Contact Form */}
            {/* HINWEIS: Dieses Formular ist ein einfaches HTML-Formular.
                Für eine interaktive Einsendung (ohne Neuladen) wäre eine
                Client Component mit Server Action erforderlich.
            */}
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h2 className="text-3xl font-serif text-primary mb-6">{content.formTitle}</h2>
              <form action="#" method="POST" className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-bold font-sans text-primary mb-2">{content.formName}</label>
                  <input type="text" id="name" name="name" required className="w-full px-4 py-3 font-sans border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-bold font-sans text-primary mb-2">{content.formEmail}</label>
                  <input type="email" id="email" name="email" required className="w-full px-4 py-3 font-sans border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-bold font-sans text-primary mb-2">{content.formMessage}</label>
                  <textarea id="message" name="message" rows={5} required className="w-full px-4 py-3 font-sans border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"></textarea>
                </div>
                <div>
                  <button type="submit" className="w-full bg-accent text-primary font-bold py-3 px-6 rounded-md text-lg hover:opacity-90 transition-opacity shadow-lg">
                    {content.formButton}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Map Section (unverändert) */}
          <div className="mt-20">
            <h2 className="text-4xl font-serif text-primary mb-8 text-center">Unser Standort</h2>
            <div className="rounded-lg overflow-hidden shadow-xl border-4 border-white">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d25074.962627416494!2d6.9284984!3d50.9412786!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47bf25a6e0c8932f%3A0x8c85f9a7723118b0!2sCologne!5e0!3m2!1sen!2sde!4v1732032000000!5m2!1sen!2sde"
                width="100%"
                height="450"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="ElysonSweets Konumu"
              ></iframe>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}