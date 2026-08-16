'use client';

import React from 'react';
import { Locale } from '@/i18n-config';

interface NutritionData {
    pro_100g?: Record<string, number | string>;
    energy_kj?: number | string;
    energy_kcal?: number | string;
    fat_g?: number | string;
    saturated_fat_g?: number | string;
    carbohydrates_g?: number | string;
    sugar_g?: number | string;
    dietary_fibre_g?: number | string;
    protein_g?: number | string;
    salt_g?: number | string;
    [key: string]: any;
}

interface NutritionTableProps {
    data: NutritionData | null | undefined;
    locale?: Locale | string;
    className?: string;
}

function fmtVal(val: any, unit = 'g'): string {
    if (val === null || val === undefined || val === '') return '—';
    if (typeof val === 'number') {
        return val % 1 === 0 ? `${val} ${unit}` : `${val.toFixed(1).replace('.', ',')} ${unit}`;
    }
    const str = String(val).trim();
    if (str.toLowerCase().includes('g') || str.toLowerCase().includes('kj') || str.toLowerCase().includes('kcal')) {
        return str;
    }
    return `${str} ${unit}`;
}

export function NutritionTable({ data, locale = 'de', className = '' }: NutritionTableProps) {
    if (!data || Object.keys(data).length === 0) return null;

    // Support nested pro_100g or flat structure or localized strings
    const raw = data.pro_100g || data[locale as any] || data.de || data.tr || data.en || data;

    const kj = raw.energie_kj ?? raw.energy_kj ?? raw.enerji_kj ?? null;
    const kcal = raw.energie_kcal ?? raw.energy_kcal ?? raw.enerji_kcal ?? raw.enerji ?? raw.energy ?? null;
    const fett = raw.fett ?? raw.fat_g ?? raw.fat ?? raw.yag ?? null;
    const satFett = raw.davon_gesaettigt ?? raw.davon_gesaettigte_fettsaeuren ?? raw.saturated_fat_g ?? raw.saturated_fat ?? raw.doymus_yag ?? null;
    const carbs = raw.kohlenhydrate ?? raw.carbohydrates_g ?? raw.carbohydrates ?? raw.karbonhidrat ?? null;
    const sugar = raw.davon_zucker ?? raw.sugar_g ?? raw.sugar ?? raw.seker ?? raw.sekerler ?? null;
    const fiber = raw.ballaststoffe ?? raw.dietary_fibre_g ?? raw.fiber ?? raw.lif ?? raw.selulozik_lif ?? null;
    const protein = raw.eiweiss ?? raw.protein_g ?? raw.protein ?? null;
    const salt = raw.salz ?? raw.salt_g ?? raw.salt ?? raw.tuz ?? null;

    // Check if at least one value exists
    if (!kj && !kcal && !fett && !carbs && !protein && !salt) {
        return null;
    }

    const t = {
        de: {
            title: 'Nährwertangaben',
            per100: 'pro 100 g',
            energy: 'Brennwert / Energie',
            fat: 'Fett',
            satFat: 'davon gesättigte Fettsäuren',
            carbs: 'Kohlenhydrate',
            sugar: 'davon Zucker',
            fiber: 'Ballaststoffe',
            protein: 'Eiweiß',
            salt: 'Salz',
        },
        tr: {
            title: 'Besin Değerleri',
            per100: '100 g için',
            energy: 'Enerji',
            fat: 'Yağ',
            satFat: 'Doymuş Yağ',
            carbs: 'Karbonhidrat',
            sugar: 'Şekerler',
            fiber: 'Lif / Ballaststoffe',
            protein: 'Protein',
            salt: 'Tuz / Sodyum',
        },
        en: {
            title: 'Nutrition Facts',
            per100: 'per 100 g',
            energy: 'Energy',
            fat: 'Fat',
            satFat: 'of which Saturates',
            carbs: 'Carbohydrate',
            sugar: 'of which Sugars',
            fiber: 'Dietary Fibre',
            protein: 'Protein',
            salt: 'Salt',
        },
    }[locale as 'de' | 'tr' | 'en'] || {
        title: 'Nährwertangaben',
        per100: 'pro 100 g',
        energy: 'Brennwert / Energie',
        fat: 'Fett',
        satFat: 'davon gesättigte Fettsäuren',
        carbs: 'Kohlenhydrate',
        sugar: 'davon Zucker',
        fiber: 'Ballaststoffe',
        protein: 'Eiweiß',
        salt: 'Salz',
    };

    const rows = [
        {
            label: t.energy,
            val: (kj && kcal)
                ? `${fmtVal(kj, 'kJ')} / ${fmtVal(kcal, 'kcal')}`
                : kcal ? fmtVal(kcal, 'kcal') : fmtVal(kj, 'kJ'),
            isSub: false,
            highlight: true,
        },
        { label: t.fat, val: fmtVal(fett, 'g'), isSub: false },
        { label: t.satFat, val: fmtVal(satFett, 'g'), isSub: true },
        { label: t.carbs, val: fmtVal(carbs, 'g'), isSub: false },
        { label: t.sugar, val: fmtVal(sugar, 'g'), isSub: true },
        ...(fiber !== null ? [{ label: t.fiber, val: fmtVal(fiber, 'g'), isSub: false }] : []),
        { label: t.protein, val: fmtVal(protein, 'g'), isSub: false },
        { label: t.salt, val: fmtVal(salt, 'g'), isSub: false },
    ].filter(r => r.val !== '—');

    return (
        <div className={`overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs ${className}`}>
            <div className="flex items-center justify-between bg-slate-50/90 px-3.5 py-2.5 border-b border-slate-200/80">
                <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                    {t.title}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {t.per100}
                </span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
                {rows.map((row, idx) => (
                    <div
                        key={idx}
                        className={`flex items-center justify-between px-3.5 py-2 transition-colors ${
                            row.isSub
                                ? 'bg-slate-50/40 text-slate-500 pl-6'
                                : row.highlight
                                ? 'bg-amber-50/30 font-semibold text-slate-900'
                                : 'text-slate-700'
                        }`}
                    >
                        <span className={`${row.isSub ? 'text-[11px]' : 'font-medium'}`}>
                            {row.label}
                        </span>
                        <span className="font-semibold font-mono text-slate-900">
                            {row.val}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
