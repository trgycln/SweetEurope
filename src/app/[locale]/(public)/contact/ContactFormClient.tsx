'use client';

import { useState, useTransition, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { submitContactForm } from '@/app/actions/contact-actions';

export default function ContactFormClient({
  labels,
  locale = 'de',
}: {
  labels: {
    formTitle: string;
    formName: string;
    formEmail: string;
    formMessage: string;
    formButton: string;
  };
  locale?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const searchParams = useSearchParams();
  const rawSubject = searchParams.get('subject') || '';
  const bodyParam = searchParams.get('body') || '';

  const isTasting = rawSubject.toLowerCase() === 'tasting' || rawSubject.toLowerCase().includes('verkostung') || rawSubject.toLowerCase().includes('tadım');
  const isPricelist = rawSubject.toLowerCase() === 'pricelist' || rawSubject.toLowerCase().includes('preisliste') || rawSubject.toLowerCase().includes('fiyat');

  const defaultMessage = (() => {
    if (bodyParam) return bodyParam;
    if (isTasting) {
      if (locale === 'tr') {
        return `Merhaba,\n\nKöln/Bonn bölgesindeki işletmemiz için ücretsiz yerinde tadım ve ürün deneme randevusu talep ediyoruz.\n\nİşletme Adı:\nŞehir / İlçe:\nİlgilendiğimiz Ürünler (Kahve Şurubu, Kokteyl, Sos vb.):\nUygun Gün ve Saat Aralığı:`;
      }
      if (locale === 'en') {
        return `Hello,\n\nWe would like to request a free on-site tasting session for our venue in the Cologne/Bonn area.\n\nVenue / Business Name:\nCity / District:\nProducts of Interest (Coffee syrups, Cocktail syrups, Purees etc.):\nPreferred Date & Time:`;
      }
      if (locale === 'ar') {
        return `مرحباً،\n\nنود طلب موعد لتذوق وتجربة المنتجات مجاناً في موقعنا بمنطقة كولونيا/بون.\n\nاسم المنشأة:\nالمدينة / الحي:\nالمنتجات المطلوبة:\nالموعد المفضل:`;
      }
      return `Hallo,\n\nwir möchten einen kostenlosen Verkostungstermin für unsere Gastronomie im Raum Köln/Bonn anfragen.\n\nBetriebsname:\nStadt / Stadtteil:\nInteressante Produkte (Kaffeesirupe, Cocktailsirupe, Saucen etc.):\nWunschtermin (Tag & Uhrzeit):`;
    }
    if (isPricelist) {
      if (locale === 'tr') {
        return `Merhaba,\n\nİşletmemiz için güncel B2B Fiyat Listesini (PDF) talep ediyoruz.\n\nİşletme Adı:\nŞehir / Posta Kodu:`;
      }
      if (locale === 'en') {
        return `Hello,\n\nWe would like to receive the current B2B price list (PDF) for our business.\n\nBusiness Name:\nCity / Postal Code:`;
      }
      if (locale === 'ar') {
        return `مرحباً،\n\nنرجو تزويدنا بقائمة أسعار B2B الحالية (PDF) لمنشأتنا.\n\nاسم المنشأة:\nالمدينة:`;
      }
      return `Hallo,\n\nbitte senden Sie uns die aktuelle B2B-Preisliste (PDF) für unseren Betrieb zu.\n\nBetriebsname:\nStadt / PLZ:`;
    }
    return rawSubject;
  })();

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

      {isTasting && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">☕</span>
          <div>
            <h3 className="font-bold text-primary text-sm sm:text-base">
              {locale === 'tr' ? 'Köln & Bonn Yerinde Ücretsiz Tadım Randevusu' :
               locale === 'en' ? 'Free On-Site Tasting (Cologne & Bonn)' :
               locale === 'ar' ? 'تذوق مجاني في الموقع (كولونيا وبون)' :
               'Kostenlose Verkostung vor Ort (Köln & Bonn)'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 mt-1">
              {locale === 'tr' ? 'Şuruplarımızı ve soslarımızı bizzat işletmenize getirip yerinde denetiyoruz. Aşağıdaki bilgileri tamamlayarak randevu talebinizi iletebilirsiniz.' :
               locale === 'en' ? 'We personally bring our syrups and sauces to your venue for an on-site tasting. Complete the details below to request your session.' :
               locale === 'ar' ? 'نقوم بزيارة مقهاك أو مطعمك شخصياً لتجربة منتجاتنا في موقعك. أكمل التفاصيل أدناه لتحديد الموعد.' :
               'Wir bringen unsere Sirupe & Saucen persönlich in Ihren Betrieb und verkosten gemeinsam vor Ort. Vervollständigen Sie einfach die Angaben unten.'}
            </p>
          </div>
        </div>
      )}

      {isPricelist && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">📄</span>
          <div>
            <h3 className="font-bold text-primary text-sm sm:text-base">
              {locale === 'tr' ? 'B2B Fiyat Listesi (PDF) Talebi' :
               locale === 'en' ? 'Request B2B Price List (PDF)' :
               locale === 'ar' ? 'طلب قائمة أسعار B2B (PDF)' :
               'B2B-Preisliste (PDF) anfordern'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 mt-1">
              {locale === 'tr' ? 'Güncel toptan fiyat listemiz e-posta adresinize iletilecektir. Lütfen işletme adınızı belirtiniz.' :
               locale === 'en' ? 'Our current wholesale price list will be sent to your email. Please include your venue name.' :
               locale === 'ar' ? 'سيتم إرسال قائمة أسعار الجملة إلى بريدك الإلكتروني. يرجى ذكر اسم المنشأة.' :
               'Unsere aktuelle Großhandelspreisliste wird Ihnen per E-Mail zugesendet. Bitte geben Sie Ihren Betriebsnamen an.'}
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* HONEYPOT: Botları yakalamak için gizli alan */}
        <input type="text" name="bot_field" className="hidden" tabIndex={-1} autoComplete="off" />
        
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
            key={defaultMessage}
            id="message"
            name="message"
            rows={6}
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
