'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { getLocalizedName } from '@/lib/utils';
import { Locale } from '@/i18n-config';

interface Kategori {
    id: string;
    ad: any;
    ust_kategori_id?: string | null;
}

interface ProfesyonelFiltreProps {
    kategoriler: Kategori[];
    locale: Locale;
    labels: {
        searchPlaceholder: string;
        categoryLabel: string;
        allCategories: string;
        portionLabel: string;
        allPortions: string;
        featureLabel: string;
        allFeatures: string;
        tasteLabel: string;
        allTastes: string;
        applyFilters: string;
        clearFilters: string;
    activeFiltersBadgeSingular: string; // placeholder with %{count}
    activeFiltersBadgePlural: string; // placeholder with %{count}
        featureOptions?: {
            vegan?: string;
            vegetarian?: string;
            glutenFree?: string;
            lactoseFree?: string;
            organic?: string;
            sugarFree?: string;
        };
        tasteOptions?: Record<string, string>;
    };
}

export default function ProfesyonelFiltre({ kategoriler, locale, labels }: ProfesyonelFiltreProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [kategori, setKategori] = useState(searchParams?.get('kategori') || '');
    const [porsiyon, setPorsiyon] = useState(searchParams?.get('porsiyon') || '');
    const [ozellik, setOzellik] = useState(searchParams?.get('ozellik') || '');
    const [tat, setTat] = useState(searchParams?.get('tat') || '');
    const [arama, setArama] = useState(searchParams?.get('q') || '');

    // Porsiyon seçenekleri (dilim sayıları)
    const porsiyonSecenekleri = [
        { value: '4', label: '4' },
        { value: '6', label: '6' },
        { value: '8', label: '8' },
        { value: '10', label: '10' },
        { value: '12', label: '12' },
        { value: '14', label: '14' },
        { value: '16', label: '16' },
    ];

    // Özellik seçenekleri
    const ozellikSecenekleri = [
        { value: 'vegan', label: labels.featureOptions?.vegan || 'Vegan' },
        { value: 'vegetarian', label: labels.featureOptions?.vegetarian || (locale === 'en' ? 'Vegetarian' : locale === 'tr' ? 'Vejetaryen' : locale === 'ar' ? 'نباتي' : 'Vegetarisch') },
        { value: 'glutenfrei', label: labels.featureOptions?.glutenFree || (locale === 'en' ? 'Gluten-Free' : locale === 'tr' ? 'Glutensiz' : locale === 'ar' ? 'خالٍ من الغلوتين' : 'Glutenfrei') },
        { value: 'laktosefrei', label: labels.featureOptions?.lactoseFree || (locale === 'en' ? 'Lactose-Free' : locale === 'tr' ? 'Laktozsuz' : locale === 'ar' ? 'خالٍ من اللاكتوز' : 'Laktosefrei') },
        { value: 'bio', label: labels.featureOptions?.organic || (locale === 'en' ? 'Organic' : locale === 'tr' ? 'Organik' : locale === 'ar' ? 'عضوي' : 'Bio') },
        { value: 'ohne_zucker', label: labels.featureOptions?.sugarFree || (locale === 'en' ? 'Sugar-Free' : locale === 'tr' ? 'Şekersiz' : locale === 'ar' ? 'بدون سكر' : 'Ohne Zucker') },
    ];

    // Tat seçenekleri - use dictionary tasteOptions if provided
    const baseTastes = ['schokolade', 'vanille', 'erdbeere', 'himbeere', 'brombeere', 'zitrone', 'portakal', 'karamell', 'nuss', 'frucht', 'kaffee'];
    const tatSecenekleri = baseTastes.map(value => ({
        value,
        label: labels.tasteOptions?.[value] || (value.charAt(0).toUpperCase() + value.slice(1))
    }));

    const applyFilter = () => {
        const params = new URLSearchParams();
        if (arama) params.set('q', arama);
        if (kategori) params.set('kategori', kategori);
        if (porsiyon) params.set('porsiyon', porsiyon);
        if (ozellik) params.set('ozellik', ozellik);
        if (tat) params.set('tat', tat);
        
        router.push(`/${locale}/admin/urun-yonetimi/urunler?${params.toString()}`);
    };

    const clearFilters = () => {
        setArama('');
        setKategori('');
        setPorsiyon('');
        setOzellik('');
        setTat('');
        router.push(`/${locale}/admin/urun-yonetimi/urunler`);
    };

    const activeFilterCount = [arama, kategori, porsiyon, ozellik, tat].filter(Boolean).length;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            {/* Arama Çubuğu */}
            <div className="mb-4">
                <input
                    type="text"
                    value={arama}
                    onChange={(e) => setArama(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
                    placeholder={labels.searchPlaceholder}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
            </div>

            {/* Filtre Dropdowns - 4'lü Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Kategorie */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {labels.categoryLabel}
                    </label>
                    <select
                        value={kategori}
                        onChange={(e) => setKategori(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                        <option value="">{labels.allCategories}</option>
                        {kategoriler
                            .filter(k => !k.ust_kategori_id)
                            .map(k => (
                                <option key={k.id} value={k.id}>
                                    {getLocalizedName(k.ad, locale as Locale) || 'Unnamed'}
                                </option>
                            ))}
                    </select>
                </div>

                {/* Portionen */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {labels.portionLabel}
                    </label>
                    <select
                        value={porsiyon}
                        onChange={(e) => setPorsiyon(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                        <option value="">{labels.allPortions}</option>
                        {porsiyonSecenekleri.map(p => (
                            <option key={p.value} value={p.value}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Zusatzeigenschaften */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {labels.featureLabel}
                    </label>
                    <select
                        value={ozellik}
                        onChange={(e) => setOzellik(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                        <option value="">{labels.allFeatures}</option>
                        {ozellikSecenekleri.map(o => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Geschmack */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {labels.tasteLabel}
                    </label>
                    <select
                        value={tat}
                        onChange={(e) => setTat(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                        <option value="">{labels.allTastes}</option>
                        {tatSecenekleri.map(t => (
                            <option key={t.value} value={t.value}>
                                {t.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Butonlar */}
            <div className="flex items-center justify-between">
                <div className="flex gap-3">
                    <button
                        onClick={applyFilter}
                        className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                        {labels.applyFilters}
                    </button>
                    
                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                            {labels.clearFilters}
                        </button>
                    )}
                </div>

                {/* Aktif Filtre Badge (Singular/Plural) */}
                {activeFilterCount > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                            {(activeFilterCount === 1 ? labels.activeFiltersBadgeSingular : labels.activeFiltersBadgePlural).replace('%{count}', String(activeFilterCount))}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
