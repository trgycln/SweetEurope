'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Kategori {
    id: string;
    ad: any;
    ust_kategori_id?: string | null;
    slug?: string | null;
}

interface ProfesyonelFiltreProps {
    kategoriler: Kategori[];
    locale: string;
    seciliKategoriSlug?: string;
    totalCount?: number;
    availablePorsiyonlar?: number[]; // Dynamic portion options from database
    labels: {
        searchPlaceholder?: string;
        categoryLabel?: string;
        allCategories?: string;
        portionLabel?: string;
        allPortions?: string;
        featureLabel?: string;
        allFeatures?: string;
        tasteLabel?: string;
        allTastes?: string;
        applyFilters?: string;
        clearFilters?: string;
    activeFiltersBadgeSingular?: string; // placeholder with %{count}
    activeFiltersBadgePlural?: string;   // placeholder with %{count}
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

export default function ProfesyonelFiltre({ kategoriler, locale, seciliKategoriSlug, totalCount, labels, availablePorsiyonlar = [] }: ProfesyonelFiltreProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [altKategori, setAltKategori] = useState(searchParams?.get('altKategori') || '');
    const [porsiyon, setPorsiyon] = useState(searchParams?.get('porsiyon') || '');
    const [ozellik, setOzellik] = useState(searchParams?.get('ozellik') || '');
    const [tat, setTat] = useState(searchParams?.get('tat') || '');

    // Çeviri objeleri
    const translations = {
        unterkategorie: { de: 'Unterkategorie', tr: 'Alt Kategori', en: 'Subcategory', ar: 'فئة فرعية' },
        portionen: { de: 'Portionen', tr: 'Porsiyon', en: 'Portions', ar: 'حصص' },
        eigenschaften: { de: 'Eigenschaften', tr: 'Özellikler', en: 'Properties', ar: 'خصائص' },
        geschmack: { de: 'Geschmack', tr: 'Tat', en: 'Flavor', ar: 'نكهة' },
        filterAktiv: { de: 'Filter aktiv', tr: 'Filtre aktif', en: 'Filter active', ar: 'تصفية نشطة' },
        produkte: { de: 'Produkte', tr: 'Ürün', en: 'Products', ar: 'منتجات' },
        zurucksetzen: { de: 'Zurücksetzen', tr: 'Sıfırla', en: 'Reset', ar: 'إعادة تعيين' },
    };

    const t = (key: keyof typeof translations) => translations[key][locale as keyof typeof translations[typeof key]] || translations[key].de;

    // Seçili ana kategorinin alt kategorilerini bul
    const seciliAnaKategori = kategoriler.find(k => k.slug === seciliKategoriSlug);
    const altKategoriler = seciliAnaKategori 
        ? kategoriler.filter(k => k.ust_kategori_id === seciliAnaKategori.id)
        : [];

    // Porsiyon seçenekleri (dilim sayıları) - dinamik olarak database'den alınan değerler
    const porsiyonSecenekleri = availablePorsiyonlar.map(value => ({
        value: String(value),
        label: value === 1 
            ? (locale === 'de' ? '1 Portion' : locale === 'tr' ? '1 Porsiyon' : locale === 'ar' ? '١ حصة' : '1 Portion')
            : (locale === 'de' ? `${value} Portionen` : locale === 'tr' ? `${value} Porsiyon` : locale === 'ar' ? `${value} حصص` : `${value} Portions`)
    }));

    // Özellik seçenekleri - use dictionary labels with fallbacks
    const ozellikSecenekleri = [
        { value: 'vegan', label: labels.featureOptions?.vegan || (locale === 'de' ? 'Vegan' : locale === 'tr' ? 'Vegan' : locale === 'ar' ? 'نباتي' : 'Vegan') },
        { value: 'vegetarisch', label: labels.featureOptions?.vegetarian || (locale === 'de' ? 'Vegetarisch' : locale === 'tr' ? 'Vejetaryen' : locale === 'ar' ? 'نباتي (غير صارم)' : 'Vegetarian') },
        { value: 'glutenfrei', label: labels.featureOptions?.glutenFree || (locale === 'de' ? 'Glutenfrei' : locale === 'tr' ? 'Glutensiz' : locale === 'ar' ? 'خالي من الغلوتين' : 'Gluten-free') },
        { value: 'laktosefrei', label: labels.featureOptions?.lactoseFree || (locale === 'de' ? 'Laktosefrei' : locale === 'tr' ? 'Laktozsuz' : locale === 'ar' ? 'خالي من اللاكتوز' : 'Lactose-free') },
        { value: 'bio', label: labels.featureOptions?.organic || (locale === 'de' ? 'Bio' : locale === 'tr' ? 'Organik' : locale === 'ar' ? 'عضوي' : 'Organic') },
        { value: 'ohne_zucker', label: labels.featureOptions?.sugarFree || (locale === 'de' ? 'Ohne Zucker' : locale === 'tr' ? 'Şekersiz' : locale === 'ar' ? 'بدون سكر' : 'Sugar-Free') },
    ];

    // Tat seçenekleri - use dictionary tasteOptions if provided
    const baseTastes = ['schokolade', 'kakao', 'erdbeere', 'vanille', 'karamell', 'nuss', 'walnuss', 'badem', 
                       'hindistancevizi', 'honig', 'tereyag', 'zitrone', 'portakal', 'zeytin', 'frucht', 
                       'waldfrucht', 'kaffee', 'himbeere', 'brombeere', 'pistazie', 'kirsche', 'yabanmersini', 'havuc', 'yulaf'];
    const tatSecenekleri = baseTastes.map(value => ({
        value,
        label: labels.tasteOptions?.[value] || (value.charAt(0).toUpperCase() + value.slice(1))
    }));

    const applyFilter = () => {
        const params = new URLSearchParams();
        if (seciliKategoriSlug) params.set('kategori', seciliKategoriSlug);
        if (altKategori) params.set('altKategori', altKategori);
        if (porsiyon) params.set('porsiyon', porsiyon);
        if (ozellik) params.set('ozellik', ozellik);
        if (tat) params.set('tat', tat);
        
        router.push(`/${locale}/products?${params.toString()}`);
    };

    const clearFilters = () => {
        setAltKategori('');
        setPorsiyon('');
        setOzellik('');
        setTat('');
        const params = new URLSearchParams();
        if (seciliKategoriSlug) params.set('kategori', seciliKategoriSlug);
        router.push(`/${locale}/products?${params.toString()}`);
    };

    // Auto-apply when selections change
    useEffect(() => {
        applyFilter();
    }, [altKategori, porsiyon, ozellik, tat]);

    const activeFilterCount = [altKategori, porsiyon, ozellik, tat].filter(Boolean).length;

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            {/* Filtre Dropdowns - Kompakt Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Alt Kategoriler */}
                <select
                    value={altKategori}
                    onChange={(e) => setAltKategori(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-accent focus:border-accent bg-white disabled:bg-gray-50 disabled:text-gray-400"
                    disabled={altKategoriler.length === 0}
                >
                    <option value="">
                        {altKategoriler.length === 0 
                            ? t('unterkategorie')
                            : `${t('unterkategorie')} (${altKategoriler.length})`
                        }
                    </option>
                    {altKategoriler.map(k => (
                        <option key={k.id} value={k.slug || k.id}>
                            {k.ad?.[locale] || k.ad?.de || k.ad?.tr || 'Unnamed'}
                        </option>
                    ))}
                </select>

                {/* Portionen */}
                <select
                    value={porsiyon}
                    onChange={(e) => setPorsiyon(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-accent focus:border-accent bg-white"
                >
                    <option value="">{t('portionen')}</option>
                    {porsiyonSecenekleri.map(p => (
                        <option key={p.value} value={p.value}>
                            {p.label}
                        </option>
                    ))}
                </select>

                {/* Eigenschaften */}
                <select
                    value={ozellik}
                    onChange={(e) => setOzellik(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-accent focus:border-accent bg-white"
                >
                    <option value="">{t('eigenschaften')}</option>
                    {ozellikSecenekleri.map(o => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>

                {/* Geschmack */}
                <select
                    value={tat}
                    onChange={(e) => setTat(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-accent focus:border-accent bg-white"
                >
                    <option value="">{t('geschmack')}</option>
                    {tatSecenekleri.map(t => (
                        <option key={t.value} value={t.value}>
                            {t.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Aktif Filtre ve Temizle */}
            {activeFilterCount > 0 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-600">
                        {activeFilterCount} {t('filterAktiv')} • <span className="font-semibold">{totalCount || 0}</span> {t('produkte')}
                    </span>
                    <button
                        onClick={clearFilters}
                        className="text-xs text-gray-500 hover:text-accent transition-colors"
                    >
                        {t('zurucksetzen')}
                    </button>
                </div>
            )}
        </div>
    );
}
