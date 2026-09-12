'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiTruck, FiAward, FiUsers, FiLayers, FiCheck, FiArrowRight } from 'react-icons/fi';
import { getLocalizedName } from '@/lib/utils';

export type AnaKategoriItem = {
    id: string;
    slug: string | null;
    ad: any;
    image_url: string;
    productCount: number;
};

interface Props {
    locale: string;
    dictionary: any;
    anaKategoriler?: AnaKategoriItem[];
}

const ADVANTAGE_ICONS = [FiTruck, FiAward, FiUsers, FiLayers];

const CERTIFICATIONS = [
    { key: 'halal', label: { de: 'Halal-zertifiziert', tr: 'Helal Sertifikalı', en: 'Halal Certified', ar: 'حلال معتمد' } },
    { key: 'brc', label: { de: 'BRC Food Safety', tr: 'BRC Gıda Güvenliği', en: 'BRC Food Safety', ar: 'BRC سلامة الغذاء' } },
    { key: 'patent', label: { de: 'Türk. Patent-Sieger', tr: 'Türk Patent Ödüllü', en: 'Turkish Patent Winner', ar: 'حائز على براءة اختراع' } },
    { key: 'iso', label: { de: 'ISO 22000 Standards', tr: 'ISO 22000 Standartları', en: 'ISO 22000 Standards', ar: 'معايير ISO 22000' } },
];

