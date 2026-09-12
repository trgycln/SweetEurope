'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
    FiCalendar, FiUser, FiX, FiCheck, FiRefreshCw, FiBriefcase,
    FiEdit2, FiAlertCircle, FiClock, FiGrid, FiColumns, FiLoader,
    FiPlus, FiMessageSquare, FiCheckSquare, FiSquare, FiTrash2, FiSave, FiList,
    FiSearch, FiZap, FiChevronDown, FiChevronUp, FiCheckCircle, FiCopy, FiExternalLink, FiSmartphone
} from 'react-icons/fi';
import {
    gorevDurumGuncelleAction,
    gorevDurumDegistirAction,
    fetchGorevDetayAction,
    addGorevNotuAction,
    addAltGorevAction,
    toggleAltGorevAction,
    editAltGorevAction,
    deleteAltGorevAction,
    deleteGorevNotuAction,
    gorevTarihGuncelleAction,
    gorevSilAction,
    gorevHizliEkleAction,
    gorevGuncelleAction,
    gorevOncelikGuncelleAction,
    gorevAtananKisiGuncelleAction,
    getUserCalendarUrlAction,
} from '@/app/[locale]/admin/gorevler/actions';
import { toast } from 'sonner';
import { formatLinks } from '@/lib/utils';

import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });
const MDPreview = dynamic(() => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

export type GorevOncelik = 'Düşük' | 'Orta' | 'Yüksek';
export type GorevDurumu  = 'Yapılacak' | 'Devam Ediyor' | 'Tamamlandı';

export type GorevRow = {
    id: string;
    baslik: string;
    aciklama: string | null;
    atanan_kisi_id: string;
    ilgili_firma_id: string | null;
    son_tarih: string | null;
    tamamlandi: boolean;
    durum: GorevDurumu;
    oncelik: GorevOncelik;
    created_at: string;
    ilgili_firma?: { unvan: string } | null;
    atanan_kisi?: { tam_ad: string | null } | null;
    alt_gorevler?: Array<{ id: string; baslik: string; tamamlandi: boolean; olusturma_tarihi: string }>;
    gorev_notlari?: Array<{ id: string; not_metni: string; kullanici_id?: string; olusturma_tarihi: string; kullanici_adi?: string | null }>;
};

export type ProfilOption = { id: string; tam_ad: string | null; rol?: string | null };
export type FirmaOption  = { id: string; unvan: string };

export interface GorevlerClientProps {
    gorevler: GorevRow[];
    profiller: ProfilOption[];
    firmalar?: FirmaOption[];
    locale: string;
    isPortal?: boolean;
    baseFirmaPath?: string;
    baseTaskDetailPath?: string;
    currentUserId?: string;
    defaultMode?: 'list' | 'kanban' | 'cards';
}

// ── Config ────────────────────────────────────────────────────────────────────

const ONCELIK_CFG = {
    'Yüksek': { dot: 'bg-red-500',   badge: 'bg-red-100 text-red-700 border-red-200', text: 'text-red-700' },
    'Orta':   { dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-800 border-amber-200', text: 'text-amber-700' },
    'Düşük':  { dot: 'bg-blue-500',  badge: 'bg-blue-100 text-blue-700 border-blue-200', text: 'text-blue-700' },
} as const;

const DURUM_CFG = {
    'Yapılacak':    { badge: 'bg-slate-100 text-slate-700 border-slate-200', col: 'border-slate-200 bg-slate-50/70', dot: 'bg-slate-400' },
    'Devam Ediyor': { badge: 'bg-blue-100 text-blue-700 border-blue-200',    col: 'border-blue-200 bg-blue-50/70', dot: 'bg-blue-500' },
    'Tamamlandı':   { badge: 'bg-green-100 text-green-700 border-green-200', col: 'border-green-200 bg-green-50/70', dot: 'bg-green-500' },
} as const;

const KANBAN_COLS: GorevDurumu[] = ['Yapılacak', 'Devam Ediyor', 'Tamamlandı'];

const DURUM_ACTIONS: Record<GorevDurumu, Array<{ label: string; to: GorevDurumu; cls: string }>> = {
    'Yapılacak':    [{ label: 'Başlat ⚡', to: 'Devam Ediyor', cls: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' }],
    'Devam Ediyor': [
        { label: '← Geri Al', to: 'Yapılacak',    cls: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200' },
        { label: 'Tamamla ✓', to: 'Tamamlandı',   cls: 'bg-emerald-600 text-white hover:bg-emerald-700 font-bold' },
    ],
    'Tamamlandı':   [{ label: '↺ Yeniden Aç', to: 'Yapılacak', cls: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200' }],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(date: string | null, locale: string): string {
    if (!date) return '—';
    try { return new Date(date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return '—'; }
}

function fmtTime(date: string): string {
    try { return new Date(date).toLocaleDateString('tr', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return '—'; }
}

function overdue(date: string | null, done: boolean): boolean {
    if (!date || done) return false;
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d < new Date();
}

function getRelativeDateInfo(dateStr: string | null, done: boolean) {
    if (!dateStr) {
        return {
            text: 'Tarih Belirtilmedi',
            isLate: false,
            isToday: false,
            isTomorrow: false,
            badgeClass: 'text-slate-400 bg-slate-50 border-slate-200'
        };
    }
    const d = new Date(dateStr);
    const now = new Date();
    const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((dStart.getTime() - nowStart.getTime()) / (1000 * 60 * 60 * 24));

    if (done) {
        return {
            text: d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
            isLate: false,
            isToday: false,
            isTomorrow: false,
            badgeClass: 'text-slate-500 bg-slate-100 border-slate-200'
        };
    }

    if (diffDays < 0) {
        return {
            text: `Gecikmiş (${Math.abs(diffDays)} gün)`,
            isLate: true,
            isToday: false,
            isTomorrow: false,
            badgeClass: 'text-red-700 bg-red-50 border-red-200 font-bold'
        };
    }
    if (diffDays === 0) {
        return {
            text: 'Bugün!',
            isLate: false,
            isToday: true,
            isTomorrow: false,
            badgeClass: 'text-amber-700 bg-amber-50 border-amber-300 ring-1 ring-amber-200 font-bold'
        };
    }
    if (diffDays === 1) {
        return {
            text: 'Yarın',
            isLate: false,
            isToday: false,
            isTomorrow: true,
            badgeClass: 'text-blue-700 bg-blue-50 border-blue-200 font-semibold'
        };
    }
    if (diffDays <= 7) {
        return {
            text: `${diffDays} gün kaldı`,
            isLate: false,
            isToday: false,
            isTomorrow: false,
            badgeClass: 'text-slate-700 bg-slate-100 border-slate-200 font-medium'
        };
    }
    return {
        text: d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }),
        isLate: false,
        isToday: false,
        isTomorrow: false,
        badgeClass: 'text-slate-600 bg-slate-50 border-slate-200 font-medium'
    };
}

function initials(name: string | null | undefined): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── Görev Sıralama Fonksiyonları ──────────────────────────────────────────────

function sortUpcomingTasks(tasks: GorevRow[], currentUserId?: string) {
    return [...tasks].sort((a, b) => {
        // 0. Kullanıcının kendi görevleri en başta (öncelikli)
        if (currentUserId) {
            const aMine = a.atanan_kisi_id === currentUserId;
            const bMine = b.atanan_kisi_id === currentUserId;
            if (aMine && !bMine) return -1;
            if (!aMine && bMine) return 1;
        }

        // 1. Gecikenler en başa (gecikme tarihi daha eski olan en başta)
        const aLate = overdue(a.son_tarih, a.tamamlandi);
        const bLate = overdue(b.son_tarih, b.tamamlandi);
        if (aLate && !bLate) return -1;
        if (!aLate && bLate) return 1;

        // 2. Tarihi olanlar tarihe göre artan (yaklaşan günler en başta)
        if (a.son_tarih && b.son_tarih) {
            return new Date(a.son_tarih).getTime() - new Date(b.son_tarih).getTime();
        }
        if (a.son_tarih && !b.son_tarih) return -1;
        if (!a.son_tarih && b.son_tarih) return 1;

        // 3. Tarihsiz olanlar en sonda (oluşturulma tarihine göre yeniler önce)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

function sortInProgressTasks(tasks: GorevRow[], currentUserId?: string) {
    return [...tasks].sort((a, b) => {
        // 0. Kullanıcının kendi görevleri en başta (öncelikli)
        if (currentUserId) {
            const aMine = a.atanan_kisi_id === currentUserId;
            const bMine = b.atanan_kisi_id === currentUserId;
            if (aMine && !bMine) return -1;
            if (!aMine && bMine) return 1;
        }

        // 1. Gecikenler öncelikli
        const aLate = overdue(a.son_tarih, a.tamamlandi);
        const bLate = overdue(b.son_tarih, b.tamamlandi);
        if (aLate && !bLate) return -1;
        if (!aLate && bLate) return 1;

        // 2. Öncelik sırası: Yüksek > Orta > Düşük
        const prioScore: Record<GorevOncelik, number> = { 'Yüksek': 3, 'Orta': 2, 'Düşük': 1 };
        const pDiff = (prioScore[b.oncelik] || 2) - (prioScore[a.oncelik] || 2);
        if (pDiff !== 0) return pDiff;

        // 3. Tarihi olanlar tarihe göre artan
        if (a.son_tarih && b.son_tarih) {
            return new Date(a.son_tarih).getTime() - new Date(b.son_tarih).getTime();
        }
        if (a.son_tarih) return -1;
        if (b.son_tarih) return 1;

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

// ── Görev Kartı (Kanban Görünümü) ──────────────────────────────────────────────

function GorevKarti({
    g, locale, onOpen, showStatusButtons, onStatusChange
}: {
    g: GorevRow;
    locale: string;
    onOpen: (g: GorevRow) => void;
    showStatusButtons?: boolean;
    onStatusChange?: (id: string, durum: GorevDurumu) => void;
    baseFirmaPath?: string;
}) {
    const [pending, startT] = useTransition();
    const prio = ONCELIK_CFG[g.oncelik] ?? ONCELIK_CFG['Orta'];
    const dateInfo = getRelativeDateInfo(g.son_tarih, g.tamamlandi);
    const name = g.atanan_kisi?.tam_ad ?? 'Atanmadı';
    const actions = showStatusButtons ? (DURUM_ACTIONS[g.durum] ?? []) : [];

    function moveTo(durum: GorevDurumu) {
        startT(async () => {
            const res = await gorevDurumDegistirAction(g.id, durum, locale);
            if (res.success) { toast.success(res.success); onStatusChange?.(g.id, durum); }
            else if (res.error) toast.error(res.error);
        });
    }

    return (
        <div className={[
            'bg-white rounded-2xl border shadow-sm transition-all duration-200 hover:shadow-md flex flex-col',
            g.tamamlandi ? 'opacity-70 bg-slate-50/50' : '',
            dateInfo.isLate ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200',
        ].join(' ')}>
            <div className={`h-1.5 rounded-t-2xl ${prio.dot}`} />
            
            <button
                type="button"
                onClick={() => onOpen(g)}
                className="w-full text-left p-4 focus:outline-none flex-1"
            >
                <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${prio.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />{g.oncelik}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${DURUM_CFG[g.durum]?.badge ?? ''}`}>
                        {g.durum}
                    </span>
                </div>

                <p className={`text-[15px] font-bold leading-snug mb-1.5 ${g.tamamlandi ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {g.baslik}
                </p>

                {g.aciklama && (
                    <p className="text-[13px] text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                        {g.aciklama.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}
                    </p>
                )}

                {g.ilgili_firma?.unvan && (
                    <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md mb-3 max-w-full truncate">
                        <FiBriefcase size={12} className="flex-shrink-0" />
                        <span className="truncate">{g.ilgili_firma.unvan}</span>
                    </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-[10px] font-bold flex-shrink-0 inline-flex items-center justify-center shadow-xs">
                            {initials(name)}
                        </span>
                        <span className="text-[12px] font-medium text-slate-700 truncate">{name}</span>
                    </div>

                    {g.son_tarih && (
                        <span className={`flex items-center gap-1 text-[11px] font-semibold flex-shrink-0 px-2 py-0.5 rounded-md border ${dateInfo.badgeClass}`}>
                            {dateInfo.isLate ? <FiAlertCircle size={12} /> : <FiCalendar size={12} />}
                            {dateInfo.text}
                        </span>
                    )}
                </div>
            </button>

            {actions.length > 0 && (
                <div className="flex gap-1.5 px-3 pb-3 pt-1 border-t border-slate-50">
                    {actions.map(a => (
                        <button
                            key={a.to}
                            type="button"
                            onClick={() => moveTo(a.to)}
                            disabled={pending}
                            className={`flex-1 text-[12px] py-1.5 px-2 rounded-xl transition-all disabled:opacity-50 ${a.cls}`}
                        >
                            {pending ? <FiLoader size={12} className="animate-spin mx-auto" /> : a.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Devam Eden Görev Kartı (Üst Odak Alanı) ───────────────────────────────────

function DevamEdenGorevKarti({
    g,
    locale,
    onOpen,
    onStatusChange,
    onDateChange,
}: {
    g: GorevRow;
    locale: string;
    onOpen: (g: GorevRow) => void;
    onStatusChange?: (id: string, durum: GorevDurumu) => void;
    onDateChange?: (id: string, date: string) => void;
}) {
    const [pending, startT] = useTransition();
    const prio = ONCELIK_CFG[g.oncelik] ?? ONCELIK_CFG['Orta'];
    const dateInfo = getRelativeDateInfo(g.son_tarih, g.tamamlandi);
    const name = g.atanan_kisi?.tam_ad ?? 'Atanmadı';

    function handleMove(to: GorevDurumu) {
        if (!onStatusChange) return;
        onStatusChange(g.id, to);
        startT(async () => {
            const res = await gorevDurumDegistirAction(g.id, to, locale);
            if (res.success) toast.success(res.success);
            else if (res.error) toast.error(res.error);
        });
    }

    return (
        <div
            onClick={() => onOpen(g)}
            className={[
                'group relative bg-white hover:bg-slate-50/95 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md p-4 sm:p-5 flex flex-col justify-between',
                dateInfo.isLate ? 'border-red-300 ring-1 ring-red-100 bg-red-50/20' : 'border-blue-200/90 hover:border-blue-300'
            ].join(' ')}
        >
            {/* Sol Kenar Canlı Vurgusu */}
            <div className={`absolute top-0 left-0 bottom-0 w-1.5 rounded-l-2xl ${dateInfo.isLate ? 'bg-red-500' : 'bg-blue-600'}`} />

            <div>
                {/* Üst Bilgi Satırı: Öncelik, Durum ve Tarih */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${prio.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                            {g.oncelik}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                            Devam Ediyor
                        </span>
                    </div>

                    {/* Tarih Rozeti & Hızlı Seçici */}
                    <div className="flex items-center" onClick={e => e.stopPropagation()}>
                        <div className="relative group/date">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${dateInfo.badgeClass}`}>
                                {dateInfo.isLate ? <FiAlertCircle size={12} className="text-red-600" /> : <FiCalendar size={12} />}
                                {dateInfo.text}
                            </span>
                            {onDateChange && (
                                <input
                                    type="date"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) => onDateChange(g.id, e.target.value)}
                                    value={g.son_tarih ? g.son_tarih.split('T')[0] : ''}
                                    title="Tarihi Güncelle"
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Başlık */}
                <h3 className="text-[15px] sm:text-[16px] font-extrabold text-slate-900 leading-snug mb-1.5 group-hover:text-blue-900 transition-colors">
                    {g.baslik}
                </h3>

                {/* Açıklama Özeti */}
                {g.aciklama && (
                    <p className="text-[13px] text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                        {g.aciklama.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}
                    </p>
                )}

                {/* Firma Bağlantısı */}
                {g.ilgili_firma?.unvan && (
                    <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-800 bg-blue-50/80 px-2.5 py-1 rounded-lg mb-3 max-w-full truncate border border-blue-100">
                        <FiBriefcase size={12} className="flex-shrink-0 text-blue-600" />
                        <span className="truncate">{g.ilgili_firma.unvan}</span>
                    </div>
                )}
            </div>

            {/* Alt Bilgi & Hızlı Aksiyonlar */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-[10px] font-bold flex-shrink-0 inline-flex items-center justify-center shadow-2xs">
                        {initials(name)}
                    </span>
                    <span className="text-[12px] font-medium text-slate-700 truncate">{name}</span>
                </div>

                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => handleMove('Yapılacak')}
                        disabled={pending}
                        className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all disabled:opacity-50"
                        title="Yapılacaklar listesine geri al"
                    >
                        ← Geri Al
                    </button>
                    <button
                        type="button"
                        onClick={() => handleMove('Tamamlandı')}
                        disabled={pending}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center gap-1 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                        title="Görevi tamamlandı olarak işaretle"
                    >
                        {pending ? <FiLoader size={11} className="animate-spin" /> : <FiCheck size={12} />}
                        <span>Tamamla</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Asana / Excel Tarzı İnteraktif Tablo Satırı ───────────────────────────────

function GorevTabloSatiri({
    g,
    locale,
    profiller,
    currentUserId,
    onOpen,
    onStatusChange,
    onDateChange,
    onPriorityChange,
    onAssigneeChange,
    baseFirmaPath,
}: {
    g: GorevRow;
    locale: string;
    profiller: ProfilOption[];
    currentUserId?: string;
    onOpen: (g: GorevRow) => void;
    onStatusChange: (id: string, durum: GorevDurumu) => void;
    onDateChange: (id: string, date: string) => void;
    onPriorityChange: (id: string, oncelik: GorevOncelik) => void;
    onAssigneeChange: (id: string, atananKisiId: string) => void;
    baseFirmaPath?: string;
}) {
    const prio = ONCELIK_CFG[g.oncelik] ?? ONCELIK_CFG['Orta'];
    const dateInfo = getRelativeDateInfo(g.son_tarih, g.tamamlandi);
    const name = g.atanan_kisi?.tam_ad ?? 'Atanmadı';

    return (
        <tr className={`group transition-colors border-b border-slate-100/90 text-sm ${
            g.tamamlandi
                ? 'opacity-65 bg-slate-50/40 hover:bg-slate-50'
                : g.durum === 'Devam Ediyor'
                ? 'bg-slate-50/50 hover:bg-slate-100/70'
                : 'hover:bg-slate-50/80'
        }`}>
            {/* 1. Checkbox / Tamamla */}
            <td className="w-10 px-3 py-2.5 text-center align-middle" onClick={e => e.stopPropagation()}>
                <button
                    type="button"
                    onClick={() => onStatusChange(g.id, g.tamamlandi ? 'Yapılacak' : 'Tamamlandı')}
                    className="text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer flex items-center justify-center mx-auto"
                    title={g.tamamlandi ? 'Görevi yeniden aç' : 'Tamamlandı olarak işaretle'}
                >
                    {g.tamamlandi ? (
                        <FiCheckSquare className="text-emerald-600" size={18} />
                    ) : (
                        <FiSquare className="group-hover:text-slate-500 hover:text-emerald-600" size={18} />
                    )}
                </button>
            </td>

            {/* 2. Görev Başlığı */}
            <td className="px-3 py-2.5 align-middle">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onOpen(g)}
                        className={`text-left font-semibold text-xs sm:text-sm hover:text-blue-600 transition-colors cursor-pointer line-clamp-1 ${
                            g.tamamlandi ? 'line-through text-slate-400 font-normal' : 'text-slate-900'
                        }`}
                        title={g.baslik}
                    >
                        {g.baslik}
                    </button>

                    {/* Alt görev sayısı rozeti */}
                    {g.alt_gorevler && g.alt_gorevler.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex-shrink-0" title="Alt Görevler">
                            <FiCheckSquare size={10} />
                            {g.alt_gorevler.filter(a => a.tamamlandi).length}/{g.alt_gorevler.length}
                        </span>
                    )}

                    {/* Not rozeti */}
                    {g.aciklama && (
                        <span className="text-slate-400 flex-shrink-0" title="Açıklama mevcut">
                            <FiMessageSquare size={12} />
                        </span>
                    )}
                </div>
            </td>

            {/* 3. Durum (Asana Pill Select) */}
            <td className="w-36 px-2 py-2 align-middle">
                <div className="relative inline-block w-full">
                    <select
                        value={g.durum}
                        onChange={e => onStatusChange(g.id, e.target.value as GorevDurumu)}
                        className={`w-full appearance-none text-[11px] font-bold pl-2.5 pr-6 py-1 rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all ${
                            g.durum === 'Devam Ediyor'
                                ? 'bg-blue-100 text-blue-800 border-blue-300 ring-1 ring-blue-200'
                                : g.durum === 'Tamamlandı'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                    >
                        <option value="Yapılacak">Yapılacak</option>
                        <option value="Devam Ediyor">Devam Ediyor ⚡</option>
                        <option value="Tamamlandı">Tamamlandı ✓</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 opacity-60">
                        <FiChevronDown size={12} />
                    </div>
                </div>
            </td>

            {/* 4. Bitiş Tarihi (Quick Date Picker) */}
            <td className="w-36 px-2 py-2 align-middle">
                <label className="relative inline-flex items-center gap-1 cursor-pointer group/date" title="Tarihi değiştirmek için tıklayın">
                    <input
                        type="date"
                        value={g.son_tarih ? g.son_tarih.slice(0, 10) : ''}
                        onChange={e => onDateChange(g.id, e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                    />
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition-all ${
                        g.son_tarih
                            ? dateInfo.isLate && !g.tamamlandi
                                ? 'bg-red-50 text-red-700 border-red-200 font-bold group-hover/date:border-red-400'
                                : 'bg-slate-50 text-slate-700 border-slate-200 group-hover/date:border-slate-400 group-hover/date:bg-white'
                            : 'bg-transparent text-slate-400 border-dashed border-slate-200 hover:border-slate-400 hover:text-slate-600'
                    }`}>
                        <FiCalendar size={11} className={dateInfo.isLate && !g.tamamlandi ? 'text-red-500' : 'text-slate-400'} />
                        <span>{g.son_tarih ? dateInfo.text : 'Tarih Ekle'}</span>
                    </span>
                </label>
            </td>

            {/* 5. Öncelik Seçici */}
            <td className="w-28 px-2 py-2 align-middle">
                <div className="relative inline-block w-full">
                    <select
                        value={g.oncelik}
                        onChange={e => onPriorityChange(g.id, e.target.value as GorevOncelik)}
                        className={`w-full appearance-none text-[11px] font-bold pl-2 pr-5 py-1 rounded-lg border cursor-pointer transition-all ${prio.badge}`}
                    >
                        <option value="Düşük">🔵 Düşük</option>
                        <option value="Orta">🟡 Orta</option>
                        <option value="Yüksek">🔴 Yüksek</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5 opacity-60">
                        <FiChevronDown size={11} />
                    </div>
                </div>
            </td>

            {/* 6. Atanan Kişi */}
            <td className="w-40 px-2 py-2 align-middle">
                <div className="relative inline-block w-full">
                    <select
                        value={g.atanan_kisi_id || ''}
                        onChange={e => onAssigneeChange(g.id, e.target.value)}
                        className="w-full appearance-none text-[11px] font-semibold pl-2 pr-6 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all truncate"
                    >
                        {profiller.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.tam_ad || 'Kullanıcı'}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 opacity-50">
                        <FiChevronDown size={12} />
                    </div>
                </div>
            </td>

            {/* 7. Firma / Müşteri */}
            <td className="w-36 px-2 py-2 align-middle">
                {g.ilgili_firma?.unvan ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-700 truncate" title={g.ilgili_firma.unvan}>
                        <FiBriefcase size={12} className="text-blue-500 flex-shrink-0" />
                        <span className="truncate font-medium">{g.ilgili_firma.unvan}</span>
                    </div>
                ) : (
                    <span className="text-xs text-slate-300">—</span>
                )}
            </td>

            {/* 8. İşlemler */}
            <td className="w-28 px-3 py-2 align-middle text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1.5">
                    {g.durum === 'Yapılacak' && (
                        <button
                            type="button"
                            onClick={() => onStatusChange(g.id, 'Devam Ediyor')}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 transition-all flex items-center gap-1 cursor-pointer"
                            title="Çalışmaya Başla"
                        >
                            <FiZap size={11} className="text-amber-500 fill-amber-500" />
                            <span>Başlat</span>
                        </button>
                    )}

                    {g.durum === 'Devam Ediyor' && (
                        <button
                            type="button"
                            onClick={() => onStatusChange(g.id, 'Tamamlandı')}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Tamamla"
                        >
                            <FiCheck size={11} />
                            <span>Tamamla</span>
                        </button>
                    )}

                    {g.durum === 'Tamamlandı' && (
                        <button
                            type="button"
                            onClick={() => onStatusChange(g.id, 'Yapılacak')}
                            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                            title="Yeniden Aç"
                        >
                            <FiRefreshCw size={11} />
                            <span>Aç</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => onOpen(g)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Görevi İncele / Notlar"
                    >
                        <FiEdit2 size={13} />
                    </button>
                </div>
            </td>
        </tr>
    );
}

// ── İnline Hızlı Görev Ekleme Satırı ──────────────────────────────────────────

function GorevHizliEkleSatiri({
    defaultDurum,
    onQuickAdd,
}: {
    defaultDurum: GorevDurumu;
    onQuickAdd: (baslik: string, durum: GorevDurumu) => Promise<void>;
}) {
    const [title, setTitle] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e?: React.FormEvent) {
        if (e) e.preventDefault();
        const trimmed = title.trim();
        if (!trimmed || submitting) return;
        setSubmitting(true);
        try {
            await onQuickAdd(trimmed, defaultDurum);
            setTitle('');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <tr className="border-t border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-colors">
            <td className="w-10 px-3 py-2 text-center text-slate-400">
                <FiPlus size={15} className="mx-auto" />
            </td>
            <td colSpan={6} className="px-3 py-2">
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder={`+ Yeni görev yazın ve Enter'a basın... (${defaultDurum} olarak eklenecek)`}
                        className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none py-1"
                        disabled={submitting}
                    />
                    {title.trim() && (
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-2.5 py-1 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all flex-shrink-0 cursor-pointer"
                        >
                            {submitting ? 'Ekleniyor...' : 'Ekle'}
                        </button>
                    )}
                </form>
            </td>
            <td className="px-3 py-2 text-right">
                <span className="text-[11px] text-slate-400 font-medium select-none">
                    ↵ Enter
                </span>
            </td>
        </tr>
    );
}

// ── Asana / Excel Tablo Bölümü ────────────────────────────────────────────────

function GorevTablosu({
    title,
    icon,
    badgeText,
    badgeColor = 'bg-slate-100 text-slate-700',
    description,
    tasks,
    profiller,
    currentUserId,
    locale,
    defaultDurum,
    accentBorder = 'border-slate-200',
    accentHeader = 'bg-white',
    collapsible = false,
    defaultOpen = true,
    onOpen,
    onStatusChange,
    onDateChange,
    onPriorityChange,
    onAssigneeChange,
    onQuickAdd,
    baseFirmaPath,
}: {
    title: string;
    icon: React.ReactNode;
    badgeText: string;
    badgeColor?: string;
    description?: string;
    tasks: GorevRow[];
    profiller: ProfilOption[];
    currentUserId?: string;
    locale: string;
    defaultDurum: GorevDurumu;
    accentBorder?: string;
    accentHeader?: string;
    collapsible?: boolean;
    defaultOpen?: boolean;
    onOpen: (g: GorevRow) => void;
    onStatusChange: (id: string, durum: GorevDurumu) => void;
    onDateChange: (id: string, date: string) => void;
    onPriorityChange: (id: string, oncelik: GorevOncelik) => void;
    onAssigneeChange: (id: string, atananKisiId: string) => void;
    onQuickAdd: (baslik: string, durum: GorevDurumu) => Promise<void>;
    baseFirmaPath?: string;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <section className={`rounded-2xl border ${accentBorder} bg-white shadow-xs overflow-hidden transition-all duration-200`}>
            {/* Bölüm Başlığı */}
            <div
                onClick={() => collapsible && setIsOpen(!isOpen)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 sm:px-5 ${accentHeader} border-b border-slate-200/80 ${collapsible ? 'cursor-pointer hover:bg-slate-50/80 select-none' : ''}`}
            >
                <div className="flex items-center gap-2.5">
                    {collapsible && (
                        <div className="text-slate-400 hover:text-slate-700">
                            {isOpen ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                        </div>
                    )}
                    <span className="text-base sm:text-lg flex-shrink-0">{icon}</span>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                                {title}
                            </h2>
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs ${badgeColor}`}>
                                {badgeText}
                            </span>
                        </div>
                        {description && (
                            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tablo İçeriği */}
            {isOpen && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[780px]">
                        <thead>
                            <tr className="bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 select-none">
                                <th className="w-10 px-3 py-2.5 text-center">✓</th>
                                <th className="px-3 py-2.5">Görev Başlığı</th>
                                <th className="w-36 px-2 py-2.5">Durum</th>
                                <th className="w-36 px-2 py-2.5">Bitiş Tarihi</th>
                                <th className="w-28 px-2 py-2.5">Öncelik</th>
                                <th className="w-40 px-2 py-2.5">Atanan Kişi</th>
                                <th className="w-36 px-2 py-2.5">Firma / Müşteri</th>
                                <th className="w-28 px-3 py-2.5 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/80">
                            {tasks.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-xs text-slate-400 font-medium">
                                        Bu tabloda henüz görev bulunmuyor.
                                    </td>
                                </tr>
                            ) : (
                                tasks.map(g => (
                                    <GorevTabloSatiri
                                        key={g.id}
                                        g={g}
                                        locale={locale}
                                        profiller={profiller}
                                        currentUserId={currentUserId}
                                        onOpen={onOpen}
                                        onStatusChange={onStatusChange}
                                        onDateChange={onDateChange}
                                        onPriorityChange={onPriorityChange}
                                        onAssigneeChange={onAssigneeChange}
                                        baseFirmaPath={baseFirmaPath}
                                    />
                                ))
                            )}
                            {/* İnline Yeni Görev Ekleme Satırı */}
                            <GorevHizliEkleSatiri
                                defaultDurum={defaultDurum}
                                onQuickAdd={onQuickAdd}
                            />
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

// ── Görev Satırı (Liste Görünümü) ─────────────────────────────────────────────

function GorevSatiri({
    g, locale, onOpen, onDateChange, onStatusChange
}: {
    g: GorevRow;
    locale: string;
    onOpen: (g: GorevRow) => void;
    onDateChange?: (id: string, date: string) => void;
    onStatusChange?: (id: string, durum: GorevDurumu) => void;
    baseFirmaPath?: string;
}) {
    const [pending, startT] = useTransition();
    const prio = ONCELIK_CFG[g.oncelik] ?? ONCELIK_CFG['Orta'];
    const dateInfo = getRelativeDateInfo(g.son_tarih, g.tamamlandi);
    const name = g.atanan_kisi?.tam_ad ?? 'Atanmadı';

    function handleQuickStatus(to: GorevDurumu) {
        if (!onStatusChange) return;
        onStatusChange(g.id, to);
        startT(async () => {
            const res = await gorevDurumDegistirAction(g.id, to, locale);
            if (res.success) toast.success(res.success);
            else if (res.error) toast.error(res.error);
        });
    }

    return (
        <div
            onClick={() => onOpen(g)}
            className={[
                'w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/80 border rounded-2xl p-3.5 sm:p-4 text-left transition-all duration-150 cursor-pointer shadow-xs',
                g.tamamlandi ? 'opacity-65 bg-slate-50/40' : '',
                dateInfo.isLate && !g.tamamlandi ? 'border-red-200 hover:border-red-300 ring-1 ring-red-50 bg-red-50/5' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
            ].join(' ')}
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Öncelik İndikatörü */}
                <div className={`w-2 h-10 rounded-full flex-shrink-0 ${prio.dot}`} />

                {/* Başlık ve Firma */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className={`text-[14px] sm:text-[15px] font-bold leading-snug truncate ${g.tamamlandi ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {g.baslik}
                        </p>
                        <span className={`sm:hidden text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${prio.badge}`}>
                            {g.oncelik}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                        {g.ilgili_firma?.unvan ? (
                            <div className="flex items-center gap-1 text-[12px] font-medium text-slate-500">
                                <FiBriefcase size={12} className="text-blue-500 flex-shrink-0" />
                                <span className="truncate text-blue-700 font-semibold">{g.ilgili_firma.unvan}</span>
                            </div>
                        ) : (
                            <span className="text-[11px] text-slate-400 opacity-60">Firma bağlantısı yok</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Sağ Blok: Öncelik, Tarih, Personel ve Hızlı Aksiyonlar */}
            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 sm:gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                {/* Öncelik Rozeti (Geniş ekran) */}
                <div className="hidden lg:flex items-center flex-shrink-0">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${prio.badge}`}>
                        {g.oncelik}
                    </span>
                </div>

                {/* Tarih Rozeti */}
                <div className="flex items-center flex-shrink-0 relative group/date" onClick={e => e.stopPropagation()}>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold transition-colors px-2.5 py-1 rounded-lg border ${dateInfo.badgeClass}`}>
                        {dateInfo.isLate ? <FiAlertCircle size={12} className="text-red-600" /> : <FiCalendar size={12} />}
                        {dateInfo.text}
                    </span>
                    {onDateChange && (
                        <input
                            type="date"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => onDateChange(g.id, e.target.value)}
                            value={g.son_tarih ? g.son_tarih.split('T')[0] : ''}
                            title="Tarihi Değiştir"
                        />
                    )}
                </div>

                {/* Atanan Kişi */}
                <div className="hidden md:flex w-28 lg:w-36 flex-shrink-0 items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-[10px] font-bold flex-shrink-0 inline-flex items-center justify-center shadow-2xs">
                        {initials(name)}
                    </span>
                    <span className="text-[12px] font-semibold text-slate-700 truncate">{name}</span>
                </div>

                {/* Hızlı Aksiyon Butonları */}
                <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {g.durum === 'Yapılacak' && (
                        <button
                            type="button"
                            onClick={() => handleQuickStatus('Devam Ediyor')}
                            disabled={pending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 transition-all shadow-2xs hover:shadow-xs active:scale-[0.98]"
                            title="Bu görevi üzerinde çalışmaya başla"
                        >
                            {pending ? <FiLoader size={12} className="animate-spin" /> : <FiZap size={13} className="text-amber-500 fill-amber-500" />}
                            <span>Başlat</span>
                        </button>
                    )}

                    {g.durum === 'Devam Ediyor' && (
                        <button
                            type="button"
                            onClick={() => handleQuickStatus('Tamamlandı')}
                            disabled={pending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs active:scale-[0.98]"
                            title="Tamamla"
                        >
                            {pending ? <FiLoader size={12} className="animate-spin" /> : <FiCheck size={13} />}
                            <span>Tamamla</span>
                        </button>
                    )}

                    {g.durum === 'Tamamlandı' && (
                        <button
                            type="button"
                            onClick={() => handleQuickStatus('Yapılacak')}
                            disabled={pending}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all"
                            title="Yeniden Aç"
                        >
                            {pending ? <FiLoader size={12} className="animate-spin" /> : <FiRefreshCw size={12} />}
                            <span>Yeniden Aç</span>
                        </button>
                    )}

                    {/* Hızlı Durum Menüsü */}
                    <div className="relative">
                        <select
                            value={g.durum}
                            onChange={(e) => handleQuickStatus(e.target.value as GorevDurumu)}
                            className={`appearance-none text-[11px] font-bold pl-2.5 pr-6 py-1.5 rounded-xl border cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors ${DURUM_CFG[g.durum]?.badge ?? ''}`}
                        >
                            <option value="Yapılacak">Yapılacak</option>
                            <option value="Devam Ediyor">Devam Ediyor</option>
                            <option value="Tamamlandı">Tamamlandı</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5 opacity-60">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

function GorevDrawer({
    g, locale, onClose, onToggle, onStatusChange, onDeleteTask, onUpdateDetails, baseFirmaPath, isPortal
}: {
    g: GorevRow;
    locale: string;
    onClose: () => void;
    onToggle: () => void;
    onStatusChange: (id: string, durum: GorevDurumu) => void;
    onDeleteTask?: (id: string) => void;
    onUpdateDetails?: (id: string, updates: Partial<GorevRow>) => void;
    baseFirmaPath?: string;
    baseTaskDetailPath?: string;
    isPortal?: boolean;
}) {
    const [togglePending, startToggle] = useTransition();
    const [notlar, setNotlar]           = useState<Array<{ id: string; not_metni: string; olusturma_tarihi: string; kullanici_adi: string | null }>>([]);
    const [altGorevler, setAltGorevler] = useState<Array<{ id: string; baslik: string; tamamlandi: boolean; olusturma_tarihi: string }>>([]);
    const [detayLoading, setDetayLoading] = useState(true);
    const [notText, setNotText]         = useState('');
    const [altText, setAltText]         = useState('');
    
    // Title & Description editing
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editableTitle, setEditableTitle] = useState(g.baslik);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [editableDesc, setEditableDesc] = useState(g.aciklama || '');

    // Subtask Editing State
    const [editingAltId, setEditingAltId] = useState<string | null>(null);
    const [expandedAltId, setExpandedAltId] = useState<string | null>(null);
    const [editAltText, setEditAltText]   = useState('');

    const [notPending, startNot]        = useTransition();
    const [altPending, startAlt]        = useTransition();
    const [toggleAltPending, startToggleAlt] = useTransition();
    const [actionPending, startAction]  = useTransition();

    const prio = ONCELIK_CFG[g.oncelik] ?? ONCELIK_CFG['Orta'];
    const late = overdue(g.son_tarih, g.tamamlandi);
    const name = g.atanan_kisi?.tam_ad ?? 'Atanmadı';
    const doneCount = altGorevler.filter(a => a.tamamlandi).length;

    useEffect(() => {
        setDetayLoading(true);
        fetchGorevDetayAction(g.id).then(res => {
            setNotlar(res.notlar);
            setAltGorevler(res.altGorevler);
            setDetayLoading(false);
        });
    }, [g.id]);

    function handleToggle() {
        startToggle(async () => {
            const res = await gorevDurumGuncelleAction(g.id, !g.tamamlandi, locale);
            if (res.success) { toast.success(res.success); onToggle(); }
            else if (res.error) toast.error(res.error);
        });
    }

    function saveTitle() {
        if (!editableTitle.trim()) return;
        startAction(async () => {
            const res = await gorevGuncelleAction(g.id, {
                baslik: editableTitle.trim(),
                aciklama: g.aciklama,
                son_tarih: g.son_tarih,
                atanan_kisi_id: g.atanan_kisi_id,
                ilgili_firma_id: g.ilgili_firma_id,
                oncelik: g.oncelik,
                tamamlandi: g.tamamlandi,
            }, locale);
            if (res.success) {
                toast.success('Başlık güncellendi.');
                setIsEditingTitle(false);
                onUpdateDetails?.(g.id, { baslik: editableTitle.trim() });
            } else if (res.error) toast.error(res.error);
        });
    }

    function saveDesc() {
        startAction(async () => {
            const res = await gorevGuncelleAction(g.id, {
                baslik: g.baslik,
                aciklama: editableDesc.trim() || null,
                son_tarih: g.son_tarih,
                atanan_kisi_id: g.atanan_kisi_id,
                ilgili_firma_id: g.ilgili_firma_id,
                oncelik: g.oncelik,
                tamamlandi: g.tamamlandi,
            }, locale);
            if (res.success) {
                toast.success('Açıklama kaydedildi.');
                setIsEditingDesc(false);
                onUpdateDetails?.(g.id, { aciklama: editableDesc.trim() || null });
            } else if (res.error) toast.error(res.error);
        });
    }

    function submitNot() {
        if (!notText.trim()) return;
        startNot(async () => {
            const res = await addGorevNotuAction(g.id, notText);
            if (res.success) {
                toast.success(res.success);
                setNotText('');
                const fresh = await fetchGorevDetayAction(g.id);
                setNotlar(fresh.notlar);
            } else if (res.error) toast.error(res.error);
        });
    }

    function removeNot(id: string) {
        if (!confirm('Bu notu silmek istediğinize emin misiniz?')) return;
        startAction(async () => {
            const res = await deleteGorevNotuAction(id);
            if (res.success) {
                toast.success(res.success);
                setNotlar(prev => prev.filter(n => n.id !== id));
            } else if (res.error) toast.error(res.error);
        });
    }

    function submitAlt() {
        if (!altText.trim()) return;
        startAlt(async () => {
            const res = await addAltGorevAction(g.id, altText);
            if (res.success) {
                toast.success(res.success);
                setAltText('');
                const fresh = await fetchGorevDetayAction(g.id);
                setAltGorevler(fresh.altGorevler);
            } else if (res.error) toast.error(res.error);
        });
    }

    function saveEditAlt(id: string) {
        if (!editAltText.trim()) return;
        startAction(async () => {
            const res = await editAltGorevAction(id, editAltText);
            if (res.success) {
                toast.success(res.success);
                setAltGorevler(prev => prev.map(a => a.id === id ? { ...a, baslik: editAltText } : a));
                setEditingAltId(null);
            } else if (res.error) toast.error(res.error);
        });
    }

    function removeAlt(id: string) {
        if (!confirm('Bu alt görevi silmek istediğinize emin misiniz?')) return;
        startAction(async () => {
            const res = await deleteAltGorevAction(id);
            if (res.success) {
                toast.success(res.success);
                setAltGorevler(prev => prev.filter(a => a.id !== id));
            } else if (res.error) toast.error(res.error);
        });
    }

    function toggleAlt(id: string, done: boolean) {
        setAltGorevler(prev => prev.map(a => a.id === id ? { ...a, tamamlandi: done } : a));
        startToggleAlt(async () => {
            const res = await toggleAltGorevAction(id, done);
            if (res.error) {
                toast.error(res.error);
                setAltGorevler(prev => prev.map(a => a.id === id ? { ...a, tamamlandi: !done } : a));
            }
        });
    }

    function handleDeleteTask() {
        if (!confirm('Bu görevi tamamen silmek istediğinize emin misiniz?')) return;
        startAction(async () => {
            const res = await gorevSilAction(g.id, locale);
            if (res.success) {
                toast.success('Görev silindi.');
                onDeleteTask?.(g.id);
                onClose();
            } else if (res.error) toast.error(res.error);
        });
    }

    const customerLink = g.ilgili_firma_id
        ? (baseFirmaPath ? `${baseFirmaPath}/${g.ilgili_firma_id}` : `/${locale}/${isPortal ? 'portal/musterilerim' : 'admin/crm/firmalar'}/${g.ilgili_firma_id}`)
        : null;

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity" onClick={onClose} aria-hidden="true" />
            <div className="fixed right-0 top-0 bottom-0 w-full sm:max-w-2xl bg-white z-50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
                <div className={`h-1.5 flex-shrink-0 ${prio.dot}`} />

                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 flex-shrink-0 bg-white">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${prio.badge}`}>{g.oncelik}</span>
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${DURUM_CFG[g.durum]?.badge ?? ''}`}>{g.durum}</span>
                        </div>

                        {isEditingTitle ? (
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="text"
                                    value={editableTitle}
                                    onChange={e => setEditableTitle(e.target.value)}
                                    className="flex-1 text-lg font-extrabold text-slate-900 border border-slate-300 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-slate-900 outline-none"
                                    autoFocus
                                    onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setIsEditingTitle(false); }}
                                />
                                <button onClick={saveTitle} disabled={actionPending} className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800">
                                    <FiSave size={16} />
                                </button>
                                <button onClick={() => setIsEditingTitle(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
                                    <FiX size={16} />
                                </button>
                            </div>
                        ) : (
                            <h2 
                                onClick={() => setIsEditingTitle(true)}
                                className={`text-xl font-extrabold leading-snug cursor-pointer group flex items-center gap-2 ${g.tamamlandi ? 'line-through text-slate-400' : 'text-slate-900'}`}
                                title="Başlığı düzenlemek için tıklayın"
                            >
                                <span>{g.baslik}</span>
                                <FiEdit2 size={14} className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                            </h2>
                        )}
                    </div>
                    <button type="button" onClick={onClose}
                        className="flex-shrink-0 p-2.5 rounded-full hover:bg-slate-100 text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors">
                        <FiX size={22} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 bg-slate-50/40">
                    {late && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-semibold shadow-xs">
                            <FiAlertCircle size={18} className="flex-shrink-0 text-red-500" />
                            <span>Bu görev gecikmiş durumda — Son tarih: {fmt(g.son_tarih, locale)}</span>
                        </div>
                    )}

                    {/* Detay Kartları */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                                <FiUser size={18} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Atanan Kişi</p>
                                <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{name}</p>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${late ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-600'}`}>
                                <FiCalendar size={18} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Son Tarih</p>
                                <p className={`text-sm font-bold mt-0.5 ${late ? 'text-red-600' : 'text-slate-900'}`}>
                                    {g.son_tarih ? fmt(g.son_tarih, locale) : 'Belirsiz'}
                                </p>
                            </div>
                        </div>

                        {g.ilgili_firma?.unvan && customerLink && (
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                    <FiBriefcase size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">İlgili Müşteri</p>
                                    <Link href={customerLink}
                                        className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline mt-0.5 block truncate" onClick={onClose}>
                                        {g.ilgili_firma.unvan}
                                    </Link>
                                </div>
                            </div>
                        )}

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                                <FiClock size={18} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Oluşturulma</p>
                                <p className="text-sm font-semibold text-slate-700 mt-0.5">{fmt(g.created_at, locale)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Açıklama */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Görev Açıklaması</p>
                            <button
                                type="button"
                                onClick={() => setIsEditingDesc(!isEditingDesc)}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-50"
                            >
                                <FiEdit2 size={12} /> {isEditingDesc ? 'İptal' : 'Düzenle'}
                            </button>
                        </div>

                        {isEditingDesc ? (
                            <div className="space-y-3" data-color-mode="light">
                                <MDEditor
                                    value={editableDesc}
                                    onChange={(val) => setEditableDesc(val || '')}
                                    preview="edit"
                                    height={160}
                                    textareaProps={{ placeholder: "Detaylı görev açıklaması girin..." }}
                                    className="border border-slate-200 rounded-xl overflow-hidden shadow-none"
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={saveDesc}
                                        disabled={actionPending}
                                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5"
                                    >
                                        <FiSave size={13} /> Kaydet
                                    </button>
                                </div>
                            </div>
                        ) : g.aciklama ? (
                            <div className="prose prose-sm max-w-none text-slate-700" data-color-mode="light">
                                <MDPreview 
                                    source={formatLinks(g.aciklama)} 
                                    style={{ backgroundColor: 'transparent', color: '#334155' }} 
                                    components={{
                                        a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
                                    }}
                                />
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">Açıklama girilmemiş.</p>
                        )}
                    </div>

                    {/* ── Alt Görevler ─────────────────────────────────── */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <FiCheckSquare size={16} className="text-slate-500" />
                                Alt Görevler
                                {altGorevler.length > 0 && (
                                    <span className="ml-1 text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                                        {doneCount}/{altGorevler.length}
                                    </span>
                                )}
                            </h3>
                        </div>

                        {altGorevler.length > 0 && (
                            <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
                                <div className="bg-green-500 h-2 transition-all duration-300 rounded-full" style={{ width: `${(doneCount / altGorevler.length) * 100}%` }} />
                            </div>
                        )}

                        {detayLoading ? (
                            <div className="flex items-center gap-2 py-4 text-slate-400 text-sm justify-center">
                                <FiLoader size={16} className="animate-spin" /> Yükleniyor…
                            </div>
                        ) : (
                            <>
                                {altGorevler.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        {altGorevler.map(a => (
                                            <div key={a.id} className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                                                <button type="button"
                                                    onClick={() => toggleAlt(a.id, !a.tamamlandi)}
                                                    disabled={toggleAltPending}
                                                    className="flex-shrink-0 mt-0.5 text-slate-400 hover:text-green-600 transition-colors">
                                                    {a.tamamlandi
                                                        ? <FiCheckSquare size={18} className="text-green-600" />
                                                        : <FiSquare size={18} />}
                                                </button>
                                                
                                                {editingAltId === a.id ? (
                                                    <div className="flex-1 flex gap-2">
                                                        <textarea 
                                                            autoFocus
                                                            rows={2}
                                                            value={editAltText}
                                                            onChange={e => setEditAltText(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEditAlt(a.id); }
                                                                if (e.key === 'Escape') setEditingAltId(null);
                                                            }}
                                                            className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 resize-y"
                                                        />
                                                        <button onClick={() => saveEditAlt(a.id)} disabled={actionPending} className="text-green-700 hover:bg-green-50 p-2 rounded-xl">
                                                            <FiSave size={15} />
                                                        </button>
                                                        <button onClick={() => setEditingAltId(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-xl">
                                                            <FiX size={15} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex-1 min-w-0" data-color-mode="light">
                                                            <div 
                                                                className={`text-sm pt-0.5 relative cursor-pointer group/content ${expandedAltId === a.id ? '' : 'max-h-12 overflow-hidden'} ${a.tamamlandi ? 'line-through text-slate-400 opacity-70' : 'text-slate-800'}`}
                                                                onClick={() => setExpandedAltId(expandedAltId === a.id ? null : a.id)}
                                                            >
                                                                <MDPreview 
                                                                    source={formatLinks(a.baslik)} 
                                                                    style={{ backgroundColor: 'transparent', color: 'inherit', fontSize: '0.875rem' }} 
                                                                    components={{
                                                                        a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} />
                                                                    }}
                                                                />
                                                                {expandedAltId !== a.id && a.baslik.length > 60 && (
                                                                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-50 to-transparent" />
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                                            <button onClick={() => { setEditingAltId(a.id); setEditAltText(a.baslik); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Düzenle">
                                                                <FiEdit2 size={13} />
                                                            </button>
                                                            <button onClick={() => removeAlt(a.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Sil">
                                                                <FiTrash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Alt görev ekle */}
                                <div className="flex gap-2">
                                    <textarea value={altText}
                                        onChange={e => setAltText(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAlt(); }
                                        }}
                                        rows={1}
                                        placeholder="Yeni alt görev ekle (Enter ile kaydet)..."
                                        className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[44px] bg-slate-50 focus:bg-white transition-colors resize-y"
                                    />
                                    <button type="button" onClick={submitAlt} disabled={altPending || !altText.trim()}
                                        className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-40 hover:bg-slate-800 transition-colors min-h-[44px] flex items-center gap-1.5 shadow-xs">
                                        {altPending ? <FiLoader size={14} className="animate-spin" /> : <><FiPlus size={16} /> Ekle</>}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ── Aktivite & Notlar ───────────────────────────────────────── */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                            <FiMessageSquare size={16} className="text-slate-500" /> 
                            Aktivite & Notlar
                        </h3>

                        <div className="rounded-2xl border border-slate-200 overflow-hidden mb-6" data-color-mode="light">
                            <MDEditor
                                value={notText}
                                onChange={(val) => setNotText(val || '')}
                                preview="edit"
                                height={150}
                                textareaProps={{ placeholder: "Detaylı not bırakın (Markdown desteklenir)..." }}
                                className="border-0 shadow-none"
                            />
                            <div className="flex items-center justify-end px-4 py-2.5 bg-slate-50 border-t border-slate-200">
                                <button type="button" onClick={submitNot} disabled={notPending || !notText.trim()}
                                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-40 hover:bg-slate-800 transition-colors shadow-xs">
                                    {notPending ? <FiLoader size={14} className="animate-spin" /> : 'Notu Kaydet'}
                                </button>
                            </div>
                        </div>

                        {detayLoading ? null : notlar.length === 0 ? (
                            <div className="text-center py-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                                <p className="text-xs text-slate-400 font-medium">Henüz bir not bırakılmamış.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {notlar.map(n => (
                                    <div key={n.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 group">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">
                                                    {initials(n.kullanici_adi)}
                                                </span>
                                                <span className="font-bold text-slate-900 text-xs">{n.kullanici_adi ?? 'Kullanıcı'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] text-slate-400 font-medium">{fmtTime(n.olusturma_tarihi)}</span>
                                                <button onClick={() => removeNot(n.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-opacity p-1">
                                                    <FiTrash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="prose prose-sm max-w-none text-slate-700 pl-8" data-color-mode="light">
                                            <MDPreview 
                                                source={formatLinks(n.not_metni)} 
                                                style={{ backgroundColor: 'transparent', color: '#334155' }} 
                                                components={{
                                                    a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3 flex-shrink-0 shadow-lg">
                    <button
                        type="button"
                        onClick={handleDeleteTask}
                        disabled={actionPending}
                        className="px-4 py-3 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors flex items-center gap-1.5"
                    >
                        <FiTrash2 size={14} /> Sil
                    </button>

                    <div className="flex items-center gap-3">
                        <button type="button" onClick={handleToggle} disabled={togglePending}
                            className={[
                                'px-5 py-3 rounded-xl text-sm font-bold min-h-[46px] transition-all shadow-xs flex items-center gap-2',
                                g.tamamlandi ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-green-600 text-white hover:bg-green-700',
                            ].join(' ')}>
                            {togglePending ? <FiLoader size={16} className="animate-spin" /> :
                             g.tamamlandi ? <><FiRefreshCw size={16} /> Yeniden Aç</> :
                             <><FiCheck size={18} /> Tamamla</>}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Yeni Görev Ekle Modalı ───────────────────────────────────────────────────

function GorevEkleModal({
    isOpen,
    onClose,
    locale,
    profiller,
    firmalar,
    onSuccess,
    initialDurum = 'Yapılacak'
}: {
    isOpen: boolean;
    onClose: () => void;
    locale: string;
    profiller: ProfilOption[];
    firmalar: FirmaOption[];
    onSuccess: (task: GorevRow) => void;
    initialDurum?: GorevDurumu;
}) {
    const [pending, startTransition] = useTransition();
    const [baslik, setBaslik] = useState('');
    const [aciklama, setAciklama] = useState('');
    const [oncelik, setOncelik] = useState<GorevOncelik>('Orta');
    const [durum, setDurum] = useState<GorevDurumu>(initialDurum);
    const [atananKisiId, setAtananKisiId] = useState(profiller[0]?.id || '');
    const [ilgiliFirmaId, setIlgiliFirmaId] = useState('');
    const [sonTarih, setSonTarih] = useState('');

    useEffect(() => {
        if (isOpen) {
            setDurum(initialDurum);
            setBaslik('');
            setAciklama('');
            setOncelik('Orta');
            setSonTarih('');
            setIlgiliFirmaId('');
            if (profiller.length > 0) setAtananKisiId(profiller[0].id);
        }
    }, [isOpen, initialDurum, profiller]);

    if (!isOpen) return null;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!baslik.trim()) {
            toast.error('Lütfen bir görev başlığı girin.');
            return;
        }

        startTransition(async () => {
            const res = await gorevHizliEkleAction({
                baslik: baslik.trim(),
                aciklama: aciklama.trim() || null,
                son_tarih: sonTarih || null,
                atanan_kisi_id: atananKisiId || null,
                ilgili_firma_id: ilgiliFirmaId || null,
                oncelik,
                durum,
            }, locale);

            if (res.success && res.gorev) {
                toast.success('Yeni görev eklendi.');
                const firmaObj = firmalar.find(f => f.id === ilgiliFirmaId);
                const profilObj = profiller.find(p => p.id === atananKisiId);
                
                onSuccess({
                    ...res.gorev,
                    ilgili_firma: firmaObj ? { unvan: firmaObj.unvan } : null,
                    atanan_kisi: profilObj ? { tam_ad: profilObj.tam_ad } : null,
                });
                onClose();
            } else if (res.error) {
                toast.error(res.error);
            }
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />
            <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900">Yeni Görev Oluştur</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Planlanan görev ve müşteri aksiyonlarını belirleyin</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                        <FiX size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Görev Başlığı <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Örn: Yeni katalog teslimatı ve tadım görüşmesi..."
                            value={baslik}
                            onChange={e => setBaslik(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Öncelik
                            </label>
                            <select
                                value={oncelik}
                                onChange={e => setOncelik(e.target.value as GorevOncelik)}
                                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                            >
                                <option value="Yüksek">🔴 Yüksek</option>
                                <option value="Orta">🟡 Orta</option>
                                <option value="Düşük">🔵 Düşük</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Kolon / Durum
                            </label>
                            <select
                                value={durum}
                                onChange={e => setDurum(e.target.value as GorevDurumu)}
                                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                            >
                                <option value="Yapılacak">Yapılacak</option>
                                <option value="Devam Ediyor">Devam Ediyor</option>
                                <option value="Tamamlandı">Tamamlandı</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Son Tarih
                            </label>
                            <input
                                type="date"
                                value={sonTarih}
                                onChange={e => setSonTarih(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Atanan Kişi
                            </label>
                            <select
                                value={atananKisiId}
                                onChange={e => setAtananKisiId(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                            >
                                {profiller.map(p => (
                                    <option key={p.id} value={p.id}>{p.tam_ad}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {firmalar.length > 0 && (
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                İlgili Müşteri / Firma (İsteğe bağlı)
                            </label>
                            <select
                                value={ilgiliFirmaId}
                                onChange={e => setIlgiliFirmaId(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                            >
                                <option value="">-- Müşteri Seçilmedi --</option>
                                {firmalar.map(f => (
                                    <option key={f.id} value={f.id}>{f.unvan}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div data-color-mode="light">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Açıklama & Detaylar (Markdown desteklenir)
                        </label>
                        <MDEditor
                            value={aciklama}
                            onChange={(val) => setAciklama(val || '')}
                            preview="edit"
                            height={140}
                            textareaProps={{ placeholder: "Görevle ilgili önemli notları yazın..." }}
                            className="border border-slate-300 rounded-xl overflow-hidden shadow-none"
                        />
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={pending}
                            className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
                        >
                            {pending ? <FiLoader size={16} className="animate-spin" /> : <><FiPlus size={16} /> Görevi Kaydet</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Telefon Takvimine Bağla Modalı ───────────────────────────────────────────

function TakvimBaglaModal({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [calData, setCalData] = useState<{
        webcalUrl?: string;
        httpsUrl?: string;
        userName?: string;
    } | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            getUserCalendarUrlAction().then(res => {
                setLoading(false);
                if (res.error) toast.error(res.error);
                else setCalData(res);
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    function handleCopy() {
        if (!calData?.httpsUrl) return;
        navigator.clipboard.writeText(calData.httpsUrl);
        setCopied(true);
        toast.success('Takvim bağlantı adresi panoya kopyalandı.');
        setTimeout(() => setCopied(false), 2500);
    }

    const googleCalendarUrl = calData?.webcalUrl
        ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calData.webcalUrl)}`
        : '#';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
                    <div className="flex items-center gap-2.5">
                        <span className="p-2.5 bg-blue-100 text-blue-700 rounded-2xl">
                            <FiSmartphone size={22} />
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-slate-900">Telefon Takvimine Bağla</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Apple Takvim, Google Takvim veya Outlook ile canlı senkronizasyon</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer">
                        <FiX size={20} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
                            <FiLoader size={24} className="animate-spin text-blue-600" />
                            <span>Size özel güvenli takvim anahtarı oluşturuluyor...</span>
                        </div>
                    ) : (
                        <>
                            {/* Kullanıcıya Özel Bilgilendirme Kutusu */}
                            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80">
                                <div className="flex items-start gap-2.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0 animate-pulse" />
                                    <div className="text-xs text-blue-900 leading-relaxed">
                                        <p className="font-extrabold text-sm mb-1 text-blue-950">
                                            👤 {calData?.userName || 'Kullanıcı'} — Kişisel Görev Takvimi
                                        </p>
                                        <p>
                                            Bu takvim bağlantısı <strong>yalnızca size atanan görevleri</strong> içerir ve <strong>kalıcı olarak bağlı kalır</strong>. Bir kez ekledikten sonra sisteme yeni görev atandığında veya mevcut görevlerde değişiklik yapıldığında takviminiz <strong>otomatik olarak güncellenir</strong> — her seferinde tekrar bağlamanıza gerek yoktur.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Canlı Senkronizasyon Bilgisi */}
                            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-900 flex items-start gap-2.5">
                                <FiRefreshCw size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Canlı Senkronizasyon — Her 15 Dakikada Bir Güncellenir</p>
                                    <p className="text-emerald-800 mt-0.5">
                                        Takvim uygulamanız bu beslemeleri arka planda otomatik olarak çeker. Yeni görev atandığında, tarih değiştiğinde veya görev tamamlandığında en geç 15 dakika içinde telefonunuza yansır.
                                    </p>
                                </div>
                            </div>

                            {/* Hızlı Ekleme Butonları */}
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Takviminize Ekleyin — Bir Kez Bağlayın, Daima Güncel
                                </p>

                                {/* iPhone / Apple Takvim Butonu */}
                                <a
                                    href={calData?.webcalUrl || '#'}
                                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all shadow-sm group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-lg">🍏</span>
                                        <div className="text-left">
                                            <div>iPhone / Apple Takvime Ekle</div>
                                            <div className="text-[11px] font-normal text-slate-300">Tek dokunuşla abone olun · iOS, macOS, iPadOS</div>
                                        </div>
                                    </div>
                                    <FiExternalLink size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                                </a>

                                {/* Google Takvim Butonu */}
                                <a
                                    href={googleCalendarUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-sm group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-lg">📅</span>
                                        <div className="text-left">
                                            <div>Google Takvime Ekle</div>
                                            <div className="text-[11px] font-normal text-blue-100">Android, Google Calendar Web · Otomatik senkron</div>
                                        </div>
                                    </div>
                                    <FiExternalLink size={16} className="text-blue-200 group-hover:text-white transition-colors" />
                                </a>
                            </div>

                            {/* Manuel Bağlantı Adresi */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Outlook veya Diğer Takvim Uygulamaları
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={calData?.httpsUrl || ''}
                                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-700 focus:outline-none select-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                                    >
                                        {copied ? <FiCheck className="text-green-600" size={14} /> : <FiCopy size={14} />}
                                        <span>{copied ? 'Kopyalandı!' : 'Kopyala'}</span>
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    Outlook, Thunderbird veya diğer uygulamalardaki <strong>"İnternet Takvim Aboneliği"</strong> alanına yapıştırın. Bir kez eklediğinizde daima bağlı ve güncel kalır.
                                </p>
                            </div>

                            {/* Hatırlatıcı / Bildirim Bilgisi */}
                            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                                <FiAlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Otomatik Telefon Uyarıları</p>
                                    <p className="text-amber-800 mt-0.5">
                                        Her görev için <strong>1 gün öncesinde</strong> ve görev günü <strong>sabah 09:00'da</strong> telefonunuzda otomatik hatırlatma bildirimi çıkar.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Ana Bileşen (GorevlerClient) ──────────────────────────────────────────────

export default function GorevlerClient({
    gorevler,
    profiller,
    firmalar = [],
    locale,
    isPortal = false,
    baseFirmaPath,
    baseTaskDetailPath,
    currentUserId,
    defaultMode = 'list',
}: GorevlerClientProps) {
    // Varsayılan olarak tablo modunda başlar ('list' = Asana Tablosu)
    const [mode, setMode] = useState<'list' | 'kanban' | 'cards'>(defaultMode);
    const [open, setOpen] = useState<GorevRow | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [modalInitialDurum, setModalInitialDurum] = useState<GorevDurumu>('Yapılacak');

    // Local items for optimistic responsiveness
    const [taskList, setTaskList] = useState<GorevRow[]>(gorevler);
    const [searchQuery, setSearchQuery] = useState('');
    type StatusFilterType = 'tumu' | 'devam_ediyor' | 'yapilacak' | 'gecikenler' | 'tamamlandi';
    const [statusFilter, setStatusFilter] = useState<StatusFilterType>('tumu');
    type ScopeFilterType = 'mine' | 'all';
    // Varsayılan olarak her kullanıcı kendi görevlerini görür
    const [scopeFilter, setScopeFilter] = useState<ScopeFilterType>(currentUserId ? 'mine' : 'all');
    const [prioFilter, setPrioFilter] = useState<string>('');
    const [personFilter, setPersonFilter] = useState<string>('');
    const [firmaFilter, setFirmaFilter] = useState<string>('');
    const [isCompletedSectionOpen, setIsCompletedSectionOpen] = useState(false);
    const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

    // Keep taskList in sync when server props refresh
    useEffect(() => {
        setTaskList(gorevler);
    }, [gorevler]);

    function handleDateChange(id: string, newDate: string) {
        setTaskList(prev => prev.map(g => g.id === id ? { ...g, son_tarih: newDate || null } : g));
        toast.promise(
            gorevTarihGuncelleAction(id, newDate, locale),
            {
                loading: 'Tarih güncelleniyor...',
                success: 'Görev tarihi güncellendi.',
                error: 'Tarih güncellenemedi.'
            }
        );
        if (open?.id === id) {
            setOpen(prev => prev ? { ...prev, son_tarih: newDate || null } : null);
        }
    }

    function handleStatusChange(id: string, durum: GorevDurumu) {
        const tamamlandi = durum === 'Tamamlandı';
        setTaskList(prev => prev.map(g => g.id === id ? { ...g, durum, tamamlandi } : g));
        if (open?.id === id) {
            setOpen(prev => prev ? { ...prev, durum, tamamlandi } : null);
        }
        toast.promise(
            gorevDurumDegistirAction(id, durum, locale),
            {
                loading: 'Durum güncelleniyor...',
                success: `Durum "${durum}" olarak güncellendi.`,
                error: 'Durum güncellenemedi.'
            }
        );
    }

    function handlePriorityChange(id: string, oncelik: GorevOncelik) {
        setTaskList(prev => prev.map(g => g.id === id ? { ...g, oncelik } : g));
        toast.promise(
            gorevOncelikGuncelleAction(id, oncelik, locale),
            {
                loading: 'Öncelik güncelleniyor...',
                success: `Öncelik "${oncelik}" olarak güncellendi.`,
                error: 'Öncelik güncellenemedi.'
            }
        );
        if (open?.id === id) {
            setOpen(prev => prev ? { ...prev, oncelik } : null);
        }
    }

    function handleAssigneeChange(id: string, atananKisiId: string) {
        const selectedPerson = profiller.find(p => p.id === atananKisiId);
        setTaskList(prev => prev.map(g => g.id === id ? {
            ...g,
            atanan_kisi_id: atananKisiId,
            atanan_kisi: selectedPerson ? { tam_ad: selectedPerson.tam_ad } : g.atanan_kisi
        } : g));
        toast.promise(
            gorevAtananKisiGuncelleAction(id, atananKisiId, locale),
            {
                loading: 'Personel ataması yapılıyor...',
                success: 'Personel ataması güncellendi.',
                error: 'Personel ataması güncellenemedi.'
            }
        );
        if (open?.id === id) {
            setOpen(prev => prev ? {
                ...prev,
                atanan_kisi_id: atananKisiId,
                atanan_kisi: selectedPerson ? { tam_ad: selectedPerson.tam_ad } : prev.atanan_kisi
            } : null);
        }
    }

    async function handleQuickAdd(baslik: string, durum: GorevDurumu) {
        if (!baslik.trim()) return;
        const toastId = toast.loading('Görev ekleniyor...');
        try {
            const res = await gorevHizliEkleAction({
                baslik: baslik.trim(),
                durum,
                oncelik: 'Orta',
                atanan_kisi_id: currentUserId || (profiller[0]?.id ?? null),
            }, locale);

            if (res.success && res.gorev) {
                toast.success(res.success, { id: toastId });
                const assignedPerson = profiller.find(p => p.id === (res.gorev.atanan_kisi_id || currentUserId));
                const newTask: GorevRow = {
                    id: res.gorev.id || res.id!,
                    baslik: res.gorev.baslik,
                    aciklama: res.gorev.aciklama || null,
                    atanan_kisi_id: res.gorev.atanan_kisi_id || currentUserId || '',
                    ilgili_firma_id: res.gorev.ilgili_firma_id || null,
                    son_tarih: res.gorev.son_tarih || null,
                    tamamlandi: res.gorev.tamamlandi || false,
                    durum: res.gorev.durum || durum,
                    oncelik: (res.gorev.oncelik as GorevOncelik) || 'Orta',
                    created_at: res.gorev.created_at || new Date().toISOString(),
                    atanan_kisi: assignedPerson ? { tam_ad: assignedPerson.tam_ad } : null,
                    ilgili_firma: null,
                    alt_gorevler: [],
                    gorev_notlari: [],
                };
                setTaskList(prev => [newTask, ...prev]);
            } else if (res.error) {
                toast.error(res.error, { id: toastId });
            }
        } catch (e: any) {
            toast.error(e?.message || 'Görev eklenirken bir hata oluştu.', { id: toastId });
        }
    }

    function handleToggle() {
        if (!open) return;
        const next = !open.tamamlandi;
        const nextDurum: GorevDurumu = next ? 'Tamamlandı' : 'Yapılacak';
        handleStatusChange(open.id, nextDurum);
    }

    function handleDeleteTask(id: string) {
        setTaskList(prev => prev.filter(g => g.id !== id));
        if (open?.id === id) setOpen(null);
    }

    function handleUpdateDetails(id: string, updates: Partial<GorevRow>) {
        setTaskList(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
        if (open?.id === id) setOpen(prev => prev ? { ...prev, ...updates } : null);
    }

    function handleAddNewTaskSuccess(newTask: GorevRow) {
        setTaskList(prev => [newTask, ...prev]);
    }

    function openModalWithDurum(d: GorevDurumu) {
        setModalInitialDurum(d);
        setIsAddModalOpen(true);
    }

    // Sayaçlar (Tüm veri üzerinden)
    const myTasksCount    = currentUserId ? taskList.filter(g => g.atanan_kisi_id === currentUserId).length : 0;
    const inProgressCount = taskList.filter(g => g.durum === 'Devam Ediyor' && !g.tamamlandi).length;
    const todoCount       = taskList.filter(g => g.durum === 'Yapılacak' && !g.tamamlandi).length;
    const lateCount       = taskList.filter(g => overdue(g.son_tarih, g.tamamlandi) && !g.tamamlandi).length;
    const doneCount       = taskList.filter(g => g.tamamlandi).length;
    const totalCount      = taskList.length;

    // Filtre Mantığı
    const filteredRows = useMemo(() => {
        return taskList.filter(g => {
            // Varsayılan olarak kullanıcının kendi görevleri
            if (scopeFilter === 'mine' && currentUserId && !personFilter) {
                if (g.atanan_kisi_id !== currentUserId) return false;
            }

            if (statusFilter === 'devam_ediyor' && (g.durum !== 'Devam Ediyor' || g.tamamlandi)) return false;
            if (statusFilter === 'yapilacak' && (g.durum !== 'Yapılacak' || g.tamamlandi)) return false;
            if (statusFilter === 'gecikenler' && (!overdue(g.son_tarih, g.tamamlandi) || g.tamamlandi)) return false;
            if (statusFilter === 'tamamlandi' && !g.tamamlandi) return false;

            if (prioFilter && g.oncelik !== prioFilter) return false;
            if (personFilter && g.atanan_kisi_id !== personFilter) return false;
            if (firmaFilter && g.ilgili_firma_id !== firmaFilter) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = g.baslik.toLowerCase().includes(q);
                const matchDesc = g.aciklama?.toLowerCase().includes(q);
                const matchFirm = g.ilgili_firma?.unvan.toLowerCase().includes(q);
                if (!matchTitle && !matchDesc && !matchFirm) return false;
            }
            return true;
        });
    }, [taskList, scopeFilter, currentUserId, statusFilter, prioFilter, personFilter, firmaFilter, searchQuery]);

    // Alt Kümeler (Gruplandırılmış ve Sıralanmış - Kullanıcının görevleri öncelikli!)
    const inProgressTasks = useMemo(() => {
        return sortInProgressTasks(filteredRows.filter(g => g.durum === 'Devam Ediyor' && !g.tamamlandi), currentUserId);
    }, [filteredRows, currentUserId]);

    const todoTasks = useMemo(() => {
        return sortUpcomingTasks(filteredRows.filter(g => g.durum === 'Yapılacak' && !g.tamamlandi), currentUserId);
    }, [filteredRows, currentUserId]);

    const completedTasks = useMemo(() => {
        return [...filteredRows.filter(g => g.tamamlandi)].sort((a, b) => {
            if (currentUserId) {
                const aMine = a.atanan_kisi_id === currentUserId;
                const bMine = b.atanan_kisi_id === currentUserId;
                if (aMine && !bMine) return -1;
                if (!aMine && bMine) return 1;
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [filteredRows, currentUserId]);

    const overdueTasks = useMemo(() => {
        return sortUpcomingTasks(filteredRows.filter(g => overdue(g.son_tarih, g.tamamlandi) && !g.tamamlandi), currentUserId);
    }, [filteredRows, currentUserId]);

    const anyFilterActive = statusFilter !== 'tumu' || !!prioFilter || !!personFilter || !!firmaFilter || !!searchQuery || (currentUserId ? scopeFilter !== 'mine' : false);

    return (
        <div className="space-y-6">
            {/* Üst Bar: Başlık, Görünüm Geçişi ve Hızlı Ekleme */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <span>📋</span> {isPortal ? 'Görevlerim' : 'Görev Yönetimi'}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-2 font-medium">
                        <span>{totalCount} toplam görev</span>
                        <span>·</span>
                        <span className="text-blue-700 font-bold">{inProgressCount} devam ediyor</span>
                        <span>·</span>
                        <span className="text-slate-800 font-semibold">{todoCount} yapılacak</span>
                        <span>·</span>
                        <span className="text-emerald-700 font-semibold">{doneCount} tamamlandı</span>
                        {lateCount > 0 && (
                            <>
                                <span>·</span>
                                <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                    {lateCount} gecikmiş
                                </span>
                            </>
                        )}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                    {/* Görünüm Geçişi */}
                    <div className="flex rounded-2xl border border-slate-200 bg-slate-100 p-1 shadow-xs">
                        <button
                            type="button"
                            onClick={() => setMode('list')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${mode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                            title="Asana / Excel benzeri interaktif tablo görünümü"
                        >
                            <FiList size={14} />
                            <span>Tablo (Asana)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('kanban')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${mode === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                            title="Kanban panosu görünümü"
                        >
                            <FiColumns size={14} />
                            <span>Kanban</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('cards')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${mode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                            title="Büyük kartlar görünümü"
                        >
                            <FiGrid size={14} />
                            <span>Kartlar</span>
                        </button>
                    </div>

                    {/* Takvimime Bağla Butonu */}
                    <button
                        type="button"
                        onClick={() => setIsCalendarModalOpen(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                        title="Size atanan görevleri telefon takviminize bağlayın"
                    >
                        <FiSmartphone size={16} className="text-blue-600" />
                        <span>Takvime Bağla</span>
                    </button>

                    {/* Yeni Görev Butonu */}
                    <button
                        type="button"
                        onClick={() => openModalWithDurum('Yapılacak')}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-xs sm:text-sm font-bold hover:bg-slate-800 transition-all shadow-sm hover:shadow-md cursor-pointer"
                    >
                        <FiPlus size={17} /> Yeni Görev
                    </button>
                </div>
            </div>

            {/* KPI Özet Metrik Kartları (Tıklanabilir Filtreler) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Devam Edenler */}
                <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'devam_ediyor' ? 'tumu' : 'devam_ediyor')}
                    className={`text-left p-4 sm:p-5 rounded-3xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        statusFilter === 'devam_ediyor'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400'
                            : 'bg-white hover:bg-blue-50/40 text-slate-900 border-blue-100 hover:border-blue-200 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                            statusFilter === 'devam_ediyor' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'
                        }`}>
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            Devam Ediyor
                        </span>
                        <FiZap className={statusFilter === 'devam_ediyor' ? 'text-blue-200' : 'text-blue-500'} size={18} />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black">{inProgressCount}</div>
                    <p className={`text-xs mt-1 font-medium ${statusFilter === 'devam_ediyor' ? 'text-blue-100' : 'text-slate-500'}`}>
                        Aktif üzerinde çalışılan
                    </p>
                </button>

                {/* 2. Yapılacaklar */}
                <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'yapilacak' ? 'tumu' : 'yapilacak')}
                    className={`text-left p-4 sm:p-5 rounded-3xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        statusFilter === 'yapilacak'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-700'
                            : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200/80 hover:border-slate-300 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                            statusFilter === 'yapilacak' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                            Yapılacak
                        </span>
                        <FiList className={statusFilter === 'yapilacak' ? 'text-slate-400' : 'text-slate-500'} size={18} />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black">{todoCount}</div>
                    <p className={`text-xs mt-1 font-medium ${statusFilter === 'yapilacak' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Sırada bekleyen görev
                    </p>
                </button>

                {/* 3. Gecikenler */}
                <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'gecikenler' ? 'tumu' : 'gecikenler')}
                    className={`text-left p-4 sm:p-5 rounded-3xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        statusFilter === 'gecikenler'
                            ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-400'
                            : lateCount > 0
                                ? 'bg-white hover:bg-red-50/40 text-slate-900 border-red-200 hover:border-red-300 shadow-xs'
                                : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200/80 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                            statusFilter === 'gecikenler'
                                ? 'bg-red-700 text-white'
                                : lateCount > 0
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-slate-100 text-slate-600'
                        }`}>
                            {lateCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
                            Gecikenler
                        </span>
                        <FiAlertCircle className={statusFilter === 'gecikenler' ? 'text-red-200' : lateCount > 0 ? 'text-red-500' : 'text-slate-400'} size={18} />
                    </div>
                    <div className={`text-2xl sm:text-3xl font-black ${lateCount > 0 && statusFilter !== 'gecikenler' ? 'text-red-600' : ''}`}>
                        {lateCount}
                    </div>
                    <p className={`text-xs mt-1 font-medium ${statusFilter === 'gecikenler' ? 'text-red-100' : 'text-slate-500'}`}>
                        {lateCount > 0 ? 'Acil ilgi gereken' : 'Geciken görev yok'}
                    </p>
                </button>

                {/* 4. Tamamlananlar */}
                <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'tamamlandi' ? 'tumu' : 'tamamlandi')}
                    className={`text-left p-4 sm:p-5 rounded-3xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                        statusFilter === 'tamamlandi'
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400'
                            : 'bg-white hover:bg-emerald-50/40 text-slate-900 border-emerald-100 hover:border-emerald-200 shadow-xs'
                    }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                            statusFilter === 'tamamlandi' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                            Tamamlandı
                        </span>
                        <FiCheckCircle className={statusFilter === 'tamamlandi' ? 'text-emerald-200' : 'text-emerald-600'} size={18} />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black">{doneCount}</div>
                    <p className={`text-xs mt-1 font-medium ${statusFilter === 'tamamlandi' ? 'text-emerald-100' : 'text-slate-500'}`}>
                        Başarıyla sonuçlanan
                    </p>
                </button>
            </div>

            {/* Filtre ve Arama Çubuğu */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                    {/* Arama Kutusu */}
                    <div className="relative min-w-[180px] max-w-xs flex-1">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Görev veya müşteri ara..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 focus:bg-white transition-colors"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <FiX size={12} />
                            </button>
                        )}
                    </div>

                    {/* Kullanıcı Kapsam Geçişi: Bana Atananlar vs Tüm Ekip */}
                    {currentUserId && (
                        <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200 shadow-2xs">
                            <button
                                type="button"
                                onClick={() => {
                                    setScopeFilter('mine');
                                    setPersonFilter('');
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    scopeFilter === 'mine' && !personFilter
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Yalnızca size atanan görevleri gösterir"
                            >
                                <FiUser size={12} />
                                <span>Bana Atananlar</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                    scopeFilter === 'mine' && !personFilter ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                    {myTasksCount}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setScopeFilter('all')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    scopeFilter === 'all' || !!personFilter
                                        ? 'bg-slate-900 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Tüm ekibin görevlerini gösterir (kendi görevleriniz öncelikli en üsttedir)"
                            >
                                <FiGrid size={12} />
                                <span>Tüm Ekip</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                    scopeFilter === 'all' || !!personFilter ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                    {totalCount}
                                </span>
                            </button>
                        </div>
                    )}

                    <span className="hidden sm:block w-px h-5 bg-slate-200" />

                    {/* Durum Sekmeleri */}
                    {([
                        { id: 'tumu', label: '🌟 Tümü' },
                        { id: 'devam_ediyor', label: `⚡ Devam Edenler (${inProgressCount})` },
                        { id: 'yapilacak', label: `📋 Yapılacaklar (${todoCount})` },
                        { id: 'gecikenler', label: `⚠️ Gecikenler (${lateCount})` },
                        { id: 'tamamlandi', label: `✅ Tamamlananlar (${doneCount})` },
                    ] as const).map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setStatusFilter(tab.id as StatusFilterType)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                                statusFilter === tab.id
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}

                    <span className="hidden sm:block w-px h-5 bg-slate-200" />

                    {/* Öncelik Dropdown */}
                    <select
                        value={prioFilter}
                        onChange={e => setPrioFilter(e.target.value)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border appearance-none pr-6 cursor-pointer ${
                            prioFilter ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        <option value="">Tüm Öncelikler</option>
                        <option value="Yüksek">🔴 Yüksek</option>
                        <option value="Orta">🟡 Orta</option>
                        <option value="Düşük">🔵 Düşük</option>
                    </select>

                    {/* Personel Dropdown */}
                    {profiller.length > 1 && (
                        <select
                            value={personFilter}
                            onChange={e => {
                                setPersonFilter(e.target.value);
                                if (e.target.value) setScopeFilter('all');
                            }}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border appearance-none pr-6 cursor-pointer ${
                                personFilter ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <option value="">Tüm Personel</option>
                            {profiller.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.tam_ad || 'Kullanıcı'}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Firma Dropdown */}
                    {firmalar.length > 0 && (
                        <select
                            value={firmaFilter}
                            onChange={e => setFirmaFilter(e.target.value)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border appearance-none pr-6 cursor-pointer max-w-[180px] truncate ${
                                firmaFilter ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <option value="">Tüm Müşteriler</option>
                            {firmalar.map(f => (
                                <option key={f.id} value={f.id}>{f.unvan}</option>
                            ))}
                        </select>
                    )}

                    {/* Filtreleri Temizle */}
                    {anyFilterActive && (
                        <button
                            type="button"
                            onClick={() => {
                                setStatusFilter('tumu');
                                setPrioFilter('');
                                setPersonFilter('');
                                setFirmaFilter('');
                                setSearchQuery('');
                                setScopeFilter(currentUserId ? 'mine' : 'all');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                        >
                            <FiX size={12} /> Temizle
                        </button>
                    )}
                </div>

                <div className="text-xs text-slate-400 font-semibold pl-2">
                    {filteredRows.length} görev listeleniyor
                </div>
            </div>

            {/* Boş Durum */}
            {filteredRows.length === 0 && (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <FiGrid className="mx-auto text-4xl text-slate-300 mb-3" />
                    <p className="text-slate-700 font-bold text-base">Filtreye uygun görev bulunamadı</p>
                    <p className="text-slate-400 text-xs mt-1">Filtrelerinizi değiştirmeyi deneyin veya yeni bir görev ekleyin.</p>
                    <button
                        type="button"
                        onClick={() => openModalWithDurum('Yapılacak')}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <FiPlus size={14} /> Yeni Görev Ekle
                    </button>
                </div>
            )}

            {/* ── ASANA / EXCEL TABLO GÖRÜNÜMÜ ── */}
            {mode === 'list' && filteredRows.length > 0 && (
                <div className="space-y-6">
                    {/* BÖLÜM 1: ⚡ DEVAM EDEN GÖREVLER (Masanızdakiler / Aktif Odak) */}
                    {(statusFilter === 'tumu' || statusFilter === 'devam_ediyor') && (
                        <GorevTablosu
                            title={scopeFilter === 'mine' ? "Devam Eden Görevlerim (Aktif Odak)" : "Devam Eden Görevler (Aktif Odak)"}
                            icon={<span className="text-blue-600 font-bold">⚡</span>}
                            badgeText={`${inProgressTasks.length} Aktif`}
                            badgeColor="bg-blue-600 text-white"
                            description="Bitiş tarihinden bağımsız olarak şu an üzerinde odaklandığınız ve masanızda olan görevler."
                            tasks={inProgressTasks}
                            profiller={profiller}
                            currentUserId={currentUserId}
                            locale={locale}
                            defaultDurum="Devam Ediyor"
                            accentBorder="border-blue-300 ring-1 ring-blue-100/60"
                            accentHeader="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white"
                            onOpen={setOpen}
                            onStatusChange={handleStatusChange}
                            onDateChange={handleDateChange}
                            onPriorityChange={handlePriorityChange}
                            onAssigneeChange={handleAssigneeChange}
                            onQuickAdd={handleQuickAdd}
                            baseFirmaPath={baseFirmaPath}
                        />
                    )}

                    {/* BÖLÜM 2: 📋 YAPILACAK GÖREVLER (Sıradakiler & Yaklaşanlar) */}
                    {(statusFilter === 'tumu' || statusFilter === 'yapilacak') && (
                        <GorevTablosu
                            title={scopeFilter === 'mine' ? "Yapılacak Görevlerim" : "Yapılacak Görevler"}
                            icon="📋"
                            badgeText={`${todoTasks.length} Görev`}
                            badgeColor="bg-slate-800 text-white"
                            description="Gecikmiş ve bitiş tarihi yaklaşanlar en başta olacak şekilde tarihe göre sıralanmıştır."
                            tasks={todoTasks}
                            profiller={profiller}
                            currentUserId={currentUserId}
                            locale={locale}
                            defaultDurum="Yapılacak"
                            accentBorder="border-slate-200"
                            accentHeader="bg-slate-50/80"
                            onOpen={setOpen}
                            onStatusChange={handleStatusChange}
                            onDateChange={handleDateChange}
                            onPriorityChange={handlePriorityChange}
                            onAssigneeChange={handleAssigneeChange}
                            onQuickAdd={handleQuickAdd}
                            baseFirmaPath={baseFirmaPath}
                        />
                    )}

                    {/* BÖLÜM 3: ⚠️ GECİKEN GÖREVLER ÖZEL FİLTRESİ */}
                    {statusFilter === 'gecikenler' && (
                        <GorevTablosu
                            title={scopeFilter === 'mine' ? "Geciken Görevlerim (Acil Müdahale)" : "Geciken Görevler (Acil Müdahale)"}
                            icon="⚠️"
                            badgeText={`${overdueTasks.length} Gecikmiş`}
                            badgeColor="bg-red-600 text-white"
                            description="Bitiş tarihi geçmiş ve henüz tamamlanmamış görevler."
                            tasks={overdueTasks}
                            profiller={profiller}
                            currentUserId={currentUserId}
                            locale={locale}
                            defaultDurum="Yapılacak"
                            accentBorder="border-red-300 ring-1 ring-red-100/60"
                            accentHeader="bg-red-50/60"
                            onOpen={setOpen}
                            onStatusChange={handleStatusChange}
                            onDateChange={handleDateChange}
                            onPriorityChange={handlePriorityChange}
                            onAssigneeChange={handleAssigneeChange}
                            onQuickAdd={handleQuickAdd}
                            baseFirmaPath={baseFirmaPath}
                        />
                    )}

                    {/* BÖLÜM 4: ✅ TAMAMLANAN GÖREVLER (Arşiv & Geçmiş) */}
                    {(statusFilter === 'tumu' || statusFilter === 'tamamlandi') && (
                        <GorevTablosu
                            title={scopeFilter === 'mine' ? "Tamamlanan Görevlerim" : "Tamamlanan Görevler"}
                            icon="✅"
                            badgeText={`${completedTasks.length} Tamamlandı`}
                            badgeColor="bg-emerald-100 text-emerald-800 border-emerald-200"
                            description="Başarıyla tamamlanan görevlerin arşivi. İstediğiniz zaman yeniden açabilirsiniz."
                            tasks={completedTasks}
                            profiller={profiller}
                            currentUserId={currentUserId}
                            locale={locale}
                            defaultDurum="Yapılacak"
                            accentBorder="border-slate-200"
                            accentHeader="bg-emerald-50/40"
                            collapsible={statusFilter === 'tumu'}
                            defaultOpen={statusFilter === 'tamamlandi'}
                            onOpen={setOpen}
                            onStatusChange={handleStatusChange}
                            onDateChange={handleDateChange}
                            onPriorityChange={handlePriorityChange}
                            onAssigneeChange={handleAssigneeChange}
                            onQuickAdd={handleQuickAdd}
                            baseFirmaPath={baseFirmaPath}
                        />
                    )}
                </div>
            )}

            {/* ── KARTLAR GÖRÜNÜMÜ ── */}
            {mode === 'cards' && filteredRows.length > 0 && (
                <div className="space-y-8">
                    {/* Devam Eden Kartlar */}
                    {(statusFilter === 'tumu' || statusFilter === 'devam_ediyor') && (
                        <section className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50/60 rounded-3xl border border-blue-200/80 p-5 sm:p-6 shadow-xs relative">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-blue-100">
                                <div className="flex items-center gap-2.5">
                                    <span className="relative flex h-3.5 w-3.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-600"></span>
                                    </span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                                Devam Eden Görevler (Üzerinde Çalışılanlar)
                                            </h2>
                                            <span className="text-xs font-extrabold bg-blue-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                                                {inProgressTasks.length} Aktif
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Bitiş tarihinden bağımsız olarak şu an masanızda olan ve üzerinde odaklandığınız görevler.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => openModalWithDurum('Devam Ediyor')}
                                    className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
                                >
                                    <FiPlus size={14} /> Devam Edene Ekle
                                </button>
                            </div>

                            {inProgressTasks.length === 0 ? (
                                <div className="text-center py-8 px-4 bg-white/80 rounded-2xl border border-dashed border-blue-200">
                                    <p className="text-sm font-bold text-slate-700">Şu anda devam eden aktif bir görev yok</p>
                                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                                        Aşağıdaki yapılacaklar listesinden sıradaki görevin yanındaki <strong className="text-blue-600">"Başlat ⚡"</strong> butonuna basarak doğrudan buraya alabilirsiniz.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                                    {inProgressTasks.map(g => (
                                        <DevamEdenGorevKarti
                                            key={g.id}
                                            g={g}
                                            locale={locale}
                                            onOpen={setOpen}
                                            onStatusChange={handleStatusChange}
                                            onDateChange={handleDateChange}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Yapılacaklar Kartlar */}
                    {(statusFilter === 'tumu' || statusFilter === 'yapilacak') && (
                        <section className="space-y-3.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                            Yapılacak Görevler
                                        </h2>
                                        <span className="text-xs font-extrabold bg-slate-800 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                                            {todoTasks.length} Görev
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Günü yaklaşan ve gecikmiş olanlar en başta olacak şekilde tarihe göre sıralanmıştır.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => openModalWithDurum('Yapılacak')}
                                    className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all border border-slate-200"
                                >
                                    <FiPlus size={14} /> Yapılacak Ekle
                                </button>
                            </div>

                            {todoTasks.length === 0 ? (
                                <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-xs text-slate-400 font-medium">Sırada bekleyen yapılacak görev bulunmuyor.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2.5">
                                    {todoTasks.map(g => (
                                        <GorevSatiri
                                            key={g.id}
                                            g={g}
                                            locale={locale}
                                            onOpen={setOpen}
                                            onDateChange={handleDateChange}
                                            onStatusChange={handleStatusChange}
                                            baseFirmaPath={baseFirmaPath}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Gecikenler Kartlar */}
                    {statusFilter === 'gecikenler' && (
                        <section className="space-y-3.5">
                            <div className="px-1">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base sm:text-lg font-black text-red-700 tracking-tight flex items-center gap-2">
                                        <FiAlertCircle size={20} />
                                        Gecikmiş Görevler (Acil Müdahale)
                                    </h2>
                                    <span className="text-xs font-extrabold bg-red-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                                        {overdueTasks.length} Gecikmiş
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2.5">
                                {overdueTasks.map(g => (
                                    <GorevSatiri
                                        key={g.id}
                                        g={g}
                                        locale={locale}
                                        onOpen={setOpen}
                                        onDateChange={handleDateChange}
                                        onStatusChange={handleStatusChange}
                                        baseFirmaPath={baseFirmaPath}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Tamamlananlar Kartlar */}
                    {(statusFilter === 'tumu' || statusFilter === 'tamamlandi') && completedTasks.length > 0 && (
                        <section className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden transition-all duration-200">
                            <button
                                type="button"
                                onClick={() => setIsCompletedSectionOpen(!isCompletedSectionOpen)}
                                className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-100/70 transition-colors text-left cursor-pointer"
                            >
                                <div className="flex items-center gap-2.5">
                                    <FiCheckCircle className="text-emerald-600" size={18} />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm sm:text-base font-bold text-slate-800">
                                                Tamamlanan Görevler
                                            </h3>
                                            <span className="text-xs font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                                                {completedTasks.length}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-2 text-slate-400 hover:text-slate-600">
                                    {isCompletedSectionOpen ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                                </div>
                            </button>

                            {(isCompletedSectionOpen || statusFilter === 'tamamlandi') && (
                                <div className="p-4 sm:p-5 pt-0 border-t border-slate-200/60 flex flex-col gap-2.5 mt-3">
                                    {completedTasks.map(g => (
                                        <GorevSatiri
                                            key={g.id}
                                            g={g}
                                            locale={locale}
                                            onOpen={setOpen}
                                            onDateChange={handleDateChange}
                                            onStatusChange={handleStatusChange}
                                            baseFirmaPath={baseFirmaPath}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </div>
            )}

            {/* ── KANBAN GÖRÜNÜMÜ ── */}
            {mode === 'kanban' && filteredRows.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                    {KANBAN_COLS.map(col => {
                        let colRows = filteredRows.filter(g => g.durum === col);
                        if (col === 'Devam Ediyor') colRows = sortInProgressTasks(colRows);
                        else if (col === 'Yapılacak') colRows = sortUpcomingTasks(colRows);
                        else colRows = [...colRows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                        const cfg = DURUM_CFG[col];
                        return (
                            <div key={col} className={`rounded-3xl border p-4 ${cfg.col} flex flex-col min-h-[360px]`}>
                                <div className="flex items-center justify-between mb-4 px-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                                        <span className="text-sm font-extrabold text-slate-900">{col}</span>
                                        <span className="text-xs font-extrabold bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                                            {colRows.length}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openModalWithDurum(col)}
                                        className="p-1.5 rounded-xl hover:bg-white text-slate-500 hover:text-slate-900 transition-colors border border-transparent hover:border-slate-200 shadow-2xs cursor-pointer"
                                        title={`${col} sütununa yeni görev ekle`}
                                    >
                                        <FiPlus size={15} />
                                    </button>
                                </div>

                                <div className="space-y-3 flex-1">
                                    {colRows.length === 0 ? (
                                        <div className="text-center py-10 text-slate-400 text-xs font-medium border-2 border-dashed border-slate-200/80 rounded-2xl">
                                            Bu kolonda görev yok
                                        </div>
                                    ) : (
                                        colRows.map(g => (
                                            <GorevKarti
                                                key={g.id}
                                                g={g}
                                                locale={locale}
                                                onOpen={setOpen}
                                                showStatusButtons
                                                onStatusChange={handleStatusChange}
                                                baseFirmaPath={baseFirmaPath}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── DETAY DRAWER ── */}
            {open && (
                <GorevDrawer
                    g={open}
                    locale={locale}
                    onClose={() => setOpen(null)}
                    onToggle={handleToggle}
                    onStatusChange={handleStatusChange}
                    onDeleteTask={handleDeleteTask}
                    onUpdateDetails={handleUpdateDetails}
                    baseFirmaPath={baseFirmaPath}
                    baseTaskDetailPath={baseTaskDetailPath}
                    isPortal={isPortal}
                />
            )}

            {/* ── YENİ GÖREV MODALI ── */}
            <GorevEkleModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                locale={locale}
                profiller={profiller}
                firmalar={firmalar}
                initialDurum={modalInitialDurum}
                onSuccess={handleAddNewTaskSuccess}
            />

            {/* ── TELEFON TAKVİMİNE BAĞLA MODALI ── */}
            <TakvimBaglaModal
                isOpen={isCalendarModalOpen}
                onClose={() => setIsCalendarModalOpen(false)}
            />
        </div>
    );
}
