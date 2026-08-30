'use client';

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
import { usePortal } from '@/contexts/PortalContext';
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
    const { addToWarenkorb } = usePortal();

    const [durumlar, setDurumlar] = useState<Record<string, string>>(
        Object.fromEntries(initialSiparisler.map(s => [s.id, s.siparis_durumu]))
    );
    const [reorderingId, setReorderingId] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(
        // Varsayılan olarak en son siparişi açık getirelim veya hepsini kapalı tutalım
        initialSiparisler.length > 0 ? [initialSiparisler[0].id] : []
    ));
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
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
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

            {/* ── 5. Sipariş Kartları Listesi (Temiz, Derli Toplu Döküm Listesi) ─── */}
            <div className="space-y-3">
                {sortedSiparisler.length > 0 ? (
                    sortedSiparisler.map((siparis) => {
                        const mevcutDurum = durumlar[siparis.id] ?? siparis.siparis_durumu;
                        const detaylar = siparis.siparis_detay || [];
                        const toplamUrunCesidi = detaylar.length;
                        const toplamKoliMiktari = detaylar.reduce((sum, d) => sum + (d.miktar || 0), 0);
                        const isReordering = reorderingId === siparis.id;
                        const isExpanded = expandedIds.has(siparis.id);
                        const isPinned = pinnedIds.has(siparis.id);

                        return (
                            <motion.div
                                key={siparis.id}
                                layout
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                                    isPinned 
                                        ? 'border-amber-300 ring-1 ring-amber-400/30 shadow-md bg-gradient-to-r from-amber-50/15 via-white to-white' 
                                        : 'border-slate-200 shadow-sm hover:border-slate-300'
                                }`}
                            >
                                {/* ── Ana Satır (Kompakt ve Anlaşılır Başlık Çubuğu) ── */}
                                <div 
                                    onClick={() => toggleExpand(siparis.id)}
                                    className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
                                >
                                    {/* Sol Bölüm: No, Tarih, Durum */}
                                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                                        {/* Açma / Kapama Oku */}
                                        <button 
                                            onClick={(e) => toggleExpand(siparis.id, e)}
                                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex-shrink-0"
                                            title={isExpanded ? (locale === 'de' ? 'Einklappen' : 'Kapat') : (locale === 'de' ? 'Detailliste öffnen' : 'Dökümü Aç')}
                                        >
                                            {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                                        </button>

                                        {/* Sabitle / Pinle Butonu */}
                                        <button
                                            onClick={(e) => togglePin(siparis.id, e)}
                                            title={isPinned 
                                                ? (locale === 'de' ? 'Pin entfernen' : 'Sabitlemeyi Kaldır')
                                                : (locale === 'de' ? 'Diese Bestellung oben anpinnen (für schnelle Nachbestellungen)' : 'Siparişi başa sabitle (hızlı tekrar sipariş için)')
                                            }
                                            className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                                                isPinned 
                                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 ring-1 ring-amber-300' 
                                                    : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            {isPinned ? <BsPinFill size={14} className="text-amber-600 rotate-45" /> : <BsPinAngle size={14} />}
                                        </button>

                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-base font-extrabold text-slate-900 tracking-tight">
                                                    #{siparis.id.substring(0, 8).toUpperCase()}
                                                </span>
                                                <button
                                                    onClick={(e) => handleCopyId(siparis.id, e)}
                                                    title={locale === 'de' ? 'ID kopieren' : 'ID Kopyala'}
                                                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                                                >
                                                    <FiCopy size={12} />
                                                </button>

                                                {/* Sabitlendi Rozeti */}
                                                {isPinned && (
                                                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-300">
                                                        <span>📌</span>
                                                        <span>{locale === 'de' ? 'Angepinnt' : 'Sabitlendi'}</span>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                <span>{formatDate(siparis.siparis_tarihi, locale)}</span>
                                                {formatRelativeTime(siparis.siparis_tarihi, locale) && (
                                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                                        {formatRelativeTime(siparis.siparis_tarihi, locale)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {siparis.firmalar?.unvan && (
                                            isAdmin && siparis.firmalar.id ? (
                                                <Link
                                                    href={`/${locale}/admin/crm/firmalar/${siparis.firmalar.id}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 transition-colors"
                                                >
                                                    <span>🏢 {siparis.firmalar.unvan}</span>
                                                    {siparis.firmalar.ticari_tip === 'alt_bayi' && (
                                                        <span className="ml-1 px-1.5 py-0.2 bg-purple-200/80 text-purple-900 rounded text-[10px] font-extrabold">
                                                            Bayi İkmali
                                                        </span>
                                                    )}
                                                </Link>
                                            ) : (
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                                                    📦 {siparis.firmalar.unvan}
                                                </span>
                                            )
                                        )}
                                    </div>

                                    {/* Orta Bölüm: Ürün Sayısı ve Mini Küçük Resimler */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
                                            {detaylar.slice(0, 3).map((item, idx) => {
                                                const imgUrl = item.urunler?.ana_resim_url;
                                                const urunAdi = getUrunAdi(item.urunler?.ad, locale);
                                                return (
                                                    <div
                                                        key={idx}
                                                        title={`${urunAdi} (${item.miktar} Koli)`}
                                                        className="relative w-9 h-9 rounded-lg bg-white border-2 border-white shadow-sm overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-100"
                                                    >
                                                        {imgUrl ? (
                                                            <Image
                                                                src={imgUrl}
                                                                alt={urunAdi}
                                                                width={36}
                                                                height={36}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <FiPackage className="text-slate-400" size={14} />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {toplamUrunCesidi > 3 && (
                                                <div className="relative w-9 h-9 rounded-lg bg-slate-800 text-white border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                                    +{toplamUrunCesidi - 3}
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-xs text-slate-600">
                                            <span className="font-bold text-slate-800">{toplamUrunCesidi} {locale === 'de' ? 'Artikel' : 'Çeşit Ürün'}</span>
                                            <span className="text-slate-400 mx-1">·</span>
                                            <span className="text-slate-600 font-medium">{toplamKoliMiktari} {locale === 'de' ? 'Kisten' : 'Koli'}</span>
                                        </div>
                                    </div>

                                    {/* Sağ Bölüm: Tutar ve Butonlar */}
                                    <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                                        <div className="text-right">
                                            <div className="text-base font-black text-slate-900 leading-tight">
                                                {formatFiyat(siparis.toplam_tutar_net, locale)}
                                                <span className="text-[10px] font-normal text-slate-500 ml-1">Netto</span>
                                            </div>
                                            {siparis.toplam_tutar_brut && (
                                                <div className="text-[11px] text-slate-400">
                                                    {formatFiyat(siparis.toplam_tutar_brut, locale)} {locale === 'de' ? 'Brutto' : 'Brüt'}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                            {/* Lieferschein / İrsaliye Yazdır Butonu */}
                                            <Link
                                                href={`/${locale}/print/lieferschein/${siparis.id}`}
                                                target="_blank"
                                                title={locale === 'de' ? 'Lieferschein drucken' : 'İrsaliye / Teslimat Fişi Yazdır'}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex-shrink-0"
                                            >
                                                <FiExternalLink size={13} className="text-slate-500" />
                                                <span>Lieferschein</span>
                                            </Link>

                                            {/* Alt Bayi Müşteri Siparişi için Hızlı Durum Butonları */}
                                            {isAltBayi && (
                                                <div className="flex items-center gap-1.5">
                                                    {(mevcutDurum === 'Beklemede' || mevcutDurum === 'Ön Sipariş') && (
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                try {
                                                                    const res = await siparisDurumGuncelleAction(siparis.id, 'Hazırlanıyor' as any);
                                                                    if (res.success) {
                                                                        setDurumlar(prev => ({ ...prev, [siparis.id]: 'Hazırlanıyor' }));
                                                                        toast.success(locale === 'de' ? 'Status: In Bearbeitung' : 'Sipariş durumu "Hazırlanıyor" yapıldı');
                                                                    } else {
                                                                        toast.error(res.error || 'Hata oluştu');
                                                                    }
                                                                } catch (err: any) {
                                                                    toast.error(err.message || 'Hata');
                                                                }
                                                            }}
                                                            title={locale === 'de' ? 'In Bearbeitung setzen' : 'Hazırlanıyor Olarak İşaretle'}
                                                            className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all flex-shrink-0"
                                                        >
                                                            <FiPackage size={13} />
                                                            <span className="hidden sm:inline">{locale === 'de' ? 'Vorbereiten' : 'Hazırla'}</span>
                                                        </button>
                                                    )}

                                                    {(mevcutDurum === 'Beklemede' || mevcutDurum === 'processing' || mevcutDurum === 'Hazırlanıyor') && (
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                try {
                                                                    const res = await siparisDurumGuncelleAction(siparis.id, 'Yola Çıktı' as any);
                                                                    if (res.success) {
                                                                        setDurumlar(prev => ({ ...prev, [siparis.id]: 'Yola Çıktı' }));
                                                                        toast.success(locale === 'de' ? 'Als versandt markiert (Unterwegs)' : 'Sipariş "Yola Çıktı" olarak güncellendi');
                                                                    } else {
                                                                        toast.error(res.error || 'Hata oluştu');
                                                                    }
                                                                } catch (err: any) {
                                                                    toast.error(err.message || 'Hata');
                                                                }
                                                            }}
                                                            title={locale === 'de' ? 'Als versandt markieren' : 'Yola Çıktı Olarak İşaretle'}
                                                            className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-all flex-shrink-0"
                                                        >
                                                            <FiTruck size={13} />
                                                            <span className="hidden sm:inline">{locale === 'de' ? 'Versenden' : 'Yola Çıkar'}</span>
                                                        </button>
                                                    )}

                                                    {mevcutDurum === 'Yola Çıktı' && (
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                try {
                                                                    const res = await siparisDurumGuncelleAction(siparis.id, 'Teslim Edildi' as any);
                                                                    if (res.success) {
                                                                        setDurumlar(prev => ({ ...prev, [siparis.id]: 'Teslim Edildi' }));
                                                                        toast.success(locale === 'de' ? 'Als zugestellt markiert' : 'Sipariş "Teslim Edildi" olarak tamamlandı');
                                                                    } else {
                                                                        toast.error(res.error || 'Hata oluştu');
                                                                    }
                                                                } catch (err: any) {
                                                                    toast.error(err.message || 'Hata');
                                                                }
                                                            }}
                                                            title={locale === 'de' ? 'Als zugestellt markieren' : 'Teslim Edildi Olarak İşaretle'}
                                                            className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all flex-shrink-0"
                                                        >
                                                            <FiCheckCircle size={13} />
                                                            <span className="hidden sm:inline">{locale === 'de' ? 'Zustellen' : 'Teslim Et'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Tekrar Sipariş Ver Butonu (Kendi siparişlerinde) */}
                                            {detaylar.length > 0 && activeTab !== 'musteri' && (
                                                <button
                                                    onClick={(e) => handleReorder(siparis, e)}
                                                    disabled={isReordering}
                                                    title={locale === 'de' ? 'Gleiche Artikel in den Warenkorb legen' : 'Aynı ürünleri sepete ekle'}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/20 transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
                                                >
                                                    {isReordering ? (
                                                        <FiLoader size={13} className="animate-spin text-amber-700" />
                                                    ) : (
                                                        <FiRepeat size={13} className="text-amber-700" />
                                                    )}
                                                    <span className="hidden sm:inline">
                                                        {locale === 'de' ? 'Erneut' : 'Tekrarla'}
                                                    </span>
                                                </button>
                                            )}

                                            {/* Dökümü Aç / Kapat Butonu */}
                                            <button
                                                onClick={(e) => toggleExpand(siparis.id, e)}
                                                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                                                    isExpanded 
                                                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <span>{isExpanded ? (locale === 'de' ? 'Schließen' : 'Gizle') : (locale === 'de' ? 'Details' : 'Döküm')}</span>
                                                {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Açılır Sipariş Dökümü (Itemized Breakdown Table) ── */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="border-t border-slate-100 bg-slate-50/50"
                                        >
                                            <div className="p-4 sm:p-6 space-y-4">
                                                {/* 1. Teslimat Süreci (Timeline) */}
                                                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                                                    <OrderTimeline status={mevcutDurum} locale={locale} />
                                                </div>

                                                {/* 2. Kalem Kalem Ürün Döküm Tablosu */}
                                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                                                    <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                                        <span>{locale === 'de' ? 'Bestellte Artikel' : 'Sipariş Edilen Ürünler'}</span>
                                                        <span>{detaylar.length} {locale === 'de' ? 'Position(en)' : 'Kalem'}</span>
                                                    </div>

                                                    <div className="divide-y divide-slate-100">
                                                        {detaylar.map((item, idx) => {
                                                            const urun = item.urunler;
                                                            const urunAdi = getUrunAdi(urun?.ad, locale);
                                                            const imgUrl = urun?.ana_resim_url;

                                                            return (
                                                                <div key={idx} className="p-3.5 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                                            {imgUrl ? (
                                                                                <Image
                                                                                    src={imgUrl}
                                                                                    alt={urunAdi}
                                                                                    width={40}
                                                                                    height={40}
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                            ) : (
                                                                                <FiPackage className="text-slate-400" size={16} />
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                                                                                {urunAdi}
                                                                            </p>
                                                                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                                                                {urun?.stok_kodu && (
                                                                                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                                                                        {urun.stok_kodu}
                                                                                    </span>
                                                                                )}
                                                                                <span>{item.miktar} {locale === 'de' ? 'Karton (Koli)' : 'Koli'}</span>
                                                                                <span>×</span>
                                                                                <span className="font-semibold">{formatFiyat(item.birim_fiyat, locale)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="text-right flex-shrink-0">
                                                                        <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                                                                            {formatFiyat(item.toplam_fiyat, locale)}
                                                                        </span>
                                                                        <span className="block text-[10px] text-slate-400">Netto</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Alt Toplam & Bilgi Satırı */}
                                                    <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                                        <div className="flex items-center gap-2 text-slate-600">
                                                            {siparis.teslimat_adresi && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <FiMapPin size={13} className="text-slate-400 flex-shrink-0" />
                                                                    <span className="font-medium text-slate-700">{siparis.teslimat_adresi}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-auto">
                                                            <div className="text-right">
                                                                <span className="text-slate-500 mr-2">Net:</span>
                                                                <span className="font-bold text-slate-800">{formatFiyat(siparis.toplam_tutar_net, locale)}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-slate-500 mr-2">Brüt (+%{siparis.kdv_orani || 7} KDV):</span>
                                                                <span className="font-extrabold text-slate-900">{formatFiyat(siparis.toplam_tutar_brut, locale)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 3. Sayfa Bağlantısı */}
                                                <div className="flex items-center justify-between pt-1">
                                                    {(isAdmin || (isAltBayi && activeTab === 'musteri')) && (
                                                        <HizliDurumButonu
                                                            siparisId={siparis.id}
                                                            durum={mevcutDurum}
                                                            onUpdate={handleDurumUpdate}
                                                        />
                                                    )}
                                                    <Link
                                                        href={isAdmin ? `/${locale}/admin/operasyon/siparisler/${siparis.id}` : `/${locale}/portal/siparisler/${siparis.id}`}
                                                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-950 hover:underline ml-auto"
                                                    >
                                                        <span>{locale === 'de' ? 'Vollständige Bestelldetails & Beleg ansehen' : 'Tüm Sipariş Faturasını ve Detayını Gör'}</span>
                                                        <FiArrowRight size={13} />
                                                    </Link>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
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
