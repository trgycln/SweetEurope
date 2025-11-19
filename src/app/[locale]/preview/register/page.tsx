import { getDictionary } from '@/dictionaries';
import RegisterFormClient from './RegisterFormClient';

export default async function RegisterPage({ params, searchParams }: { params: { locale: string }; searchParams: { [key: string]: string | string[] | undefined } }) {
  const { locale } = params;
  const dictionary = await getDictionary(locale as any);
  const t = (dictionary as any).registerPage || {};

  return (
    <div className="container mx-auto px-6 py-12">
      <header className="text-center max-w-3xl mx-auto mb-10">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary">{t.title || 'Partner werden'}</h1>
        <p className="font-sans text-lg text-text-main/80 mt-3">{t.subtitle || 'Füllen Sie das Formular aus.'}</p>
      </header>

      {searchParams?.success === '1' && (
        <div className="max-w-3xl mx-auto mb-8 p-4 rounded-md border border-green-200 bg-green-50 text-green-800">
          <p className="font-semibold">{t.successTitle || 'Vielen Dank!'}</p>
          <p className="text-sm mt-1">{t.successMessage || 'Ihre Anfrage wurde erfolgreich übermittelt.'}</p>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <RegisterFormClient dictionary={dictionary} locale={locale} />
      </div>
    </div>
  );
}
