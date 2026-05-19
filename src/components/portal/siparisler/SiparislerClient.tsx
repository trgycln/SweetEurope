'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FiPackage, FiPlus, FiSearch, FiChevronRight,
         FiAlertCircle, FiClock, FiCheck, FiTruck, FiX,
         FiArrowRight, FiLoader } from 'react-icons/fi';
import { siparisDurumGuncelleAction } from '@/app/actions/siparis-actions';
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
    isAltBayi?: boolean;
    activeTab?: string;
    kendiCount?: number;
    musteriCount?: number;
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

const DURUM_AKISI: Record<string, {
    next: string;
    label: string;
    color: string;
}> = {
    'Beklemede':    { next: 'Hazırlanıyor',  label: 'Hazırla →',   color: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200'       },
    'processing':   { next: 'Hazırlanıyor',  label: 'Hazırla →',   color: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200'       },
    'Hazırlanıyor': { next: 'Yola Çıktı',    label: 'Yola Çıkt →', color: 'bg-violet-100 text-violet-700 hover:bg-violet-200 border-violet-200' },
    'Yola Çıktı':   { next: 'Teslim Edildi', label: 'Teslim Et →', color: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200'    },
};

function HizliDurumButonu({
    siparisId,
    durum,
    onUpdate,
}: {
    siparisId: string;
    durum: string;
    onUpdate: (siparisId: string, yeniDurum: string) => void;
}) {
    const [isPending, startTransition] = useTransition();
    const sonrakiAdim = DURUM_AKISI[durum];

    if (!sonrakiAdim) return null;

    return (
        <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                startTransition(async () => {
                    const result = await siparisDurumGuncelleAction(
                        siparisId,
                        sonrakiAdim.next as any
                    );
                    if (result.success) {
                        onUpdate(siparisId, sonrakiAdim.next);
                    }
                });
            }}
            disabled={isPending}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors flex-shrink-0 ${sonrakiAdim.color} disabled:opacity-50`}
        >
            {isPending
                ? <FiLoader size={11} className="animate-spin" />
                : sonrakiAdim.label
            }
        </button>
    );
}

export function SiparislerClient({
    initialSiparisler, pageCount, currentPage,
    totalCount, locale, isAltBayi, activeTab = 'kendi', kendiCount, musteriCount,
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

    // Anlık durum takibi (liste üzerinde güncelleme için)
    const [durumlar, setDurumlar] = useState<Record<string, string>>(
        Object.fromEntries(initialSiparisler.map(s => [s.id, s.siparis_durumu]))
    );

    const handleDurumUpdate = (siparisId: string, yeniDurum: string) => {
        setDurumlar(prev => ({ ...prev, [siparisId]: yeniDurum }));
    };

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
                {isAltBayi ? (
                    activeTab === 'musteri' ? (
                        <Link
                            href={`/${locale}/portal/musteri-siparis`}
                            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors"
                        >
                            <FiPlus size={14} />
                            {locale === 'de' ? 'Kundenbestellung' : 'Müşteri Adına Sipariş'}
                        </Link>
                    ) : (
                        <Link
                            href={`/${locale}/portal/siparisler/yeni`}
                            className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-bold transition-colors"
                        >
                            <FiPlus size={14} />
                            {locale === 'de' ? 'Bestellung aufgeben' : 'Tedarikçiye Sipariş Ver'}
                        </Link>
                    )
                ) : (
                    <Link
                        href={`/${locale}/portal/siparisler/yeni`}
                        className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                        <FiPlus size={14} />
                        {locale === 'de' ? 'Neue Bestellung' : 'Yeni Sipariş'}
                    </Link>
                )}
            </div>

            {/* Alt bayi tab seçimi */}
            {isAltBayi && (
                <div className="flex gap-2 border-b border-gray-100 pb-0">
                    {[
                        { key: 'kendi', label: locale === 'de' ? 'Meine Bestellungen' : 'Kendi Siparişlerim', count: kendiCount ?? 0 },
                        { key: 'musteri', label: locale === 'de' ? 'Kundenbestellungen' : 'Müşteri Siparişleri', count: musteriCount ?? 0 },
                    ].map(t => (
                        <a
                            key={t.key}
                            href={`?tab=${t.key}`}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                                activeTab === t.key
                                    ? 'border-accent text-accent'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {t.label}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                activeTab === t.key
                                    ? 'bg-accent/10 text-accent'
                                    : 'bg-gray-100 text-gray-500'
                            }`}>
                                {t.count}
                            </span>
                        </a>
                    ))}
                </div>
            )}

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
                    initialSiparisler.map(siparis => {
                        const mevcutDurum = durumlar[siparis.id] ?? siparis.siparis_durumu;
                        return (
                        <Link
                            key={siparis.id}
                            href={`/${locale}/portal/siparisler/${siparis.id}`}
                            className="block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-accent/30 transition-all group"
                        >
                            <div className="flex items-center gap-4 p-4">
                                {/* Sol: Status ikonu */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    STATUS_CONFIG[mevcutDurum]?.bg || 'bg-gray-100'
                                }`}>
                                    <span className={STATUS_CONFIG[mevcutDurum]?.text || 'text-gray-500'}>
                                        {STATUS_CONFIG[mevcutDurum]?.icon || <FiPackage size={16} />}
                                    </span>
                                </div>

                                {/* Orta: Sipariş bilgisi */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="font-mono text-sm font-bold text-gray-800">
                                            #{siparis.id.substring(0, 8).toUpperCase()}
                                        </span>
                                        <StatusChip status={mevcutDurum} locale={locale} />
                                    </div>
                                    {/* Mini progress indicator */}
                                    {(() => {
                                        const steps: Record<string, number> = {
                                            'Beklemede': 1, 'Hazırlanıyor': 2, 'processing': 2,
                                            'Yola Çıktı': 3, 'shipped': 3,
                                            'Teslim Edildi': 4, 'delivered': 4,
                                        };
                                        const step = steps[mevcutDurum] ?? 0;
                                        if (step === 0) return null;
                                        return (
                                            <div className="flex items-center gap-0.5 mt-2">
                                                {[1, 2, 3, 4].map(i => (
                                                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                                                        i <= step
                                                            ? i === 4 ? 'bg-green-500'
                                                                : i === 3 ? 'bg-violet-500'
                                                                : i === 2 ? 'bg-blue-500'
                                                                : 'bg-amber-400'
                                                            : 'bg-gray-100'
                                                    }`} />
                                                ))}
                                            </div>
                                        );
                                    })()}
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {formatDate(siparis.siparis_tarihi, locale)}
                                    </p>
                                    {(siparis as any).firmalar?.unvan && (
                                        <span className="text-[11px] text-gray-400 mt-0.5 block">
                                            📦 {(siparis as any).firmalar.unvan}
                                        </span>
                                    )}
                                </div>

                                {/* Sağ: Tutar + ok */}
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    {/* Hızlı durum güncelleme — sadece alt bayi müşteri siparişlerinde */}
                                    {isAltBayi && activeTab === 'musteri' && (
                                        <HizliDurumButonu
                                            siparisId={siparis.id}
                                            durum={mevcutDurum}
                                            onUpdate={handleDurumUpdate}
                                        />
                                    )}
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
                        );
                    })
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
