'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { PRODUCT_LINE_FEATURES, type ProductLineKey } from '@/lib/product-lines';

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
    seciliUrunGami?: ProductLineKey;
    totalCount?: number;
    availablePorsiyonlar?: number[];
    availableHacimler?: number[];
    basePath?: string;
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
        activeFiltersBadgeSingular?: string;
        activeFiltersBadgePlural?: string;
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

export default function ProfesyonelFiltre({
    kategoriler,
    locale,
    seciliKategoriSlug,
    seciliUrunGami,
    totalCount,
    labels,
    availablePorsiyonlar = [],
    availableHacimler = [],
    basePath,
}: ProfesyonelFiltreProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const targetPath = basePath || `/${locale}/products`;

    const [altKategori, setAltKategori] = useState(searchParams?.get('altKategori') || '');
    const [porsiyon, setPorsiyon] = useState(searchParams?.get('porsiyon') || '');
    const [hacim, setHacim] = useState(searchParams?.get('hacim') || '');
    const [ozellik, setOzellik] = useState(searchParams?.get('ozellik') || '');
    const [tat, setTat] = useState(searchParams?.get('tat') || '');

    const translations = {
        unterkategorie: { de: 'Unterkategorie', tr: 'Alt Kategori', en: 'Subcategory', ar: 'فئة فرعية' },
        portionen: { de: 'Portionen', tr: 'Porsiyon', en: 'Portions', ar: 'حصص' },
        volumen: { de: 'Volumen', tr: 'Hacim', en: 'Volume', ar: 'الحجم' },
        eigenschaften: { de: 'Eigenschaften', tr: 'Özellikler', en: 'Properties', ar: 'خصائص' },
        geschmack: { de: 'Geschmack', tr: 'Tat', en: 'Flavor', ar: 'نكهة' },
        filterAktiv: { de: 'Filter aktiv', tr: 'Filtre aktif', en: 'Filter active', ar: 'تصفية نشطة' },
        produkte: { de: 'Produkte', tr: 'Ürün', en: 'Products', ar: 'منتجات' },
        zurucksetzen: { de: 'Zurücksetzen', tr: 'Sıfırla', en: 'Reset', ar: 'إعادة تعيين' },
    };

    const t = (key: keyof typeof translations) => translations[key][locale as keyof typeof translations[typeof key]] || translations[key].de;

    const seciliAnaKategori = kategoriler.find(k => k.slug === seciliKategoriSlug);
    const altKategoriler = seciliAnaKategori
        ? kategoriler.filter(k => k.ust_kategori_id === seciliAnaKategori.id)
        : [];

    const porsiyonSecenekleri = availablePorsiyonlar.map(value => ({
        value: String(value),
        label: value === 1
            ? (locale === 'de' ? '1 Portion' : locale === 'tr' ? '1 Porsiyon' : locale === 'ar' ? '١ حصة' : '1 Portion')
            : (locale === 'de' ? `${value} Portionen` : locale === 'tr' ? `${value} Porsiyon` : locale === 'ar' ? `${value} حصص` : `${value} Portions`)
    }));

    const hacimSecenekleri = availableHacimler.map(value => ({
        value: String(value),
        label: value >= 1000 && value % 1000 === 0 ? `${value / 1000} L` : `${value} ml`,
    }));

    const featureLabelMap: Record<string, string> = {
        vegan: labels.featureOptions?.vegan || (locale === 'de' ? 'Vegan' : locale === 'tr' ? 'Vegan' : locale === 'ar' ? 'نباتي' : 'Vegan'),
        vegetarisch: labels.featureOptions?.vegetarian || (locale === 'de' ? 'Vegetarisch' : locale === 'tr' ? 'Vejetaryen' : locale === 'ar' ? 'نباتي (غير صارم)' : 'Vegetarian'),
        glutenfrei: labels.featureOptions?.glutenFree || (locale === 'de' ? 'Glutenfrei' : locale === 'tr' ? 'Glutensiz' : locale === 'ar' ? 'خالي من الغلوتين' : 'Gluten-free'),
        laktosefrei: labels.featureOptions?.lactoseFree || (locale === 'de' ? 'Laktosefrei' : locale === 'tr' ? 'Laktozsuz' : locale === 'ar' ? 'خالي من اللاكتوز' : 'Lactose-free'),
        bio: labels.featureOptions?.organic || (locale === 'de' ? 'Bio' : locale === 'tr' ? 'Organik' : locale === 'ar' ? 'عضوي' : 'Organic'),
        ohne_zucker: labels.featureOptions?.sugarFree || (locale === 'de' ? 'Ohne Zucker' : locale === 'tr' ? 'Şekersiz' : locale === 'ar' ? 'بدون سكر' : 'Sugar-Free'),
        dogal_icerik: locale === 'de' ? 'Natürliche Zutaten' : locale === 'tr' ? 'Doğal İçerik' : locale === 'ar' ? 'مكونات طبيعية' : 'Natural Ingredients',
        katkisiz: locale === 'de' ? 'Ohne Zusatzstoffe' : locale === 'tr' ? 'Katkısız' : locale === 'ar' ? 'بدون إضافات' : 'No Additives',
        koruyucusuz: locale === 'de' ? 'Ohne Konservierungsstoffe' : locale === 'tr' ? 'Koruyucusuz' : locale === 'ar' ? 'بدون مواد حافظة' : 'Preservative-Free',
        pompa_uyumlu: locale === 'de' ? 'Pumpen-kompatibel' : locale === 'tr' ? 'Pompa Uyumlu' : locale === 'ar' ? 'متوافق مع المضخة' : 'Pump-Compatible',
    };

    const enabledFeatureKeys = seciliUrunGami
        ? PRODUCT_LINE_FEATURES[seciliUrunGami]
        : Array.from(new Set([...PRODUCT_LINE_FEATURES['frozen-desserts'], ...PRODUCT_LINE_FEATURES['barista-bakery-essentials']]));

    const ozellikSecenekleri = enabledFeatureKeys.map(value => ({
        value,
        label: featureLabelMap[value] || value,
    }));

    const baseTastes = ['schokolade', 'kakao', 'erdbeere', 'vanille', 'karamell', 'nuss', 'walnuss', 'badem',
        'hindistancevizi', 'honig', 'tereyag', 'zitrone', 'portakal', 'zeytin', 'frucht',
        'waldfrucht', 'kaffee', 'himbeere', 'brombeere', 'pistazie', 'kirsche', 'yabanmersini', 'havuc', 'yulaf'];
    const tatSecenekleri = baseTastes.map(value => ({
        value,
        label: labels.tasteOptions?.[value] || (value.charAt(0).toUpperCase() + value.slice(1))
    }));

    const applyFilter = () => {
        const params = new URLSearchParams();
        if (seciliUrunGami) params.set('urunGami', seciliUrunGami);
        if (seciliKategoriSlug) params.set('kategori', seciliKategoriSlug);
        if (altKategori) params.set('altKategori', altKategori);
        if (porsiyon) params.set('porsiyon', porsiyon);
        if (hacim) params.set('hacim', hacim);
        if (ozellik) params.set('ozellik', ozellik);
        if (tat) params.set('tat', tat);

        router.push(`${targetPath}?${params.toString()}`);
    };

    const clearFilters = () => {
        setAltKategori('');
        setPorsiyon('');
        setHacim('');
        setOzellik('');
        setTat('');
        const params = new URLSearchParams();
        if (seciliUrunGami) params.set('urunGami', seciliUrunGami);
        if (seciliKategoriSlug) params.set('kategori', seciliKategoriSlug);
        router.push(`${targetPath}?${params.toString()}`);
    };

    useEffect(() => {
        applyFilter();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [altKategori, porsiyon, hacim, ozellik, tat]);

    const activeFilterCount = [altKategori, porsiyon, hacim, ozellik, tat].filter(Boolean).length;

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
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

                <select
                    value={porsiyon}
                    onChange={(e) => setPorsiyon(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-accent focus:border-accent bg-white disabled:bg-gray-50 disabled:text-gray-400"
                    disabled={porsiyonSecenekleri.length === 0}
                >
                    <option value="">{t('portionen')}</option>
                    {porsiyonSecenekleri.map(p => (
                        <option key={p.value} value={p.value}>
                            {p.label}
                        </option>
                    ))}
                </select>

                <select
                    value={hacim}
                    onChange={(e) => setHacim(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-accent focus:border-accent bg-white disabled:bg-gray-50 disabled:text-gray-400"
                    disabled={hacimSecenekleri.length === 0}
                >
                    <option value="">{t('volumen')}</option>
                    {hacimSecenekleri.map(h => (
                        <option key={h.value} value={h.value}>
                            {h.label}
                        </option>
                    ))}
                </select>

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

                <select
                    value={tat}
                    onChange={(e) => setTat(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-accent focus:border-accent bg-white"
                >
                    <option value="">{t('geschmack')}</option>
                    {tatSecenekleri.map(item => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </div>

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
