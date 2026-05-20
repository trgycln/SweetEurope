import React from 'react';
import Link from 'next/link';

const ADVANTAGES = [
    {
        icon: '🚚',
        title: { de: 'Schnelle Lieferung', tr: 'Hızlı Teslimat', en: 'Fast Delivery' },
        desc: {
            de: 'Lagerbestand in Deutschland – kurze Lieferzeiten für ganz Deutschland',
            tr: 'Almanya\'da stok – tüm Almanya\'ya kısa teslimat süreleri',
            en: 'Stock in Germany – short delivery times across Germany',
        },
    },
    {
        icon: '🏆',
        title: { de: 'Premium-Sortiment', tr: 'Premium Ürün Yelpazesi', en: 'Premium Assortment' },
        desc: {
            de: '246+ sorgfältig ausgewählte Produkte für Cafés, Hotels & Gastronomie',
            tr: 'Kafeler, oteller ve gastronomi için özenle seçilmiş 246+ ürün',
            en: '246+ carefully selected products for cafés, hotels & foodservice',
        },
    },
    {
        icon: '🤝',
        title: { de: 'Persönlicher Service', tr: 'Kişisel Hizmet', en: 'Personal Service' },
        desc: {
            de: 'Direkter Ansprechpartner – keine langen Warteschleifen',
            tr: 'Direkt muhatap – uzun bekleme süreleri yok',
            en: 'Direct contact person – no long waiting queues',
        },
    },
    {
        icon: '📦',
        title: { de: 'Flexible Bestellmengen', tr: 'Esnek Sipariş Miktarları', en: 'Flexible Order Quantities' },
        desc: {
            de: 'Von einzelnen Kartons bis zur Palette – für jeden Bedarf',
            tr: 'Tek koliden palete – her ihtiyaç için',
            en: 'From single cartons to pallets – for every need',
        },
    },
];

