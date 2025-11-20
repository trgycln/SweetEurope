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
      <div>
        <label htmlFor="unvan" className="block text-sm font-bold text-text-main/80 mb-2">{content.companyName || 'Firma'} <span className="text-red-500">*</span></label>
        <input id="unvan" name="unvan" type="text" required className="w-full p-3 border rounded-lg bg-secondary" />
      </div>
      <div>
        <label htmlFor="contact_person" className="block text-sm font-bold text-text-main/80 mb-2">{content.contactPerson || 'Ansprechpartner'}</label>
        <input id="contact_person" name="contact_person" type="text" className="w-full p-3 border rounded-lg bg-secondary" />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-bold text-text-main/80 mb-2">{content.email || 'E-Mail'} <span className="text-red-500">*</span></label>
        <input id="email" name="email" type="email" required className="w-full p-3 border rounded-lg bg-secondary" />
      </div>
      <div>
        <label htmlFor="telefon" className="block text-sm font-bold text-text-main/80 mb-2">{content.phone || 'Telefon (Optional)'}</label>
        <input id="telefon" name="telefon" type="tel" className="w-full p-3 border rounded-lg bg-secondary" />
      </div>
      <div>
        <label htmlFor="adres" className="block text-sm font-bold text-text-main/80 mb-2">{content.address || 'Adresse (Optional)'}</label>
        <input id="adres" name="adres" type="text" className="w-full p-3 border rounded-lg bg-secondary" />
      </div>
      <div>
        <label htmlFor="vatId" className="block text-sm font-bold text-text-main/80 mb-2">{content.vatId || 'USt-IdNr. (Optional)'}</label>
        <input id="vatId" name="vatId" type="text" className="w-full p-3 border rounded-lg bg-secondary" />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-bold text-text-main/80 mb-2">{content.message || 'Nachricht (Optional)'}</label>
        <textarea id="message" name="message" rows={5} className="w-full p-3 border rounded-lg bg-secondary" />
      </div>
      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="w-full md:w-auto bg-accent text-white font-bold py-3 px-8 rounded-md shadow hover:opacity-90 disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
        >
          {isPending && (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isPending ? (content.submitting || 'Wird gesendet...') : (content.submitButton || 'Senden')}
        </button>
      </div>
    </form>
  );
}
