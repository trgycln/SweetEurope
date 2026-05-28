'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const ADVANTAGES = [
    { icon: '🚚', id: 1 },
    { icon: '🏆', id: 2 },
    { icon: '🤝', id: 3 },
    { icon: '📦', id: 4 },
];

const CERTIFICATIONS = [
    { key: 'halal', color: 'bg-green-100 text-green-800 border-green-200' },
    { key: 'brc', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { key: 'patent', color: 'bg-amber-100 text-amber-800 border-amber-200' },
];

function getCertLabel(key: string, locale: string) {
    if (key === 'halal') {
        if (locale === 'tr') return 'Helal Sertifikalı';
        if (locale === 'en') return 'Halal Certified';
        if (locale === 'ar') return 'حلال معتمد';
        return 'Halal-zertifiziert';
    }
    if (key === 'brc') {
        if (locale === 'tr') return 'BRC Sertifikalı';
        if (locale === 'en') return 'BRC Certified';
        if (locale === 'ar') return 'BRC معتمد';
        return 'BRC-zertifiziert';
    }
    if (key === 'patent') {
        if (locale === 'tr') return 'Türk Patent Ödüllü';
        if (locale === 'en') return 'Turkish Patent Winner';
        if (locale === 'ar') return 'حائز على براءة اختراع تركية';
        return 'Türk. Patent-Sieger';
    }
    return '';
}

type AltKategori = {
    id: string;
    slug: string | null;
    ad: any;
    productCount: number;
};

interface Props {
    locale: string;
    dictionary: any;
    altKategorilerMap?: Record<string, AltKategori[]>;
}

export default function FoBrandAboutSection({ locale, dictionary, altKategorilerMap = {} }: Props) {

    return (
        <section className="bg-gradient-to-b from-slate-50 to-white py-20 px-6">
            <div className="container mx-auto">

                {/* Header */}
                <div className="text-center mb-14">
                    <span className="inline-block text-xs font-bold uppercase tracking-[0.22em] text-teal-600 mb-3">
                        {dictionary.foBrandAboutSection.whyElyson}
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-slate-900 mb-4 leading-tight">
                        {dictionary.foBrandAboutSection.horecaSpecialist}
                    </h2>
                    <p className="text-base text-slate-500 max-w-2xl mx-auto">
                        {dictionary.foBrandAboutSection.description}
                    </p>
                </div>

                {/* Avantajlar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
                    {ADVANTAGES.map((adv, i) => (
                        <motion.div 
                            key={i} 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            viewport={{ once: true, margin: "-50px" }}
                            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                            <div className="text-3xl mb-3">{adv.icon}</div>
                            <h3 className="font-bold text-slate-800 text-sm mb-2">{dictionary.foBrandAboutSection.advantages[`adv${adv.id}Title`]}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">{dictionary.foBrandAboutSection.advantages[`adv${adv.id}Desc`]}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Alt kategoriler + CTA */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

                    {/* Sol: Alt kategori listesi */}
                    {/* Sol: Kategori listesi — ana + alt */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                            {dictionary.foBrandAboutSection.productCategories}
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
                                                    +{aktifAlts.length - 8} {dictionary.foBrandAboutSection.more} →
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
                                    key={cert.key}
                                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${cert.color}`}
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                    </svg>
                                    {getCertLabel(cert.key, locale)}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Sağ: CTA kutusu */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-3xl p-8 text-white shadow-2xl hover:shadow-3xl transition-shadow duration-500">
                        <h3 className="text-2xl font-serif font-bold mb-3">
                            {dictionary.foBrandAboutSection.joinPartnerPortal}
                        </h3>
                        <p className="text-teal-100 text-sm leading-relaxed mb-6">
                            {dictionary.foBrandAboutSection.portalDesc}
                        </p>
                        <ul className="space-y-2 mb-7">
                            {[1, 2, 3].map((i) => (
                                <li key={i} className="flex items-center gap-2.5 text-sm text-teal-50">
                                    <svg className="w-4 h-4 text-emerald-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {dictionary.foBrandAboutSection.portalBenefits[`benefit${i}`]}
                                </li>
                            ))}
                        </ul>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link
                                href={`/${locale}/register`}
                                className="flex-1 text-center bg-white text-teal-700 font-bold px-5 py-3 rounded-xl hover:bg-teal-50 transition-colors text-sm shadow-sm"
                            >
                                {dictionary.foBrandAboutSection.registerFree}
                            </Link>
                            <Link
                                href={`/${locale}/products`}
                                className="flex-1 text-center bg-teal-500/30 text-white font-semibold px-5 py-3 rounded-xl hover:bg-teal-500/50 transition-colors text-sm border border-teal-400/40"
                            >
                                {dictionary.foBrandAboutSection.browseCatalog}
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
