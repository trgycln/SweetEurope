'use client';

import React, { useState, useTransition } from 'react';
import { submitPartnerApplication } from '@/app/actions/partner-actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function RegisterFormClient({ dictionary, locale }: { dictionary: any; locale: string }) {
  const content = dictionary.registerPage || {};
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append('locale', locale);

    startTransition(async () => {
      const result = await submitPartnerApplication(formData);
      
      if (result.success) {
        // Success toast
        toast.success(
          content.toastSuccess || 'Vielen Dank! Wir werden uns in Kürze bei Ihnen melden.',
          {
            duration: 8000, // 8 saniye göster (mobilde daha uzun)
          }
        );
        
        // Reset form
        form.reset();
        
        // Optional: redirect after delay
        setTimeout(() => {
          router.push(`/${locale}/`);
        }, 4000); // 4 saniye sonra yönlendir (toast'ı görmek için yeterli süre)
      } else {
        // Error toast
        toast.error(
          content.toastError || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
          {
            duration: 6000, // 6 saniye göster
          }
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg space-y-5">

        {/* Firma Adı */}
        <div>
            <label htmlFor="unvan" className="block text-sm font-bold text-text-main/80 mb-2">
                Firmenname <span className="text-red-500">*</span>
            </label>
            <input id="unvan" name="unvan" type="text" required
                className="w-full p-3 border rounded-lg bg-secondary" />
        </div>

        {/* Yetkili Kişi */}
        <div>
            <label htmlFor="contact_person" className="block text-sm font-bold text-text-main/80 mb-2">
                Ansprechpartner <span className="text-red-500">*</span>
            </label>
            <input id="contact_person" name="contact_person" type="text" required
                className="w-full p-3 border rounded-lg bg-secondary" />
        </div>

        {/* Email + Telefon — yan yana */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="email" className="block text-sm font-bold text-text-main/80 mb-2">
                    E-Mail <span className="text-red-500">*</span>
                </label>
                <input id="email" name="email" type="email" required
                    className="w-full p-3 border rounded-lg bg-secondary" />
            </div>
            <div>
                <label htmlFor="telefon" className="block text-sm font-bold text-text-main/80 mb-2">
                    Telefon <span className="text-red-500">*</span>
                </label>
                <input id="telefon" name="telefon" type="tel" required
                    placeholder="+49 XXX XXXXXXX"
                    className="w-full p-3 border rounded-lg bg-secondary" />
            </div>
        </div>

        {/* İşletme Kategorisi + Şehir — yan yana */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="kategori" className="block text-sm font-bold text-text-main/80 mb-2">
                    Betriebsart <span className="text-red-500">*</span>
                </label>
                <select id="kategori" name="kategori" required
                    className="w-full p-3 border rounded-lg bg-secondary text-text-main">
                    <option value="">— Bitte wählen —</option>
                    <option value="Kafe">Café / Eiscafé</option>
                    <option value="Restoran">Restaurant</option>
                    <option value="Otel">Hotel</option>
                    <option value="Catering">Catering</option>
                    <option value="Zincir Market">Supermarkt / Kette</option>
                    <option value="Shisha & Lounge">Shisha & Lounge</option>
                    <option value="Casual Dining">Casual Dining</option>
                    <option value="Hotel & Event">Hotel & Event</option>
                    <option value="Diğer">Sonstiges</option>
                </select>
            </div>
            <div>
                <label htmlFor="sehir" className="block text-sm font-bold text-text-main/80 mb-2">
                    Stadt <span className="text-red-500">*</span>
                </label>
                <input id="sehir" name="sehir" type="text" required
                    placeholder="z.B. Köln"
                    className="w-full p-3 border rounded-lg bg-secondary" />
            </div>
        </div>

        {/* Adres */}
        <div>
            <label htmlFor="adres" className="block text-sm font-bold text-text-main/80 mb-2">
                Adresse <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input id="adres" name="adres" type="text"
                placeholder="Straße, Hausnummer, PLZ"
                className="w-full p-3 border rounded-lg bg-secondary" />
        </div>

        {/* USt-IdNr + Steuernummer — yan yana */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="ustIdNr" className="block text-sm font-bold text-text-main/80 mb-2">
                    USt-IdNr. <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input id="ustIdNr" name="ustIdNr" type="text"
                    placeholder="DE123456789"
                    className="w-full p-3 border rounded-lg bg-secondary" />
            </div>
            <div>
                <label htmlFor="steuernummer" className="block text-sm font-bold text-text-main/80 mb-2">
                    Steuernummer <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input id="steuernummer" name="steuernummer" type="text"
                    placeholder="123/456/78901"
                    className="w-full p-3 border rounded-lg bg-secondary" />
            </div>
        </div>

        {/* Mesaj */}
        <div>
            <label htmlFor="message" className="block text-sm font-bold text-text-main/80 mb-2">
                Nachricht <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea id="message" name="message" rows={4}
                placeholder="Teilen Sie uns gerne mit, welche Produkte Sie interessieren..."
                className="w-full p-3 border rounded-lg bg-secondary" />
        </div>

        {/* DSGVO notu */}
        <p className="text-xs text-text-main/50">
            Mit dem Absenden stimmen Sie zu, dass wir Ihre Daten zur Bearbeitung
            Ihrer Anfrage verwenden. Weitere Informationen finden Sie in unserer{' '}
            <a href="/de/datenschutz" className="underline hover:text-accent">Datenschutzerklärung</a>.
        </p>

        {/* Submit */}
        <div className="pt-2 flex justify-end">
            <button
                type="submit"
                disabled={isPending}
                className="w-full md:w-auto bg-accent text-white font-bold py-3 px-8 rounded-md shadow hover:opacity-90 disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
            >
                {isPending && (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                )}
                {isPending ? 'Wird gesendet...' : 'Jetzt Partneranfrage senden →'}
            </button>
        </div>
    </form>
  );
}
