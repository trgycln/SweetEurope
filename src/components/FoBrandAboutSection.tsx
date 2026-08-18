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
    { key: 'halal',  icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
    { key: 'brc',   icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
    { key: 'patent', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
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
        <section className="relative bg-gradient-to-b from-[#FAF9F6] to-[#EAE8E1] py-16 sm:py-20 px-4 sm:px-8 md:px-12 lg:px-20 overflow-hidden">

            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-[0.04] bg-[#2B2B2B] translate-x-1/3 -translate-y-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-[0.04] bg-[#C69F6B] -translate-x-1/3 translate-y-1/3 pointer-events-none" />

            <div className="container mx-auto relative">

                {/* Header */}
                <div className="text-center mb-10 sm:mb-14">
                    <span className="inline-block text-xs font-bold uppercase tracking-[0.22em] text-[#C69F6B] mb-3">
                        {dictionary.foBrandAboutSection.whyElyson}
                    </span>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif text-[#2B2B2B] mb-4 leading-tight">
                        {dictionary.foBrandAboutSection.horecaSpecialist}
                    </h2>
                    <p className="text-base text-[#6B6B6B] max-w-2xl mx-auto">
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
                            viewport={{ once: true, margin: '-50px' }}
                            className="bg-white rounded-2xl p-6 border border-[#E8E0D4] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
                        >
                            <div className="text-3xl mb-3">{adv.icon}</div>
                            <h3 className="font-bold text-[#2B2B2B] text-sm mb-2 group-hover:text-[#C69F6B] transition-colors">
                                {dictionary.foBrandAboutSection.advantages[`adv${adv.id}Title`]}
                            </h3>
                            <p className="text-xs text-[#888] leading-relaxed">
                                {dictionary.foBrandAboutSection.advantages[`adv${adv.id}Desc`]}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Alt kategoriler + CTA */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

                    {/* Sol: Kategori listesi */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#C69F6B] mb-4 flex items-center gap-2">
                            <span className="inline-block w-6 h-px bg-[#C69F6B]" />
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
                                                            className="flex items-center justify-between bg-white border border-[#E8E0D4] rounded-xl px-3 py-2.5 hover:border-[#C69F6B] hover:bg-[#FAF9F6] transition-all group shadow-sm"
                                                        >
                                                            <span className="text-xs font-semibold text-[#3D3D3D] group-hover:text-[#2B2B2B] truncate">
                                                                {name}
                                                            </span>
                                                            <span className="text-[10px] text-[#C69F6B] font-bold font-mono flex-shrink-0 ml-2 bg-[#C69F6B]/10 px-1.5 py-0.5 rounded-md">
                                                                {kat.productCount}
                                                            </span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                            {aktifAlts.length > 8 && (
                                                <Link
                                                    href={`/${locale}/products`}
                                                    className="mt-1.5 inline-block text-[11px] text-[#C69F6B] hover:text-[#2B2B2B] font-semibold transition-colors"
                                                >
                                                    +{aktifAlts.length - 8} {dictionary.foBrandAboutSection.more} →
                                                </Link>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>

                        {/* Sertifikalar — premium rozet tasarımı */}
                        <div className="flex flex-wrap gap-2 mt-6">
                            {CERTIFICATIONS.map((cert) => (
                                <span
                                    key={cert.key}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-[#C69F6B]/30 bg-white text-[#2B2B2B] shadow-sm hover:border-[#C69F6B] hover:shadow-md transition-all duration-200"
                                >
                                    <svg className="w-3.5 h-3.5 text-[#C69F6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cert.icon} />
                                    </svg>
                                    {getCertLabel(cert.key, locale)}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Sağ: CTA kutusu — antrasit + altın tema */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="relative rounded-3xl overflow-hidden shadow-2xl"
                    >
                        {/* Arka plan */}
                        <div className="absolute inset-0 bg-[#2B2B2B]" />
                        {/* Altın dekoratif gradyan */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#C69F6B]/20 via-transparent to-[#C69F6B]/5 pointer-events-none" />
                        {/* Subtle pattern */}
                        <div
                            className="absolute inset-0 opacity-[0.03] pointer-events-none"
                            style={{
                                backgroundImage: 'radial-gradient(circle, #C69F6B 1px, transparent 1px)',
                                backgroundSize: '24px 24px',
                            }}
                        />

                        <div className="relative z-10 p-8 text-white">
                            {/* Üst rozet */}
                            <div className="inline-flex items-center gap-1.5 bg-[#C69F6B]/15 border border-[#C69F6B]/30 rounded-full px-3 py-1 mb-5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#C69F6B] animate-pulse" />
                                <span className="text-[11px] font-bold uppercase tracking-widest text-[#C69F6B]">
                                    B2B Partnerportal
                                </span>
                            </div>

                            <h3 className="text-2xl font-serif font-bold mb-3 text-white">
                                {dictionary.foBrandAboutSection.joinPartnerPortal}
                            </h3>
                            <p className="text-[#D4C4A8] text-sm leading-relaxed mb-6">
                                {dictionary.foBrandAboutSection.portalDesc}
                            </p>

                            <ul className="space-y-2.5 mb-7">
                                {[1, 2, 3].map((i) => (
                                    <li key={i} className="flex items-center gap-2.5 text-sm text-white/85">
                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#C69F6B]/20 border border-[#C69F6B]/40 flex items-center justify-center">
                                            <svg className="w-3 h-3 text-[#C69F6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </span>
                                        {dictionary.foBrandAboutSection.portalBenefits[`benefit${i}`]}
                                    </li>
                                ))}
                            </ul>

                            {/* Ayırıcı çizgi */}
                            <div className="w-full h-px bg-gradient-to-r from-transparent via-[#C69F6B]/30 to-transparent mb-6" />

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Link
                                    href={`/${locale}/register`}
                                    className="flex-1 text-center bg-[#C69F6B] text-[#2B2B2B] font-bold px-5 py-3 rounded-xl hover:bg-[#D4AF7A] hover:shadow-lg hover:shadow-[#C69F6B]/20 transition-all duration-200 text-sm"
                                >
                                    {dictionary.foBrandAboutSection.registerFree}
                                </Link>
                                <Link
                                    href={`/${locale}/products`}
                                    className="flex-1 text-center bg-white/8 text-white font-semibold px-5 py-3 rounded-xl hover:bg-white/15 transition-all duration-200 text-sm border border-white/15"
                                >
                                    {dictionary.foBrandAboutSection.browseCatalog}
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
