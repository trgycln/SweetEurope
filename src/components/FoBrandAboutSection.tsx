import React from 'react';
import Link from 'next/link';

const STATS = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    value: 'Seit 1988',
    label: 'Erfahrung',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    value: '100+',
    label: 'Exportländer',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    value: '3',
    label: 'F&E-Labore',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    value: '4.000',
    label: 'Paletten-Lager',
  },
];

const CERTIFICATIONS = [
  { label: 'BRC-zertifiziert', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { label: 'Halal', color: 'bg-green-100 text-green-800 border-green-200' },
  { label: 'Türk. Patent-Sieger', color: 'bg-amber-100 text-amber-800 border-amber-200' },
];

export default function FoBrandAboutSection({ locale }: { locale: string }) {
  return (
    <section className="bg-white py-20 px-6">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left: Text content */}
          <div>
            <span className="inline-block text-xs font-bold uppercase tracking-[0.22em] text-teal-600 mb-3">
              Über FO Food Products
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-slate-900 mb-4 leading-tight">
              {locale === 'tr'
                ? '1988\'den Beri Premium Kalite'
                : locale === 'en'
                ? 'Premium Quality Since 1988'
                : 'Über FO – Premium-Qualität seit 1988'}
            </h2>
            <p className="text-base text-slate-500 font-medium mb-5">
              {locale === 'tr'
                ? 'Türk başarı hikayesi. 100\'den fazla ihracat ülkesi. Üç araştırma laboratuvarı. Tek hedef: Premium.'
                : locale === 'en'
                ? 'A Turkish success story. Over 100 export countries. Three research labs. One standard: Premium.'
                : 'Eine türkische Erfolgsgeschichte. Über 100 Exportländer. Drei Forschungslabore. Ein Anspruch: Premium.'}
            </p>
            <p className="text-base leading-7 text-slate-600 mb-8">
              {locale === 'tr'
                ? 'FO Food Products, 1988 yılında Türkiye\'de kurulan Özmer A.Ş.\'nin bir markasıdır. Üç kendi Ar-Ge laboratuvarı, 4.000 palet kapasiteli depo ve 100\'den fazla ülkeye ihracat ile FO; kafeler, oteller, pastaneler ve dondurmacıları premium şurup, sos, toz içecek ve pastane pastaları içeren en geniş ürün yelpazelerinden biriyle tedarik etmektedir. Tutarlı seri kalitesi, özenle seçilmiş hammaddeler ve sürekli inovasyon, FO\'yu talep sahibi gastronomi işletmeleri için ilk tercih haline getirmektedir.'
                : locale === 'en'
                ? 'FO Food Products is a brand of Özmer A.Ş., founded in 1988 in Turkey. With three in-house R&D laboratories, a 4,000-pallet warehouse and exports to over 100 countries, FO supplies cafés, hotels, patisseries and ice cream parlours with one of the widest premium assortments of syrups, sauces, powder drinks and patisserie pastes. Consistent serial quality, carefully selected raw materials and continuous innovation make FO the first choice for demanding foodservice operators.'
                : 'FO Food Products ist eine Marke der Özmer A.Ş., gegründet 1988 in der Türkei. Mit drei eigenen F&E-Laboren, einem 4.000-Paletten-Lager und Exporten in über 100 Länder beliefert FO Cafés, Hotels, Patisserien und Eisdielen mit einem der breitesten Premium-Sortimente für Sirupe, Soßen, Pulvergetränke und Konditoreipasten. Konstante Serienqualität, sorgfältig ausgewählte Rohstoffe und kontinuierliche Innovation machen FO zur ersten Wahl für anspruchsvolle Gastronomiebetriebe.'}
            </p>

            {/* Stat strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex justify-center mb-2 text-teal-600">{stat.icon}</div>
                  <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Cert badges */}
            <div className="flex flex-wrap gap-2 mb-8">
              {CERTIFICATIONS.map((cert) => (
                <span
                  key={cert.label}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${cert.color}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  {cert.label}
                </span>
              ))}
            </div>

            <Link
              href={`/${locale}/products`}
              className="inline-flex items-center gap-2 bg-slate-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-sm text-sm"
            >
              {locale === 'tr'
                ? 'Tüm FO Sortimentini Gör'
                : locale === 'en'
                ? 'View Complete FO Assortment'
                : 'Komplettes FO-Sortiment ansehen'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Right: Image mosaic */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 rounded-2xl overflow-hidden aspect-video bg-gradient-to-br from-teal-100 to-emerald-50 flex items-center justify-center shadow-sm border border-slate-100">
              <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="text-teal-400 opacity-60">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <p className="text-teal-600 font-semibold text-sm">FO Sortiment</p>
                <p className="text-teal-400 text-xs">Sirupe · Soßen · Pasten · Pulvergetränke</p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden aspect-square bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center shadow-sm border border-slate-100">
              <div className="text-center p-4">
                <p className="text-4xl font-bold text-amber-600">1988</p>
                <p className="text-xs text-amber-500 font-medium mt-1">Gegründet</p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden aspect-square bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center shadow-sm border border-slate-100">
              <div className="text-center p-4">
                <p className="text-4xl font-bold text-teal-600">100+</p>
                <p className="text-xs text-teal-500 font-medium mt-1">Länder</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
