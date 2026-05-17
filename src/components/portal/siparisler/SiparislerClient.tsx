'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FiPackage, FiPlus, FiSearch, FiChevronRight,
         FiAlertCircle, FiClock, FiCheck, FiTruck, FiX } from 'react-icons/fi';
import Link from 'next/link';
import { Tables } from '@/lib/supabase/database.types';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { useDebouncedCallback } from 'use-debounce';

type SiparislerClientProps = {
    initialSiparisler: Tables<'siparisler'>[];
    pageCount: number;
    currentPage: number;
    totalCount: number;
    dictionary: Dictionary;
    locale: Locale;
};

const STATUS_CONFIG: Record<string, {
    label: { de: string; tr: string };
    bg: string;
    text: string;
    icon: React.ReactNode;
}> = {
    'Beklemede':     { label: { de: 'Ausstehend',    tr: 'Beklemede'    }, bg: 'bg-amber-50',   text: 'text-amber-700',  icon: <FiClock size={11} /> },
    'Hazırlanıyor':  { label: { de: 'In Bearbeitung', tr: 'Hazırlanıyor' }, bg: 'bg-blue-50',    text: 'text-blue-700',   icon: <FiPackage size={11} /> },
    'processing':    { label: { de: 'In Bearbeitung', tr: 'İşleniyor'    }, bg: 'bg-blue-50',    text: 'text-blue-700',   icon: <FiPackage size={11} /> },
    'Yola Çıktı':    { label: { de: 'Unterwegs',      tr: 'Yola Çıktı'   }, bg: 'bg-violet-50',  text: 'text-violet-700', icon: <FiTruck size={11} /> },
    'shipped':       { label: { de: 'Unterwegs',      tr: 'Yola Çıktı'   }, bg: 'bg-violet-50',  text: 'text-violet-700', icon: <FiTruck size={11} /> },
    'Teslim Edildi': { label: { de: 'Geliefert',      tr: 'Teslim Edildi'}, bg: 'bg-green-50',   text: 'text-green-700',  icon: <FiCheck size={11} /> },
    'delivered':     { label: { de: 'Geliefert',      tr: 'Teslim Edildi'}, bg: 'bg-green-50',   text: 'text-green-700',  icon: <FiCheck size={11} /> },
    'İptal Edildi':  { label: { de: 'Storniert',      tr: 'İptal Edildi' }, bg: 'bg-red-50',     text: 'text-red-700',    icon: <FiX size={11} /> },
    'cancelled':     { label: { de: 'Storniert',      tr: 'İptal Edildi' }, bg: 'bg-red-50',     text: 'text-red-700',    icon: <FiX size={11} /> },
    'iptal_talep_edildi': { label: { de: 'Storno beantragt', tr: 'İptal Talep' }, bg: 'bg-orange-50', text: 'text-orange-700', icon: <FiAlertCircle size={11} /> },
};

