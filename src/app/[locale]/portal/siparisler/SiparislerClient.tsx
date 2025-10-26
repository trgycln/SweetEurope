'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FiPackage, FiPlus, FiSearch } from 'react-icons/fi';
import Link from 'next/link';
import { Tables } from '@/lib/supabase/database.types';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { useDebouncedCallback } from 'use-debounce';

type SiparislerClientProps = {
    initialSiparisler: Pick<Tables<'siparisler'>, 'id' | 'siparis_tarihi' | 'toplam_tutar_net' | 'siparis_durumu'>[];
    totalCount: number;
    pageCount: number;
    currentPage: number;
    dictionary: Dictionary;
    locale: Locale;
};

const getStatusChipClass = (status: string) => {
    const statusMap: Record<string, string> = { "Beklemede": "bg-gray-100 text-gray-800", "Hazırlanıyor": "bg-blue-100 text-blue-800", "Yola Çıktı": "bg-yellow-100 text-yellow-800", "Teslim Edildi": "bg-green-100 text-green-800", "İptal Edildi": "bg-red-100 text-red-800", "processing": "bg-blue-100 text-blue-800", /* Fügen Sie hier ggf. englische Pendants hinzu, falls gemischt */ };
    return statusMap[status] || "bg-gray-100 text-gray-800";
};

export function SiparislerClient({ initialSiparisler, totalCount, pageCount, currentPage, dictionary, locale }: SiparislerClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const content = (dictionary as any)?.portal?.ordersPage || {};
    // Sicherer Zugriff auf Status-Übersetzungen
    const statusTranslations = content.statusOptions || {};
    // Definieren Sie die möglichen DB-Werte HIER, damit sie immer verfügbar sind
    const dbStatuses = ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'Teslim Edildi', 'İptal Edildi', 'processing']; // Fügen Sie alle relevanten DB-Werte hinzu

    const handleFilterChange = useDebouncedCallback((term: string, name: 'q' | 'status') => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', '1');
        if (term) {
            params.set(name, term);
        } else {
            params.delete(name);
        }
        if (name === 'status' && term) {
            params.delete('filter');
        }
        router.replace(`${pathname}?${params.toString()}`);
    }, 300);

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const formatFiyat = (fiyat: number | null | undefined) => {
         if (fiyat === null || fiyat === undefined) return '-';
         return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'de-DE', { style: 'currency', currency: 'EUR' }).format(fiyat);
    }
    const formatDate = (tarih: string | null | undefined) => {
        if (!tarih) return '-';
        try { // Fehler abfangen, falls Datum ungültig
             return new Date(tarih).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
        } catch { return '-'; }
    }

    const currentStatusFilter = searchParams.get('status') || '';
    const currentQueryFilter = searchParams.get('q') || '';
    const isOpenFilterActive = searchParams.get('filter') === 'offen';

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

            {/* Filterleiste */}
            <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-col sm:flex-row gap-4 border border-gray-200">
                <div className="relative flex-grow">
                     <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                     <input
                         type="text"
                         placeholder={content.searchPlaceholder || 'Nach Bestell-ID suchen...'}
                         defaultValue={currentQueryFilter}
                         onChange={(e) => handleFilterChange(e.target.value, 'q')}
                         className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-accent focus:border-accent shadow-sm"
                     />
                </div>
                {/* ++ KORRIGIERTES STATUS-DROPDOWN ++ */}
                <select
                    onChange={(e) => handleFilterChange(e.target.value, 'status')}
                    value={isOpenFilterActive ? '' : currentStatusFilter}
                    disabled={isOpenFilterActive}
                    className={`w-full sm:w-auto border rounded-lg focus:ring-accent focus:border-accent shadow-sm ${isOpenFilterActive ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300 bg-white'}`}
                    title={isOpenFilterActive ? 'Filter "Offene Bestellungen" ist aktiv' : ''}
                >
                    <option value="">{content.allStatuses || 'Alle Status'}</option>
                    {/* Iteriere über die definierten DB-Statuswerte */}
                    {dbStatuses.map((dbStatus) => (
                        <option key={dbStatus} value={dbStatus}>
                            {/* Zeige die Übersetzung an, falls vorhanden, sonst den DB-Wert */}
                            {statusTranslations[dbStatus] || dbStatus}
                        </option>
                    ))}
                </select>
                {isOpenFilterActive && (
                   <button
                       onClick={() => router.replace(pathname)} // Nur den Pathname ohne Query-Parameter verwenden
                       className="text-xs text-red-600 hover:underline flex-shrink-0"
                       title="Filter 'Offene Bestellungen' entfernen"
                   >
                       Filter löschen
                   </button>
                )}
            </div>

            {/* Bestellliste */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
                 <div className="divide-y divide-gray-200">
                     {initialSiparisler.length > 0 ? (
                         initialSiparisler.map(siparis => (
                             <Link key={siparis.id} href={`/${locale}/portal/siparisler/${siparis.id}`} className="block p-4 hover:bg-secondary transition-colors">
                                 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                     <div>
                                         <p className="font-mono text-sm text-accent font-bold">#{siparis.id.substring(0, 8).toUpperCase()}</p>
                                         <p className="text-sm text-gray-500">{formatDate(siparis.siparis_tarihi)}</p>
                                     </div>
                                     <div className="flex items-center gap-4 sm:text-right">
                                         <p className="font-bold text-primary text-base">{formatFiyat(siparis.toplam_tutar_net)}</p>
                                         <span className={`flex-shrink-0 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusChipClass(siparis.siparis_durumu)}`}>
                                             {statusTranslations[siparis.siparis_durumu] || siparis.siparis_durumu}
                                         </span>
                                     </div>
                                 </div>
                             </Link>
                         ))
                     ) : (
                         <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-4">
                             <FiPackage size={40} className="text-gray-300"/>
                             <span>
                                 {searchParams.toString()
                                  ? (content.noOrdersForFilter || 'Keine Bestellungen für Ihre Kriterien gefunden.')
                                  : (content.noOrders || 'Sie haben noch keine Bestellungen aufgegeben.')
                                 }
                              </span>
                         </div>
                     )}
                 </div>

                 {/* Paginierung */}
                 {pageCount > 1 && (
                     <div className="p-4 border-t border-gray-200 flex justify-between items-center text-sm text-text-main/80">
                         <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} className="px-3 py-1 rounded-md hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed">« {content.previous || 'Zurück'}</button>
                         <span>{content.page || 'Seite'} {currentPage} {content.of || 'von'} {pageCount}</span>
                         <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= pageCount} className="px-3 py-1 rounded-md hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed">{content.next || 'Weiter'} »</button>
                     </div>
                 )}
            </div>
        </div>
    );
}