const CERTIFICATIONS = [
    { label: 'Halal-zertifiziert', color: 'bg-green-100 text-green-800 border-green-200' },
    { label: 'BRC-zertifiziert', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { label: 'Türk. Patent-Sieger', color: 'bg-amber-100 text-amber-800 border-amber-200' },
];

type AltKategori = {
    id: string;
    slug: string | null;
    ad: any;
    productCount: number;
};

interface Props {
    locale: string;
    altKategorilerMap?: Record<string, AltKategori[]>;
}

export default function FoBrandAboutSection({ locale, altKategorilerMap = {} }: Props) {
    const t = (obj: Record<string, string>) => obj[locale] || obj.de;

    return (
        <section className="bg-gradient-to-b from-slate-50 to-white py-20 px-6">
            <div className="container mx-auto">

                {/* Header */}
                <div className="text-center mb-14">
                    <span className="inline-block text-xs font-bold uppercase tracking-[0.22em] text-teal-600 mb-3">
                        {locale === 'tr' ? 'Neden ElysonSweets?'
                            : locale === 'en' ? 'Why ElysonSweets?'
                            : 'Warum ElysonSweets?'}
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-slate-900 mb-4 leading-tight">
                        {locale === 'tr' ? 'Almanya\'nın HoReCa Uzmanı'
                            : locale === 'en' ? 'Germany\'s HoReCa Specialist'
                            : 'Ihr HoReCa-Spezialist in Deutschland'}
                    </h2>
                    <p className="text-base text-slate-500 max-w-2xl mx-auto">
                        {locale === 'tr'
                            ? 'Kafeler, oteller ve restoranlar için özenle seçilmiş premium ürünler. Hızlı teslimat, esnek sipariş miktarları ve kişisel hizmet.'
                            : locale === 'en'
                            ? 'Premium products carefully selected for cafés, hotels and restaurants. Fast delivery, flexible order quantities and personal service.'
                            : 'Sorgfältig ausgewählte Premium-Produkte für Cafés, Hotels und Restaurants. Schnelle Lieferung, flexible Bestellmengen und persönlicher Service.'}
                    </p>
                </div>

                {/* Avantajlar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
                    {ADVANTAGES.map((adv, i) => (
                        <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="text-3xl mb-3">{adv.icon}</div>
                            <h3 className="font-bold text-slate-800 text-sm mb-2">{t(adv.title)}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">{t(adv.desc)}</p>
                        </div>
                    ))}
                </div>

                {/* Alt kategoriler + CTA */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

                    {/* Sol: Alt kategori listesi */}
                    {/* Sol: Kategori listesi — ana + alt */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                            {locale === 'tr' ? 'Ürün Kategorileri'
                                : locale === 'en' ? 'Product Categories'
                                : 'Produktkategorien'}
                        </p>

                        <div className="space-y-4">
                            {Object.entries(altKategorilerMap)
                                .filter(([_, alts]) => alts.some(a => a.productCount > 0))
                                .map(([anaId, alts]) => {
                                    const aktifAlts = alts
                                        .filter(a => a.productCount > 0)
                                        .sort((a, b) => b.productCount - a.productCount);
                                    if (aktifAlts.length === 0) return null;
                                    return (
                                        <div key={anaId}>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {aktifAlts.slice(0, 8).map((kat) => {
                                                    const name = kat.ad?.[locale] || kat.ad?.de || kat.slug || '—';
                                                    return (
                                                        <Link
                                                            key={kat.id}
                                                            href={`/${locale}/products?kategori=${kat.slug || kat.id}`}
                                                            className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-3 py-2.5 hover:border-teal-200 hover:bg-teal-50/30 transition-all group shadow-sm"
                                                        >
                                                            <span className="text-xs font-semibold text-slate-700 group-hover:text-teal-700 truncate">
                                                                {name}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-mono flex-shrink-0 ml-2">
                                                                {kat.productCount}
                                                            </span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                            {aktifAlts.length > 8 && (
                                                <Link
                                                    href={`/${locale}/products`}
                                                    className="mt-1.5 inline-block text-[11px] text-teal-600 hover:text-teal-800 font-semibold"
                                                >
                                                    +{aktifAlts.length - 8} {locale === 'de' ? 'weitere' : 'daha'} →
                                                </Link>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>

                        {/* Sertifikalar */}
                        <div className="flex flex-wrap gap-2 mt-5">
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
                    </div>

                    {/* Sağ: CTA kutusu */}
                    <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-3xl p-8 text-white shadow-xl">
                        <h3 className="text-2xl font-serif font-bold mb-3">
                            {locale === 'tr' ? 'Partner Portalına Katılın'
                                : locale === 'en' ? 'Join the Partner Portal'
                                : 'Jetzt Partner werden'}
                        </h3>
                        <p className="text-teal-100 text-sm leading-relaxed mb-6">
                            {locale === 'tr'
                                ? 'Özel fiyatlar, hızlı sipariş ve kişisel hesap yönetimi ile işinizi büyütün.'
                                : locale === 'en'
                                ? 'Grow your business with exclusive prices, fast ordering and personal account management.'
                                : 'Wachsen Sie mit exklusiven Preisen, schneller Bestellung und persönlichem Account-Management.'}
                        </p>
                        <ul className="space-y-2 mb-7">
                            {[
                                { de: 'Exklusive Partnerpreise', tr: 'Özel partner fiyatları', en: 'Exclusive partner prices' },
                                { de: 'Online-Bestellung 24/7', tr: '7/24 online sipariş', en: 'Online ordering 24/7' },
                                { de: 'Persönlicher Ansprechpartner', tr: 'Kişisel müşteri temsilcisi', en: 'Personal contact person' },
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2.5 text-sm text-teal-50">
                                    <svg className="w-4 h-4 text-emerald-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {t(item)}
                                </li>
                            ))}
                        </ul>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link
                                href={`/${locale}/register`}
                                className="flex-1 text-center bg-white text-teal-700 font-bold px-5 py-3 rounded-xl hover:bg-teal-50 transition-colors text-sm shadow-sm"
                            >
                                {locale === 'tr' ? 'Ücretsiz Kayıt'
                                    : locale === 'en' ? 'Register Free'
                                    : 'Kostenlos registrieren'}
                            </Link>
                            <Link
                                href={`/${locale}/products`}
                                className="flex-1 text-center bg-teal-500/30 text-white font-semibold px-5 py-3 rounded-xl hover:bg-teal-500/50 transition-colors text-sm border border-teal-400/40"
                            >
                                {locale === 'tr' ? 'Kataloğu İncele'
                                    : locale === 'en' ? 'Browse Catalog'
                                    : 'Sortiment ansehen'}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
