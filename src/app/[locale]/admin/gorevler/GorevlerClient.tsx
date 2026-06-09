'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
    FiCalendar, FiUser, FiX, FiCheck, FiRefreshCw, FiBriefcase,
    FiEdit2, FiAlertCircle, FiClock, FiGrid, FiColumns, FiLoader,
    FiPlus, FiMessageSquare, FiCheckSquare, FiSquare, FiTrash2, FiSave,
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
} from './actions';
import { toast } from 'sonner';

import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });
const MDPreview = dynamic(() => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

type GorevOncelik = 'Düşük' | 'Orta' | 'Yüksek';
type GorevDurumu  = 'Yapılacak' | 'Devam Ediyor' | 'Tamamlandı';

type GorevRow = {
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
    ilgili_firma: { unvan: string } | null;
    atanan_kisi: { tam_ad: string | null } | null;
};

type Profil = { id: string; tam_ad: string | null };

type GorevNot = { id: string; not_metni: string; olusturma_tarihi: string; kullanici_adi: string | null };
type AltGorev  = { id: string; baslik: string; tamamlandi: boolean; olusturma_tarihi: string };

interface GorevlerClientProps {
    gorevler: GorevRow[];
    profiller: Profil[];
    locale: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const ONCELIK_CFG = {
    'Yüksek': { dot: 'bg-red-500',   badge: 'bg-red-100 text-red-700 border-red-200' },
    'Orta':   { dot: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
    'Düşük':  { dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700 border-green-200' },
} as const;

const DURUM_CFG = {
    'Yapılacak':    { badge: 'bg-slate-100 text-slate-600 border-slate-200', col: 'border-slate-300 bg-slate-50/80' },
    'Devam Ediyor': { badge: 'bg-blue-100 text-blue-700 border-blue-200',    col: 'border-blue-300 bg-blue-50/80' },
    'Tamamlandı':   { badge: 'bg-green-100 text-green-700 border-green-200', col: 'border-green-300 bg-green-50/80' },
} as const;

const KANBAN_COLS: GorevDurumu[] = ['Yapılacak', 'Devam Ediyor', 'Tamamlandı'];

// Kanban kart üzerindeki durum geçiş butonları
const DURUM_ACTIONS: Record<GorevDurumu, Array<{ label: string; to: GorevDurumu; cls: string }>> = {
    'Yapılacak':    [{ label: 'Başlat →', to: 'Devam Ediyor', cls: 'bg-blue-100 text-blue-700 hover:bg-blue-200' }],
    'Devam Ediyor': [
        { label: '← Geri Al', to: 'Yapılacak',    cls: 'bg-slate-100 text-slate-600 hover:bg-slate-200' },
        { label: 'Tamamla ✓', to: 'Tamamlandı',   cls: 'bg-green-600 text-white hover:bg-green-700' },
    ],
    'Tamamlandı':   [{ label: '↺ Yeniden Aç', to: 'Yapılacak', cls: 'bg-slate-100 text-slate-600 hover:bg-slate-200' }],
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
    return !done && !!date && new Date(date) < new Date();
}

function initials(name: string | null | undefined): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── Görev Kartı ───────────────────────────────────────────────────────────────

function GorevKarti({
    g, locale, onOpen, showStatusButtons, onStatusChange,
}: {
    g: GorevRow;
    locale: string;
    onOpen: (g: GorevRow) => void;
    showStatusButtons?: boolean;
    onStatusChange?: (id: string, durum: GorevDurumu) => void;
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
            'bg-white rounded-xl border shadow-sm transition-all duration-150',
            g.tamamlandi ? 'opacity-60' : '',
            late ? 'border-red-200' : 'border-slate-200',
        ].join(' ')}>
            {/* Tıklanabilir kart gövdesi */}
            <button
                type="button"
                onClick={() => onOpen(g)}
                className="w-full text-left hover:bg-slate-50/50 rounded-t-xl focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400 transition-colors"
            >
                <div className={`h-1 rounded-t-xl ${prio.dot}`} />
                <div className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${prio.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />{g.oncelik}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${DURUM_CFG[g.durum]?.badge ?? ''}`}>
                            {g.durum}
                        </span>
                    </div>
                    <p className={`text-[15px] font-semibold leading-snug mb-1 ${g.tamamlandi ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {g.baslik}
                    </p>
                    {g.aciklama && (
                        <p className="text-[13px] text-slate-500 line-clamp-2 mb-2">{g.aciklama}</p>
                    )}
                    {g.ilgili_firma?.unvan && (
                        <div className="flex items-center gap-1 text-[12px] text-slate-400 mb-2">
                            <FiBriefcase size={11} /><span className="truncate">{g.ilgili_firma.unvan}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex-shrink-0 inline-flex items-center justify-center">
                                {initials(name)}
                            </span>
                            <span className="text-[12px] text-slate-600 truncate">{name}</span>
                        </div>
                        {g.son_tarih && (
                            <span className={`flex items-center gap-1 text-[12px] font-medium flex-shrink-0 ${late ? 'text-red-600' : 'text-slate-400'}`}>
                                {late ? <FiAlertCircle size={12} /> : <FiCalendar size={11} />}
                                {fmt(g.son_tarih, locale)}
                            </span>
                        )}
                    </div>
                </div>
            </button>

            {/* Durum butonları (sadece Kanban'da) */}
            {actions.length > 0 && (
                <div className="flex gap-1.5 px-3 pb-3">
                    {actions.map(a => (
                        <button
                            key={a.to}
                            type="button"
                            onClick={() => moveTo(a.to)}
                            disabled={pending}
                            className={`flex-1 text-[12px] py-1.5 px-2 rounded-lg font-semibold min-h-[36px] transition-colors disabled:opacity-50 ${a.cls}`}
                        >
                            {pending ? <FiLoader size={12} className="animate-spin mx-auto" /> : a.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

function GorevDrawer({
    g, locale, onClose, onToggle, onStatusChange,
}: {
    g: GorevRow;
    locale: string;
    onClose: () => void;
    onToggle: () => void;
    onStatusChange: (id: string, durum: GorevDurumu) => void;
}) {
    const [togglePending, startToggle] = useTransition();
    const [notlar, setNotlar]           = useState<GorevNot[]>([]);
    const [altGorevler, setAltGorevler] = useState<AltGorev[]>([]);
    const [detayLoading, setDetayLoading] = useState(true);
    const [notText, setNotText]         = useState('');
    const [altText, setAltText]         = useState('');
    
    // Subtask Editing State
    const [editingAltId, setEditingAltId] = useState<string | null>(null);
    const [expandedAltId, setExpandedAltId] = useState<string | null>(null);
    const [editAltText, setEditAltText]   = useState('');

    const [notPending, startNot]        = useTransition();
    const [altPending, startAlt]        = useTransition();
    const [toggleAltPending, startToggleAlt] = useTransition();
    const [actionPending, startAction]  = useTransition(); // For delete/edit

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

    return (
        <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} aria-hidden="true" />
            <div className="fixed right-0 top-0 bottom-0 w-full sm:max-w-2xl bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
                <div className={`h-1.5 flex-shrink-0 ${prio.dot}`} />

                {/* Header */}
                <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-slate-100 flex-shrink-0 bg-white">
                    <div className="min-w-0">
                        <div className="flex flex-wrap gap-2 mb-2">
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${prio.badge}`}>{g.oncelik}</span>
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${DURUM_CFG[g.durum]?.badge ?? ''}`}>{g.durum}</span>
                        </div>
                        <h2 className={`text-xl font-extrabold leading-snug ${g.tamamlandi ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {g.baslik}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose}
                        className="flex-shrink-0 p-2.5 rounded-full hover:bg-slate-100 text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors">
                        <FiX size={22} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 bg-slate-50/30">
                    {late && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                            <FiAlertCircle size={16} className="flex-shrink-0" />
                            Bu görev gecikmiş durumda — Son tarih: {fmt(g.son_tarih, locale)}
                        </div>
                    )}

                    {/* Açıklama */}
                    {g.aciklama && (
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-3">Görev Açıklaması</p>
                            <div className="prose prose-sm max-w-none text-slate-700" data-color-mode="light">
                                <MDPreview source={g.aciklama} style={{ backgroundColor: 'transparent', color: '#334155' }} />
                            </div>
                        </div>
                    )}

                    {/* Detay satırları */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                <FiUser size={18} />
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Atanan Kişi</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <p className="text-sm font-bold text-slate-800">{name}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${late ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}`}>
                                <FiCalendar size={18} />
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Son Tarih</p>
                                <p className={`text-sm font-bold mt-0.5 ${late ? 'text-red-600' : 'text-slate-800'}`}>
                                    {g.son_tarih ? fmt(g.son_tarih, locale) : 'Belirsiz'}
                                </p>
                            </div>
                        </div>
                        {g.ilgili_firma?.unvan && (
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                                    <FiBriefcase size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">İlgili Firma</p>
                                    <Link href={`/${locale}/admin/crm/firmalar/${g.ilgili_firma_id}`}
                                        className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline mt-0.5 block truncate" onClick={onClose}>
                                        {g.ilgili_firma.unvan}
                                    </Link>
                                </div>
                            </div>
                        )}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                <FiClock size={18} />
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Oluşturulma</p>
                                <p className="text-sm font-semibold text-slate-700 mt-0.5">{fmt(g.created_at, locale)}</p>
                            </div>
                        </div>
                    </div>

                    {/* ── Alt Görevler ─────────────────────────────────── */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <FiCheckSquare size={16} className="text-slate-400" />
                                Alt Görevler
                                {altGorevler.length > 0 && (
                                    <span className="ml-1 text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                                        {doneCount}/{altGorevler.length}
                                    </span>
                                )}
                            </h3>
                        </div>

                        {/* Progress Bar */}
                        {altGorevler.length > 0 && (
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4 overflow-hidden">
                                <div className="bg-green-500 h-1.5 transition-all duration-300" style={{ width: `${(doneCount / altGorevler.length) * 100}%` }} />
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
                                            <div key={a.id} className="group flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                                <button type="button"
                                                    onClick={() => toggleAlt(a.id, !a.tamamlandi)}
                                                    disabled={toggleAltPending}
                                                    className="flex-shrink-0 mt-0.5 text-slate-300 hover:text-green-500 transition-colors">
                                                    {a.tamamlandi
                                                        ? <FiCheckSquare size={18} className="text-green-500" />
                                                        : <FiSquare size={18} />}
                                                </button>
                                                
                                                {editingAltId === a.id ? (
                                                    <div className="flex-1 flex gap-2">
                                                        <textarea 
                                                            autoFocus
                                                            rows={3}
                                                            value={editAltText}
                                                            onChange={e => setEditAltText(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEditAlt(a.id); }
                                                                if (e.key === 'Escape') setEditingAltId(null);
                                                            }}
                                                            className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                                                        />
                                                        <button onClick={() => saveEditAlt(a.id)} disabled={actionPending} className="text-green-600 hover:bg-green-50 p-1.5 rounded-md">
                                                            <FiSave size={14} />
                                                        </button>
                                                        <button onClick={() => setEditingAltId(null)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-md">
                                                            <FiX size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex-1 min-w-0" data-color-mode="light">
                                                            <div 
                                                                className={`text-sm pt-0.5 relative cursor-pointer group/content ${expandedAltId === a.id ? '' : 'max-h-12 overflow-hidden'} ${a.tamamlandi ? 'line-through text-slate-400 opacity-70' : 'text-slate-700'}`}
                                                                onClick={() => setExpandedAltId(expandedAltId === a.id ? null : a.id)}
                                                            >
                                                                <MDPreview source={a.baslik} style={{ backgroundColor: 'transparent', color: 'inherit', fontSize: '0.875rem' }} />
                                                                {expandedAltId !== a.id && a.baslik.length > 50 && (
                                                                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-50 to-transparent" />
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                                            <button onClick={() => { setEditingAltId(a.id); setEditAltText(a.baslik); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Düzenle">
                                                                <FiEdit2 size={13} />
                                                            </button>
                                                            <button onClick={() => removeAlt(a.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Sil">
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
                                        rows={2}
                                        placeholder="Yeni alt görev ekle (Markdown desteklenir)..."
                                        className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 min-h-[44px] bg-slate-50 focus:bg-white transition-colors resize-y"
                                    />
                                    <button type="button" onClick={submitAlt} disabled={altPending || !altText.trim()}
                                        className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-bold disabled:opacity-50 hover:bg-slate-700 transition-colors min-h-[44px] flex items-center gap-1.5">
                                        {altPending ? <FiLoader size={14} className="animate-spin" /> : <><FiPlus size={16} /> Ekle</>}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ── Aktivite / Notlar Timeline ───────────────────────────────────────── */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 px-1">
                            <FiMessageSquare size={16} className="text-slate-400" /> 
                            Aktivite & Notlar
                        </h3>

                        {/* Not ekleme (Markdown) */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6" data-color-mode="light">
                            <MDEditor
                                value={notText}
                                onChange={(val) => setNotText(val || '')}
                                preview="edit"
                                hideToolbar={false}
                                height={200}
                                textareaProps={{ placeholder: "Detaylı bir not ekleyin (Markdown desteklenir)..." }}
                                className="border-0 shadow-none !rounded-b-none"
                            />
                            <div className="flex items-center justify-end px-4 py-3 bg-slate-50 border-t border-slate-200">
                                <button type="button" onClick={submitNot} disabled={notPending || !notText.trim()}
                                    className="px-5 py-2 rounded-xl bg-slate-800 text-white text-sm font-bold disabled:opacity-50 hover:bg-slate-700 transition-colors min-h-[40px] shadow-sm">
                                    {notPending ? <FiLoader size={16} className="animate-spin" /> : 'Notu Kaydet'}
                                </button>
                            </div>
                        </div>

                        {/* Timeline Listesi */}
                        {detayLoading ? null : notlar.length === 0 ? (
                            <div className="text-center py-8 bg-white rounded-2xl border border-slate-200 border-dashed">
                                <p className="text-sm text-slate-400 font-medium">Henüz aktivite veya not bulunmuyor.</p>
                            </div>
                        ) : (
                            <div className="relative pl-4 space-y-6 before:absolute before:inset-0 before:ml-8 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                {notlar.map((n, i) => (
                                    <div key={n.id} className="relative flex items-start gap-4">
                                        <div className="absolute left-0 w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm z-10">
                                            {initials(n.kullanici_adi)}
                                        </div>
                                        <div className="ml-12 w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative group">
                                            {/* Arrow for timeline bubble */}
                                            <div className="absolute top-4 -left-2 w-4 h-4 bg-white border-l border-t border-slate-200 transform -rotate-45" />
                                            
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div>
                                                    <span className="font-bold text-slate-800 text-sm">{n.kullanici_adi ?? 'Anonim'}</span>
                                                    <span className="text-slate-400 text-xs ml-2">not bıraktı</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                        {fmtTime(n.olusturma_tarihi)}
                                                    </span>
                                                    <button onClick={() => removeNot(n.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1" title="Notu Sil">
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="prose prose-sm max-w-none text-slate-700 mt-2" data-color-mode="light">
                                                <MDPreview source={n.not_metni} style={{ backgroundColor: 'transparent', color: '#334155' }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row gap-3 flex-shrink-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
                    <Link href={`/${locale}/admin/gorevler/${g.id}`} onClick={onClose}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 min-h-[48px] transition-all">
                        <FiEdit2 size={16} /> Görevi Düzenle
                    </Link>
                    <button type="button" onClick={handleToggle} disabled={togglePending}
                        className={[
                            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold min-h-[48px] transition-all shadow-sm',
                            g.tamamlandi ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md',
                        ].join(' ')}>
                        {togglePending ? <FiLoader size={18} className="animate-spin" /> :
                         g.tamamlandi ? <><FiRefreshCw size={16} /> Yeniden Aç</> :
                         <><FiCheck size={18} /> Tamamlandı Olarak İşaretle</>}
                    </button>
                </div>
            </div>
        </>
    );
}

// ── Filtre Chips ──────────────────────────────────────────────────────────────

function FilterChips({ profiller }: { profiller: Profil[] }) {
    const params   = useSearchParams();
    const pathname = usePathname();
    const router   = useRouter();

    function set(key: string, value: string) {
        const p = new URLSearchParams(params.toString());
        if (value) p.set(key, value); else p.delete(key);
        router.replace(`${pathname}?${p.toString()}`);
    }

    const durum   = params.get('durum')   ?? '';
    const oncelik = params.get('oncelik') ?? '';
    const atanan  = params.get('atanan')  ?? '';
    const any     = !!(durum || oncelik || atanan);

    const chip    = 'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all cursor-pointer min-h-[36px] whitespace-nowrap';
    const active  = 'bg-slate-800 text-white border-slate-800';
    const passive = 'bg-white text-slate-600 border-slate-200 hover:border-slate-400';

    return (
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
            {(['', 'acik', 'tamamlandi'] as const).map((v, i) => (
                <button key={v} type="button" onClick={() => set('durum', v)}
                    className={`${chip} ${durum === v ? active : passive}`}>
                    {['Tümü', 'Açık', 'Tamamlandı'][i]}
                </button>
            ))}
            <span className="w-px h-5 bg-slate-200" />
            {(['', 'Yüksek', 'Orta', 'Düşük'] as const).map((v, i) => (
                <button key={v || 'all'} type="button" onClick={() => set('oncelik', v)}
                    className={`${chip} ${oncelik === v ? active : passive}`}>
                    {['Tüm Öncelik', '🔴 Yüksek', '🟠 Orta', '🟢 Düşük'][i]}
                </button>
            ))}
            <span className="w-px h-5 bg-slate-200" />
            <select value={atanan} onChange={e => set('atanan', e.target.value)}
                className={`${chip} appearance-none pr-6 ${atanan ? active : passive}`}>
                <option value="">Tüm Kişiler</option>
                {profiller.map(p => <option key={p.id} value={p.id}>{p.tam_ad}</option>)}
            </select>
            {any && (
                <button type="button" onClick={() => router.replace(pathname)}
                    className={`${chip} bg-red-50 text-red-600 border-red-200 hover:bg-red-100`}>
                    <FiX size={13} /> Temizle
                </button>
            )}
        </div>
    );
}

// ── Ana Bileşen ───────────────────────────────────────────────────────────────

export default function GorevlerClient({ gorevler, profiller, locale }: GorevlerClientProps) {
    const [mode, setMode]     = useState<'grid' | 'kanban'>('kanban');
    const [open, setOpen]     = useState<GorevRow | null>(null);
    const [localDurum, setLocalDurum] = useState<Record<string, GorevDurumu>>({});

    function handleStatusChange(id: string, durum: GorevDurumu) {
        setLocalDurum(prev => ({ ...prev, [id]: durum }));
        if (open?.id === id) {
            setOpen(prev => prev ? { ...prev, durum, tamamlandi: durum === 'Tamamlandı' } : null);
        }
    }

    function handleToggle() {
        if (!open) return;
        const next = !open.tamamlandi;
        const nextDurum: GorevDurumu = next ? 'Tamamlandı' : 'Yapılacak';
        handleStatusChange(open.id, nextDurum);
    }

    const rows = gorevler.map(g =>
        localDurum[g.id]
            ? { ...g, durum: localDurum[g.id], tamamlandi: localDurum[g.id] === 'Tamamlandı' }
            : g
    );

    const openCount = rows.filter(g => !g.tamamlandi).length;

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <FilterChips profiller={profiller} />
                <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="text-sm text-slate-400 hidden sm:block">{rows.length} görev · {openCount} açık</span>
                    <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <button type="button" onClick={() => setMode('grid')}
                            className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${mode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                            <FiGrid size={15} />
                            <span className="hidden sm:inline text-xs font-medium">Liste</span>
                        </button>
                        <button type="button" onClick={() => setMode('kanban')}
                            className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${mode === 'kanban' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                            <FiColumns size={15} />
                            <span className="hidden sm:inline text-xs font-medium">Kanban</span>
                        </button>
                    </div>
                </div>
            </div>

            <p className="text-sm text-slate-400 sm:hidden">{rows.length} görev · {openCount} açık</p>

            {rows.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <FiGrid className="mx-auto text-4xl text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">Görev bulunamadı</p>
                    <p className="text-slate-400 text-sm mt-1">Filtrelerinizi değiştirin veya yeni görev ekleyin</p>
                </div>
            )}

            {/* KART GÖRÜNÜMÜ */}
            {mode === 'grid' && rows.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rows.map(g => (
                        <GorevKarti key={g.id} g={g} locale={locale} onOpen={setOpen} />
                    ))}
                </div>
            )}

            {/* KANBAN GÖRÜNÜMÜ */}
            {mode === 'kanban' && rows.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {KANBAN_COLS.map(col => {
                        const colRows = rows.filter(g => g.durum === col);
                        const cfg     = DURUM_CFG[col];
                        return (
                            <div key={col} className={`rounded-2xl border-2 p-3 ${cfg.col}`}>
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>{col}</span>
                                    <span className="text-xs text-slate-500 font-medium">{colRows.length}</span>
                                </div>
                                <div className="space-y-3">
                                    {colRows.length === 0 && (
                                        <p className="text-center py-8 text-slate-400 text-sm">Bu sütunda görev yok</p>
                                    )}
                                    {colRows.map(g => (
                                        <GorevKarti
                                            key={g.id} g={g} locale={locale} onOpen={setOpen}
                                            showStatusButtons
                                            onStatusChange={handleStatusChange}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* DRAWER */}
            {open && (
                <GorevDrawer
                    g={open}
                    locale={locale}
                    onClose={() => setOpen(null)}
                    onToggle={handleToggle}
                    onStatusChange={handleStatusChange}
                />
            )}
        </div>
    );
}
