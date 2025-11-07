'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Kategori {
    id: string;
    ad: any;
    ust_kategori_id?: string | null;
}

interface ProfesyonelFiltreProps {
    kategoriler: Kategori[];
    locale: string;
}

export default function ProfesyonelFiltre({ kategoriler, locale }: ProfesyonelFiltreProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [kategori, setKategori] = useState(searchParams?.get('kategori') || '');
    const [porsiyon, setPorsiyon] = useState(searchParams?.get('porsiyon') || '');
    const [ozellik, setOzellik] = useState(searchParams?.get('ozellik') || '');
    const [tat, setTat] = useState(searchParams?.get('tat') || '');
    const [arama, setArama] = useState(searchParams?.get('q') || '');

    // Porsiyon seçenekleri (dilim sayıları)
    const porsiyonSecenekleri = [
        { value: '4', label: '4 Portionen' },
        { value: '6', label: '6 Portionen' },
        { value: '8', label: '8 Portionen' },
        { value: '10', label: '10 Portionen' },
        { value: '12', label: '12 Portionen' },
        { value: '14', label: '14 Portionen' },
        { value: '16', label: '16 Portionen' },
    ];

    // Özellik seçenekleri
    const ozellikSecenekleri = [
        { value: 'vegan', label: 'Vegan' },
        { value: 'vegetarisch', label: 'Vegetarisch' },
        { value: 'glutenfrei', label: 'Glutenfrei' },
        { value: 'laktosefrei', label: 'Laktosefrei' },
        { value: 'bio', label: 'Bio' },
        { value: 'ohne_zucker', label: 'Ohne Zucker' },
    ];

    // Tat seçenekleri
    const tatSecenekleri = [
        { value: 'schokolade', label: 'Schokolade' },
        { value: 'vanille', label: 'Vanille' },
        { value: 'erdbeere', label: 'Erdbeere' },
        { value: 'himbeere', label: 'Himbeere' },
        { value: 'zitrone', label: 'Zitrone' },
        { value: 'portakal', label: 'Orange' },
        { value: 'karamell', label: 'Karamell' },
        { value: 'nuss', label: 'Nuss' },
        { value: 'frucht', label: 'Frucht' },
        { value: 'kaffee', label: 'Kaffee' },
    ];

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
                    placeholder="Produktname oder SKU suchen..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
            </div>

            {/* Filtre Dropdowns - 4'lü Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Kategorie */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kategorie
                    </label>
                    <select
                        value={kategori}
                        onChange={(e) => setKategori(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                        <option value="">Alle Kategorien</option>
                        {kategoriler
                            .filter(k => !k.ust_kategori_id)
                            .map(k => (
                                <option key={k.id} value={k.id}>
                                    {k.ad?.de || k.ad?.tr || 'Unnamed'}
                                </option>
                            ))}
                    </select>
                </div>

                {/* Portionen */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Portionen
                    </label>
                    <select
                        value={porsiyon}
                        onChange={(e) => setPorsiyon(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                        <option value="">Alle Portionen</option>
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
                        Zusatzeigenschaften
                    </label>
                    <select
                        value={ozellik}
                        onChange={(e) => setOzellik(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                        <option value="">Alle Eigenschaften</option>
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
                        Geschmack
                    </label>
                    <select
                        value={tat}
                        onChange={(e) => setTat(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                        <option value="">Alle Geschmäcker</option>
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
                        Filter anwenden
                    </button>
                    
                    {activeFilterCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                            Zurücksetzen
                        </button>
                    )}
                </div>

                {/* Aktif Filtre Badge */}
                {activeFilterCount > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                            {activeFilterCount} {activeFilterCount === 1 ? 'Filter aktiv' : 'Filter aktiv'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