export default function FoBrandAboutSection({ locale, dictionary, anaKategoriler = [] }: Props) {
    const activeCategories = (anaKategoriler || []).filter(k => k.productCount > 0);

    return (
        <section className="relative bg-gradient-to-b from-[#FAF9F6] to-[#EFECE6] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-[0.03] bg-[#2B2B2B] translate-x-1/3 -translate-y-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-[0.05] bg-[#C69F6B] -translate-x-1/3 translate-y-1/3 pointer-events-none" />

            <div className="container mx-auto max-w-7xl relative z-10">

                {/* Section Header */}
                <div className="text-center mb-12 sm:mb-16">
                    <span className="inline-block text-xs font-bold uppercase tracking-[0.22em] text-[#C69F6B] mb-3">
                        {dictionary.foBrandAboutSection.whyElyson}
                    </span>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#2B2B2B] mb-4 leading-tight font-bold">
                        {dictionary.foBrandAboutSection.horecaSpecialist}
                    </h2>
                    <p className="text-base sm:text-lg text-[#6B6B6B] max-w-2xl mx-auto leading-relaxed">
                        {dictionary.foBrandAboutSection.description}
                    </p>
                </div>

                {/* 4 B2B Advantages */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16 sm:mb-20">
                    {[1, 2, 3, 4].map((id, i) => {
                        const IconComponent = ADVANTAGE_ICONS[i];
                        return (
                            <motion.div
                                key={id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: i * 0.1 }}
                                viewport={{ once: true, margin: '-40px' }}
                                className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-[#E8E0D4] shadow-sm hover:shadow-lg hover:border-[#C69F6B]/60 hover:-translate-y-1 transition-all duration-300 group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-[#FAF6F0] border border-[#C69F6B]/20 flex items-center justify-center text-[#C69F6B] mb-4 group-hover:scale-110 group-hover:bg-[#C69F6B] group-hover:text-white transition-all duration-300">
                                    <IconComponent size={22} />
                                </div>
                                <h3 className="font-bold text-[#2B2B2B] text-base mb-2 group-hover:text-[#C69F6B] transition-colors">
                                    {dictionary.foBrandAboutSection.advantages[`adv${id}Title`]}
                                </h3>
                                <p className="text-xs sm:text-sm text-[#777] leading-relaxed">
                                    {dictionary.foBrandAboutSection.advantages[`adv${id}Desc`]}
                                </p>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Visual Category Grid */}
                <div className="mb-16 sm:mb-20">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                        <div>
                            <div className="text-xs font-bold uppercase tracking-widest text-[#C69F6B] mb-2 flex items-center gap-2">
                                <span className="inline-block w-6 h-px bg-[#C69F6B]" />
                                {dictionary.foBrandAboutSection.productCategories}
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#2B2B2B]">
                                {locale === 'tr' ? 'B2B Toptan Ürün Kategorileri' : locale === 'en' ? 'B2B Wholesale Product Categories' : locale === 'ar' ? 'فئات المنتجات بالجملة' : 'B2B Großhandels-Sortiment'}
                            </h3>
                        </div>
                        <Link
                            href={`/${locale}/products`}
                            className="inline-flex items-center gap-2 text-sm font-bold text-[#C69F6B] hover:text-[#2B2B2B] group transition-colors"
                        >
                            <span>{dictionary.foBrandAboutSection.browseCatalog || 'Alle Kategorien'}</span>
                            <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5 sm:gap-6">
                        {activeCategories.map((kat) => {
                            const name = getLocalizedName(kat.ad, locale as any);
                            return (
                                <Link
                                    key={kat.id}
                                    href={`/${locale}/products?kategori=${kat.slug || kat.id}`}
                                    className="group relative flex flex-col justify-end h-60 sm:h-72 rounded-2xl overflow-hidden border border-[#E8E0D4] bg-[#1A1A1A] shadow-sm hover:shadow-xl hover:border-[#C69F6B] hover:-translate-y-1.5 transition-all duration-300"
                                >
                                    {/* Image background */}
                                    <Image
                                        src={kat.image_url}
                                        alt={name}
                                        fill
                                        unoptimized
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        className="object-cover group-hover:scale-108 transition-transform duration-500 ease-out opacity-90"
                                    />

                                    {/* Subtle multi-stop gradient for readable text */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

                                    {/* Content inside card */}
                                    <div className="relative z-10 p-5">
                                        <div className="inline-block bg-white/20 backdrop-blur-md border border-white/30 text-white text-[11px] font-bold px-3 py-1 rounded-full mb-2 shadow-sm">
                                            {kat.productCount} {dictionary.foBrandAboutSection?.products || (locale === 'tr' ? 'Ürün' : locale === 'en' ? 'Products' : locale === 'ar' ? 'منتج' : 'Produkte')}
                                        </div>
                                        <h4 className="text-white font-bold text-base sm:text-lg leading-snug group-hover:text-[#F4D099] transition-colors line-clamp-2 drop-shadow-sm">
                                            {name}
                                        </h4>
                                    </div>

                                    {/* Subtle gold bottom accent line on hover */}
                                    <div className="absolute bottom-0 inset-x-0 h-1 bg-[#C69F6B] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* B2B Partner Portal Banner & Certifications */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    
                    {/* Sol: HoReCa Bilgilendirme ve Sertifika Rozetleri (5 Sütun) */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="inline-block text-xs font-bold uppercase tracking-widest text-[#C69F6B]">
                            HoReCa & B2B Service
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#2B2B2B] leading-tight">
                            {locale === 'tr' ? 'Güvenilir Kalite ve Hızlı Tedarik Zinciri' : locale === 'en' ? 'Certified Quality and Rapid Supply Chain' : locale === 'ar' ? 'جودة معتمدة وسلسلة توريد سريعة' : 'Zertifizierte Qualität & Schnelle Lieferkette'}
                        </h3>
                        <p className="text-sm text-[#666] leading-relaxed">
                            {locale === 'tr' 
                                ? 'Almanya depomuzdan doğrudan sevkiyat ile otel, restoran ve kafelerin günlük operasyonel ihtiyaçlarına kesintisiz destek veriyoruz.' 
                                : locale === 'en'
                                ? 'With direct dispatch from our German warehouse, we seamlessly support the daily operational demands of hotels, restaurants, and cafes.'
                                : locale === 'ar'
                                ? 'مع الشحن المباشر من مستودعنا في ألمانيا، ندعم العمليات اليومية للفنادق والمطاعم والمقاهي بكل كفاءة.'
                                : 'Mit direktem Versand aus unserem deutschen Zentrallager unterstützen wir Hotels, Cafés und Restaurants zuverlässig im täglichen Betrieb.'}
                        </p>

                        {/* Sertifikalar */}
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-[#999] mb-3">
                                {locale === 'tr' ? 'Sertifikalar ve Standartlar' : locale === 'en' ? 'Certifications & Standards' : locale === 'ar' ? 'الشهادات والمعايير' : 'Zertifikate & Standards'}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {CERTIFICATIONS.map((cert) => (
                                    <span
                                        key={cert.key}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-[#C69F6B]/30 bg-white text-[#2B2B2B] shadow-sm hover:border-[#C69F6B] hover:shadow-md transition-all"
                                    >
                                        <FiCheck className="text-[#C69F6B]" size={14} />
                                        {(cert.label as any)[locale] || cert.label.de}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sağ: B2B Partnerportal CTA Kartı (7 Sütun) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        viewport={{ once: true }}
                        className="lg:col-span-7 relative rounded-3xl overflow-hidden shadow-2xl bg-[#232323] p-8 sm:p-10 border border-[#C69F6B]/30"
                    >
                        {/* Ambient gradients */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#C69F6B]/20 via-transparent to-black/60 pointer-events-none" />
                        <div
                            className="absolute inset-0 opacity-[0.03] pointer-events-none"
                            style={{
                                backgroundImage: 'radial-gradient(circle, #C69F6B 1px, transparent 1px)',
                                backgroundSize: '24px 24px',
                            }}
                        />

                        <div className="relative z-10 text-white">
                            <div className="inline-flex items-center gap-2 bg-[#C69F6B]/20 border border-[#C69F6B]/40 rounded-full px-3 py-1 mb-5">
                                <span className="w-2 h-2 rounded-full bg-[#C69F6B] animate-pulse" />
                                <span className="text-[11px] font-bold uppercase tracking-widest text-[#E2BA84]">
                                    B2B Partnerportal
                                </span>
                            </div>

                            <h3 className="text-2xl sm:text-3xl font-serif font-bold mb-3 text-white">
                                {dictionary.foBrandAboutSection.joinPartnerPortal}
                            </h3>
                            <p className="text-[#D4C4A8] text-sm sm:text-base leading-relaxed mb-6">
                                {dictionary.foBrandAboutSection.portalDesc}
                            </p>

                            <ul className="space-y-3 mb-8">
                                {[1, 2, 3].map((i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm sm:text-base text-white/90">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#C69F6B]/25 border border-[#C69F6B]/50 flex items-center justify-center text-[#E2BA84]">
                                            <FiCheck size={14} />
                                        </span>
                                        {dictionary.foBrandAboutSection.portalBenefits[`benefit${i}`]}
                                    </li>
                                ))}
                            </ul>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/10">
                                <Link
                                    href={`/${locale}/register`}
                                    className="flex-1 text-center bg-[#C69F6B] text-[#1A1A1A] font-bold px-6 py-3.5 rounded-xl hover:bg-[#D4AF7A] hover:shadow-lg hover:shadow-[#C69F6B]/30 transition-all duration-200 text-sm sm:text-base"
                                >
                                    {dictionary.foBrandAboutSection.registerFree}
                                </Link>
                                <Link
                                    href={`/${locale}/products`}
                                    className="flex-1 text-center bg-white/10 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/20 transition-all duration-200 text-sm sm:text-base border border-white/15"
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
