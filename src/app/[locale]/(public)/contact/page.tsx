// src/app/[locale]/(public)/contact/page.tsx (Korrigiert)

// KORREKTUR: 'use client' entfernt. Dies ist eine Server-Komponente.
import React from 'react';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/lib/utils';
import { FaEnvelope, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';
import ContactFormClient from './ContactFormClient';
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
                    <p className="font-sans">Wilhelm-Ruppert-Straße 38 / F8</p>
                    <p className="font-sans">51147 Köln, Deutschland</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <FaEnvelope className="text-accent text-2xl mt-1" />
                  <div>
                    <h3 className="font-bold font-sans text-primary">E-Mail</h3>
                    <a href={`mailto:${content.email}`} className="font-sans hover:text-accent transition-colors block">{content.email}</a>
                    <a href="mailto:elysonsweets@gmail.com" className="font-sans hover:text-accent transition-colors block">elysonsweets@gmail.com</a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <FaPhone className="text-accent text-2xl mt-1" />
                  <div>
                    <h3 className="font-bold font-sans text-primary">Telefon</h3>
                    <a href="tel:+4917641533653" className="font-sans hover:text-accent transition-colors block">+49 176 41533653</a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Contact Form */}
            <ContactFormClient
              labels={{
                formTitle:   content.formTitle,
                formName:    content.formName,
                formEmail:   content.formEmail,
                formMessage: content.formMessage,
                formButton:  content.formButton,
              }}
            />
          </div>

          {/* Map Section (unverändert) */}
          <div className="mt-20">
            <h2 className="text-4xl font-serif text-primary mb-8 text-center">Unser Standort</h2>
            <div className="rounded-lg overflow-hidden shadow-xl border-4 border-white">
              <iframe
                src="https://maps.google.com/maps?q=Wilhelm-Ruppert-Stra%C3%9Fe+38,+51147+K%C3%B6ln&t=&z=15&ie=UTF8&iwloc=&output=embed"
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