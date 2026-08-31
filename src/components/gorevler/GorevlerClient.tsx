'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
    FiCalendar, FiUser, FiX, FiCheck, FiRefreshCw, FiBriefcase,
    FiEdit2, FiAlertCircle, FiClock, FiGrid, FiColumns, FiLoader,
    FiPlus, FiMessageSquare, FiCheckSquare, FiSquare, FiTrash2, FiSave, FiList,
    FiSearch
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
    defaultMode?: 'list' | 'kanban';
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
    'Yapılacak':    [{ label: 'Başlat →', to: 'Devam Ediyor', cls: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' }],
    'Devam Ediyor': [
        { label: '← Geri Al', to: 'Yapılacak',    cls: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200' },
        { label: 'Tamamla ✓', to: 'Tamamlandı',   cls: 'bg-green-600 text-white hover:bg-green-700 font-bold' },
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

function initials(name: string | null | undefined): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
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
    const late = overdue(g.son_tarih, g.tamamlandi);
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
            late ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200',
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
                        <span className={`flex items-center gap-1 text-[12px] font-semibold flex-shrink-0 ${late ? 'text-red-600' : 'text-slate-500'}`}>
                            {late ? <FiAlertCircle size={13} /> : <FiCalendar size={12} />}
                            {fmt(g.son_tarih, locale)}
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
    const prio = ONCELIK_CFG[g.oncelik] ?? ONCELIK_CFG['Orta'];
    const late = overdue(g.son_tarih, g.tamamlandi);
    const name = g.atanan_kisi?.tam_ad ?? 'Atanmadı';

    return (
        <div
            onClick={() => onOpen(g)}
            className={[
                'w-full flex items-center gap-3 sm:gap-4 bg-white hover:bg-slate-50/80 border rounded-2xl p-3.5 sm:p-4 text-left transition-all duration-150 cursor-pointer shadow-xs',
                g.tamamlandi ? 'opacity-65 bg-slate-50/40' : '',
                late ? 'border-red-200 hover:border-red-300 ring-1 ring-red-50' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
            ].join(' ')}
        >
            {/* Öncelik İndikatörü */}
            <div className={`w-2 h-10 rounded-full flex-shrink-0 ${prio.dot}`} />

            {/* Başlık ve Firma */}
            <div className="flex-1 min-w-0">
                <p className={`text-[14px] sm:text-[15px] font-bold leading-snug truncate ${g.tamamlandi ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {g.baslik}
                </p>
                {g.ilgili_firma?.unvan ? (
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 mt-1">
                        <FiBriefcase size={12} className="text-blue-500 flex-shrink-0" />
                        <span className="truncate text-blue-700 font-semibold">{g.ilgili_firma.unvan}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                        <span className="truncate opacity-50">Firma bağlantısı yok</span>
                    </div>
                )}
            </div>

            {/* Öncelik Rozeti */}
            <div className="hidden lg:flex items-center flex-shrink-0">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${prio.badge}`}>
                    {g.oncelik}
                </span>
            </div>

            {/* Durum Rozeti */}
            <div className="flex sm:w-36 flex-shrink-0 items-center relative" onClick={e => e.stopPropagation()}>
                <select
                    value={g.durum}
                    onChange={(e) => {
                        const newDurum = e.target.value as GorevDurumu;
                        if (onStatusChange) {
                            onStatusChange(g.id, newDurum);
                            toast.promise(
                                gorevDurumDegistirAction(g.id, newDurum, locale),
                                { loading: 'Durum güncelleniyor...', success: 'Görev durumu güncellendi.', error: 'Güncellenemedi.' }
                            );
                        }
                    }}
                    className={`appearance-none text-[12px] font-bold px-3 py-1.5 pr-7 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors ${DURUM_CFG[g.durum]?.badge ?? ''}`}
                >
                    <option value="Yapılacak">Yapılacak</option>
                    <option value="Devam Ediyor">Devam Ediyor</option>
                    <option value="Tamamlandı">Tamamlandı</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 opacity-60">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>

            {/* Atanan Kişi */}
            <div className="hidden md:flex w-36 lg:w-44 flex-shrink-0 items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-slate-800 text-white text-[11px] font-bold flex-shrink-0 inline-flex items-center justify-center shadow-xs">
                    {initials(name)}
                </span>
                <span className="text-[12px] font-semibold text-slate-700 truncate">{name}</span>
            </div>

            {/* Son Tarih */}
            <div className="w-24 sm:w-32 flex-shrink-0 flex items-center justify-end text-right relative group">
                {g.son_tarih ? (
                    <span className={`flex items-center gap-1.5 text-[12px] font-semibold transition-colors px-2.5 py-1 rounded-lg ${late ? 'text-red-700 bg-red-50 border border-red-200' : 'text-slate-600 bg-slate-50 border border-slate-200 group-hover:border-slate-300'}`}>
                        {late ? <FiAlertCircle size={13} /> : <FiCalendar size={13} />}
                        {fmt(g.son_tarih, locale)}
                    </span>
                ) : (
                    <span className="text-[12px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors flex items-center gap-1 bg-slate-50 border border-dashed border-slate-200 px-2.5 py-1 rounded-lg">
                        <FiCalendar size={13} /> Tarih
                    </span>
                )}
                {onDateChange && (
                    <input
                        type="date"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onDateChange(g.id, e.target.value)}
                        value={g.son_tarih ? g.son_tarih.split('T')[0] : ''}
                        title="Tarihi Değiştir"
                    />
                )}
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
    // Varsayılan olarak liste modunda başlar
    const [mode, setMode] = useState<'list' | 'kanban'>(defaultMode);
    const [open, setOpen] = useState<GorevRow | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [modalInitialDurum, setModalInitialDurum] = useState<GorevDurumu>('Yapılacak');

    // Local items for optimistic responsiveness
    const [taskList, setTaskList] = useState<GorevRow[]>(gorevler);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('acik');
    const [prioFilter, setPrioFilter] = useState<string>('');
    const [personFilter, setPersonFilter] = useState<string>('');
    const [firmaFilter, setFirmaFilter] = useState<string>('');

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

    // Filter logic
    const filteredRows = useMemo(() => {
        return taskList.filter(g => {
            if (statusFilter === 'acik' && g.tamamlandi) return false;
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
    }, [taskList, statusFilter, prioFilter, personFilter, firmaFilter, searchQuery]);

    const totalCount = taskList.length;
    const openCount  = taskList.filter(g => !g.tamamlandi).length;
    const lateCount  = taskList.filter(g => overdue(g.son_tarih, g.tamamlandi)).length;

    const anyFilterActive = statusFilter !== 'acik' || !!prioFilter || !!personFilter || !!firmaFilter || !!searchQuery;

    return (
        <div className="space-y-5">
            {/* Üst Bar: Başlık, Sayaçlar ve Hızlı Ekleme */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <span>📋</span> {isPortal ? 'Görevlerim' : 'Görev Yönetimi'}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-2 font-medium">
                        <span>{totalCount} toplam görev</span>
                        <span>·</span>
                        <span className="text-slate-800 font-semibold">{openCount} açık</span>
                        <span>·</span>
                        <span>{totalCount - openCount} tamamlandı</span>
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

                <div className="flex items-center gap-2.5">
                    {/* Görünüm Geçişi */}
                    <div className="flex rounded-2xl border border-slate-200 bg-slate-100 p-1 shadow-xs">
                        <button
                            type="button"
                            onClick={() => setMode('list')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${mode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <FiList size={14} />
                            <span>Liste</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('kanban')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${mode === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <FiColumns size={14} />
                            <span>Kanban</span>
                        </button>
                    </div>

                    {/* Yeni Görev Butonu */}
                    <button
                        type="button"
                        onClick={() => openModalWithDurum('Yapılacak')}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-xs sm:text-sm font-bold hover:bg-slate-800 transition-all shadow-sm hover:shadow-md"
                    >
                        <FiPlus size={17} /> Yeni Görev
                    </button>
                </div>
            </div>

            {/* Filtre ve Arama Çubuğu */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                    {/* Arama */}
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

                    <span className="hidden sm:block w-px h-5 bg-slate-200" />

                    {/* Durum Chips */}
                    {(['tumu', 'acik', 'tamamlandi'] as const).map((v) => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setStatusFilter(v)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                statusFilter === v
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {v === 'tumu' ? 'Tümü' : v === 'acik' ? 'Açık' : 'Tamamlandı'}
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

                    {/* Personel Dropdown (Eğer birden fazla kişi varsa) */}
                    {profiller.length > 1 && (
                        <select
                            value={personFilter}
                            onChange={e => setPersonFilter(e.target.value)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border appearance-none pr-6 cursor-pointer ${
                                personFilter ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            <option value="">Tüm Kişiler</option>
                            {profiller.map(p => (
                                <option key={p.id} value={p.id}>{p.tam_ad}</option>
                            ))}
                        </select>
                    )}

                    {/* Firma/Müşteri Dropdown */}
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
                                setStatusFilter('acik');
                                setPrioFilter('');
                                setPersonFilter('');
                                setFirmaFilter('');
                                setSearchQuery('');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
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
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                    >
                        <FiPlus size={14} /> Yeni Görev Ekle
                    </button>
                </div>
            )}

            {/* ── LİSTE GÖRÜNÜMÜ ── */}
            {mode === 'list' && filteredRows.length > 0 && (
                <div className="flex flex-col gap-2.5">
                    {filteredRows.map(g => (
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

            {/* ── KANBAN GÖRÜNÜMÜ ── */}
            {mode === 'kanban' && filteredRows.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                    {KANBAN_COLS.map(col => {
                        const colRows = filteredRows.filter(g => g.durum === col);
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
                                        className="p-1.5 rounded-xl hover:bg-white text-slate-500 hover:text-slate-900 transition-colors border border-transparent hover:border-slate-200 shadow-2xs"
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
        </div>
    );
}
