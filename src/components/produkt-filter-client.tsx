'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

type Kategori = {
    id: string;
    ad: string;
    ust_kategori_id: string | null;
};

export function ProduktFilterClient({ kategoriler }: { kategoriler: Kategori[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeKategoriId = searchParams.get('kategori');

    const handleFilterChange = (kategoriId: string | null) => {
        const params = new URLSearchParams(window.location.search);
        if (kategoriId) {
            params.set('kategori', kategoriId);
        } else {
            params.delete('kategori');
        }
        router.push(`/produkte?${params.toString()}`);
    };

    // Kategorileri hiyerarşik yapıya dönüştür
    const kategoriHiyerarsisi = useMemo(() => {
        const anaKategoriler = kategoriler.filter(k => !k.ust_kategori_id);
        return anaKategoriler.map(ana => ({
            ...ana,
            altKategoriler: kategoriler.filter(alt => alt.ust_kategori_id === ana.id)
        }));
    }, [kategoriler]);

    return (
        <nav className="flex flex-col space-y-4">
            <button
                onClick={() => handleFilterChange(null)}
                className={`text-left transition-colors font-bold ${!activeKategoriId ? 'text-accent' : 'text-text-main hover:text-accent'}`}
            >
                Alle Produkte
            </button>
            <hr className="border-bg-subtle"/>
            {kategoriHiyerarsisi.map(kategori => (
                <div key={kategori.id}>
                    <button
                        onClick={() => handleFilterChange(kategori.id)}
                        className={`text-left w-full transition-colors font-bold ${activeKategoriId === kategori.id ? 'text-accent' : 'text-text-main hover:text-accent'}`}
                    >
                        {kategori.ad}
                    </button>
                    {kategori.altKategoriler.length > 0 && (
                        <div className="flex flex-col space-y-2 pl-4 pt-2 mt-2 border-l border-bg-subtle">
                            {kategori.altKategoriler.map(altKat => (
                                <button
                                    key={altKat.id}
                                    onClick={() => handleFilterChange(altKat.id)}
                                    className={`text-left transition-colors text-text-main hover:text-accent text-sm ${activeKategoriId === altKat.id ? 'font-bold text-accent' : ''}`}
                                >
                                    {altKat.ad}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </nav>
    );
}