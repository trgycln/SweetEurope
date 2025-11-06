'use client';

import React from 'react';
import { useFormStatus } from 'react-dom';
import { registerSubmit } from '@/app/actions/partner-actions';

export default function RegisterFormClient({ dictionary, locale }: { dictionary: any; locale: string }) {
  const content = dictionary.registerPage || {};

  function SubmitButton() {
    const { pending } = useFormStatus();
    return (
      <button
        type="submit"
        disabled={pending}
        className="w-full md:w-auto bg-accent text-white font-bold py-3 px-8 rounded-md shadow hover:opacity-90 disabled:opacity-70 disabled:cursor-wait"
      >
        {pending ? (content.submitting || 'Wird gesendet...') : (content.submitButton || 'Senden')}
      </button>
    );
  }

  return (
  <form action={registerSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg space-y-5">
  {/* locale, redirect için gerekli */}
  <input type="hidden" name="locale" value={locale} />
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
        <SubmitButton />
      </div>
    </form>
  );
}
