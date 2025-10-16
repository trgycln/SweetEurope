// src/components/portal/siparisler/SiparislerClient.tsx (YENİ DOSYA)
'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FiPackage, FiPlus, FiSearch } from 'react-icons/fi';
import Link from 'next/link';
import { Enums, Tables } from '@/lib/supabase/database.types';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { useDebouncedCallback } from 'use-debounce';

// Gelen propların tipini tanımla
type SiparislerClientProps = {
    initialSiparisler: Tables<'siparisler'>[];
    totalCount: number;
    pageCount: number;
    currentPage: number;
    dictionary: Dictionary;
    locale: Locale;
};

// Sipariş durumuna göre renk döndüren yardımcı fonksiyon
const getStatusChipClass = (status: string) => { /* ... önceki kodla aynı ... */ };

export function SiparislerClient({
    initialSiparisler,
    totalCount,
    pageCount,
    currentPage,
    dictionary,
    locale,
}: SiparislerClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const content = dictionary.portal.ordersPage;

    // Arama ve filtreleme için URL'yi güncelleyen fonksiyon
    const handleFilterChange = useDebouncedCallback((term: string, name: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', '1'); // Filtre değiştiğinde her zaman ilk sayfaya dön
        if (term) {
            params.set(name, term);
        } else {
            params.delete(name);
        }
        router.replace(`${pathname}?${params.toString()}`);
    }, 300); // Kullanıcı yazmayı bitirene kadar 300ms bekle

    // Sayfa değiştirme fonksiyonu
    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };
    
    // Yardımcı fonksiyonlar
    const formatFiyat = (fiyat: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(fiyat);
    const formatDate = (tarih: string) => new Date(tarih).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });

    // Sipariş durumları (veritabanı tiplerinden alınabilir)
    const siparisDurumlari: Enums<'siparis_durumu'>[] = ["Beklemede", "Hazırlanıyor", "Yola Çıktı", "Teslim Edildi", "İptal Edildi"];

    return (
        <div className="space-y-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">{content.title}</h1>
                    <p className="text-text-main/80 mt-1">{content.subtitle}</p>
                </div>
                <Link href={`/${locale}/portal/siparisler/yeni`} className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-lg shadow-sm hover:bg-opacity-90 transition-all font-bold text-sm">
                    <FiPlus /> {content.newOrderButton}
                </Link>
            </header>

            {/* Filtreleme ve Arama Çubuğu */}
            <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={content.searchPlaceholder}
                        defaultValue={searchParams.get('q') || ''}
                        onChange={(e) => handleFilterChange(e.target.value, 'q')}
                        className="w-full pl-10 pr-4 py-2 border border-bg-subtle rounded-lg focus:ring-accent focus:border-accent"
                    />
                </div>
                <select
                    onChange={(e) => handleFilterChange(e.target.value, 'status')}
                    defaultValue={searchParams.get('status') || ''}
                    className="border border-bg-subtle rounded-lg focus:ring-accent focus:border-accent"
                >
                    <option value="">{content.allStatuses}</option>
                    {siparisDurumlari.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>

            {/* Sipariş Listesi ve Sayfalama */}
            <div className="bg-white rounded-2xl shadow-lg">
                <div className="divide-y divide-bg-subtle">
                    {initialSiparisler.length > 0 ? (
                        initialSiparisler.map(siparis => (
                           // ... Link ve sipariş listeleme kodu öncekiyle aynı ...
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-4">
                            <FiPackage size={40} className="text-gray-300"/>
                            <span>{searchParams.toString() ? content.noOrdersForFilter : content.noOrders}</span>
                        </div>
                    )}
                </div>

                {/* Sayfalama Kontrolleri */}
                {pageCount > 1 && (
                    <div className="p-4 border-t flex justify-between items-center text-sm">
                        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} className="disabled:opacity-50">« {content.previous}</button>
                        <span>{content.page} {currentPage} {content.of} {pageCount}</span>
                        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= pageCount} className="disabled:opacity-50">{content.next} »</button>
                    </div>
                )}
            </div>
        </div>
    );
}