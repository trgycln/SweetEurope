import React from 'react';
import { FiClock, FiPackage, FiGlobe, FiAward } from 'react-icons/fi';

interface StatsBarProps {
    dictionary: any;
}

export default function StatsBar({ dictionary }: StatsBarProps) {
    const stats = dictionary.statsBar || {
        expValue: "20+",
        expLabel: "Jahre Erfahrung",
        expSub: "im europäischen B2B-Markt",
        productsValue: "400+",
        productsLabel: "Premium Produkte",
        productsSub: "Sirupe, Soßen & Barista-Bedarf",
        countriesValue: "15+",
        countriesLabel: "EU-Länder beliefert",
        countriesSub: "Verlässliche B2B-Logistik",
        qualityValue: "100%",
        qualityLabel: "Geprüfte Qualität",
        qualitySub: "Halal, BRC & ISO zertifiziert",
    };

    const items = [
        {
            icon: FiClock,
            value: stats.expValue,
            label: stats.expLabel,
            sub: stats.expSub,
        },
        {
            icon: FiPackage,
            value: stats.productsValue,
            label: stats.productsLabel,
            sub: stats.productsSub,
        },
        {
            icon: FiGlobe,
            value: stats.countriesValue,
            label: stats.countriesLabel,
            sub: stats.countriesSub,
        },
        {
            icon: FiAward,
            value: stats.qualityValue,
            label: stats.qualityLabel,
            sub: stats.qualitySub,
        },
    ];

    return (
        <section className="relative bg-[#1A1A1A] border-y border-[#C69F6B]/25 py-8 sm:py-10 overflow-hidden shadow-inner">
            {/* Subtle luxury ambient glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#C69F6B]/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#C69F6B]/40 to-transparent" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 divide-y sm:divide-y-0 lg:divide-x divide-white/10">
                    {items.map((item, idx) => {
                        const IconComponent = item.icon;
                        return (
                            <div
                                key={idx}
                                className={`flex items-center gap-4 group ${
                                    idx > 0 ? 'lg:pl-8' : ''
                                } ${idx === 2 ? 'pt-6 sm:pt-0' : ''} ${
                                    idx === 3 ? 'pt-6 sm:pt-0' : ''
                                }`}
                            >
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-[#C69F6B]/30 flex items-center justify-center text-[#C69F6B] group-hover:scale-110 group-hover:border-[#C69F6B] group-hover:bg-[#C69F6B]/15 transition-all duration-300 flex-shrink-0 shadow-sm">
                                    <IconComponent size={22} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-2xl sm:text-3xl font-bold font-serif text-[#F4E8D3] tracking-tight group-hover:text-[#E2BA84] transition-colors">
                                        {item.value}
                                    </div>
                                    <div className="text-xs sm:text-sm font-semibold text-white/90 truncate">
                                        {item.label}
                                    </div>
                                    <div className="text-[11px] text-white/50 hidden sm:block truncate mt-0.5">
                                        {item.sub}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#C69F6B]/20 to-transparent" />
        </section>
    );
}
