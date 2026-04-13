'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    FiPlus, FiEdit, FiTrash2, FiCopy, FiCheckCircle, FiChevronDown,
    FiChevronUp, FiSliders, FiX, FiAlertCircle, FiCheck,
} from 'react-icons/fi';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { Tables, Database } from '@/lib/supabase/database.types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { deleteGiderAction, approveGiderler } from '@/app/actions/gider-actions';
import { toast } from 'sonner';
import { GiderFormModal } from './GiderFormModal';

type GiderWithDetails = Tables<'giderler'> & {
    profiller: { tam_ad: string | null } | null;
    gider_kalemleri: {
        id: string;
        ad: string | null;
        ana_kategori_id: string;
        gider_ana_kategoriler: {
            ad: string | null;
        } | null;
    } | null;
};
type HauptKategorie = Tables<'gider_ana_kategoriler'>;
type GiderKalemi = Tables<'gider_kalemleri'>;

interface GiderlerClientProps {
    initialGiderler: GiderWithDetails[];
    hauptKategorien: HauptKategorie[];
    giderKalemleri: GiderKalemi[];
    availableFrequencies: readonly Database['public']['Enums']['zahlungshaeufigkeit'][];
    dictionary: Dictionary;
    locale: Locale;
    datePeriods: { label: string; value: string }[];
    currentPeriod: string;
}

const fmtEur = (v: number, locale: Locale) =>
    new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'de-DE', {
        style: 'currency', currency: 'EUR', maximumFractionDigits: 2,
    }).format(v);

