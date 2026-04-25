'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiPlus, FiCalendar, FiUser, FiX, FiCheck, FiRefreshCw, FiBriefcase, FiEdit2, FiAlertCircle, FiClock, FiGrid, FiColumns, FiLoader, FiTrash2 } from 'react-icons/fi';
import { Enums } from '@/lib/supabase/database.types';
import { gorevDurumGuncelleAction } from './actions';
import { toast } from 'sonner';

type GorevOncelik = Enums<'gorev_oncelik'>;
type GorevDurumu = Enums<'gorev_durumu'>;

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
    olusturan_kisi_id?: string | null;
    ilgili_firma: { unvan: string } | null;
    atanan_kisi: { tam_ad: string | null } | null;
};

type Profil = { id: string; tam_ad: string | null; rol?: string | null };

interface GorevlerClientProps {
    gorevler: GorevRow[];
    profiller: Profil[];
    locale: string;
}

// ── Config ───────────────────────────────────────────────────────────────────

const ONCELIK_CFG: Record<GorevOncelik, { label: string; dot: string; badge: string }> = {
    'Yüksek': { label: 'Yüksek', dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700 border-red-200' },
    'Orta':   { label: 'Orta',   dot: 'bg-orange-400',  badge: 'bg-orange-100 text-orange-700 border-orange-200' },
    'Düşük':  { label: 'Düşük',  dot: 'bg-green-500',   badge: 'bg-green-100 text-green-700 border-green-200' },
};

const DURUM_CFG: Record<string, { label: string; badge: string; col: string }> = {
    'Yapılacak':    { label: 'Yapılacak',    badge: 'bg-slate-100 text-slate-600 border-slate-200',   col: 'border-slate-300 bg-slate-50' },
    'Devam Ediyor': { label: 'Devam Ediyor', badge: 'bg-blue-100 text-blue-700 border-blue-200',      col: 'border-blue-300 bg-blue-50' },
    'Tamamlandı':   { label: 'Tamamlandı',   badge: 'bg-green-100 text-green-700 border-green-200',   col: 'border-green-300 bg-green-50' },
};

const KANBAN_COLUMNS: GorevDurumu[] = ['Yapılacak', 'Devam Ediyor', 'Tamamlandı'];

function formatDate(date: string | null, locale: string): string {
    if (!date) return '—';
    try {
        return new Date(date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return '—';
    }
}

function isOverdue(date: string | null, tamamlandi: boolean): boolean {
    if (!date || tamamlandi) return false;
    return new Date(date) < new Date();
}

function initials(name: string | null | undefined): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── Görev Kartı ──────────────────────────────────────────────────────────────

function GorevKarti({ gorev, locale, onClick }: { gorev: GorevRow; locale: string; onClick: (g: GorevRow) => void }) {
    const prio = ONCELIK_CFG[gorev.oncelik] || ONCELIK_CFG['Orta'];
    const durum = DURUM_CFG[gorev.durum] || DURUM_CFG['Yapılacak'];
    const overdue = isOverdue(gorev.son_tarih, gorev.tamamlandi);
    const atananAd = gorev.atanan_kisi?.tam_ad || 'Atanmadı';

    return (
        <button
            onClick={() => onClick(gorev)}
            className={`w-full text-left bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400
                ${gorev.tamamlandi ? 'opacity-60' : ''}
                ${overdue ? 'border-red-200' : 'border-slate-200'}`}
        >
            {/* Top bar */}
            <div className={`h-1 rounded-t-xl ${prio.dot}`} />

            <div className="p-4">
                {/* Badge row */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${prio.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                        {prio.label}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${durum.badge}`}>
                        {durum.label}
                    </span>
                </div>

                {/* Title */}
                <p className={`text-[15px] font-semibold leading-snug mb-1.5 ${gorev.tamamlandi ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {gorev.baslik}
                </p>

                {/* Description */}
                {gorev.aciklama && (
                    <p className="text-[13px] text-slate-500 leading-snug line-clamp-2 mb-3">
                        {gorev.aciklama}
                    </p>
                )}

                {/* Company */}
                {gorev.ilgili_firma?.unvan && (
                    <div className="flex items-center gap-1 text-[12px] text-slate-400 mb-3">
                        <FiBriefcase size={11} />
                        <span className="truncate">{gorev.ilgili_firma.unvan}</span>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    {/* Assignee */}
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold flex-shrink-0">
                            {initials(atananAd)}
                        </span>
                        <span className="text-[12px] text-slate-600 truncate">{atananAd}</span>
                    </div>

                    {/* Due date */}
                    {gorev.son_tarih && (
                        <span className={`flex items-center gap-1 text-[12px] font-medium flex-shrink-0
                            ${overdue ? 'text-red-600' : 'text-slate-400'}`}>
                            {overdue ? <FiAlertCircle size={12} /> : <FiCalendar size={11} />}
                            {formatDate(gorev.son_tarih, locale)}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

// ── Görev Drawer ─────────────────────────────────────────────────────────────

function GorevDrawer({ gorev, locale, onClose, onStatusChange }: {
    gorev: GorevRow;
    locale: string;
    onClose: () => void;
    onStatusChange: (id: string, done: boolean) => void;
}) {
    const [isPending, startTransition] = useTransition();
    const prio = ONCELIK_CFG[gorev.oncelik] || ONCELIK_CFG['Orta'];
    const durum = DURUM_CFG[gorev.durum] || DURUM_CFG['Yapılacak'];
    const overdue = isOverdue(gorev.son_tarih, gorev.tamamlandi);
    const atananAd = gorev.atanan_kisi?.tam_ad || 'Atanmadı';

    const handleToggle = () => {
        startTransition(async () => {
            const result = await gorevDurumGuncelleAction(gorev.id, !gorev.tamamlandi, locale);
            if (result.success) {
                toast.success(result.success);
                onStatusChange(gorev.id, !gorev.tamamlandi);
            } else if (result.error) {
                toast.error(result.error);
            }
        });
    };

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/30 z-40 transition-opacity"
                onClick={onClose}
                aria-hidden
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className={`h-1.5 ${prio.dot}`} />
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${prio.badge}`}>
                                {prio.label} öncelik
                            </span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${durum.badge}`}>
                                {durum.label}
                            </span>
                        </div>
                        <h2 className={`text-lg font-bold leading-snug ${gorev.tamamlandi ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {gorev.baslik}
                        </h2>
                    </div>
                    <button onClick={onClose} className="flex-shrink-0 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                        <FiX size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                    {overdue && !gorev.tamamlandi && (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
                            <FiAlertCircle size={15} className="flex-shrink-0" />
                            Bu görev gecikmiş! Son tarih: {formatDate(gorev.son_tarih, locale)}
                        </div>
                    )}

                    {/* Description */}
                    {gorev.aciklama && (
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Açıklama</p>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{gorev.aciklama}</p>
                        </div>
                    )}

                    {/* Details grid */}
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3">
                            <FiUser size={15} className="text-slate-400 flex-shrink-0" />
                            <div>
                                <p className="text-[11px] text-slate-400 font-medium">Atanan Kişi</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
                                        {initials(atananAd)}
                                    </span>
                                    <p className="text-sm font-semibold text-slate-800">{atananAd}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 px-4 py-3">
                            <FiCalendar size={15} className="text-slate-400 flex-shrink-0" />
                            <div>
                                <p className="text-[11px] text-slate-400 font-medium">Son Tarih</p>
                                <p className={`text-sm font-semibold mt-0.5 ${overdue && !gorev.tamamlandi ? 'text-red-600' : 'text-slate-800'}`}>
                                    {gorev.son_tarih ? formatDate(gorev.son_tarih, locale) : 'Belirsiz'}
                                </p>
                            </div>
                        </div>

                        {gorev.ilgili_firma?.unvan && (
                            <div className="flex items-center gap-3 px-4 py-3">
                                <FiBriefcase size={15} className="text-slate-400 flex-shrink-0" />
                                <div>
                                    <p className="text-[11px] text-slate-400 font-medium">İlgili Firma</p>
                                    <Link
                                        href={`/${locale}/admin/crm/firmalar/${gorev.ilgili_firma_id}`}
                                        className="text-sm font-semibold text-blue-600 hover:underline mt-0.5 block"
                                        onClick={onClose}
                                    >
                                        {gorev.ilgili_firma.unvan}
                                    </Link>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3 px-4 py-3">
                            <FiClock size={15} className="text-slate-400 flex-shrink-0" />
                            <div>
                                <p className="text-[11px] text-slate-400 font-medium">Oluşturulma</p>
                                <p className="text-sm text-slate-700 mt-0.5">{formatDate(gorev.created_at, locale)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions footer */}
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-2.5">
                    <button
                        onClick={handleToggle}
                        disabled={isPending}
                        className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all min-h-[44px]
                            ${gorev.tamamlandi
                                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                : 'bg-green-600 text-white hover:bg-green-700'}`}
                    >
                        {isPending
                            ? <FiLoader size={16} className="animate-spin" />
                            : gorev.tamamlandi
                            ? <><FiRefreshCw size={15} /> Yeniden Aç</>
                            : <><FiCheck size={15} /> Tamamlandı olarak işaretle</>}
                    </button>
                    <Link
                        href={`/${locale}/admin/gorevler/${gorev.id}`}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors min-h-[44px]"
                        onClick={onClose}
                    >
                        <FiEdit2 size={14} /> Görevi Düzenle
                    </Link>
                </div>
            </div>
        </>
    );
}

// ── Filtre Chips ─────────────────────────────────────────────────────────────

function FilterChips({ profiller }: { profiller: Profil[] }) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const set = useCallback((key: string, value: string) => {
        const p = new URLSearchParams(searchParams.toString());
        if (value) p.set(key, value); else p.delete(key);
        router.replace(`${pathname}?${p.toString()}`);
    }, [searchParams, pathname, router]);

    const clear = useCallback(() => {
        router.replace(pathname);
    }, [pathname, router]);

    const durum = searchParams.get('durum') || '';
    const oncelik = searchParams.get('oncelik') || '';
    const atanan = searchParams.get('atanan') || '';
    const hasFilter = !!(durum || oncelik || atanan);

    const chipBase = 'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all cursor-pointer min-h-[36px] whitespace-nowrap';
    const activeChip = 'bg-slate-800 text-white border-slate-800';
    const inactiveChip = 'bg-white text-slate-600 border-slate-200 hover:border-slate-400';

    const DURUM_CHIPS = [
        { value: '',          label: 'Tümü' },
        { value: 'acik',      label: 'Açık' },
        { value: 'tamamlandi',label: 'Tamamlandı' },
    ];
    const ONCELIK_CHIPS = [
        { value: '',       label: 'Tüm Öncelik' },
        { value: 'Yüksek', label: '🔴 Yüksek' },
        { value: 'Orta',   label: '🟠 Orta' },
        { value: 'Düşük',  label: '🟢 Düşük' },
    ];

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
                {/* Durum */}
                {DURUM_CHIPS.map(c => (
                    <button key={c.value} onClick={() => set('durum', c.value)}
                        className={`${chipBase} ${durum === c.value ? activeChip : inactiveChip}`}>
                        {c.label}
                    </button>
                ))}

                <span className="w-px h-6 bg-slate-200 mx-1" />

                {/* Öncelik */}
                {ONCELIK_CHIPS.map(c => (
                    <button key={c.value} onClick={() => set('oncelik', c.value)}
                        className={`${chipBase} ${oncelik === c.value ? activeChip : inactiveChip}`}>
                        {c.label}
                    </button>
                ))}

                <span className="w-px h-6 bg-slate-200 mx-1" />

                {/* Atanan */}
                <select value={atanan}
                    onChange={e => set('atanan', e.target.value)}
                    className={`${chipBase} pr-7 appearance-none ${atanan ? activeChip : inactiveChip}`}
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '28px' }}>
                    <option value="">Tüm Kişiler</option>
                    {profiller.map(p => (
                        <option key={p.id} value={p.id}>{p.tam_ad}</option>
                    ))}
                </select>

                {/* Clear */}
                {hasFilter && (
                    <button onClick={clear}
                        className={`${chipBase} bg-red-50 text-red-600 border-red-200 hover:bg-red-100`}>
                        <FiX size={13} /> Temizle
                    </button>
                )}
            </div>
        </div>
    );
}

// ── Ana Bileşen ───────────────────────────────────────────────────────────────

export default function GorevlerClient({ gorevler, profiller, locale }: GorevlerClientProps) {
    const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
    const [selectedGorev, setSelectedGorev] = useState<GorevRow | null>(null);
    // Mirror completed state in-memory for instant drawer update after action
    const [localDone, setLocalDone] = useState<Record<string, boolean>>({});

    const handleCardClick = (g: GorevRow) => setSelectedGorev(g);
    const handleDrawerClose = () => setSelectedGorev(null);

    const handleStatusChange = (id: string, done: boolean) => {
        setLocalDone(prev => ({ ...prev, [id]: done }));
        // Update selectedGorev to reflect new status immediately
        if (selectedGorev?.id === id) {
            setSelectedGorev(prev => prev ? {
                ...prev,
                tamamlandi: done,
                durum: done ? 'Tamamlandı' : 'Yapılacak',
            } : null);
        }
    };

    // Apply local done state override
    const gorevlerEffective = gorevler.map(g =>
        localDone[g.id] !== undefined
            ? { ...g, tamamlandi: localDone[g.id], durum: localDone[g.id] ? 'Tamamlandı' as GorevDurumu : 'Yapılacak' as GorevDurumu }
            : g
    );

    const openCount = gorevlerEffective.filter(g => !g.tamamlandi).length;

    return (
        <div className="space-y-5">

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <FilterChips profiller={profiller} />

                {/* View toggle */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm text-slate-500 hidden sm:block">
                        {gorevlerEffective.length} görev · {openCount} açık
                    </span>
                    <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <button onClick={() => setViewMode('grid')}
                            title="Liste görünümü"
                            className={`px-3 py-2 text-sm transition-colors flex items-center gap-1.5 ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                            <FiGrid size={15} />
                            <span className="hidden sm:inline">Liste</span>
                        </button>
                        <button onClick={() => setViewMode('kanban')}
                            title="Kanban görünümü"
                            className={`px-3 py-2 text-sm transition-colors flex items-center gap-1.5 ${viewMode === 'kanban' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                            <FiColumns size={15} />
                            <span className="hidden sm:inline">Kanban</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Count (mobile) */}
            <p className="text-sm text-slate-500 sm:hidden">
                {gorevlerEffective.length} görev · {openCount} açık
            </p>

            {/* Empty state */}
            {gorevlerEffective.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <FiGrid className="mx-auto text-4xl text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">Görev bulunamadı</p>
                    <p className="text-slate-400 text-sm mt-1">Filtrelerinizi değiştirin veya yeni görev ekleyin</p>
                </div>
            )}

            {/* GRID VIEW */}
            {viewMode === 'grid' && gorevlerEffective.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gorevlerEffective.map(g => (
                        <GorevKarti key={g.id} gorev={g} locale={locale} onClick={handleCardClick} />
                    ))}
                </div>
            )}

            {/* KANBAN VIEW */}
            {viewMode === 'kanban' && gorevlerEffective.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {KANBAN_COLUMNS.map(col => {
                        const colGorevler = gorevlerEffective.filter(g => g.durum === col);
                        const cfg = DURUM_CFG[col];
                        return (
                            <div key={col} className={`rounded-2xl border-2 p-3 ${cfg.col}`}>
                                {/* Column header */}
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>{col}</span>
                                    </div>
                                    <span className="text-xs text-slate-500 font-medium">{colGorevler.length}</span>
                                </div>

                                {/* Cards */}
                                <div className="space-y-3">
                                    {colGorevler.length === 0 && (
                                        <div className="text-center py-8 text-slate-400 text-sm">
                                            Bu sütunda görev yok
                                        </div>
                                    )}
                                    {colGorevler.map(g => (
                                        <GorevKarti key={g.id} gorev={g} locale={locale} onClick={handleCardClick} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* DRAWER */}
            {selectedGorev && (
                <GorevDrawer
                    gorev={selectedGorev}
                    locale={locale}
                    onClose={handleDrawerClose}
                    onStatusChange={handleStatusChange}
                />
            )}
        </div>
    );
}