function StatusChip({ status, locale }: { status: string; locale: string }) {
    const cfg = STATUS_CONFIG[status];
    if (!cfg) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">
            {status}
        </span>
    );
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.bg} ${cfg.text}`}>
            {cfg.icon}
            {locale === 'de' ? cfg.label.de : cfg.label.tr}
        </span>
    );
}

function formatFiyat(fiyat: number | null, locale: string) {
    if (!fiyat) return '—';
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'de-DE', {
        style: 'currency', currency: 'EUR'
    }).format(fiyat);
}

function formatDate(tarih: string, locale: string) {
    return new Date(tarih).toLocaleDateString(
        locale === 'tr' ? 'tr-TR' : 'de-DE',
        { day: '2-digit', month: 'short', year: 'numeric' }
    );
}

export function SiparislerClient({
    initialSiparisler, pageCount, currentPage,
    totalCount, dictionary, locale
}: SiparislerClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
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

    const activeFilter = searchParams.get('status') || '';
    const hasFilters = searchParams.has('q') || searchParams.has('status');

    const STATUS_FILTER_OPTIONS = [
        { value: '', label: { de: 'Alle Status', tr: 'Tüm Durumlar' } },
        { value: 'Beklemede', label: { de: 'Ausstehend', tr: 'Beklemede' } },
        { value: 'Hazırlanıyor', label: { de: 'In Bearbeitung', tr: 'Hazırlanıyor' } },
        { value: 'Yola Çıktı', label: { de: 'Unterwegs', tr: 'Yola Çıktı' } },
        { value: 'Teslim Edildi', label: { de: 'Geliefert', tr: 'Teslim Edildi' } },
        { value: 'iptal_talep_edildi', label: { de: 'Storno beantragt', tr: 'İptal Talep' } },
        { value: 'İptal Edildi', label: { de: 'Storniert', tr: 'İptal Edildi' } },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-primary">
                        {locale === 'de' ? 'Meine Bestellungen' : 'Siparişlerim'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {totalCount > 0
                            ? (locale === 'de'
                                ? `${totalCount} Bestellungen insgesamt`
                                : `Toplam ${totalCount} sipariş`)
                            : (locale === 'de'
                                ? 'Noch keine Bestellungen'
                                : 'Henüz sipariş yok')
                        }
                    </p>
                </div>
                <Link
                    href={`/${locale}/portal/katalog`}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl font-bold text-sm hover:bg-accent/90 transition-colors shadow-sm"
                >
                    <FiPlus size={16} />
                    {locale === 'de' ? 'Neue Bestellung' : 'Yeni Sipariş'}
                </Link>
            </div>

            {/* Filtreler */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Arama */}
                    <div className="relative flex-grow">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                        <input
                            type="text"
                            placeholder={locale === 'de' ? 'Nach Bestell-ID suchen...' : 'Sipariş ID ara...'}
                            defaultValue={searchParams.get('q') || ''}
                            onChange={(e) => handleFilterChange(e.target.value, 'q')}
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent/30 focus:border-accent"
                        />
                    </div>

                    {/* Status filtre chip'leri */}
                    <div className="flex flex-wrap gap-2">
                        {STATUS_FILTER_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => handleFilterChange(opt.value, 'status')}
                                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                                    activeFilter === opt.value
                                        ? 'bg-accent text-white border-accent'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                {locale === 'de' ? opt.label.de : opt.label.tr}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sipariş listesi */}
            <div className="space-y-2">
                {initialSiparisler.length > 0 ? (
                    initialSiparisler.map(siparis => (
                        <Link
                            key={siparis.id}
                            href={`/${locale}/portal/siparisler/${siparis.id}`}
                            className="block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-accent/30 transition-all group"
                        >
                            <div className="flex items-center gap-4 p-4">
                                {/* Sol: Status ikonu */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    STATUS_CONFIG[siparis.siparis_durumu]?.bg || 'bg-gray-100'
                                }`}>
                                    <span className={STATUS_CONFIG[siparis.siparis_durumu]?.text || 'text-gray-500'}>
                                        {STATUS_CONFIG[siparis.siparis_durumu]?.icon || <FiPackage size={16} />}
                                    </span>
                                </div>

                                {/* Orta: Sipariş bilgisi */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="font-mono text-sm font-bold text-gray-800">
                                            #{siparis.id.substring(0, 8).toUpperCase()}
                                        </span>
                                        <StatusChip status={siparis.siparis_durumu} locale={locale} />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {formatDate(siparis.siparis_tarihi, locale)}
                                    </p>
                                </div>

                                {/* Sağ: Tutar + ok */}
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <div className="text-right">
                                        <p className="font-bold text-gray-800 text-sm">
                                            {formatFiyat(siparis.toplam_tutar_net, locale)}
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                            {locale === 'de' ? 'Netto' : 'Net'}
                                        </p>
                                    </div>
                                    <FiChevronRight
                                        size={16}
                                        className="text-gray-300 group-hover:text-accent transition-colors"
                                    />
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    /* Boş durum */
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiPackage size={28} className="text-gray-300" />
                        </div>
                        <p className="font-semibold text-gray-600 text-sm">
                            {hasFilters
                                ? (locale === 'de' ? 'Keine Bestellungen gefunden' : 'Sipariş bulunamadı')
                                : (locale === 'de' ? 'Noch keine Bestellungen' : 'Henüz sipariş yok')
                            }
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {hasFilters
                                ? (locale === 'de' ? 'Versuchen Sie andere Filter' : 'Farklı filtreler deneyin')
                                : (locale === 'de' ? 'Entdecken Sie unseren Katalog' : 'Kataloğumuzu keşfedin')
                            }
                        </p>
                        {!hasFilters && (
                            <Link
                                href={`/${locale}/portal/katalog`}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors"
                            >
                                <FiPlus size={14} />
                                {locale === 'de' ? 'Zum Katalog' : 'Kataloga Git'}
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
                <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        ← {locale === 'de' ? 'Zurück' : 'Önceki'}
                    </button>
                    <span className="text-sm text-gray-500">
                        {locale === 'de' ? 'Seite' : 'Sayfa'} <strong>{currentPage}</strong> / {pageCount}
                    </span>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= pageCount}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {locale === 'de' ? 'Weiter' : 'Sonraki'} →
                    </button>
                </div>
            )}
        </div>
    );
}
