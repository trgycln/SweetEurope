'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    FiCalendar, FiUser, FiX, FiCheck, FiRefreshCw, FiBriefcase,
    FiEdit2, FiAlertCircle, FiClock, FiGrid, FiColumns, FiLoader,
    FiPlus, FiMessageSquare, FiCheckSquare, FiSquare,
} from 'react-icons/fi';
import {
    gorevDurumGuncelleAction,
    gorevDurumDegistirAction,
    fetchGorevDetayAction,
    addGorevNotuAction,
    addAltGorevAction,
    toggleAltGorevAction,
} from './actions';
import { toast } from 'sonner';

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
    const [notPending, startNot]        = useTransition();
    const [altPending, startAlt]        = useTransition();
    const [toggleAltPending, startToggleAlt] = useTransition();

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
            <div className="fixed right-0 top-0 bottom-0 w-full sm:max-w-md bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
                <div className={`h-1.5 flex-shrink-0 ${prio.dot}`} />

                {/* Header */}
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
                    <div className="min-w-0">
                        <div className="flex flex-wrap gap-2 mb-1.5">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${prio.badge}`}>{g.oncelik}</span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${DURUM_CFG[g.durum]?.badge ?? ''}`}>{g.durum}</span>
                        </div>
                        <h2 className={`text-lg font-bold leading-snug ${g.tamamlandi ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {g.baslik}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose}
                        className="flex-shrink-0 p-2 rounded-full hover:bg-slate-100 text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center">
                        <FiX size={20} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                    {late && (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
                            <FiAlertCircle size={15} className="flex-shrink-0" />
                            Gecikmiş — Son tarih: {fmt(g.son_tarih, locale)}
                        </div>
                    )}

                    {/* Açıklama */}
                    {g.aciklama && (
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Açıklama</p>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{g.aciklama}</p>
                        </div>
                    )}

                    {/* Detay satırları */}
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3">
                            <FiUser size={15} className="text-slate-400 flex-shrink-0" />
                            <div>
                                <p className="text-[11px] text-slate-400 font-medium">Atanan Kişi</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold inline-flex items-center justify-center">{initials(name)}</span>
                                    <p className="text-sm font-semibold text-slate-800">{name}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-3">
                            <FiCalendar size={15} className="text-slate-400 flex-shrink-0" />
                            <div>
                                <p className="text-[11px] text-slate-400 font-medium">Son Tarih</p>
                                <p className={`text-sm font-semibold mt-0.5 ${late ? 'text-red-600' : 'text-slate-800'}`}>
                                    {g.son_tarih ? fmt(g.son_tarih, locale) : 'Belirsiz'}
                                </p>
                            </div>
                        </div>
                        {g.ilgili_firma?.unvan && (
                            <div className="flex items-center gap-3 px-4 py-3">
                                <FiBriefcase size={15} className="text-slate-400 flex-shrink-0" />
                                <div>
                                    <p className="text-[11px] text-slate-400 font-medium">İlgili Firma</p>
                                    <Link href={`/${locale}/admin/crm/firmalar/${g.ilgili_firma_id}`}
                                        className="text-sm font-semibold text-blue-600 hover:underline mt-0.5 block" onClick={onClose}>
                                        {g.ilgili_firma.unvan}
                                    </Link>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-3 px-4 py-3">
                            <FiClock size={15} className="text-slate-400 flex-shrink-0" />
                            <div>
                                <p className="text-[11px] text-slate-400 font-medium">Oluşturulma</p>
                                <p className="text-sm text-slate-700 mt-0.5">{fmt(g.created_at, locale)}</p>
                            </div>
                        </div>
                    </div>

                    {/* ── Alt Görevler ─────────────────────────────────── */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <FiCheckSquare size={12} />
                                Alt Görevler
                                {altGorevler.length > 0 && (
                                    <span className="ml-1 text-slate-600 normal-case font-semibold">
                                        ({doneCount}/{altGorevler.length})
                                    </span>
                                )}
                            </p>
                        </div>

                        {detayLoading ? (
                            <div className="flex items-center gap-2 py-3 text-slate-400 text-sm">
                                <FiLoader size={14} className="animate-spin" /> Yükleniyor…
                            </div>
                        ) : (
                            <>
                                {altGorevler.length > 0 && (
                                    <div className="space-y-1.5 mb-3">
                                        {altGorevler.map(a => (
                                            <div key={a.id} className="flex items-start gap-2.5">
                                                <button type="button"
                                                    onClick={() => toggleAlt(a.id, !a.tamamlandi)}
                                                    disabled={toggleAltPending}
                                                    className="flex-shrink-0 mt-0.5 text-slate-400 hover:text-green-600 transition-colors">
                                                    {a.tamamlandi
                                                        ? <FiCheckSquare size={16} className="text-green-600" />
                                                        : <FiSquare size={16} />}
                                                </button>
                                                <span className={`text-sm leading-snug ${a.tamamlandi ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                                    {a.baslik}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Alt görev ekle */}
                                <div className="flex gap-2">
                                    <input type="text" value={altText}
                                        onChange={e => setAltText(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && submitAlt()}
                                        placeholder="Yeni alt görev ekle…"
                                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 min-h-[40px]"
                                    />
                                    <button type="button" onClick={submitAlt} disabled={altPending || !altText.trim()}
                                        className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold disabled:opacity-50 hover:bg-slate-700 transition-colors min-h-[40px]">
                                        {altPending ? <FiLoader size={14} className="animate-spin" /> : <FiPlus size={14} />}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* ── Notlar ───────────────────────────────────────── */}
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <FiMessageSquare size={12} /> Notlar / Gelişmeler
                        </p>

                        {/* Not ekleme */}
                        <div className="rounded-xl border border-slate-200 overflow-hidden mb-3">
                            <textarea value={notText}
                                onChange={e => setNotText(e.target.value)}
                                placeholder="Yeni not ekle…"
                                rows={3}
                                className="w-full px-3 py-2.5 text-sm text-slate-700 resize-none focus:outline-none"
                            />
                            <div className="flex items-center justify-end px-3 py-2 bg-slate-50 border-t border-slate-100">
                                <button type="button" onClick={submitNot} disabled={notPending || !notText.trim()}
                                    className="px-4 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold disabled:opacity-50 hover:bg-slate-700 transition-colors min-h-[36px]">
                                    {notPending ? <FiLoader size={13} className="animate-spin" /> : 'Not Ekle'}
                                </button>
                            </div>
                        </div>

                        {/* Not listesi */}
                        {detayLoading ? null : notlar.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-3">Henüz not eklenmemiş.</p>
                        ) : (
                            <div className="space-y-3">
                                {notlar.map(n => (
                                    <div key={n.id} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-700 text-[9px] font-bold inline-flex items-center justify-center flex-shrink-0">
                                                {initials(n.kullanici_adi)}
                                            </span>
                                            <span className="text-[11px] font-semibold text-slate-600">{n.kullanici_adi ?? 'Anonim'}</span>
                                            <span className="text-[10px] text-slate-400 ml-auto">{fmtTime(n.olusturma_tarihi)}</span>
                                        </div>
                                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{n.not_metni}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-2.5 flex-shrink-0">
                    <button type="button" onClick={handleToggle} disabled={togglePending}
                        className={[
                            'flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold min-h-[44px] transition-colors',
                            g.tamamlandi ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-green-600 text-white hover:bg-green-700',
                        ].join(' ')}>
                        {togglePending ? <FiLoader size={16} className="animate-spin" /> :
                         g.tamamlandi ? <><FiRefreshCw size={15} /> Yeniden Aç</> :
                         <><FiCheck size={15} /> Tamamlandı</>}
                    </button>
                    <Link href={`/${locale}/admin/gorevler/${g.id}`} onClick={onClose}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 min-h-[44px] transition-colors">
                        <FiEdit2 size={14} /> Görevi Düzenle
                    </Link>
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
    const [mode, setMode]     = useState<'grid' | 'kanban'>('grid');
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
