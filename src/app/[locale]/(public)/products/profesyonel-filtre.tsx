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
}

export default function ProfesyonelFiltre({ kategoriler, locale, seciliKategoriSlug, totalCount }: ProfesyonelFiltreProps) {
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

    // Porsiyon seçenekleri (dilim sayıları)
    const porsiyonSecenekleri = [
        { value: '4', label: '4 Portionen' },
        { value: '6', label: '6 Portionen' },
        { value: '8', label: '8 Portionen' },
        { value: '10', label: '10 Portionen' },
        { value: '12', label: '12 Portionen' },
        { value: '14', label: '14 Portionen' },
        { value: '16', label: '16 Portionen' },
        { value: '18', label: '18 Portionen' },
        { value: '20', label: '20 Portionen' },
    ];

    // Özellik seçenekleri (Admin ile senkronize - 4 dil desteği)
    const ozellikSecenekleri = [
        { value: 'vegan', label: locale === 'de' ? 'Vegan' : locale === 'tr' ? 'Vegan' : locale === 'ar' ? 'نباتي' : 'Vegan' },
        { value: 'vegetarisch', label: locale === 'de' ? 'Vegetarisch' : locale === 'tr' ? 'Vejetaryen' : locale === 'ar' ? 'نباتي (غير صارم)' : 'Vegetarian' },
        { value: 'glutenfrei', label: locale === 'de' ? 'Glutenfrei' : locale === 'tr' ? 'Glutensiz' : locale === 'ar' ? 'خالي من الغلوتين' : 'Gluten-free' },
        { value: 'laktosefrei', label: locale === 'de' ? 'Laktosefrei' : locale === 'tr' ? 'Laktozsuz' : locale === 'ar' ? 'خالي من اللاكتوز' : 'Lactose-free' },
        { value: 'bio', label: locale === 'de' ? 'Bio' : locale === 'tr' ? 'Organik' : locale === 'ar' ? 'عضوي' : 'Organic' },
    ];

    // Tat seçenekleri (Admin ile senkronize - sadece standart değerler)
    const tatSecenekleri = [
        { value: 'schokolade', label: locale === 'de' ? 'Schokolade' : locale === 'tr' ? 'Çikolata' : locale === 'ar' ? 'شوكولاتة' : 'Chocolate' },
        { value: 'kakao', label: locale === 'de' ? 'Kakao' : locale === 'tr' ? 'Kakao' : locale === 'ar' ? 'كاكاو' : 'Cocoa' },
        { value: 'erdbeere', label: locale === 'de' ? 'Erdbeere' : locale === 'tr' ? 'Çilek' : locale === 'ar' ? 'فراولة' : 'Strawberry' },
        { value: 'vanille', label: locale === 'de' ? 'Vanille' : locale === 'tr' ? 'Vanilya' : locale === 'ar' ? 'فانيليا' : 'Vanilla' },
        { value: 'karamell', label: locale === 'de' ? 'Karamell' : locale === 'tr' ? 'Karamel' : locale === 'ar' ? 'كراميل' : 'Caramel' },
        { value: 'nuss', label: locale === 'de' ? 'Nuss' : locale === 'tr' ? 'Fındık' : locale === 'ar' ? 'بندق' : 'Hazelnut' },
        { value: 'walnuss', label: locale === 'de' ? 'Walnuss' : locale === 'tr' ? 'Ceviz' : locale === 'ar' ? 'جوز' : 'Walnut' },
        { value: 'badem', label: locale === 'de' ? 'Mandel' : locale === 'tr' ? 'Badem' : locale === 'ar' ? 'لوز' : 'Almond' },
        { value: 'hindistancevizi', label: locale === 'de' ? 'Kokosnuss' : locale === 'tr' ? 'Hindistan Cevizi' : locale === 'ar' ? 'جوز الهند' : 'Coconut' },
        { value: 'honig', label: locale === 'de' ? 'Honig' : locale === 'tr' ? 'Bal' : locale === 'ar' ? 'عسل' : 'Honey' },
        { value: 'tereyag', label: locale === 'de' ? 'Butter' : locale === 'tr' ? 'Tereyağ' : locale === 'ar' ? 'زبدة' : 'Butter' },
        { value: 'zitrone', label: locale === 'de' ? 'Zitrone' : locale === 'tr' ? 'Limon' : locale === 'ar' ? 'ليمون' : 'Lemon' },
        { value: 'portakal', label: locale === 'de' ? 'Orange' : locale === 'tr' ? 'Portakal' : locale === 'ar' ? 'برتقال' : 'Orange' },
        { value: 'zeytin', label: locale === 'de' ? 'Olive' : locale === 'tr' ? 'Zeytin' : locale === 'ar' ? 'زيتون' : 'Olive' },
        { value: 'frucht', label: locale === 'de' ? 'Frucht' : locale === 'tr' ? 'Meyve' : locale === 'ar' ? 'فاكهة' : 'Fruit' },
        { value: 'waldfrucht', label: locale === 'de' ? 'Waldfrucht' : locale === 'tr' ? 'Orman Meyveli' : locale === 'ar' ? 'فاكهة الغابة' : 'Forest Fruit' },
        { value: 'kaffee', label: locale === 'de' ? 'Kaffee' : locale === 'tr' ? 'Kahve' : locale === 'ar' ? 'قهوة' : 'Coffee' },
        { value: 'himbeere', label: locale === 'de' ? 'Himbeere' : locale === 'tr' ? 'Frambuaz' : locale === 'ar' ? 'توت العليق' : 'Raspberry' },
        { value: 'pistazie', label: locale === 'de' ? 'Pistazie' : locale === 'tr' ? 'Fıstık' : locale === 'ar' ? 'فستق' : 'Pistachio' },
        { value: 'kirsche', label: locale === 'de' ? 'Kirsche' : locale === 'tr' ? 'Kiraz' : locale === 'ar' ? 'كرز' : 'Cherry' },
        { value: 'yabanmersini', label: locale === 'de' ? 'Heidelbeere' : locale === 'tr' ? 'Yaban Mersini' : locale === 'ar' ? 'توت أزرق' : 'Blueberry' },
        { value: 'havuc', label: locale === 'de' ? 'Karotte' : locale === 'tr' ? 'Havuç' : locale === 'ar' ? 'جزر' : 'Carrot' },
        { value: 'yulaf', label: locale === 'de' ? 'Hafer' : locale === 'tr' ? 'Yulaf' : locale === 'ar' ? 'شوفان' : 'Oat' },
    ];

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
