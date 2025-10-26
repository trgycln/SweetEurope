'use client';

import { useState, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FiPlus, FiFilter, FiEdit, FiTrash2, FiCopy } from 'react-icons/fi';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { Tables, Enums, Database } from '@/lib/supabase/database.types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { deleteGiderAction } from '@/app/actions/gider-actions';
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

export function GiderlerClient({
    initialGiderler,
    hauptKategorien,
    giderKalemleri,
    availableFrequencies,
    dictionary,
    locale,
    datePeriods,
    currentPeriod
}: GiderlerClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGider, setEditingGider] = useState<GiderWithDetails | null>(null);
    const [modalKey, setModalKey] = useState(Date.now().toString());
    const [customDateFrom, setCustomDateFrom] = useState(searchParams.get('from') || '');
    const [customDateTo, setCustomDateTo] = useState(searchParams.get('to') || '');

    const content = (dictionary as any).admin?.finans?.giderlerPage || {
        title: "Ausgabenverwaltung",
        description: "Alle Betriebsausgaben auflisten und verwalten.",
        newExpense: "Neue Ausgabe",
        filterByHauptCategory: "Nach Hauptkategorie filtern",
        filterByCategory: "Nach Ausgabenposten filtern",
        allCategories: "Alle Hauptkategorien",
        allSubCategories: "Alle Posten",
        date: "Datum",
        hauptCategory: "Hauptkategorie",
        category: "Ausgabenposten",
        descriptionCol: "Beschreibung",
        amount: "Betrag",
        frequency: "Häufigkeit",
        recordedBy: "Erfasst von",
        actions: "Aktionen",
        edit: "Bearbeiten",
        delete: "Löschen",
        duplicate: "Duplizieren",
        confirmDelete: "Möchten Sie diese Ausgabe wirklich löschen?",
        deleteSuccess: "Ausgabe gelöscht.",
        deleteError: "Fehler beim Löschen.",
        noExpensesFoundFilter: "Für diese Filter wurden keine Ausgaben gefunden.",
        noExpensesYet: "Noch keine Ausgaben erfasst.",
    };

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
        const duplicatedData = { ...gider };
        delete (duplicatedData as any).id;
        delete (duplicatedData as any).created_at;
        delete (duplicatedData as any).islem_yapan_kullanici_id;
        delete (duplicatedData as any).profiller;
        duplicatedData.tarih = new Date().toISOString().split('T')[0];
        setEditingGider(duplicatedData as GiderWithDetails);
        setModalKey(Date.now().toString());
        setIsModalOpen(true);
    };

    const handleDelete = async (gider: GiderWithDetails) => {
        if (window.confirm(`${content.confirmDelete}\n\n${formatDate(gider.tarih, locale)} - ${gider.aciklama}: ${formatCurrency(gider.tutar, locale)}`)) {
            const result = await deleteGiderAction(gider.id);
            if (result.success) {
                toast.success(content.deleteSuccess || 'Ausgabe gelöscht.');
                router.refresh(); // ✅ Listeyi güncelle
            } else {
                toast.error(`${content.deleteError || 'Fehler:'} ${result.error}`);
            }
        }
    };

    // ✅ GÜNCELLENMİŞ Filter-Handler (router.refresh eklendi)
    const handleFilterChange = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(updates).forEach(([key, value]) => {
            if (value) params.set(key, value);
            else params.delete(key);
        });

        if ('haupt_kategorie' in updates) params.delete('gider_kalemi_id');

        if ('period' in updates && updates.period !== 'custom') {
            params.delete('from');
            params.delete('to');
            setCustomDateFrom('');
            setCustomDateTo('');
        }

        if ('from' in updates || 'to' in updates) params.set('period', 'custom');

        params.delete('page');

        // 🔧 Ana düzeltme: router.refresh() eklendi
        router.push(`${pathname}?${params.toString()}`);
        router.refresh(); // ✅ Server-side veriyi yeniden çeker
    };

    const currentHauptCategory = searchParams.get('haupt_kategorie') || '';
    const currentGiderKalemi = searchParams.get('gider_kalemi_id') || '';

    const filteredGiderKalemleri = useMemo(() => {
        if (!currentHauptCategory) return giderKalemleri;
        return giderKalemleri.filter(k => k.ana_kategori_id === currentHauptCategory);
    }, [currentHauptCategory, giderKalemleri]);

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">{content.title}</h1>
                    <p className="text-text-main/80 mt-1">{content.description}</p>
                </div>
                <button
                    onClick={handleNewExpense}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto"
                >
                    <FiPlus size={18} />
                    {content.newExpense}
                </button>
            </header>

            {/* DATUMSFILTER */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <FiFilter className="text-gray-500 flex-shrink-0" />
                    <span className="text-sm font-bold text-primary mr-2">Zeitraum:</span>
                    {datePeriods.map(p => (
                        <button
                            key={p.value}
                            onClick={() => handleFilterChange({ period: p.value })}
                            className={`px-3 py-1 text-sm font-bold rounded-full transition-colors ${currentPeriod === p.value ? 'bg-accent text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {currentPeriod === 'custom' && (
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label htmlFor="dateFrom" className="text-sm font-medium text-gray-700">Von:</label>
                            <input
                                type="date"
                                id="dateFrom"
                                value={customDateFrom}
                                onChange={(e) => setCustomDateFrom(e.target.value)}
                                onBlur={(e) => handleFilterChange({ from: e.target.value, to: customDateTo })}
                                className="w-full mt-1 border border-gray-300 rounded-md py-2 px-3 bg-white shadow-sm focus:ring-accent focus:border-accent"
                            />
                        </div>
                        <div className="flex-1">
                            <label htmlFor="dateTo" className="text-sm font-medium text-gray-700">Bis:</label>
                            <input
                                type="date"
                                id="dateTo"
                                value={customDateTo}
                                onChange={(e) => setCustomDateTo(e.target.value)}
                                onBlur={(e) => handleFilterChange({ from: customDateFrom, to: e.target.value })}
                                className="w-full mt-1 border border-gray-300 rounded-md py-2 px-3 bg-white shadow-sm focus:ring-accent focus:border-accent"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* KATEGORIE-FILTER */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4">
                <FiFilter className="text-gray-500 flex-shrink-0 mt-2" />
                <div className="flex-1">
                    <label htmlFor="hauptCategoryFilter" className="text-sm font-medium text-gray-700">{content.filterByHauptCategory}:</label>
                    <select
                        id="hauptCategoryFilter"
                        value={currentHauptCategory}
                        onChange={(e) => handleFilterChange({ haupt_kategorie: e.target.value || null })}
                        className="w-full mt-1 border border-gray-300 rounded-md py-2 px-3 bg-white shadow-sm focus:ring-accent focus:border-accent"
                    >
                        <option value="">{content.allCategories}</option>
                        {hauptKategorien.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.ad}</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1">
                    <label htmlFor="categoryFilter" className="text-sm font-medium text-gray-700">{content.filterByCategory}:</label>
                    <select
                        id="categoryFilter"
                        value={currentGiderKalemi}
                        onChange={(e) => handleFilterChange({ gider_kalemi_id: e.target.value || null })}
                        className="w-full mt-1 border border-gray-300 rounded-md py-2 px-3 bg-white shadow-sm focus:ring-accent focus:border-accent"
                        disabled={filteredGiderKalemleri.length === 0 && !currentHauptCategory}
                    >
                        <option value="">{content.allSubCategories}</option>
                        {filteredGiderKalemleri.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.ad}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* TABLO */}
            <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.date}</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.hauptCategory}</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.category}</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.descriptionCol}</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">{content.amount}</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.frequency}</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{content.recordedBy}</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">{content.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {initialGiderler.length > 0 ? (
                            initialGiderler.map((gider) => (
                                <tr key={gider.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(gider.tarih, locale)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{gider.gider_kalemleri?.gider_ana_kategoriler?.ad || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{gider.gider_kalemleri?.ad || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={gider.aciklama || ''}>{gider.aciklama}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-right">{formatCurrency(gider.tutar, locale)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{gider.odeme_sikligi || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{gider.profiller?.tam_ad || 'System'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => handleEditExpense(gider)} className="text-indigo-600 hover:text-indigo-900" title={content.edit}><FiEdit /></button>
                                        <button onClick={() => handleDuplicateExpense(gider)} className="text-green-600 hover:text-green-900" title={content.duplicate}><FiCopy /></button>
                                        <button onClick={() => handleDelete(gider)} className="text-red-600 hover:text-red-900" title={content.delete}><FiTrash2 /></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                                    {currentGiderKalemi || currentHauptCategory ? content.noExpensesFoundFilter : content.noExpensesYet}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

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
