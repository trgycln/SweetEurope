"use client";

import React from 'react';
import { dictionary } from '@/dictionaries/de';
import { FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';

const KontaktPage = () => {
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
                    <h3 className="font-bold font-sans text-primary">Adresse</h3>
                    <p className="font-sans">{content.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <FaPhone className="text-accent text-2xl mt-1" />
                  <div>
                    <h3 className="font-bold font-sans text-primary">Telefon</h3>
                    <a href={`tel:${content.phone.replace(/\s/g, '')}`} className="font-sans hover:text-accent transition-colors">{content.phone}</a>
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

          {/* New Map Section */}
          <div className="mt-20">
            <h2 className="text-4xl font-serif text-primary mb-8 text-center">Unser Standort</h2>
            <div className="rounded-lg overflow-hidden shadow-xl border-4 border-white">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2428.106772428285!2d13.37542277717462!3d52.51627497206105!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47a851e0610be079%3A0x1033723378253112!2sReichstag%20Building!5e0!3m2!1sen!2sde!4v1727463075591!5m2!1sen!2sde"
                width="100%"
                height="450"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="SweetDreams Konumu"
              ></iframe>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};

export default KontaktPage;

