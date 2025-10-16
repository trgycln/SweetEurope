// src/components/portal/siparisler/SiparislerClient.tsx (SON VE %100 DOĞRU HALİ)
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FiPackage, FiPlus, FiSearch } from 'react-icons/fi';
import Link from 'next/link';
import { Tables } from '@/lib/supabase/database.types';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { useDebouncedCallback } from 'use-debounce';

type SiparislerClientProps = {
    initialSiparisler: Tables<'siparisler'>[];
    pageCount: number;
    currentPage: number;
    dictionary: Dictionary;
    locale: Locale;
};

const getStatusChipClass = (status: string) => {
    const statusMap: Record<string, string> = { "Beklemede": "bg-gray-100 text-gray-800", "Hazırlanıyor": "bg-blue-100 text-blue-800", "Yola Çıktı": "bg-yellow-100 text-yellow-800", "Teslim Edildi": "bg-green-100 text-green-800", "İptal Edildi": "bg-red-100 text-red-800", "processing": "bg-blue-100 text-blue-800", "shipped": "bg-yellow-100 text-yellow-800", "delivered": "bg-green-100 text-green-800", "cancelled": "bg-red-100 text-red-800", };
    return statusMap[status] || "bg-gray-100 text-gray-800";
};

export function SiparislerClient({ initialSiparisler, pageCount, currentPage, dictionary, locale }: SiparislerClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    // NİHAİ DÜZELTME: `dictionary` nesnesi veya alt özellikleri tanımsız olsa bile
    // sayfanın çökmesini engellemek için güvenlik kontrolleri ekliyoruz.
    const content = (dictionary as any)?.ordersPage || {};
    const statusTranslations = content.statusOptions || {};

    const handleFilterChange = useDebouncedCallback((term: string, name: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', '1');
        if (term) { params.set(name, term); } else { params.delete(name); }
        router.replace(`${pathname}?${params.toString()}`);
    }, 300);

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };
    
    const formatFiyat = (fiyat: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(fiyat);
    const formatDate = (tarih: string) => new Date(tarih).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">{content.title || 'Meine Bestellungen'}</h1>
                    <p className="text-text-main/80 mt-1">{content.subtitle || 'Verfolgen Sie hier alle Ihre Bestellungen.'}</p>
                </div>
                <Link href={`/${locale}/portal/siparisler/yeni`} className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-lg shadow-sm hover:bg-opacity-90 transition-all font-bold text-sm">
                    <FiPlus /> {content.newOrderButton || 'Neue Bestellung'}
                </Link>
            </header>

            <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-grow">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder={content.searchPlaceholder || 'Nach Bestell-ID suchen...'} defaultValue={searchParams.get('q') || ''} onChange={(e) => handleFilterChange(e.target.value, 'q')} className="w-full pl-10 pr-4 py-2 border border-bg-subtle rounded-lg focus:ring-accent focus:border-accent"/>
                </div>
                <select onChange={(e) => handleFilterChange(e.target.value, 'status')} defaultValue={searchParams.get('status') || ''} className="w-full sm:w-auto border border-bg-subtle rounded-lg focus:ring-accent focus:border-accent">
                    <option value="">{content.allStatuses || 'Alle Status'}</option>
                    {/* Object.keys() kullanarak nesne boş olsa bile çökmemesini sağlıyoruz */}
                    {Object.keys(statusTranslations).map((rawStatus) => (
                        <option key={rawStatus} value={rawStatus}>{(statusTranslations as any)[rawStatus]}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-2xl shadow-lg">
                <div className="divide-y divide-bg-subtle">
                    {initialSiparisler.length > 0 ? (
                        initialSiparisler.map(siparis => (
                            <Link key={siparis.id} href={`/${locale}/portal/siparisler/${siparis.id}`} className="block p-4 hover:bg-secondary transition-colors">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-mono text-sm text-accent font-bold">#{siparis.id.substring(0, 8).toUpperCase()}</p>
                                        <p className="text-sm text-gray-500">{formatDate(siparis.siparis_tarihi)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-primary">{formatFiyat(siparis.toplam_tutar_net)}</p>
                                        <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusChipClass(siparis.siparis_durumu)}`}>
                                            {(statusTranslations as any)[siparis.siparis_durumu] || siparis.siparis_durumu}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-4">
                            <FiPackage size={40} className="text-gray-300"/>
                            <span>{searchParams.toString() ? (content.noOrdersForFilter || 'Keine Bestellungen für Ihre Kriterien gefunden.') : (content.noOrders || 'Sie haben noch keine Bestellungen aufgegeben.')}</span>
                        </div>
                    )}
                </div>

                {pageCount > 1 && (
                    <div className="p-4 border-t flex justify-between items-center text-sm text-text-main/80">
                        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} className="px-3 py-1 rounded-md hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed">« {content.previous || 'Zurück'}</button>
                        <span>{content.page || 'Seite'} {currentPage} {content.of || 'von'} {pageCount}</span>
                        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= pageCount} className="px-3 py-1 rounded-md hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed">{content.next || 'Weiter'} »</button>
                    </div>
                )}
            </div>
        </div>
    );
}

