'use client';

import React, { useState } from 'react';
import { Locale } from '@/i18n-config';
import {
    LuChevronDown,
    LuLeaf,
    LuActivity,
    LuFileText,
    LuPackage,
    LuEye,
    LuDownload
} from 'react-icons/lu';
import { FiAlertTriangle } from 'react-icons/fi';
import { formatLmivIngredients } from '@/lib/allergen-highlighter';
import { NutritionTable } from './NutritionTable';
import { LabelModal } from './LabelModal';
import { getProductLabelPdfUrl } from '@/lib/label-matcher';

interface ProductSpecsAccordionProps {
    inhaltsstoffe?: any;
    naehrwerte?: any;
    allergene?: any;
    etiketPdfUrl?: string | null;
    logistik?: {
        koliIciAdet?: number | null;
        paletIciAdet?: number | null;
        paletIciKoliAdet?: number | null;
        birimAgirlikKg?: number | null;
        mindestBestellmenge?: number | null;
        mindestBestellmengeEinheit?: string | null;
        lieferzeitWerktage?: number | null;
        herstellerName?: string | null;
        herkunftsland?: any;
    };
    productName: string;
    stokKodu?: string | null;
    locale: Locale | string;
    className?: string;
}

export function ProductSpecsAccordion({
    inhaltsstoffe,
    naehrwerte,
    allergene,
    etiketPdfUrl,
    logistik,
    productName,
    stokKodu,
    locale = 'de',
    className = ''
}: ProductSpecsAccordionProps) {
    const [openSection, setOpenSection] = useState<string | null>(null);
    const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

    // Extract localized ingredients string
    const ingredientsText = (() => {
        if (!inhaltsstoffe) return null;
        if (typeof inhaltsstoffe === 'string') return inhaltsstoffe.trim();
        return (
            inhaltsstoffe[locale] ||
            inhaltsstoffe['de'] ||
            inhaltsstoffe['tr'] ||
            inhaltsstoffe['en'] ||
            Object.values(inhaltsstoffe)[0] ||
            null
        );
    })();

    // Matched PDF Label URL (either explicit or matched from 84 PDFs)
    const matchedPdfUrl = getProductLabelPdfUrl(etiketPdfUrl, productName, stokKodu);

    // Check if logistics has any data
    const hasLogistics =
        logistik &&
        (logistik.koliIciAdet ||
            logistik.paletIciAdet ||
            logistik.paletIciKoliAdet ||
            logistik.birimAgirlikKg ||
            logistik.mindestBestellmenge ||
            logistik.lieferzeitWerktage ||
            logistik.herstellerName ||
            logistik.herkunftsland);

    const hasIngredients = Boolean(ingredientsText);
    const hasNutrition = Boolean(naehrwerte && Object.keys(naehrwerte).length > 0);

    // If no technical details at all, return null
    if (!hasIngredients && !hasNutrition && !hasLogistics && !matchedPdfUrl) {
        return null;
    }

    const t = {
        de: {
            ingredients: 'Zutaten & Allergene',
            ingredientsSub: 'LMIV-konforme Inhaltsstoffe und Allergenhinweise',
            nutrition: 'Nährwerte pro 100g',
            nutritionSub: 'Brennwert, Fett, Zucker, Proteine und Salz',
            logistics: 'Logistik & Lieferung',
            logisticsSub: 'Karton- & Palettenmengen, Lieferzeiten',
            originalLabel: 'Original-Produktetikett (PDF)',
            viewLabel: 'Etikett ansehen',
            allergenWarningTitle: 'Wichtiger Allergenhinweis:',
            allergenNotice: 'Allergene Inhaltsstoffe sind in GROSSBUCHSTABEN, FETT und KURSIV hervorgehoben.',
            stkKarton: 'Stück / Karton',
            kartonPalette: 'Kartons / Palette',
            unitWeight: 'Gewicht pro Einheit',
            minOrder: 'Mindestbestellmenge',
            deliveryTime: 'Lieferzeit',
            workingDays: 'Werktage',
            manufacturer: 'Hersteller',
            origin: 'Herkunftsland'
        },
        tr: {
            ingredients: 'İçindekiler & Alerjenler',
            ingredientsSub: 'Gıda mevzuatına uygun bileşenler ve alerjenler',
            nutrition: '100g Besin Değerleri',
            nutritionSub: 'Enerji, yağ, şeker, protein ve tuz oranları',
            logistics: 'Lojistik & Teslimat',
            logisticsSub: 'Koli, palet ve kargo teslimat bilgileri',
            originalLabel: 'Orijinal Ürün Etiketi (PDF)',
            viewLabel: 'Etiketi İncele',
            allergenWarningTitle: 'Önemli Alerjen Uyarısı:',
            allergenNotice: 'Alerjen maddeler mevzuat gereği BÜYÜK HARFLE, KALIN ve İTALİK olarak vurgulanmıştır.',
            stkKarton: 'Adet / Koli',
            kartonPalette: 'Koli / Palet',
            unitWeight: 'Birim Ağırlık',
            minOrder: 'Minimum Sipariş',
            deliveryTime: 'Teslimat Süresi',
            workingDays: 'iş günü',
            manufacturer: 'Üretici',
            origin: 'Menşei Ülke'
        },
        en: {
            ingredients: 'Ingredients & Allergens',
            ingredientsSub: 'LMIV food information and allergen declarations',
            nutrition: 'Nutrition Facts (per 100g)',
            nutritionSub: 'Energy, fat, sugar, protein and salt values',
            logistics: 'Logistics & Delivery',
            logisticsSub: 'Packaging, pallet specs, delivery schedule',
            originalLabel: 'Original Product Label (PDF)',
            viewLabel: 'View Label',
            allergenWarningTitle: 'Important Allergen Notice:',
            allergenNotice: 'Allergenic ingredients are emphasized in UPPERCASE, BOLD and ITALIC.',
            stkKarton: 'Units / Case',
            kartonPalette: 'Cases / Pallet',
            unitWeight: 'Unit Weight',
            minOrder: 'Min. Order Quantity',
            deliveryTime: 'Delivery Time',
            workingDays: 'business days',
            manufacturer: 'Manufacturer',
            origin: 'Country of Origin'
        }
    }[locale as 'de' | 'tr' | 'en'] || {
        ingredients: 'Zutaten & Allergene',
        ingredientsSub: 'LMIV-konforme Inhaltsstoffe und Allergenhinweise',
        nutrition: 'Nährwerte pro 100g',
        nutritionSub: 'Brennwert, Fett, Zucker, Proteine und Salz',
        logistics: 'Logistik & Lieferung',
        logisticsSub: 'Karton- & Palettenmengen, Lieferzeiten',
        originalLabel: 'Original-Produktetikett (PDF)',
        viewLabel: 'Etikett ansehen',
        allergenWarningTitle: 'Wichtiger Allergenhinweis:',
        allergenNotice: 'Allergene Inhaltsstoffe sind in GROSSBUCHSTABEN, FETT und KURSIV hervorgehoben.',
        stkKarton: 'Stück / Karton',
        kartonPalette: 'Kartons / Palette',
        unitWeight: 'Gewicht pro Einheit',
        minOrder: 'Mindestbestellmenge',
        deliveryTime: 'Lieferzeit',
        workingDays: 'Werktage',
        manufacturer: 'Hersteller',
        origin: 'Herkunftsland'
    };

    const toggleSection = (section: string) => {
        setOpenSection(prev => (prev === section ? null : section));
    };

    return (
        <div className={`space-y-2.5 pt-3 ${className}`}>
            {/* ── Accordion 1: Zutaten & Allergene (İçindekiler) ── */}
            {hasIngredients && (
                <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('ingredients')}
                        className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50/70 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 border border-emerald-200/60">
                                <LuLeaf size={14} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                                    {t.ingredients}
                                </h4>
                                <p className="text-[10px] text-slate-400">
                                    {t.ingredientsSub}
                                </p>
                            </div>
                        </div>
                        <LuChevronDown
                            size={16}
                            className={`text-slate-400 transition-transform duration-200 ${
                                openSection === 'ingredients' ? 'rotate-180 text-emerald-600' : ''
                            }`}
                        />
                    </button>

                    {openSection === 'ingredients' && (
                        <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3 animate-in fade-in-50 duration-150">
                            {/* LMIV Alert notice */}
                            <div className="flex items-start gap-2 bg-amber-50/80 border border-amber-200/70 rounded-lg p-2.5 text-[11px] text-amber-900">
                                <FiAlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-700" />
                                <div>
                                    <span className="font-bold block">{t.allergenWarningTitle}</span>
                                    <span className="text-amber-800/90">{t.allergenNotice}</span>
                                </div>
                            </div>

                            {/* Formatted Ingredients with Allergen Highlighter */}
                            <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                                {formatLmivIngredients(ingredientsText)}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Accordion 2: Nährwerte pro 100g (Besin Değerleri) ── */}
            {hasNutrition && (
                <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('nutrition')}
                        className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50/70 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0 border border-blue-200/60">
                                <LuActivity size={14} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                                    {t.nutrition}
                                </h4>
                                <p className="text-[10px] text-slate-400">
                                    {t.nutritionSub}
                                </p>
                            </div>
                        </div>
                        <LuChevronDown
                            size={16}
                            className={`text-slate-400 transition-transform duration-200 ${
                                openSection === 'nutrition' ? 'rotate-180 text-blue-600' : ''
                            }`}
                        />
                    </button>

                    {openSection === 'nutrition' && (
                        <div className="px-4 pb-4 pt-1 border-t border-slate-100 animate-in fade-in-50 duration-150">
                            <NutritionTable data={naehrwerte} locale={locale} />
                        </div>
                    )}
                </div>
            )}

            {/* ── Accordion 3: Logistik & Lieferung (Lojistik) ── */}
            {hasLogistics && (
                <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs transition-all">
                    <button
                        type="button"
                        onClick={() => toggleSection('logistics')}
                        className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50/70 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0 border border-indigo-200/60">
                                <LuPackage size={14} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                                    {t.logistics}
                                </h4>
                                <p className="text-[10px] text-slate-400">
                                    {t.logisticsSub}
                                </p>
                            </div>
                        </div>
                        <LuChevronDown
                            size={16}
                            className={`text-slate-400 transition-transform duration-200 ${
                                openSection === 'logistics' ? 'rotate-180 text-indigo-600' : ''
                            }`}
                        />
                    </button>

                    {openSection === 'logistics' && logistik && (
                        <div className="px-4 pb-4 pt-1 border-t border-slate-100 text-xs divide-y divide-slate-100 animate-in fade-in-50 duration-150">
                            {logistik.koliIciAdet && (
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-slate-500">{t.stkKarton}</span>
                                    <span className="font-semibold text-slate-800">{logistik.koliIciAdet}</span>
                                </div>
                            )}
                            {(logistik.paletIciKoliAdet || logistik.paletIciAdet) && (
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-slate-500">{t.kartonPalette}</span>
                                    <span className="font-semibold text-slate-800">
                                        {logistik.paletIciKoliAdet || logistik.paletIciAdet}
                                    </span>
                                </div>
                            )}
                            {logistik.birimAgirlikKg && (
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-slate-500">{t.unitWeight}</span>
                                    <span className="font-semibold text-slate-800">{logistik.birimAgirlikKg} kg</span>
                                </div>
                            )}
                            {logistik.mindestBestellmenge && (
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-slate-500">{t.minOrder}</span>
                                    <span className="font-semibold text-slate-800">
                                        {logistik.mindestBestellmenge} {logistik.mindestBestellmengeEinheit || ''}
                                    </span>
                                </div>
                            )}
                            {logistik.lieferzeitWerktage && (
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-slate-500">{t.deliveryTime}</span>
                                    <span className="font-semibold text-slate-800">
                                        {logistik.lieferzeitWerktage} {t.workingDays}
                                    </span>
                                </div>
                            )}
                            {logistik.herstellerName && (
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-slate-500">{t.manufacturer}</span>
                                    <span className="font-semibold text-slate-800">{logistik.herstellerName}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Action: View Original Label Button ── */}
            {matchedPdfUrl && (
                <div className="pt-1">
                    <button
                        type="button"
                        onClick={() => setIsLabelModalOpen(true)}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50/70 to-orange-50/40 text-amber-950 hover:bg-amber-100/60 hover:border-amber-300 shadow-2xs transition-all group"
                    >
                        <div className="flex items-center gap-2.5 text-xs font-semibold">
                            <LuFileText size={15} className="text-amber-700 group-hover:scale-110 transition-transform" />
                            <span>{t.originalLabel}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-white/90 px-2.5 py-1 rounded-lg border border-amber-200/70 group-hover:bg-white shadow-2xs">
                            <LuEye size={12} />
                            {t.viewLabel}
                        </span>
                    </button>
                </div>
            )}

            {/* ── Lightbox Modal for PDF Label ── */}
            {matchedPdfUrl && isLabelModalOpen && (
                <LabelModal
                    pdfUrl={matchedPdfUrl}
                    productTitle={productName}
                    isOpen={isLabelModalOpen}
                    onClose={() => setIsLabelModalOpen(false)}
                    locale={locale}
                />
            )}
        </div>
    );
}

export default ProductSpecsAccordion;
