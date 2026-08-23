'use client';

import { useState, useTransition, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { 
    FiPackage, FiPlus, FiSearch, FiChevronRight,
    FiAlertCircle, FiClock, FiCheck, FiTruck, FiX,
    FiArrowRight, FiLoader, FiRepeat, FiCopy,
    FiCalendar, FiMapPin, FiTrendingUp, FiShoppingBag,
    FiCheckCircle, FiExternalLink, FiInfo
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { siparisDurumGuncelleAction } from '@/app/actions/siparis-actions';
import Link from 'next/link';
import Image from 'next/image';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { useDebouncedCallback } from 'use-debounce';
import { usePortal } from '@/contexts/PortalContext';
import { toast } from 'sonner';

type SiparisItem = {
    id: string;
    siparis_tarihi: string;
    toplam_tutar_net: number | null;
    toplam_tutar_brut: number | null;
    kdv_orani?: number | null;
    siparis_durumu: string;
    teslimat_adresi?: string | null;
    notlar?: string | null;
    firmalar?: { unvan: string } | null;
    siparis_detay?: Array<{
        id: string;
        urun_id: string;
        miktar: number;
        birim_fiyat: number;
        toplam_fiyat: number;
        urunler?: {
            id: string;
            ad: any;
            stok_kodu?: string | null;
            ana_resim_url?: string | null;
            satis_fiyati_musteri?: number | null;
            stok_miktari?: number | null;
            koli_ici_adet?: number | null;
        } | null;
    }> | null;
};

type SiparislerClientProps = {
    initialSiparisler: SiparisItem[];
    pageCount: number;
    currentPage: number;
    totalCount: number;
    dictionary: Dictionary;
    locale: Locale;
    isAltBayi?: boolean;
    activeTab?: string;
    kendiCount?: number;
    musteriCount?: number;
    stats?: {
        totalOrders: number;
        activeOrders: number;
        shippedOrders: number;
        deliveredOrders: number;
        monthSpending: number;
    };
};

const STATUS_CONFIG: Record<string, {
    label: { de: string; tr: string; en: string };
    bg: string;
    text: string;
    border: string;
    dotBg: string;
    stepIndex: number;
    icon: React.ReactNode;
}> = {
    'Beklemede': {
        label: { de: 'Ausstehend', tr: 'Onay Bekliyor', en: 'Pending' },
        bg: 'bg-amber-500/10',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-500/20',
        dotBg: 'bg-amber-500',
        stepIndex: 1,
        icon: <FiClock size={13} />
    },
    'Hazırlanıyor': {
        label: { de: 'In Bearbeitung', tr: 'Hazırlanıyor', en: 'Processing' },
        bg: 'bg-sky-500/10',
        text: 'text-sky-700 dark:text-sky-400',
        border: 'border-sky-500/20',
        dotBg: 'bg-sky-500',
        stepIndex: 2,
        icon: <FiPackage size={13} />
    },
    'processing': {
        label: { de: 'In Bearbeitung', tr: 'Hazırlanıyor', en: 'Processing' },
        bg: 'bg-sky-500/10',
        text: 'text-sky-700 dark:text-sky-400',
        border: 'border-sky-500/20',
        dotBg: 'bg-sky-500',
        stepIndex: 2,
        icon: <FiPackage size={13} />
    },
    'Yola Çıktı': {
        label: { de: 'Unterwegs', tr: 'Yolda / Dağıtımda', en: 'In Transit' },
        bg: 'bg-indigo-500/10',
        text: 'text-indigo-700 dark:text-indigo-400',
        border: 'border-indigo-500/20',
        dotBg: 'bg-indigo-500',
        stepIndex: 3,
        icon: <FiTruck size={13} />
    },
    'shipped': {
        label: { de: 'Unterwegs', tr: 'Yolda / Dağıtımda', en: 'In Transit' },
        bg: 'bg-indigo-500/10',
        text: 'text-indigo-700 dark:text-indigo-400',
        border: 'border-indigo-500/20',
        dotBg: 'bg-indigo-500',
        stepIndex: 3,
        icon: <FiTruck size={13} />
    },
    'Teslim Edildi': {
        label: { de: 'Geliefert', tr: 'Teslim Edildi', en: 'Delivered' },
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-500/20',
        dotBg: 'bg-emerald-500',
        stepIndex: 4,
        icon: <FiCheck size={13} />
    },
    'delivered': {
        label: { de: 'Geliefert', tr: 'Teslim Edildi', en: 'Delivered' },
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-500/20',
        dotBg: 'bg-emerald-500',
        stepIndex: 4,
        icon: <FiCheck size={13} />
    },
    'İptal Edildi': {
        label: { de: 'Storniert', tr: 'İptal Edildi', en: 'Cancelled' },
        bg: 'bg-rose-500/10',
        text: 'text-rose-700 dark:text-rose-400',
        border: 'border-rose-500/20',
        dotBg: 'bg-rose-500',
        stepIndex: 0,
        icon: <FiX size={13} />
    },
    'cancelled': {
        label: { de: 'Storniert', tr: 'İptal Edildi', en: 'Cancelled' },
        bg: 'bg-rose-500/10',
        text: 'text-rose-700 dark:text-rose-400',
        border: 'border-rose-500/20',
        dotBg: 'bg-rose-500',
        stepIndex: 0,
        icon: <FiX size={13} />
    },
    'iptal_talep_edildi': {
        label: { de: 'Storno beantragt', tr: 'İptal Talebi', en: 'Cancellation Requested' },
        bg: 'bg-orange-500/10',
        text: 'text-orange-700 dark:text-orange-400',
        border: 'border-orange-500/20',
        dotBg: 'bg-orange-500',
        stepIndex: 0,
        icon: <FiAlertCircle size={13} />
    },
};

function getUrunAdi(ad: any, locale: string): string {
    if (!ad) return 'Ürün';
    if (typeof ad === 'string') return ad;
    return ad[locale] || ad['de'] || ad['tr'] || ad['en'] || 'Ürün';
}

function formatFiyat(fiyat: number | null | undefined, locale: string) {
    if (fiyat === null || fiyat === undefined) return '—';
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'de-DE', {
        style: 'currency',
        currency: 'EUR',
    }).format(fiyat);
}

function formatDate(tarih: string, locale: string) {
    if (!tarih) return '—';
    return new Date(tarih).toLocaleDateString(
        locale === 'tr' ? 'tr-TR' : 'de-DE',
        { day: '2-digit', month: 'short', year: 'numeric' }
    );
}

function formatRelativeTime(tarih: string, locale: string) {
    if (!tarih) return '';
    const diff = Date.now() - new Date(tarih).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return locale === 'de' ? 'Heute' : locale === 'tr' ? 'Bugün' : 'Today';
    if (days === 1) return locale === 'de' ? 'Gestern' : locale === 'tr' ? 'Dün' : 'Yesterday';
    if (days < 30) return locale === 'de' ? `vor ${days} Tagen` : locale === 'tr' ? `${days} gün önce` : `${days} days ago`;
    return '';
}

function StatusChip({ status, locale }: { status: string; locale: string }) {
    const cfg = STATUS_CONFIG[status];
    if (!cfg) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                {status}
            </span>
        );
    }
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-sm ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotBg} animate-pulse`} />
            {cfg.icon}
            {locale === 'de' ? cfg.label.de : locale === 'tr' ? cfg.label.tr : cfg.label.en}
        </span>
    );
}

function OrderTimeline({ status, locale }: { status: string; locale: string }) {
    const cfg = STATUS_CONFIG[status];
    const currentStep = cfg ? cfg.stepIndex : 0;
    const isCancelled = status === 'İptal Edildi' || status === 'cancelled' || status === 'iptal_talep_edildi';

    if (isCancelled) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50/70 border border-rose-200/60 text-xs font-medium text-rose-700">
                <FiAlertCircle className="text-rose-500 flex-shrink-0" size={15} />
                <span>
                    {locale === 'de'
                        ? 'Diese Bestellung wurde storniert.'
                        : 'Bu sipariş iptal edilmiştir.'}
                </span>
            </div>
        );
    }

    const steps = [
        { id: 1, label: { de: 'Eingegangen', tr: 'Alındı', en: 'Received' } },
        { id: 2, label: { de: 'Bearbeitung', tr: 'Hazırlanıyor', en: 'Processing' } },
        { id: 3, label: { de: 'Unterwegs', tr: 'Yolda', en: 'In Transit' } },
        { id: 4, label: { de: 'Geliefert', tr: 'Teslim Edildi', en: 'Delivered' } },
    ];

    return (
        <div className="w-full py-1">
            <div className="relative flex items-center justify-between">
                {/* Connecting Line Background */}
                <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-1 bg-slate-100 rounded-full z-0" />
                
                {/* Active Filled Progress Line */}
                <div 
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-amber-500 via-sky-500 to-emerald-500 rounded-full z-0 transition-all duration-700"
                    style={{
                        width: currentStep >= 4 ? 'calc(100% - 24px)' :
                               currentStep === 3 ? 'calc(66% - 16px)' :
                               currentStep === 2 ? 'calc(33% - 8px)' : '0%'
                    }}
                />

                {steps.map((step) => {
                    const isDone = currentStep > step.id || (currentStep === 4 && step.id === 4);
                    const isCurrent = currentStep === step.id;
                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center group">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                                isDone
                                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 shadow-sm'
                                    : isCurrent
                                    ? 'bg-sky-600 text-white ring-4 ring-sky-100 shadow-md scale-110'
                                    : 'bg-white text-slate-400 border-2 border-slate-200'
                            }`}>
                                {isDone ? <FiCheck size={11} className="stroke-[3]" /> : step.id}
                            </div>
                            <span className={`text-[11px] mt-1.5 font-medium whitespace-nowrap hidden sm:block ${
                                isCurrent ? 'text-sky-700 font-bold' : isDone ? 'text-emerald-700' : 'text-slate-400'
                            }`}>
                                {locale === 'de' ? step.label.de : locale === 'tr' ? step.label.tr : step.label.en}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const DURUM_AKISI: Record<string, { next: string; label: string; color: string }> = {
    'Beklemede': { next: 'Hazırlanıyor', label: 'Hazırla →', color: 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200' },
    'processing': { next: 'Hazırlanıyor', label: 'Hazırla →', color: 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200' },
    'Hazırlanıyor': { next: 'Yola Çıktı', label: 'Yola Çıkt →', color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200' },
    'Yola Çıktı': { next: 'Teslim Edildi', label: 'Teslim Et →', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200' },
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
                        toast.success('Sipariş durumu güncellendi');
                    }
                });
            }}
            disabled={isPending}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex-shrink-0 shadow-sm ${sonrakiAdim.color} disabled:opacity-50`}
        >
            {isPending ? <FiLoader size={12} className="animate-spin" /> : sonrakiAdim.label}
        </button>
    );
}

export function SiparislerClient({
    initialSiparisler,
    pageCount,
    currentPage,
    totalCount,
    locale,
    isAltBayi,
    activeTab = 'kendi',
    kendiCount = 0,
    musteriCount = 0,
    stats,
}: SiparislerClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { addToWarenkorb } = usePortal();

    const [durumlar, setDurumlar] = useState<Record<string, string>>(
        Object.fromEntries(initialSiparisler.map(s => [s.id, s.siparis_durumu]))
    );
    const [reorderingId, setReorderingId] = useState<string | null>(null);

    const handleDurumUpdate = (siparisId: string, yeniDurum: string) => {
        setDurumlar(prev => ({ ...prev, [siparisId]: yeniDurum }));
    };

    const handleFilterChange = useDebouncedCallback((term: string, name: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', '1');
        if (term) {
            params.set(name, term);
        } else {
            params.delete(name);
        }
        router.replace(`${pathname}?${params.toString()}`);
    }, 300);

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleCopyId = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const cleanId = id.substring(0, 8).toUpperCase();
        navigator.clipboard.writeText(id);
        toast.success(
            locale === 'de' 
                ? `Bestell-ID #${cleanId} kopiert!` 
                : `Sipariş #${cleanId} panoya kopyalandı!`
        );
    };

    const handleReorder = (siparis: SiparisItem, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!siparis.siparis_detay || siparis.siparis_detay.length === 0) {
            toast.error(
                locale === 'de'
                    ? 'Keine Artikel für diese Bestellung gefunden.'
                    : 'Bu siparişte tekrarlanacak ürün bulunamadı.'
            );
            return;
        }

        setReorderingId(siparis.id);

        let addedCount = 0;
        siparis.siparis_detay.forEach((detay) => {
            if (detay.urunler) {
                const produkt: any = {
                    ...detay.urunler,
                    partnerPreis: detay.birim_fiyat,
                };
                addToWarenkorb(produkt, detay.miktar, 'koli');
                addedCount += detay.miktar;
            }
        });

        setTimeout(() => {
            setReorderingId(null);
            toast.success(
                locale === 'de'
                    ? `${siparis.siparis_detay?.length} Artikel (${addedCount} Kisten) zum Warenkorb hinzugefügt!`
                    : `${siparis.siparis_detay?.length} farklı ürün (${addedCount} koli) sepete eklendi!`,
                {
                    action: {
                        label: locale === 'de' ? 'Zur Bestellung' : 'Siparişe Git',
                        onClick: () => router.push(`/${locale}/portal/siparisler/yeni`),
                    },
                }
            );
        }, 400);
    };

    const activeFilter = searchParams.get('status') || '';
    const hasFilters = searchParams.has('q') || searchParams.has('status');

    const STATUS_TABS = [
        { value: '', label: { de: 'Alle', tr: 'Tümü', en: 'All' }, count: totalCount },
        { value: 'Beklemede', label: { de: 'Ausstehend', tr: 'Onay Bekliyor', en: 'Pending' } },
        { value: 'Hazırlanıyor', label: { de: 'In Bearbeitung', tr: 'Hazırlanıyor', en: 'Processing' } },
        { value: 'Yola Çıktı', label: { de: 'Unterwegs', tr: 'Yolda', en: 'In Transit' } },
        { value: 'Teslim Edildi', label: { de: 'Geliefert', tr: 'Teslim Edildi', en: 'Delivered' } },
        { value: 'İptal Edildi', label: { de: 'Storniert', tr: 'İptal', en: 'Cancelled' } },
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* ── 1. Üst Başlık & Aksiyon Alanı ─────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                {/* Background decorative glow */}
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-semibold border border-white/10">
                        <FiShoppingBag className="text-amber-400" size={13} />
                        <span>SweetHeaven B2B Portal</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                        {locale === 'de' ? 'Bestellübersicht & Sendungsverfolgung' : 'Siparişlerim & Teslimat Takibi'}
                    </h1>
                    <p className="text-sm text-slate-300 max-w-xl">
                        {locale === 'de'
                            ? 'Verfolgen Sie Ihre aktuellen B2B-Bestellungen in Echtzeit, laden Sie Rechnungen herunter oder bestellen Sie mit einem Klick nach.'
                            : 'Tüm siparişlerinizi anlık olarak takip edin, geçmiş siparişlerinizi tek tıkla tekrarlayın ve sevkiyat durumunu görüntüleyin.'}
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-3 flex-shrink-0">
                    <Link
                        href={`/${locale}/portal/siparisler/yeni`}
                        className="group inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <FiPlus size={16} className="transition-transform group-hover:rotate-90" />
                        <span>
                            {locale === 'de' ? 'Neue Bestellung' : 'Yeni Sipariş Oluştur'}
                        </span>
                    </Link>
                </div>
            </div>

            {/* ── 2. KPI Metrik Kartları ───────────────────────────────────── */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Aktif Siparişler */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                {locale === 'de' ? 'Aktive Aufträge' : 'Aktif Siparişler'}
                            </span>
                            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FiClock size={18} />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900">{stats.activeOrders}</span>
                            <span className="text-xs text-amber-600 font-medium">
                                {locale === 'de' ? 'in Bearbeitung' : 'süreçte'}
                            </span>
                        </div>
                        <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (stats.activeOrders / (stats.totalOrders || 1)) * 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Yoldaki Siparişler */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                {locale === 'de' ? 'Unterwegs' : 'Yolda / Dağıtımda'}
                            </span>
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FiTruck size={18} />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900">{stats.shippedOrders}</span>
                            <span className="text-xs text-indigo-600 font-medium">
                                {locale === 'de' ? 'Versandbereit' : 'sevkiyatta'}
                            </span>
                        </div>
                        <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (stats.shippedOrders / (stats.totalOrders || 1)) * 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Bu Ayki Toplam Ciro / Harcama */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                {locale === 'de' ? 'Dieser Monat (Netto)' : 'Bu Ay Toplam (Net)'}
                            </span>
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FiTrendingUp size={18} />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900">
                                {formatFiyat(stats.monthSpending, locale)}
                            </span>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-400">
                            {locale === 'de' ? 'Rechnungsbetrag netto' : 'KDV hariç sipariş hacmi'}
                        </div>
                    </div>

                    {/* Teslim Edilen Siparişler */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                {locale === 'de' ? 'Erfolgreich Geliefert' : 'Teslim Edilenler'}
                            </span>
                            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FiCheckCircle size={18} />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900">{stats.deliveredOrders}</span>
                            <span className="text-xs text-slate-400 font-medium">
                                / {stats.totalOrders} {locale === 'de' ? 'gesamt' : 'toplam'}
                            </span>
                        </div>
                        <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-teal-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (stats.deliveredOrders / (stats.totalOrders || 1)) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── 3. Alt Bayi Sekmeleri (Varsa) ─────────────────────────────── */}
            {isAltBayi && (
                <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/60">
                    <Link
                        href={`?tab=kendi`}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'kendi'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <span>{locale === 'de' ? 'Meine Bestellungen' : 'Kendi Siparişlerim'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                            activeTab === 'kendi' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                            {kendiCount}
                        </span>
                    </Link>
                    <Link
                        href={`?tab=musteri`}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'musteri'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <span>{locale === 'de' ? 'Kundenbestellungen' : 'Müşteri Siparişleri'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                            activeTab === 'musteri' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                            {musteriCount}
                        </span>
                    </Link>
                </div>
            )}

            {/* ── 4. Filtreleme & Arama Araç Çubuğu ──────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-4">
                <div className="flex flex-col md:flex-row items-center gap-3">
                    {/* Arama Input */}
                    <div className="relative w-full md:flex-1">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder={
                                locale === 'de'
                                    ? 'Nach Bestellnummer suchen (z. B. #SH-1024)...'
                                    : 'Sipariş No ile ara (örn: #SH-1024)...'
                            }
                            defaultValue={searchParams.get('q') || ''}
                            onChange={(e) => handleFilterChange(e.target.value, 'q')}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                        />
                    </div>

                    {/* Reset Button (Varsa) */}
                    {hasFilters && (
                        <button
                            onClick={() => router.replace(pathname)}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors flex-shrink-0"
                        >
                            <FiX size={14} />
                            <span>{locale === 'de' ? 'Filter zurücksetzen' : 'Filtreleri Temizle'}</span>
                        </button>
                    )}
                </div>

                {/* Durum Hapları (Status Filter Tabs) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {STATUS_TABS.map((tab) => {
                        const isSelected = activeFilter === tab.value;
                        return (
                            <button
                                key={tab.value}
                                onClick={() => handleFilterChange(tab.value, 'status')}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                                    isSelected
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <span>{locale === 'de' ? tab.label.de : locale === 'tr' ? tab.label.tr : tab.label.en}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── 5. Sipariş Kartları Listesi ───────────────────────────────── */}
            <div className="space-y-4">
                {initialSiparisler.length > 0 ? (
                    initialSiparisler.map((siparis) => {
                        const mevcutDurum = durumlar[siparis.id] ?? siparis.siparis_durumu;
                        const detaylar = siparis.siparis_detay || [];
                        const toplamUrunCesidi = detaylar.length;
                        const toplamKoliMiktari = detaylar.reduce((sum, d) => sum + (d.miktar || 0), 0);
                        const displayItems = detaylar.slice(0, 4);
                        const remainingCount = Math.max(0, toplamUrunCesidi - 4);
                        const isReordering = reorderingId === siparis.id;

                        return (
                            <motion.div
                                key={siparis.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all overflow-hidden group"
                            >
                                {/* Kart Üst Başlık Barı */}
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-base font-extrabold text-slate-900 tracking-tight">
                                                #{siparis.id.substring(0, 8).toUpperCase()}
                                            </span>
                                            <button
                                                onClick={(e) => handleCopyId(siparis.id, e)}
                                                title={locale === 'de' ? 'ID kopieren' : 'ID Kopyala'}
                                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                                            >
                                                <FiCopy size={13} />
                                            </button>
                                        </div>

                                        <StatusChip status={mevcutDurum} locale={locale} />

                                        {siparis.firmalar?.unvan && (
                                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                                                📦 {siparis.firmalar.unvan}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <FiCalendar size={13} className="text-slate-400" />
                                            <span>{formatDate(siparis.siparis_tarihi, locale)}</span>
                                        </div>
                                        {formatRelativeTime(siparis.siparis_tarihi, locale) && (
                                            <span className="px-2 py-0.5 rounded-full bg-slate-200/60 text-slate-600 font-medium">
                                                {formatRelativeTime(siparis.siparis_tarihi, locale)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Kart İçeriği: Zaman Çizelgesi & Ürünler & Fiyat */}
                                <div className="p-5 space-y-5">
                                    {/* 1. Teslimat Zaman Çizelgesi */}
                                    <div className="px-2">
                                        <OrderTimeline status={mevcutDurum} locale={locale} />
                                    </div>

                                    {/* 2. Sipariş Edilen Ürünler Görsel Önizlemesi */}
                                    {detaylar.length > 0 && (
                                        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            {/* Ürün Görselleri Yığını */}
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <div className="flex items-center -space-x-2 overflow-hidden py-1">
                                                    {displayItems.map((item, idx) => {
                                                        const imgUrl = item.urunler?.ana_resim_url;
                                                        const urunAdi = getUrunAdi(item.urunler?.ad, locale);
                                                        return (
                                                            <div
                                                                key={idx}
                                                                title={`${urunAdi} (${item.miktar} Koli)`}
                                                                className="relative w-12 h-12 rounded-xl bg-white border-2 border-white shadow-sm overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-100 group-hover:scale-105 transition-transform"
                                                            >
                                                                {imgUrl ? (
                                                                    <Image
                                                                        src={imgUrl}
                                                                        alt={urunAdi}
                                                                        width={48}
                                                                        height={48}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <FiPackage className="text-slate-400" size={18} />
                                                                )}
                                                                <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[9px] font-bold px-1 rounded-tl">
                                                                    {item.miktar}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}

                                                    {remainingCount > 0 && (
                                                        <div className="relative w-12 h-12 rounded-xl bg-slate-900 text-white border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                            +{remainingCount}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="text-xs text-slate-600">
                                                    <span className="font-bold text-slate-800">
                                                        {toplamUrunCesidi} {locale === 'de' ? 'Artikel' : 'Çeşit Ürün'}
                                                    </span>
                                                    <span className="text-slate-400 mx-1.5">·</span>
                                                    <span>
                                                        {toplamKoliMiktari} {locale === 'de' ? 'Kisten insgesamt' : 'Toplam Koli'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Teslimat Adresi Özeti (Varsa) */}
                                            {siparis.teslimat_adresi && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 max-w-xs truncate">
                                                    <FiMapPin size={13} className="text-slate-400 flex-shrink-0" />
                                                    <span className="truncate">{siparis.teslimat_adresi}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Kart Alt Barı: Finansal Tutar & Aksiyon Butonları */}
                                <div className="px-5 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    {/* Sol: Tutar Bilgisi */}
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xs text-slate-400 uppercase font-semibold">
                                            {locale === 'de' ? 'Gesamtbetrag (Netto):' : 'Toplam Tutar (Net):'}
                                        </span>
                                        <span className="text-lg font-black text-slate-900">
                                            {formatFiyat(siparis.toplam_tutar_net, locale)}
                                        </span>
                                        {siparis.toplam_tutar_brut && (
                                            <span className="text-xs text-slate-400">
                                                ({formatFiyat(siparis.toplam_tutar_brut, locale)} {locale === 'de' ? 'Brutto' : 'Brüt'})
                                            </span>
                                        )}
                                    </div>

                                    {/* Sağ: Hızlı Aksiyon Butonları */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* Alt Bayi Hızlı Durum Güncelleme Butonu */}
                                        {isAltBayi && activeTab === 'musteri' && (
                                            <HizliDurumButonu
                                                siparisId={siparis.id}
                                                durum={mevcutDurum}
                                                onUpdate={handleDurumUpdate}
                                            />
                                        )}

                                        {/* Tek Tıkla Tekrar Sipariş Ver */}
                                        {detaylar.length > 0 && (
                                            <button
                                                onClick={(e) => handleReorder(siparis, e)}
                                                disabled={isReordering}
                                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                            >
                                                {isReordering ? (
                                                    <FiLoader size={13} className="animate-spin text-amber-600" />
                                                ) : (
                                                    <FiRepeat size={13} className="text-amber-600" />
                                                )}
                                                <span>
                                                    {locale === 'de' ? 'Erneut bestellen' : 'Tekrar Sipariş Ver'}
                                                </span>
                                            </button>
                                        )}

                                        {/* Sipariş Detayına Git */}
                                        <Link
                                            href={`/${locale}/portal/siparisler/${siparis.id}`}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all hover:scale-105 active:scale-95"
                                        >
                                            <span>{locale === 'de' ? 'Details ansehen' : 'Sipariş Detayı'}</span>
                                            <FiChevronRight size={14} />
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                ) : (
                    /* Boş Durum (Empty State) */
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-12 text-center max-w-lg mx-auto">
                        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-5 border border-amber-100 shadow-inner">
                            <FiShoppingBag size={32} className="text-amber-600" />
                        </div>
                        <h3 className="font-extrabold text-slate-900 text-lg">
                            {hasFilters
                                ? (locale === 'de' ? 'Keine passenden Bestellungen gefunden' : 'Aramanıza uygun sipariş bulunamadı')
                                : (locale === 'de' ? 'Noch keine Bestellungen vorhanden' : 'Henüz bir siparişiniz bulunmuyor')}
                        </h3>
                        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                            {hasFilters
                                ? (locale === 'de' ? 'Versuchen Sie einen anderen Suchbegriff oder Status-Filter.' : 'Lütfen farklı bir arama kelimesi veya durum filtresi deneyin.')
                                : (locale === 'de' ? 'Entdecken Sie unseren umfangreichen Großhandelskatalog und geben Sie Ihre erste Bestellung auf.' : 'Geniş ürün kataloğumuzu inceleyerek toptan fiyat avantajıyla ilk siparişinizi hemen oluşturabilirsiniz.')}
                        </p>
                        <div className="mt-6 flex justify-center gap-3">
                            {hasFilters ? (
                                <button
                                    onClick={() => router.replace(pathname)}
                                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                                >
                                    {locale === 'de' ? 'Filter zurücksetzen' : 'Tüm Filtreleri Temizle'}
                                </button>
                            ) : (
                                <Link
                                    href={`/${locale}/portal/siparisler/yeni`}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl text-xs font-extrabold shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-all"
                                >
                                    <FiPlus size={15} />
                                    <span>{locale === 'de' ? 'Neue Bestellung erstellen' : 'Yeni Sipariş Oluştur'}</span>
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── 6. Sayfalama (Pagination) ─────────────────────────────────── */}
            {pageCount > 1 && (
                <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200/80 px-5 py-4 shadow-sm">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        ← {locale === 'de' ? 'Vorherige' : 'Önceki Sayfa'}
                    </button>
                    <div className="text-xs text-slate-500 font-medium">
                        {locale === 'de' ? 'Seite' : 'Sayfa'} <strong className="text-slate-900">{currentPage}</strong> / {pageCount}
                    </div>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= pageCount}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {locale === 'de' ? 'Nächste' : 'Sonraki Sayfa'} →
                    </button>
                </div>
            )}
        </div>
    );
}
