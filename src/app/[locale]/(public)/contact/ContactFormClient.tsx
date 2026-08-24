'use client';

import { useState, useTransition, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { submitContactForm } from '@/app/actions/contact-actions';

export default function ContactFormClient({
  labels,
}: {
  labels: {
    formTitle: string;
    formName: string;
    formEmail: string;
    formMessage: string;
    formButton: string;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const searchParams = useSearchParams();
  const subject = searchParams.get('subject');
  const bodyParam = searchParams.get('body');
  
  const defaultMessage = [subject, bodyParam].filter(Boolean).join('\n\n');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      const res = await submitContactForm(formData);
      if (res.success) {
        setStatus('success');
        form.reset();
      } else {
        setStatus('error');
      }
    });
  }

  if (status === 'success') {
    return (
      <div className="bg-white p-8 rounded-lg shadow-lg flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
        <div className="text-5xl">✅</div>
        <h3 className="text-2xl font-serif text-primary">Vielen Dank!</h3>
        <p className="font-sans text-gray-600">Ihre Nachricht wurde erfolgreich gesendet. Wir melden uns in Kürze bei Ihnen.</p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-4 text-sm text-accent underline hover:opacity-70"
        >
          Neue Nachricht senden
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-3xl font-serif text-primary mb-6">{labels.formTitle}</h2>

      {status === 'error' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-bold font-sans text-primary mb-2">
            {labels.formName} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full px-4 py-3 font-sans border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-bold font-sans text-primary mb-2">
            {labels.formEmail} <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="w-full px-4 py-3 font-sans border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-bold font-sans text-primary mb-2">
            {labels.formMessage} <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            required
            defaultValue={defaultMessage}
            className="w-full px-4 py-3 font-sans border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-accent text-primary font-bold py-3 px-6 rounded-md text-lg hover:opacity-90 transition-opacity shadow-lg disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
        >
          {isPending && (
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isPending ? 'Wird gesendet…' : labels.formButton}
        </button>
      </form>
    </div>
  );
}
