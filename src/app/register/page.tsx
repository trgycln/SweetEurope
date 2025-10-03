"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { dictionary } from '@/dictionaries/de';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const content = dictionary.registerPage;
  const supabase = createClient();

  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    vat_id: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const { error } = await supabase.from('partner_applications').insert(formData);

    if (error) {
      setError('Fehler beim Senden des Antrags. Bitte versuchen Sie es erneut.');
      console.error('Başvuru hatası:', error);
    } else {
      setSuccess(true);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-6">
      <div className="container mx-auto max-w-2xl bg-white rounded-lg shadow-2xl p-8 md:p-12">
        {success ? (
          <div className="text-center">
            <h1 className="text-3xl font-serif font-bold text-primary mb-4">{content.successTitle}</h1>
            <p className="text-text-main mb-8">{content.successMessage}</p>
            <Link href="/portal" className="bg-accent text-primary font-bold py-3 px-6 rounded-md text-lg hover:opacity-90 transition-opacity">
              {content.backToLogin}
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-4xl font-serif font-bold text-primary">{content.title}</h1>
              <p className="text-text-main mt-2">{content.subtitle}</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="company_name" className="block text-sm font-bold text-gray-700 mb-2">{content.companyName}</label>
                  <input type="text" name="company_name" id="company_name" onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-accent focus:border-accent" />
                </div>
                <div>
                  <label htmlFor="contact_person" className="block text-sm font-bold text-gray-700 mb-2">{content.contactPerson}</label>
                  <input type="text" name="contact_person" id="contact_person" onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-accent focus:border-accent" />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">{content.email}</label>
                <input type="email" name="email" id="email" onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-accent focus:border-accent" />
              </div>
               <div>
                <label htmlFor="vat_id" className="block text-sm font-bold text-gray-700 mb-2">{content.vatId}</label>
                <input type="text" name="vat_id" id="vat_id" onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-accent focus:border-accent" />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-bold text-gray-700 mb-2">{content.message}</label>
                <textarea name="message" id="message" rows={4} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-accent focus:border-accent"></textarea>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-accent text-primary font-bold py-3 px-4 rounded-md hover:opacity-90 transition-opacity text-lg disabled:opacity-50">
                  {isSubmitting ? content.submitting : content.submitButton}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}