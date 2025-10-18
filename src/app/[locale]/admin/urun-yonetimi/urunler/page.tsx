// src/app/[locale]/admin/urun-yonetimi/urunler/page.tsx (Korrigiert)

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Tables } from '@/lib/supabase/database.types';
import { FiPlus, FiArchive } from 'react-icons/fi';

export const dynamic = 'force-dynamic'; // Stellt sicher, dass die Seite immer aktuell ist

// Typdefinition (unverändert)
type UrunWithKategori = Tables<'urunler'> & {
    kategoriler: {
        ad: { [key: string]: string } | null;
    } | null;
};

// Stok Durum Göstergesi Komponente (unverändert)
const StokDurumGostergesi = ({ miktar, esik }: { miktar: number | null; esik: number | null }) => {
    const mevcutMiktar = miktar || 0;
    const uyariEsigi = esik || 0;
    let durum = { text: 'Yeterli', color: 'bg-green-100 text-green-800' };
    if (mevcutMiktar <= 0) {
        durum = { text: 'Tükendi', color: 'bg-red-100 text-red-800' };
    } else if (mevcutMiktar <= uyariEsigi) {
        durum = { text: 'Azaldı', color: 'bg-yellow-100 text-yellow-800' };
    }
    return (
        <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800">{mevcutMiktar}</span>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold leading-5 rounded-full ${durum.color}`}>
                {durum.text}
            </span>
        </div>
    );
};

// Hauptseitenkomponente
export default async function UrunlerListPage({ params }: { params: { locale: string } }) { // params hinzugefügt
    const supabase = createSupabaseServerClient();
    const locale = params.locale; // KORREKTUR: Locale aus params holen

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect(`/${locale}/login`); // Locale zur Weiterleitung hinzufügen
    }

    const { data: urunler, error } = await supabase
        .from('urunler')
        .select(`
            id,
            ad,
            stok_kodu,
            stok_miktari,
            stok_esigi,
            satis_fiyati_musteri,
            aktif,
            kategoriler ( ad )
        `)
        .order(`ad->>${locale}`, { ascending: true }); // Locale in der Sortierung verwenden

    if (error) {
        console.error("Ürünler çekilirken hata:", error);
        return <div className="p-6 text-red-500">Ürün listesi yüklenirken bir hata oluştu.</div>;
    }

    const urunListesi: UrunWithKategori[] = urunler as any;

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">Produktverwaltung</h1> {/* Text anpassen */}
                    <p className="text-text-main/80 mt-1">{urunListesi.length} Produkte aufgelistet.</p> {/* Text anpassen */}
                </div>
                {/* KORREKTUR: Link zum korrekten Pfad */}
                <Link href={`/${locale}/admin/urun-yonetimi/urunler/yeni`} passHref>
                    <button className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto">
                        <FiPlus size={18} />
                        Neues Produkt hinzufügen {/* Text anpassen */}
                    </button>
                </Link>
            </header>

            {urunListesi.length === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-gray-200 rounded-lg bg-white shadow-sm">
                    <FiArchive className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">Noch keine Produkte hinzugefügt</h2> {/* Text anpassen */}
                    <p className="mt-2 text-text-main/70">Verwenden Sie die Schaltfläche "Neues Produkt hinzufügen", um zu beginnen.</p> {/* Text anpassen */}
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {/* KORREKTUR: Spaltennamen anpassen */}
                                {['Produktname', 'Artikelnummer', 'Kategorie', 'Lagerbestand', 'Preis (Kunde)', 'Status'].map(header => (
                                    <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        {header}
                                    </th>
                                ))}
                                {/* KORREKTUR: Spalte für Bearbeiten-Link hinzufügen */}
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Bearbeiten</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {urunListesi.map((urun) => (
                                <tr key={urun.id} className="hover:bg-gray-50 transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                                         {/* KORREKTUR: Link zum korrekten Pfad ([urunId] oder edit) */}
                                         {/* Annahme: Bearbeiten ist in [urunId] */}
                                        <Link href={`/${locale}/admin/urun-yonetimi/urunler/${urun.id}`} className="hover:underline hover:text-accent transition-colors">
                                            {urun.ad?.[locale] || 'Unbenanntes Produkt'}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                        {urun.stok_kodu || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {urun.kategoriler?.ad?.[locale] || 'Ohne Kategorie'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        <StokDurumGostergesi miktar={urun.stok_miktari} esik={urun.stok_esigi} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                         {/* KORREKTUR: Preisformat anpassen (EUR) */}
                                        {urun.satis_fiyati_musteri?.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex px-3 py-1 text-xs font-semibold leading-5 rounded-full ${
                                            urun.aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {urun.aktif ? 'Aktiv' : 'Inaktiv'} {/* Text anpassen */}
                                        </span>
                                    </td>
                                    {/* KORREKTUR: Zelle für Bearbeiten-Link */}
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link href={`/${locale}/admin/urun-yonetimi/urunler/${urun.id}`} className="text-accent hover:text-accent-dark">
                                            Bearbeiten {/* Text anpassen */}
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}