export function GiderlerClient({
    initialGiderler,
    hauptKategorien,
    giderKalemleri,
    availableFrequencies,
    dictionary,
    locale,
    datePeriods,
    currentPeriod,
}: GiderlerClientProps) {
    const router = useRouter();

    const getLocalizedName = (item: any) => {
        if (!item) return '';
        if (item.ad_translations && typeof item.ad_translations === 'object') {
            return item.ad_translations[locale] || item.ad_translations['de'] || item.ad || '';
        }
        return item.ad || '';
    };

    const getCategoryName = (gider: GiderWithDetails) => {
        const kalem = giderKalemleri.find(k => k.id === gider.gider_kalemi_id);
        if (!kalem) return gider.gider_kalemleri?.gider_ana_kategoriler?.ad || '—';
        const kategori = hauptKategorien.find(k => k.id === kalem.ana_kategori_id);
        return getLocalizedName(kategori) || '—';
    };

    const getItemName = (gider: GiderWithDetails) => {
        const kalem = giderKalemleri.find(k => k.id === gider.gider_kalemi_id);
        return getLocalizedName(kalem) || gider.gider_kalemleri?.ad || '—';
    };

    // ── Filters ─────────────────────────────────────────────────────────
    const [selectedHauptCategory, setSelectedHauptCategory] = useState('');
    const [selectedGiderKalemi, setSelectedGiderKalemi] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedDurum, setSelectedDurum] = useState<'all' | 'Taslak' | 'Onaylandı'>('all');
    const [filtersOpen, setFiltersOpen] = useState(false);

    // ── Modal ────────────────────────────────────────────────────────────
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGider, setEditingGider] = useState<GiderWithDetails | null>(null);
    const [modalKey, setModalKey] = useState(Date.now().toString());

    // ── Selection ────────────────────────────────────────────────────────
    const [selectedGiderIds, setSelectedGiderIds] = useState<string[]>([]);

    // ── Sorting ──────────────────────────────────────────────────────────
    const [sortField, setSortField] = useState<'tarih' | 'tutar'>('tarih');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    // Recalculate date range when period changes
    useEffect(() => {
        if (selectedPeriod === 'custom') return;
        const now = new Date();
        let start = new Date();
        let end = new Date();
        if (selectedPeriod === 'this-month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (selectedPeriod === 'last-month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (selectedPeriod === 'this-year') {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
        }
        const fmt = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        setDateFrom(fmt(start));
        setDateTo(fmt(end));
    }, [selectedPeriod]);

    const filteredGiderKalemleri = useMemo(() => {
        if (!selectedHauptCategory) return giderKalemleri;
        return giderKalemleri.filter(k => k.ana_kategori_id === selectedHauptCategory);
    }, [selectedHauptCategory, giderKalemleri]);

    const filteredGiderler = useMemo(() => {
        let result = [...initialGiderler];
        if (selectedHauptCategory)
            result = result.filter(g => g.gider_kalemleri?.ana_kategori_id === selectedHauptCategory);
        if (selectedGiderKalemi)
            result = result.filter(g => g.gider_kalemi_id === selectedGiderKalemi);
        if (dateFrom) result = result.filter(g => g.tarih >= dateFrom);
        if (dateTo) result = result.filter(g => g.tarih <= dateTo);
        if (selectedDurum !== 'all') result = result.filter(g => g.durum === selectedDurum);
        result.sort((a, b) => {
            const dir = sortDir === 'asc' ? 1 : -1;
            if (sortField === 'tarih') return a.tarih.localeCompare(b.tarih) * dir;
            return ((Number(a.tutar) || 0) - (Number(b.tutar) || 0)) * dir;
        });
        return result;
    }, [initialGiderler, selectedHauptCategory, selectedGiderKalemi, dateFrom, dateTo, selectedDurum, sortField, sortDir]);

    // ── Stats ────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const all = filteredGiderler;
        const approved = all.filter(g => g.durum === 'Onaylandı');
        const draft = all.filter(g => g.durum === 'Taslak');
        return {
            toplam: all.reduce((s, g) => s + Number(g.tutar || 0), 0),
            onaylandi: approved.reduce((s, g) => s + Number(g.tutar || 0), 0),
            taslak: draft.reduce((s, g) => s + Number(g.tutar || 0), 0),
            kayitSayisi: all.length,
            taslakSayisi: draft.length,
        };
    }, [filteredGiderler]);

    const visibleDraftIds = useMemo(
        () => filteredGiderler.filter(g => g.durum === 'Taslak').map(g => g.id),
        [filteredGiderler]
    );
    const allDraftsSelected = visibleDraftIds.length > 0 && visibleDraftIds.every(id => selectedGiderIds.includes(id));

    // ── Handlers ─────────────────────────────────────────────────────────
    const handleNewExpense = () => {
        setEditingGider(null);
        setModalKey(Date.now().toString());
        setIsModalOpen(true);
    };

    const handleEditExpense = (gider: GiderWithDetails) => {
        setEditingGider(gider);
        setModalKey(gider.id);
        setIsModalOpen(true);
    };

    const handleDuplicateExpense = (gider: GiderWithDetails) => {
        const dup = { ...gider };
        delete (dup as any).id;
        delete (dup as any).created_at;
        delete (dup as any).islem_yapan_kullanici_id;
        delete (dup as any).profiller;
        dup.tarih = new Date().toISOString().split('T')[0];
        setEditingGider(dup as GiderWithDetails);
        setModalKey(Date.now().toString());
        setIsModalOpen(true);
    };

    const handleDelete = async (gider: GiderWithDetails) => {
        if (!window.confirm(
            `Bu gideri silmek istediğinizden emin misiniz?\n\n${formatDate(gider.tarih, locale)} — ${gider.aciklama}: ${formatCurrency(gider.tutar, locale)}`
        )) return;
        const result = await deleteGiderAction(gider.id);
        if (result.success) { toast.success('Gider silindi.'); router.refresh(); }
        else toast.error(`Hata: ${result.error}`);
    };

    const handleApprove = async (ids: string[]) => {
        if (ids.length === 0) return;
        const result = await approveGiderler(ids);
        if (result.success) {
            toast.success(`${result.count} gider onaylandı.`);
            setSelectedGiderIds([]);
            router.refresh();
        } else toast.error(result.error || 'Onaylama sırasında hata oluştu.');
    };

    const handleToggleSelect = (id: string) =>
        setSelectedGiderIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );

    const handleToggleAllDrafts = () =>
        setSelectedGiderIds(allDraftsSelected ? [] : visibleDraftIds);

    const handleResetFilters = () => {
        setSelectedHauptCategory('');
        setSelectedGiderKalemi('');
        setSelectedPeriod('this-month');
        setSelectedDurum('all');
        setSelectedGiderIds([]);
    };

    const toggleSort = (field: 'tarih' | 'tutar') => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('desc'); }
    };

    const SortIcon = ({ field }: { field: 'tarih' | 'tutar' }) =>
        sortField !== field ? null : sortDir === 'desc'
            ? <FiChevronDown className="inline ml-0.5" size={12} />
            : <FiChevronUp className="inline ml-0.5" size={12} />;

    const activeFilterCount = [selectedHauptCategory, selectedGiderKalemi, selectedDurum !== 'all' ? '1' : ''].filter(Boolean).length;

    return (
        <div className="space-y-5">

            {/* ─── Başlık + Butonlar ───────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-primary">Gider Yönetimi</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Tüm işletme giderlerini takip edin ve raporlayın.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href={`/${locale}/admin/idari/finans/gider-sablonlari`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Şablon Yönetimi
                    </Link>
                    <button
                        onClick={handleNewExpense}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                    >
                        <FiPlus size={16} /> Yeni Gider Ekle
                    </button>
                </div>
            </div>

            {/* ─── Özet Kartlar ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Dönem Toplamı</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{fmtEur(stats.toplam, locale)}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{stats.kayitSayisi} kayıt</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Onaylandı</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-800">{fmtEur(stats.onaylandi, locale)}</p>
                    <p className="mt-0.5 text-xs text-emerald-500">{stats.kayitSayisi - stats.taslakSayisi} kayıt</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Taslak / Bekliyor</p>
                    <p className="mt-1 text-2xl font-bold text-amber-800">{fmtEur(stats.taslak, locale)}</p>
                    <p className="mt-0.5 text-xs text-amber-500">{stats.taslakSayisi} kayıt onay bekliyor</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Onay Oranı</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                        {stats.kayitSayisi > 0
                            ? `%${Math.round(((stats.kayitSayisi - stats.taslakSayisi) / stats.kayitSayisi) * 100)}`
                            : '—'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">onaylanan kayıtlar</p>
                </div>
            </div>

            {/* ─── Filtreler ──────────────────────────────────────────── */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Dönem hızlı seçim + filtre toggle */}
                <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-100">
                    {datePeriods.map(p => (
                        <button
                            key={p.value}
                            onClick={() => setSelectedPeriod(p.value)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                                selectedPeriod === p.value
                                    ? 'bg-primary text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                    <button
                        onClick={() => setFiltersOpen(v => !v)}
                        className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                            filtersOpen || activeFilterCount > 0
                                ? 'bg-primary/10 text-primary'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <FiSliders size={12} />
                        Filtrele {activeFilterCount > 0 && <span className="rounded-full bg-primary text-white px-1.5 py-0.5 text-[10px]">{activeFilterCount}</span>}
                        {filtersOpen ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
                    </button>
                </div>

                {/* Genişleyen filtre paneli */}
                {filtersOpen && (
                    <div className="px-4 py-4 space-y-3 border-b border-slate-100">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                            {selectedPeriod === 'custom' && (
                                <>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-600">Başlangıç tarihi</label>
                                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-slate-600">Bitiş tarihi</label>
                                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Ana kategori</label>
                                <select value={selectedHauptCategory}
                                    onChange={e => { setSelectedHauptCategory(e.target.value); setSelectedGiderKalemi(''); }}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                                    <option value="">Tümü</option>
                                    {hauptKategorien.map(cat => <option key={cat.id} value={cat.id}>{cat.ad}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Gider kalemi</label>
                                <select value={selectedGiderKalemi} onChange={e => setSelectedGiderKalemi(e.target.value)}
                                    disabled={filteredGiderKalemleri.length === 0}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50">
                                    <option value="">Tümü</option>
                                    {filteredGiderKalemleri.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Durum</label>
                                <div className="flex gap-1">
                                    {(['all', 'Taslak', 'Onaylandı'] as const).map(d => (
                                        <button key={d} onClick={() => setSelectedDurum(d)}
                                            className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                                                selectedDurum === d
                                                    ? d === 'Taslak' ? 'border-amber-400 bg-amber-50 text-amber-800'
                                                        : d === 'Onaylandı' ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                                                        : 'border-primary bg-primary/10 text-primary'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                            }`}>
                                            {d === 'all' ? 'Tümü' : d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                            <p className="text-xs text-slate-500">{filteredGiderler.length} / {initialGiderler.length} kayıt gösteriliyor</p>
                            <button onClick={handleResetFilters} className="text-xs text-slate-500 hover:text-slate-700 underline">
                                Filtreleri temizle
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── Tablo ──────────────────────────────────────────── */}
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <th className="w-8 px-3 py-2.5">
                                    {visibleDraftIds.length > 0 && (
                                        <input type="checkbox" checked={allDraftsSelected} onChange={handleToggleAllDrafts}
                                            className="rounded border-slate-300" title="Tüm taslakları seç" />
                                    )}
                                </th>
                                <th className="px-3 py-2.5 text-left">Durum</th>
                                <th className="px-3 py-2.5 text-left cursor-pointer select-none" onClick={() => toggleSort('tarih')}>
                                    Tarih <SortIcon field="tarih" />
                                </th>
                                <th className="px-3 py-2.5 text-left">Kategori / Kalem</th>
                                <th className="px-3 py-2.5 text-left">Açıklama</th>
                                <th className="px-3 py-2.5 text-right cursor-pointer select-none" onClick={() => toggleSort('tutar')}>
                                    Tutar <SortIcon field="tutar" />
                                </th>
                                <th className="px-3 py-2.5 text-left">Sıklık</th>
                                <th className="px-3 py-2.5 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredGiderler.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-12 text-center">
                                        <FiAlertCircle className="mx-auto mb-2 text-slate-300" size={32} />
                                        <p className="text-sm text-slate-500">
                                            {selectedHauptCategory || selectedGiderKalemi || selectedDurum !== 'all'
                                                ? 'Bu filtrelere uyan kayıt bulunamadı.'
                                                : 'Henüz gider kaydı yok. Yeni Gider Ekle butonuyla başlayın.'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredGiderler.map(gider => {
                                    const isDraft = gider.durum === 'Taslak';
                                    const isSelected = selectedGiderIds.includes(gider.id);
                                    return (
                                        <tr key={gider.id}
                                            className={`transition-colors hover:bg-slate-50/70 ${isDraft ? 'bg-amber-50/40' : ''} ${isSelected ? 'ring-1 ring-inset ring-primary/30 bg-primary/5' : ''}`}>
                                            <td className="px-3 py-2.5 text-center">
                                                {isDraft && (
                                                    <input type="checkbox" checked={isSelected}
                                                        onChange={() => handleToggleSelect(gider.id)}
                                                        className="rounded border-slate-300" />
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                    isDraft
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-emerald-100 text-emerald-800'
                                                }`}>
                                                    {isDraft ? <FiAlertCircle size={10} /> : <FiCheck size={10} />}
                                                    {gider.durum}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                                                {formatDate(gider.tarih, locale)}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <p className="font-medium text-slate-900 leading-tight">{getCategoryName(gider)}</p>
                                                <p className="text-xs text-slate-400 leading-tight">{getItemName(gider)}</p>
                                            </td>
                                            <td className="px-3 py-2.5 max-w-[220px]">
                                                <p className="truncate text-slate-700" title={gider.aciklama || ''}>
                                                    {gider.aciklama || '—'}
                                                </p>
                                                {gider.profiller?.tam_ad && (
                                                    <p className="text-[11px] text-slate-400">{gider.profiller.tam_ad}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap text-slate-900">
                                                {fmtEur(Number(gider.tutar || 0), locale)}
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-500">
                                                {gider.odeme_sikligi || '—'}
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {isDraft && (
                                                        <button onClick={() => handleApprove([gider.id])}
                                                            title="Onayla"
                                                            className="rounded border border-emerald-300 bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100">
                                                            <FiCheckCircle size={14} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleEditExpense(gider)} title="Düzenle"
                                                        className="rounded border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100">
                                                        <FiEdit size={14} />
                                                    </button>
                                                    <button onClick={() => handleDuplicateExpense(gider)} title="Kopyala"
                                                        className="rounded border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100">
                                                        <FiCopy size={14} />
                                                    </button>
                                                    <button onClick={() => handleDelete(gider)} title="Sil"
                                                        className="rounded border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50">
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Tablo alt özet */}
                {filteredGiderler.length > 0 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
                        <span>{filteredGiderler.length} kayıt</span>
                        <span className="font-semibold text-slate-700">
                            Görünen toplam: {fmtEur(stats.toplam, locale)}
                        </span>
                    </div>
                )}
            </div>

            {/* ─── Seçili taslaklar için sabit onay çubuğu ────────────── */}
            {selectedGiderIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-2xl">
                    <span className="text-sm font-semibold text-slate-700">{selectedGiderIds.length} taslak seçildi</span>
                    <button onClick={() => handleApprove(selectedGiderIds)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                        <FiCheckCircle size={14} /> Tümünü Onayla
                    </button>
                    <button onClick={() => setSelectedGiderIds([])}
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100">
                        <FiX size={14} />
                    </button>
                </div>
            )}

            <GiderFormModal
                key={modalKey}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                giderToEdit={editingGider}
                availableCategories={giderKalemleri}
                availableHauptCategories={hauptKategorien}
                availableFrequencies={availableFrequencies}
                dictionary={dictionary}
                locale={locale}
            />
        </div>
    );
}
