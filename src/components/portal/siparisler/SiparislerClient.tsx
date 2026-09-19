'use client';
import React from 'react';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { 
    FiPackage, FiPlus, FiSearch, FiChevronRight, FiChevronDown, FiChevronUp,
    FiAlertCircle, FiClock, FiCheck, FiTruck, FiX,
    FiArrowRight, FiLoader, FiRepeat, FiCopy,
    FiCalendar, FiMapPin, FiTrendingUp, FiShoppingBag,
    FiCheckCircle, FiExternalLink, FiInfo, FiLayers
} from 'react-icons/fi';
import { BsPinAngle, BsPinFill } from 'react-icons/bs';
import { motion, AnimatePresence } from 'framer-motion';
import { siparisDurumGuncelleAction } from '@/app/actions/siparis-actions';
import Link from 'next/link';
import Image from 'next/image';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { useDebouncedCallback } from 'use-debounce';
import { useOptionalPortal } from '@/contexts/PortalContext';
import { toast } from 'sonner';

type SiparisItem = {
    id: string;
    firma_id?: string;
    siparis_tarihi: string;
    toplam_tutar_net: number | null;
    toplam_tutar_brut: number | null;
    kdv_orani?: number | null;
    siparis_durumu: string;
    teslimat_adresi?: string | null;
    notlar?: string | null;
    firmalar?: {
        id?: string;
        unvan: string;
        adres?: string | null;
        sehir?: string | null;
        ilce?: string | null;
        posta_kodu?: string | null;
        google_maps_url?: string | null;
        telefon?: string | null;
        parent_firma_id?: string | null;
        ust_bayi_firma_id?: string | null;
        ticari_tip?: string | null;
    } | null;
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
    isAdmin?: boolean;
    isAltBayi?: boolean;
    activeTab?: string;
    adminTur?: string;
    kendiCount?: number;
    musteriCount?: number;
    altBayiler?: Array<{ id: string; unvan: string }>;
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
    'Ön Sipariş': {
        label: { de: 'Vorbestellung (Bedarf)', tr: '⏳ Ön Sipariş / Talep', en: 'Pre-Order' },
        bg: 'bg-amber-100 dark:bg-amber-950/40',
        text: 'text-amber-900 dark:text-amber-300 font-extrabold',
        border: 'border-amber-400 dark:border-amber-600 ring-2 ring-amber-300/40',
        dotBg: 'bg-amber-600',
        stepIndex: 0.5,
        icon: <FiClock size={13} />
    },
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
            <div className="flex items-center justify-between relative">
                <div className="absolute left-4 right-4 top-3.5 h-0.5 bg-slate-200 z-0" />
                {steps.map((step) => {
                    const isDone = currentStep >= step.id;
                    const isCurrent = currentStep === step.id;
                    return (
                        <div key={step.id} className="flex flex-col items-center gap-1.5 z-10">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                isDone
                                    ? 'bg-slate-900 text-white ring-4 ring-white shadow-xs'
                                    : 'bg-slate-100 text-slate-400 border border-slate-300'
                            }`}>
                                {isDone ? '✓' : step.id}
                            </div>
                            <span className={`text-[10px] font-semibold ${isCurrent ? 'text-slate-900 font-bold' : isDone ? 'text-slate-600' : 'text-slate-400'}`}>
                                {locale === 'de' ? step.label.de : locale === 'tr' ? step.label.tr : step.label.en}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function HizliDurumButonu({
    siparisId,
    durum,
    onUpdate
}: {
    siparisId: string;
    durum: string;
    onUpdate: (id: string, newStatus: string) => void;
}) {
    const [loading, setLoading] = useState(false);

    const handleAction = async (newStatus: string) => {
        setLoading(true);
        try {
            const res = await siparisDurumGuncelleAction(siparisId, newStatus as any);
            if (res.success) {
                onUpdate(siparisId, newStatus);
                toast.success(`Sipariş durumu "${newStatus}" olarak güncellendi.`);
            } else {
                toast.error(res.error || 'Güncelleme başarısız.');
            }
        } catch (err: any) {
            toast.error(err.message || 'Hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
            <span className="text-[11px] font-bold text-slate-500 mr-1">Durumu Güncelle:</span>
            
            {durum !== 'Hazırlanıyor' && durum !== 'Yola Çıktı' && durum !== 'Teslim Edildi' && (
                <button
                    disabled={loading}
                    onClick={() => handleAction('Hazırlanıyor')}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition disabled:opacity-50"
                >
                    📦 Hazırlanıyor
                </button>
            )}

            {durum !== 'Yola Çıktı' && durum !== 'Teslim Edildi' && (
                <button
                    disabled={loading}
                    onClick={() => handleAction('Yola Çıktı')}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition disabled:opacity-50"
                >
                    🚚 Yola Çıkar (Sevk Et)
                </button>
            )}

            {durum !== 'Teslim Edildi' && (
                <button
                    disabled={loading}
                    onClick={() => handleAction('Teslim Edildi')}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition disabled:opacity-50"
                >
                    ✓ Teslim Edildi
                </button>
            )}

            {durum !== 'İptal Edildi' && (
                <button
                    disabled={loading}
                    onClick={() => {
                        if (confirm('Bu siparişi iptal etmek istediğinize emin misiniz?')) {
                            handleAction('İptal Edildi');
                        }
                    }}
                    className="px-2 py-1.5 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition disabled:opacity-50"
                >
                    ✕ İptal
                </button>
            )}
        </div>
    );
}

export function SiparislerClient({
    initialSiparisler,
    pageCount,
    currentPage,
    totalCount,
    locale,
    isAdmin = false,
    isAltBayi,
    activeTab = 'kendi',
    adminTur = 'merkez',
    kendiCount = 0,
    musteriCount = 0,
    altBayiler = [],
    stats,
}: SiparislerClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const portal = useOptionalPortal();
    const addToWarenkorb = portal?.addToWarenkorb;

    const [durumlar, setDurumlar] = useState<Record<string, string>>(
        Object.fromEntries(initialSiparisler.map(s => [s.id, s.siparis_durumu]))
    );
    const [reorderingId, setReorderingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

    // LocalStorage'dan sabitlenen siparişleri yükle
    useEffect(() => {
        try {
            const saved = localStorage.getItem('portal_pinned_orders');
            if (saved) {
                setPinnedIds(new Set(JSON.parse(saved)));
            }
        } catch {}
    }, []);

    // Stripe ödeme sonrası başarılı dönüş bildirimi
    useEffect(() => {
        if (searchParams.get('payment_status') === 'success') {
            portal?.clearWarenkorb();
            toast.success(
                locale === 'de'
                    ? 'Zahlung erfolgreich! Ihre Bestellung wurde entgegengenommen.'
                    : locale === 'tr'
                    ? 'Ödemeniz başarıyla tamamlandı! Siparişiniz alındı.'
                    : 'Payment successful! Your order has been placed.'
            );
        } else if (searchParams.get('payment_status') === 'cancelled') {
            toast.info(
                locale === 'de'
                    ? 'Zahlungsvorgang abgebrochen.'
                    : locale === 'tr'
                    ? 'Ödeme işlemi iptal edildi.'
                    : 'Payment cancelled.'
            );
        }
    }, [searchParams]);

    const togglePin = (id: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setPinnedIds(prev => {
            const next = new Set(prev);
            const isPinnedNow = !next.has(id);
            if (isPinnedNow) next.add(id);
            else next.delete(id);

            try {
                localStorage.setItem('portal_pinned_orders', JSON.stringify(Array.from(next)));
            } catch {}

            const cleanId = id.substring(0, 8).toUpperCase();
            if (isPinnedNow) {
                toast.success(
                    locale === 'de'
                        ? `📌 Bestellung #${cleanId} oben angepinnt!`
                        : `📌 Sipariş #${cleanId} başa sabitlendi!`
                );
            } else {
                toast.info(
                    locale === 'de'
                        ? `Pin für #${cleanId} entfernt.`
                        : `Sipariş #${cleanId} sabitlemesi kaldırıldı.`
                );
            }

            return next;
        });
    };

    // Sabitlenen siparişleri en üste alan sıralama
    const sortedSiparisler = useMemo(() => {
        if (pinnedIds.size === 0) return initialSiparisler;
        return [...initialSiparisler].sort((a, b) => {
            const aPinned = pinnedIds.has(a.id);
            const bPinned = pinnedIds.has(b.id);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return 0;
        });
    }, [initialSiparisler, pinnedIds]);

    const toggleExpand = (id: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        // Tekli akordiyon: Açık olana tıklanırsa kapanır, başka birine tıklanırsa diğeri otomatik kapanıp yenisi açılır
        setExpandedId(prev => (prev === id ? null : id));
    };

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

    const handleSelectFilterChange = (value: string, name: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', '1');
        if (value) {
            params.set(name, value);
        } else {
            params.delete(name);
        }
        router.replace(`${pathname}?${params.toString()}`);
    };

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

        if (!addToWarenkorb) {
            router.push(`/${locale}/admin/operasyon/siparisler/${siparis.id}`);
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
    const hasFilters = searchParams.has('q') || searchParams.has('status') || searchParams.has('period');

    const STATUS_TABS = [
        { value: '', label: { de: '📦 Normal Bestellungen (Alle)', tr: '📦 Normal Siparişler (Tümü)', en: '📦 Standard Orders' } },
        { value: 'Ön Sipariş', label: { de: '⏳ Vorbestellungen & Bedarf', tr: '⏳ Ön Siparişler & Talepler', en: '⏳ Pre-Orders & Requests' } },
        { value: 'Beklemede', label: { de: 'Ausstehend', tr: 'Onay Bekliyor', en: 'Pending' } },
        { value: 'Hazırlanıyor', label: { de: 'In Bearbeitung', tr: 'Hazırlanıyor', en: 'Processing' } },
        { value: 'Yola Çıktı', label: { de: 'Unterwegs', tr: 'Yolda', en: 'In Transit' } },
        { value: 'Teslim Edildi', label: { de: 'Geliefert', tr: 'Teslim Edildi', en: 'Delivered' } },
        { value: 'İptal Edildi', label: { de: 'Storniert', tr: 'İptal', en: 'Cancelled' } },
        { value: 'hepsi', label: { de: '📋 Alle (inkl. Vorbestellung)', tr: '📋 Hepsi (Ön Siparişler Dahil)', en: '📋 All Records' } },
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
                        <span>{isAdmin ? 'SweetHeaven Merkez Depo & Lojistik' : 'SweetHeaven B2B Portal'}</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                        {isAdmin
                            ? 'Sipariş & Sevkiyat Yönetimi'
                            : (locale === 'de' ? 'Bestellübersicht & Sendungsverfolgung' : 'Siparişlerim & Teslimat Takibi')}
                    </h1>
                    <p className="text-sm text-slate-300 max-w-xl">
                        {isAdmin
                            ? 'Merkez depodan sevk edilecek siparişleri yönetin, aşamalarını güncelleyin ve irsaliye çıktısı alın.'
                            : (locale === 'de'
                                ? 'Verfolgen Sie Ihre aktuellen B2B-Bestellungen in Echtzeit, laden Sie Rechnungen herunter oder bestellen Sie mit einem Klick nach.'
                                : 'Tüm siparişlerinizi anlık olarak takip edin, geçmiş siparişlerinizi tek tıkla tekrarlayın ve sevkiyat durumunu görüntüleyin.')}
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-3 flex-shrink-0">
                    <Link
                        href={isAdmin ? `/${locale}/admin/crm/firmalar` : `/${locale}/portal/siparisler/yeni`}
                        className="group inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <FiPlus size={16} className="transition-transform group-hover:rotate-90" />
                        <span>
                            {isAdmin ? 'Yeni Sipariş Oluştur' : (locale === 'de' ? 'Neue Bestellung' : 'Yeni Sipariş Oluştur')}
                        </span>
                    </Link>
                </div>
            </div>

            {/* ── 1.1. Admin Sipariş Türü Sekmeleri ─────────────────────────── */}
            {isAdmin && (
                <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200 overflow-x-auto">
                    {[
                        { id: 'merkez', label: '📦 Merkez Depo Siparişleri', desc: 'Hazırlanıp Sevk Edilecekler' },
                        { id: 'bayi_ikmal', label: '🤝 Bayi İkmal Talepleri', desc: 'Bayi Stok Siparişleri' },
                        { id: 'bayi_musterileri', label: '👥 Bayi Müşteri Siparişleri', desc: 'Bayilerin Teslim Edecekleri' },
                        { id: 'tumu', label: '📋 Tüm Siparişler', desc: 'Genel Liste' },
                    ].map((tab) => {
                        const isSelected = (adminTur || 'merkez') === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set('tur', tab.id);
                                    params.set('page', '1');
                                    router.replace(`${pathname}?${params.toString()}`);
                                }}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                    isSelected
                                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                }`}
                            >
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── 1.2. Alt Bayi Sekmeleri (Kendi vs Müşteri) ─────────────────── */}
            {!isAdmin && isAltBayi && (
                <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200">
                    <button
                        onClick={() => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('tab', 'kendi');
                            params.set('page', '1');
                            router.replace(`${pathname}?${params.toString()}`);
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            activeTab !== 'musteri'
                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <FiShoppingBag size={14} />
                        <span>{locale === 'de' ? 'Eigene Bestellungen (Zentrale)' : 'Kendi Siparişlerim (Merkezden)'}</span>
                        {kendiCount !== undefined && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                                {kendiCount}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('tab', 'musteri');
                            params.set('page', '1');
                            router.replace(`${pathname}?${params.toString()}`);
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'musteri'
                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <FiLayers size={14} />
                        <span>{locale === 'de' ? 'Kundenbestellungen (Portfolio)' : 'Müşteri Siparişleri (Portföyümden)'}</span>
                        {musteriCount !== undefined && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-extrabold">
                                {musteriCount}
                            </span>
                        )}
                    </button>
                </div>
            )}

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

            {/* ── 4. Filtreleme & Arama Araç Çubuğu (Akıllı Arama + Dönem Filtresi) ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3.5">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Çok Yönlü Akıllı Arama Input */}
                    <div className="relative w-full flex-1">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder={
                                locale === 'de'
                                    ? 'Nach Bestell-Nr., Produkt (z. B. Frambuaz), Art.-Nr. oder Datum suchen...'
                                    : 'Sipariş No, ürün adı (örn: Frambuaz), kod veya tarih ile arayın...'
                            }
                            defaultValue={searchParams.get('q') || ''}
                            onChange={(e) => handleFilterChange(e.target.value, 'q')}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                        />
                    </div>

                    {/* Tarih / Dönem Seçimi */}
                    <div className="relative w-full sm:w-56 flex-shrink-0">
                        <select
                            value={searchParams.get('period') || ''}
                            onChange={(e) => handleSelectFilterChange(e.target.value, 'period')}
                            className="w-full pl-3.5 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors appearance-none cursor-pointer"
                        >
                            <option value="">
                                📅 {locale === 'de' ? 'Alle Zeiträume' : 'Tüm Dönemler'}
                            </option>
                            <option value="this_month">
                                📅 {locale === 'de' ? 'Dieser Monat' : 'Bu Ay'}
                            </option>
                            <option value="last_month">
                                📅 {locale === 'de' ? 'Letzter Monat' : 'Geçen Ay'}
                            </option>
                            <option value="last_3_months">
                                📅 {locale === 'de' ? 'Letzte 3 Monate' : 'Son 3 Ay'}
                            </option>
                            <option value="this_year">
                                📅 {locale === 'de' ? 'Dieses Jahr (2026)' : 'Bu Yıl (2026)'}
                            </option>
                        </select>
                        <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                    </div>

                    {/* Reset Button (Varsa) */}
                    {hasFilters && (
                        <button
                            onClick={() => router.replace(pathname)}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors flex-shrink-0 w-full sm:w-auto justify-center"
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

            
            {/* ── 5. Sipariş Veri Tablosu & Mobil Kartlar ─── */}
            <div className="space-y-4">
                {sortedSiparisler.length > 0 ? (
                    <>
                        {/* ── MASAÜSTÜ: DATA GRID (B2B Toptancı Ergonomisi) ── */}
                        <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-10"></th>
                                        <th className="px-4 py-3 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Sipariş No & Tarih</th>
                                        <th className="px-4 py-3 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Müşteri / Firma</th>
                                        <th className="px-4 py-3 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">İçerik Özeti</th>
                                        <th className="px-4 py-3 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider text-right">Net Tutar</th>
                                        <th className="px-4 py-3 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Durum</th>
                                        <th className="px-4 py-3 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider text-right">Aksiyonlar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sortedSiparisler.map((siparis) => {
                                        const isPinned = pinnedIds.has(siparis.id);
                                        const isExpanded = expandedId === siparis.id;
                                        const mevcutDurum = durumlar[siparis.id] || siparis.siparis_durumu;
                                        const isPreOrder = mevcutDurum === 'Ön Sipariş';
                                        const detaylar = siparis.siparis_detay || [];
                                        const toplamUrunCesidi = detaylar.length;
                                        const toplamKoliMiktari = detaylar.reduce((sum, d) => sum + (d.miktar || 0), 0);
                                        const isReordering = reorderingId === siparis.id;

                                        return (
                                            <React.Fragment key={siparis.id}>
                                                <tr 
                                                    onClick={(e) => {
                                                        // Prevent expansion if clicking on a button or link
                                                        if ((e.target as HTMLElement).closest('button, a')) return;
                                                        toggleExpand(siparis.id, e as any);
                                                    }}
                                                    className={`group transition-colors cursor-pointer ${isExpanded ? 'bg-indigo-50/50' : isPreOrder ? 'bg-amber-50/30' : isPinned ? 'bg-slate-50/80' : 'hover:bg-slate-50'}`}
                                                >
                                                    {/* Pin/Expand */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                onClick={(e) => toggleExpand(siparis.id, e)}
                                                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                                                            >
                                                                {isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                                                            </button>
                                                            <button
                                                                onClick={(e) => togglePin(siparis.id, e)}
                                                                className={`p-1 rounded transition-colors ${isPinned ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-100' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-200'}`}
                                                            >
                                                                {isPinned ? <BsPinFill size={14} className="rotate-45" /> : <BsPinAngle size={14} />}
                                                            </button>
                                                        </div>
                                                    </td>

                                                    {/* ID & Date */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-mono text-sm font-extrabold text-slate-900 tracking-tight">
                                                                    #{siparis.id.substring(0, 8).toUpperCase()}
                                                                </span>
                                                                <button
                                                                    onClick={(e) => handleCopyId(siparis.id, e)}
                                                                    className="text-slate-400 hover:text-slate-700 transition-colors"
                                                                >
                                                                    <FiCopy size={12} />
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                                                <span>{formatDate(siparis.siparis_tarihi, locale)}</span>
                                                                {formatRelativeTime(siparis.siparis_tarihi, locale) && (
                                                                    <span className="px-1.5 py-0.5 rounded-sm bg-slate-100 font-medium">
                                                                        {formatRelativeTime(siparis.siparis_tarihi, locale)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Firm */}
                                                    <td className="px-4 py-3">
                                                        {siparis.firmalar?.unvan ? (
                                                            isAdmin && siparis.firmalar.id ? (
                                                                <Link
                                                                    href={`/${locale}/admin/crm/firmalar/${siparis.firmalar.id}`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:underline max-w-[200px] truncate"
                                                                >
                                                                    <span>{siparis.firmalar.unvan}</span>
                                                                    {siparis.firmalar.ticari_tip === 'alt_bayi' && (
                                                                        <span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] uppercase tracking-wider">
                                                                            Alt Bayi
                                                                        </span>
                                                                    )}
                                                                </Link>
                                                            ) : (
                                                                <span className="text-xs font-bold text-slate-700 max-w-[200px] truncate block">
                                                                    {siparis.firmalar.unvan}
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="text-xs text-slate-400">—</span>
                                                        )}
                                                    </td>

                                                    {/* Summary */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col text-[11px]">
                                                            <span className="font-bold text-slate-800">{toplamUrunCesidi} {locale === 'de' ? 'Artikel' : 'Çeşit'}</span>
                                                            <span className="text-slate-500">{toplamKoliMiktari} {locale === 'de' ? 'Kisten' : 'Koli'}</span>
                                                        </div>
                                                    </td>

                                                    {/* Net Amount */}
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="text-sm font-black text-slate-900">
                                                            {formatFiyat(siparis.toplam_tutar_net, locale)}
                                                        </span>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-4 py-3">
                                                        <StatusChip status={mevcutDurum} locale={locale} />
                                                        {isPreOrder && (
                                                            <div className="text-[9px] font-bold text-amber-600 mt-1 uppercase tracking-wider">
                                                                {locale === 'de' ? 'Bedarf (kein Bestand)' : 'Talep (Stok Düşülmedi)'}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                            {/* Lieferschein Print */}
                                                            <Link
                                                                href={`/${locale}/print/lieferschein/${siparis.id}`}
                                                                target="_blank"
                                                                title={locale === 'de' ? 'Lieferschein' : 'İrsaliye'}
                                                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                                                            >
                                                                <FiExternalLink size={14} />
                                                            </Link>

                                                            {/* Quick Status Updates (Admin) */}
                                                            {(isAdmin || (isAltBayi && activeTab === 'musteri')) && (
                                                                <>
                                                                    {(mevcutDurum === 'Beklemede' || mevcutDurum === 'Ön Sipariş') && (
                                                                        <button
                                                                            onClick={() => handleDurumUpdate(siparis.id, 'Hazırlanıyor')}
                                                                            className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-bold transition-colors border border-blue-200"
                                                                        >
                                                                            {locale === 'de' ? 'Vorbereiten' : 'Hazırla'}
                                                                        </button>
                                                                    )}
                                                                    {(mevcutDurum === 'Hazırlanıyor' || mevcutDurum === 'processing') && (
                                                                        <button
                                                                            onClick={() => handleDurumUpdate(siparis.id, 'Yola Çıktı')}
                                                                            className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-[10px] font-bold transition-colors border border-purple-200"
                                                                        >
                                                                            {locale === 'de' ? 'Versenden' : 'Sevk Et'}
                                                                        </button>
                                                                    )}
                                                                    {mevcutDurum === 'Yola Çıktı' && (
                                                                        <button
                                                                            onClick={() => handleDurumUpdate(siparis.id, 'Teslim Edildi')}
                                                                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[10px] font-bold transition-colors border border-emerald-200"
                                                                        >
                                                                            {locale === 'de' ? 'Zustellen' : 'Teslim Et'}
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}

                                                            {/* Reorder (Customer) */}
                                                            {detaylar.length > 0 && activeTab !== 'musteri' && !isAdmin && (
                                                                <button
                                                                    onClick={(e) => handleReorder(siparis, e)}
                                                                    disabled={isReordering}
                                                                    className="px-2 py-1 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded text-[10px] font-bold transition-colors border border-amber-300 disabled:opacity-50 flex items-center gap-1"
                                                                >
                                                                    {isReordering ? <FiLoader size={10} className="animate-spin" /> : <FiRepeat size={10} />}
                                                                    {locale === 'de' ? 'Erneut' : 'Tekrarla'}
                                                                </button>
                                                            )}
                                                            
                                                            <Link
                                                                href={isAdmin ? `/${locale}/admin/operasyon/siparisler/${siparis.id}` : `/${locale}/portal/siparisler/${siparis.id}`}
                                                                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors ml-1"
                                                            >
                                                                <FiArrowRight size={14} />
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Expanded Details Row */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <tr className="bg-slate-50/50 border-b-2 border-indigo-200">
                                                            <td colSpan={7} className="p-0">
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="p-6 bg-indigo-50/30">
                                                                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                                                            <div className="xl:col-span-2 space-y-4">
                                                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                                                    {locale === 'de' ? 'Bestellte Artikel' : 'Sipariş Kalemleri'}
                                                                                </div>
                                                                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                                                                    <table className="w-full text-left text-sm">
                                                                                        <thead className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500">
                                                                                            <tr>
                                                                                                <th className="px-3 py-2 font-semibold">Ürün</th>
                                                                                                <th className="px-3 py-2 font-semibold text-right">Miktar (Koli)</th>
                                                                                                <th className="px-3 py-2 font-semibold text-right">Birim (Net)</th>
                                                                                                <th className="px-3 py-2 font-semibold text-right">Toplam (Net)</th>
                                                                                            </tr>
                                                                                        </thead>
                                                                                        <tbody className="divide-y divide-slate-50">
                                                                                            {detaylar.map((item, idx) => {
                                                                                                const urun = item.urunler;
                                                                                                const urunAdi = getUrunAdi(urun?.ad, locale);
                                                                                                return (
                                                                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                                                                        <td className="px-3 py-2.5 flex items-center gap-3">
                                                                                                            <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                                                                                {urun?.ana_resim_url ? (
                                                                                                                    <img src={urun.ana_resim_url} alt={urunAdi} className="w-full h-full object-cover" />
                                                                                                                ) : (
                                                                                                                    <FiPackage className="text-slate-400" size={14} />
                                                                                                                )}
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <div className="font-bold text-slate-800 text-xs">{urunAdi}</div>
                                                                                                                {urun?.stok_kodu && <div className="text-[10px] font-mono text-slate-500">{urun.stok_kodu}</div>}
                                                                                                            </div>
                                                                                                        </td>
                                                                                                        <td className="px-3 py-2.5 text-right font-medium text-slate-700 text-xs">{item.miktar}</td>
                                                                                                        <td className="px-3 py-2.5 text-right text-slate-600 text-xs">{formatFiyat(item.birim_fiyat, locale)}</td>
                                                                                                        <td className="px-3 py-2.5 text-right font-extrabold text-slate-900 text-xs">{formatFiyat(item.toplam_fiyat, locale)}</td>
                                                                                                    </tr>
                                                                                                );
                                                                                            })}
                                                                                        </tbody>
                                                                                    </table>
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            <div className="space-y-4">
                                                                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                                                                        {locale === 'de' ? 'Zusammenfassung' : 'Sipariş Özeti'}
                                                                                    </div>
                                                                                    <div className="space-y-2 text-sm">
                                                                                        <div className="flex justify-between text-slate-600">
                                                                                            <span>Net Tutar:</span>
                                                                                            <span className="font-bold">{formatFiyat(siparis.toplam_tutar_net, locale)}</span>
                                                                                        </div>
                                                                                        <div className="flex justify-between text-slate-500 text-xs">
                                                                                            <span>KDV (%{siparis.kdv_orani || 7}):</span>
                                                                                            <span>{formatFiyat((siparis.toplam_tutar_brut || 0) - (siparis.toplam_tutar_net || 0), locale)}</span>
                                                                                        </div>
                                                                                        <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between text-slate-900">
                                                                                            <span className="font-bold">Brüt Tutar:</span>
                                                                                            <span className="font-black text-base">{formatFiyat(siparis.toplam_tutar_brut, locale)}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                
                                                                                {siparis.teslimat_adresi && (
                                                                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                                                            <FiMapPin />
                                                                                            {locale === 'de' ? 'Lieferadresse' : 'Teslimat Adresi'}
                                                                                        </div>
                                                                                        <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                                                                            {siparis.teslimat_adresi}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </AnimatePresence>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* ── MOBİL: KART GÖRÜNÜMÜ ── */}
                        <div className="lg:hidden space-y-3">
                            {sortedSiparisler.map((siparis) => {
                                // Mevcut mobil kart kodu (eski kodun sadeleştirilmiş hali)
                                const isPinned = pinnedIds.has(siparis.id);
                                const isExpanded = expandedId === siparis.id;
                                const mevcutDurum = durumlar[siparis.id] || siparis.siparis_durumu;
                                const isPreOrder = mevcutDurum === 'Ön Sipariş';
                                const detaylar = siparis.siparis_detay || [];
                                const toplamUrunCesidi = detaylar.length;
                                const toplamKoliMiktari = detaylar.reduce((sum, d) => sum + (d.miktar || 0), 0);
                                const isReordering = reorderingId === siparis.id;

                                return (
                                    <motion.div
                                        key={`mobile-${siparis.id}`}
                                        layout
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`rounded-xl border transition-all overflow-hidden relative ${
                                            isExpanded 
                                                ? 'bg-white border-slate-900 shadow-lg' 
                                                : isPreOrder
                                                ? 'bg-amber-50/50 border-amber-300'
                                                : isPinned 
                                                ? 'border-amber-300 bg-white' 
                                                : 'bg-white border-slate-200'
                                        }`}
                                    >
                                        <div onClick={() => toggleExpand(siparis.id)} className="p-4 flex flex-col gap-3 cursor-pointer">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm font-extrabold text-slate-900">#{siparis.id.substring(0, 8).toUpperCase()}</span>
                                                    {isPinned && <BsPinFill size={12} className="text-amber-600 rotate-45" />}
                                                </div>
                                                <StatusChip status={mevcutDurum} locale={locale} />
                                            </div>
                                            
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="text-slate-500">{formatDate(siparis.siparis_tarihi, locale)}</div>
                                                <div className="font-bold text-slate-800">{siparis.firmalar?.unvan || '—'}</div>
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                                <div className="text-xs text-slate-600">
                                                    <span className="font-bold">{toplamUrunCesidi} Çeşit</span> · {toplamKoliMiktari} Koli
                                                </div>
                                                <div className="font-black text-slate-900">{formatFiyat(siparis.toplam_tutar_net, locale)}</div>
                                            </div>
                                            
                                            {isExpanded && (
                                                <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                                                    <div className="text-xs text-slate-500 font-bold uppercase">Kalemler</div>
                                                    {detaylar.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between text-xs">
                                                            <span className="font-semibold text-slate-700 truncate w-40">{getUrunAdi(item.urunler?.ad, locale)}</span>
                                                            <span className="text-slate-600">{item.miktar} × {formatFiyat(item.birim_fiyat, locale)}</span>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-100">
                                                        <Link href={`/${locale}/admin/operasyon/siparisler/${siparis.id}`} className="text-xs font-bold text-indigo-600 underline">Detaya Git</Link>
                                                        {detaylar.length > 0 && activeTab !== 'musteri' && !isAdmin && (
                                                            <button onClick={(e) => handleReorder(siparis, e)} className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded font-bold">Tekrar Sipariş</button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </>
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
